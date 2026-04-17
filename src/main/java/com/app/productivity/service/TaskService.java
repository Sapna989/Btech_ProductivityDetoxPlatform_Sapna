package com.app.productivity.service;

import com.app.productivity.dto.TaskRequest;
import com.app.productivity.entity.Task;
import com.app.productivity.entity.User;
import com.app.productivity.repository.TaskRepository;
import com.app.productivity.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

import java.util.stream.Collectors;
import java.util.Map;
import com.app.productivity.repository.FocusSessionRepository;
import com.app.productivity.entity.FocusSession;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final FocusSessionRepository sessionRepository;

    public TaskService(TaskRepository taskRepository, UserRepository userRepository, FocusSessionRepository sessionRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
    }

    public List<Task> getTasksByDate(String email, LocalDate date) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        List<Task> tasks = taskRepository.findByUserAndDateOrderByStatusAscIdDesc(user, date);

        List<FocusSession> sessions = sessionRepository.findByUser(user).stream()
            .filter(s -> s.getStartTime() != null && s.getStartTime().toLocalDate().equals(date))
            .collect(Collectors.toList());

        Map<Long, Integer> taskTimeMap = sessions.stream()
            .filter(s -> s.getTask() != null)
            .collect(Collectors.groupingBy(
                s -> s.getTask().getId(),
                Collectors.summingInt(FocusSession::getDuration)
            ));

        for (Task task : tasks) {
            int minutes = taskTimeMap.getOrDefault(task.getId(), 0);
            task.setTotalTimeSpent(minutes);
        }

        return tasks;
    }

    public Task createTask(String email, TaskRequest request) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        Task task = new Task();
        task.setUser(user);
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setEstimatedTime(request.getEstimatedTime());
        task.setDate(request.getDate() != null ? request.getDate() : LocalDate.now());
        task.setStatus("PENDING");
        task.setTotalTimeSpent(0);
        return taskRepository.save(task);
    }

    public void deleteTask(String email, Long taskId) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        Task task = taskRepository.findById(taskId).orElseThrow(() -> new RuntimeException("Task not found"));
        if (!task.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized to delete this task");
        }
        taskRepository.delete(task);
    }
}
