package com.app.productivity.repository;

import com.app.productivity.entity.FocusSession;
import com.app.productivity.entity.Task;
import com.app.productivity.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;
import java.time.LocalDateTime;

public interface FocusSessionRepository extends JpaRepository<FocusSession, Long> {
    Optional<FocusSession> findFirstByUserAndTaskAndEndTimeIsNullOrderByStartTimeDesc(User user, Task task);
    List<FocusSession> findByUser(User user);
    List<FocusSession> findByUserAndStartTimeBetween(User user, LocalDateTime start, LocalDateTime end);
}
