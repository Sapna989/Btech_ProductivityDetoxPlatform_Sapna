package com.app.productivity.repository;

import com.app.productivity.entity.Task;
import com.app.productivity.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByUserAndDateOrderByStatusAscIdDesc(User user, LocalDate date);
}
