package com.app.productivity.repository;

import com.app.productivity.entity.DailyStat;
import com.app.productivity.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyStatRepository extends JpaRepository<DailyStat, Long> {
    Optional<DailyStat> findByUserAndDate(User user, LocalDate date);
    List<DailyStat> findTop7ByUserOrderByDateDesc(User user);
    List<DailyStat> findByUserOrderByDateAsc(User user);
}
