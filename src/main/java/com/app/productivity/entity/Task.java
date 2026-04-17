package com.app.productivity.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "estimated_time", nullable = false)
    private Integer estimatedTime = 0;

    @Column(name = "total_time_spent", nullable = false)
    private Integer totalTimeSpent = 0;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private String status = "PENDING"; // "PENDING", "COMPLETED"

    public Task() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Integer getEstimatedTime() { return estimatedTime; }
    public void setEstimatedTime(Integer estimatedTime) { this.estimatedTime = estimatedTime; }
    public Integer getTotalTimeSpent() { return totalTimeSpent; }
    public void setTotalTimeSpent(Integer totalTimeSpent) { this.totalTimeSpent = totalTimeSpent; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
