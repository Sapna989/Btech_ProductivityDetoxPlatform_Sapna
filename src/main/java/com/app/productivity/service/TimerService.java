package com.app.productivity.service;

import com.app.productivity.entity.DailyStat;
import com.app.productivity.entity.FocusSession;
import com.app.productivity.entity.Task;
import com.app.productivity.entity.User;
import com.app.productivity.repository.DailyStatRepository;
import com.app.productivity.repository.FocusSessionRepository;
import com.app.productivity.repository.TaskRepository;
import com.app.productivity.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class TimerService {

    private final FocusSessionRepository sessionRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final DailyStatRepository dailyStatRepository;

    public TimerService(FocusSessionRepository sessionRepository, TaskRepository taskRepository,
                        UserRepository userRepository, DailyStatRepository dailyStatRepository) {
        this.sessionRepository = sessionRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.dailyStatRepository = dailyStatRepository;
    }

    @Transactional
    public FocusSession startSession(String email, Long taskId) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        Task task = taskRepository.findById(taskId).orElseThrow(() -> new RuntimeException("Task not found"));

        if (!task.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        
        if ("COMPLETED".equals(task.getStatus())) {
            throw new RuntimeException("Task is already completed");
        }

        // Close any dangling sessions for this task
        Optional<FocusSession> activeSession = sessionRepository.findFirstByUserAndTaskAndEndTimeIsNullOrderByStartTimeDesc(user, task);
        if (activeSession.isPresent()) {
            endSession(email, taskId);
        }

        FocusSession session = new FocusSession();
        session.setUser(user);
        session.setTask(task);
        session.setStartTime(LocalDateTime.now());
        return sessionRepository.save(session);
    }

    @Transactional
    public FocusSession endSession(String email, Long taskId) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        Task task = taskRepository.findById(taskId).orElseThrow(() -> new RuntimeException("Task not found"));

        FocusSession session = sessionRepository.findFirstByUserAndTaskAndEndTimeIsNullOrderByStartTimeDesc(user, task)
                .orElseThrow(() -> new RuntimeException("No active session found"));

        session.setEndTime(LocalDateTime.now());
        long seconds = Duration.between(session.getStartTime(), session.getEndTime()).getSeconds();
        long minutes = seconds / 60; // floor automatically

        if (minutes > 120) {
            minutes = 120;
        }

        if (minutes < 1) {
            sessionRepository.delete(session);
            return null; // ignore this session completely
        }

        int durationMins = (int) minutes;
        
        session.setDuration(durationMins);
        sessionRepository.save(session);

        // Update Task
        int newTotal = task.getTotalTimeSpent() + durationMins;
        task.setTotalTimeSpent(newTotal);
        
        boolean justCompleted = false;
        if (newTotal >= task.getEstimatedTime() && !"COMPLETED".equals(task.getStatus())) {
            task.setStatus("COMPLETED");
            justCompleted = true;
        }
        taskRepository.save(task);

        // Update DailyStats
        updateDailyStats(user, LocalDate.now(), durationMins, justCompleted);

        return session;
    }

    private void updateDailyStats(User user, LocalDate date, int sessionDuration, boolean taskCompleted) {
        DailyStat stat = dailyStatRepository.findByUserAndDate(user, date)
                .orElseGet(() -> {
                    DailyStat newStat = new DailyStat();
                    newStat.setUser(user);
                    newStat.setDate(date);
                    
                    // Check streak from yesterday
                    Optional<DailyStat> yesterdayStat = dailyStatRepository.findByUserAndDate(user, date.minusDays(1));
                    if (yesterdayStat.isPresent() && yesterdayStat.get().getTotalFocusTime() >= 60) {
                        newStat.setStreak(yesterdayStat.get().getStreak());
                    } else if (yesterdayStat.isPresent()) {
                        newStat.setStreak(0); // Missed >= 60 min yesterday
                    }
                    
                    return newStat;
                });

        int oldTotal = stat.getTotalFocusTime();
        int newTotalTime = oldTotal + sessionDuration;
        stat.setTotalFocusTime(newTotalTime);

        // Calculate points
        int points = 0;
        if (sessionDuration < 30) {
            points = 10;
        } else {
            points = 100;
        }
        
        stat.setPointsEarned(stat.getPointsEarned() + points);

        // Check for bonus streak/points immediately (>= 60 min)
        if (oldTotal < 60 && newTotalTime >= 60) {
            stat.setPointsEarned(stat.getPointsEarned() + 50);
            stat.setStreak(stat.getStreak() + 1);
        }

        // Focus score
        // (0.6 * Time Efficiency) + (0.4 * Consistency)
        // Let's define Time efficiency as min(100, newTotalTime / 120.0 * 100)
        // Consistency as min(100, streak * 10.0)
        double timeEfficiency = Math.min(100.0, (newTotalTime / 120.0) * 100.0);
        double consistency = Math.min(100.0, stat.getStreak() * 10.0);
        double focusScore = (0.6 * timeEfficiency) + (0.4 * consistency);
        stat.setFocusScore(focusScore);

        dailyStatRepository.save(stat);
    }

    @Transactional
    public void autoCloseAllDanglingSessions(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) return;
        
        java.util.List<FocusSession> sessions = sessionRepository.findByUser(user);
        for (FocusSession session : sessions) {
            if (session.getEndTime() == null) {
                session.setEndTime(LocalDateTime.now());
                long seconds = Duration.between(session.getStartTime(), session.getEndTime()).getSeconds();
                long minutes = seconds / 60;
                
                if (minutes > 120) {
                    minutes = 120;
                }
                
                if (minutes < 1) {
                    sessionRepository.delete(session);
                    continue;
                }
                
                int durationMins = (int) minutes;
                session.setDuration(durationMins);
                sessionRepository.save(session);

                Task task = session.getTask();
                int newTotal = task.getTotalTimeSpent() + durationMins;
                task.setTotalTimeSpent(newTotal);
                
                boolean justCompleted = false;
                if (newTotal >= task.getEstimatedTime() && !"COMPLETED".equals(task.getStatus())) {
                    task.setStatus("COMPLETED");
                    justCompleted = true;
                }
                taskRepository.save(task);

                updateDailyStats(user, session.getStartTime().toLocalDate(), durationMins, justCompleted);
            }
        }
    }
}
