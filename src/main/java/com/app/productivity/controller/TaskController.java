package com.app.productivity.controller;

import com.app.productivity.dto.TaskRequest;
import com.app.productivity.entity.Task;
import com.app.productivity.service.TaskService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public ResponseEntity<List<Task>> getTasks(
            Authentication authentication,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        String email = authentication.getName();
        return ResponseEntity.ok(taskService.getTasksByDate(email, date));
    }

    @PostMapping
    public ResponseEntity<Task> createTask(Authentication authentication, @RequestBody TaskRequest request) {
        String email = authentication.getName();
        return ResponseEntity.ok(taskService.createTask(email, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTask(Authentication authentication, @PathVariable("id") Long id) {
        String email = authentication.getName();
        taskService.deleteTask(email, id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Task deleted successfully");
        return ResponseEntity.ok(response);
    }
}
