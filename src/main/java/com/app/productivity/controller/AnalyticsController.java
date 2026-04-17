package com.app.productivity.controller;

import com.app.productivity.service.AnalyticsService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/daily")
    public ResponseEntity<Map<String, Object>> getDaily(
            Authentication authentication,
            @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        String email = authentication.getName();
        if (date == null) {
            date = LocalDate.now();
        }
        return ResponseEntity.ok(analyticsService.getDailyAnalytics(email, date));
    }

    @GetMapping("/weekly")
    public ResponseEntity<List<Map<String, Object>>> getWeekly(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(analyticsService.getWeeklyAnalytics(email));
    }

    @GetMapping("/points")
    public ResponseEntity<List<Map<String, Object>>> getPoints(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(analyticsService.getPointsAnalytics(email));
    }

    @GetMapping("/daily-report")
    public ResponseEntity<Map<String, Object>> getDailyReport(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(analyticsService.getDailyReport(email));
    }
}
