package com.app.productivity.controller;

import com.app.productivity.dto.SessionRequest;
import com.app.productivity.service.TimerService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/sessions")
public class SessionController {

    private final TimerService timerService;

    public SessionController(TimerService timerService) {
        this.timerService = timerService;
    }

    @PostMapping("/start")
    public ResponseEntity<?> startSession(Authentication authentication, @RequestBody SessionRequest request) {
        String email = authentication.getName();
        timerService.startSession(email, request.getTaskId());
        Map<String, String> response = new HashMap<>();
        response.put("message", "Session started successfully");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/end")
    public ResponseEntity<?> endSession(Authentication authentication, @RequestBody SessionRequest request) {
        String email = authentication.getName();
        timerService.endSession(email, request.getTaskId());
        Map<String, String> response = new HashMap<>();
        response.put("message", "Session ended successfully");
        return ResponseEntity.ok(response);
    }
}
