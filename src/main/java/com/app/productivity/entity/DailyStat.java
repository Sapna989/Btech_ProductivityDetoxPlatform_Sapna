package com.app.productivity.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "daily_stats", uniqueConstraints = {@UniqueConstraint(columnNames = {"user_id", "date"})})
public class DailyStat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "total_focus_time", nullable = false)
    private Integer totalFocusTime = 0;

    @Column(name = "points_earned", nullable = false)
    private Integer pointsEarned = 0;

    @Column(name = "focus_score", nullable = false)
    private Double focusScore = 0.0;

    @Column(nullable = false)
    private Integer streak = 0;

    public DailyStat() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public Integer getTotalFocusTime() { return totalFocusTime; }
    public void setTotalFocusTime(Integer totalFocusTime) { this.totalFocusTime = totalFocusTime; }
    public Integer getPointsEarned() { return pointsEarned; }
    public void setPointsEarned(Integer pointsEarned) { this.pointsEarned = pointsEarned; }
    public Double getFocusScore() { return focusScore; }
    public void setFocusScore(Double focusScore) { this.focusScore = focusScore; }
    public Integer getStreak() { return streak; }
    public void setStreak(Integer streak) { this.streak = streak; }
}
