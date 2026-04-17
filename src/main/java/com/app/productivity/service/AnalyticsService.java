package com.app.productivity.service;

import com.app.productivity.entity.DailyStat;
import com.app.productivity.entity.User;
import com.app.productivity.repository.DailyStatRepository;
import com.app.productivity.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import com.app.productivity.entity.FocusSession;
import com.app.productivity.repository.FocusSessionRepository;

@Service
public class AnalyticsService {

    private final DailyStatRepository dailyStatRepository;
    private final UserRepository userRepository;
    private final FocusSessionRepository focusSessionRepository;
    private final TimerService timerService;

    public AnalyticsService(DailyStatRepository dailyStatRepository, UserRepository userRepository, FocusSessionRepository focusSessionRepository, TimerService timerService) {
        this.dailyStatRepository = dailyStatRepository;
        this.userRepository = userRepository;
        this.focusSessionRepository = focusSessionRepository;
        this.timerService = timerService;
    }

    public Map<String, Object> getDailyAnalytics(String email, LocalDate date) {
        timerService.autoCloseAllDanglingSessions(email);
        
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        Optional<DailyStat> statOpt = dailyStatRepository.findByUserAndDate(user, date);
        
        Map<String, Object> result = new HashMap<>();
        if (statOpt.isPresent()) {
            DailyStat stat = statOpt.get();
            result.put("total_focus_time", stat.getTotalFocusTime());
            result.put("points_earned", stat.getPointsEarned());
            result.put("focus_score", stat.getFocusScore());
            result.put("streak", calculateStreakLocally(user, date));
        } else {
            result.put("total_focus_time", 0);
            result.put("points_earned", 0);
            result.put("focus_score", 0.0);
            result.put("streak", calculateStreakLocally(user, date));
        }
        return result;
    }

    private int calculateStreakLocally(User user, LocalDate today) {
        List<DailyStat> stats = dailyStatRepository.findByUserOrderByDateAsc(user);
        Map<LocalDate, Integer> dailyTimes = new HashMap<>();
        if (stats != null) {
            for (DailyStat stat : stats) {
                dailyTimes.put(stat.getDate(), dailyTimes.getOrDefault(stat.getDate(), 0) + stat.getTotalFocusTime());
            }
        }

        int streak = 0;
        LocalDate current = today;

        while (true) {
            int time = dailyTimes.getOrDefault(current, 0);
            if (time >= 1) {
                streak++;
                current = current.minusDays(1);
            } else {
                break;
            }
        }
        return streak;
    }

    public List<Map<String, Object>> getWeeklyAnalytics(String email) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(6);
        
        List<DailyStat> stats = dailyStatRepository.findByUserOrderByDateAsc(user);
        Map<LocalDate, DailyStat> statMap = new HashMap<>();
        if (stats != null) {
            for (DailyStat stat : stats) {
                statMap.put(stat.getDate(), stat); // No duplication expected by rule
            }
        }
        
        List<Map<String, Object>> result = new ArrayList<>();
        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            Map<String, Object> map = new HashMap<>();
            map.put("date", current);
            if (statMap.containsKey(current)) {
                DailyStat stat = statMap.get(current);
                map.put("total_focus_time", stat.getTotalFocusTime());
                map.put("focus_score", stat.getFocusScore());
            } else {
                map.put("total_focus_time", 0);
                map.put("focus_score", 0.0);
            }
            result.add(map);
            current = current.plusDays(1);
        }
        
        return result;
    }

    public List<Map<String, Object>> getPointsAnalytics(String email) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        List<DailyStat> stats = dailyStatRepository.findByUserOrderByDateAsc(user);
        
        return stats.stream().map(stat -> {
            Map<String, Object> map = new HashMap<>();
            map.put("date", stat.getDate());
            map.put("points_earned", stat.getPointsEarned());
            return map;
        }).collect(Collectors.toList());
    }

    public Map<String, Object> getDailyReport(String email) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(23, 59, 59);

        List<FocusSession> sessions = focusSessionRepository.findByUserAndStartTimeBetween(user, startOfDay, endOfDay);

        Map<String, Integer> taskTimeMap = new HashMap<>();
        int totalFocusTime = 0;

        for (FocusSession session : sessions) {
            if (session.getEndTime() == null) continue;
            int duration = session.getDuration() != null ? session.getDuration() : 0;
            if (duration == 0) continue;

            String taskTitle = session.getTask().getTitle();
            taskTimeMap.put(taskTitle, taskTimeMap.getOrDefault(taskTitle, 0) + duration);
            totalFocusTime += duration;
        }

        Map<String, Object> response = new HashMap<>();
        response.put("totalFocusTime", totalFocusTime);

        if (totalFocusTime == 0) {
            return response;
        }

        String topTaskTitle = "";
        int maxTime = 0;

        for (Map.Entry<String, Integer> entry : taskTimeMap.entrySet()) {
            if (entry.getValue() > maxTime) {
                maxTime = entry.getValue();
                topTaskTitle = entry.getKey();
            }
        }

        Map<String, Object> topTask = new HashMap<>();
        topTask.put("title", topTaskTitle);
        topTask.put("time", maxTime);
        topTask.put("percentage", Math.round((maxTime * 100.0) / totalFocusTime));
        
        response.put("topTask", topTask);

        List<Map<String, Object>> otherTasks = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : taskTimeMap.entrySet()) {
            if (!entry.getKey().equals(topTaskTitle)) {
                Map<String, Object> other = new HashMap<>();
                other.put("title", entry.getKey());
                other.put("time", entry.getValue());
                otherTasks.add(other);
            }
        }
        response.put("otherTasks", otherTasks);

        return response;
    }
}
