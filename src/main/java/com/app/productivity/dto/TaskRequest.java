package com.app.productivity.dto;

import java.time.LocalDate;

public class TaskRequest {
    private String title;
    private String description;
    private Integer estimatedTime;
    private LocalDate date;

    public TaskRequest() {}

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Integer getEstimatedTime() { return estimatedTime; }
    public void setEstimatedTime(Integer estimatedTime) { this.estimatedTime = estimatedTime; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
}
