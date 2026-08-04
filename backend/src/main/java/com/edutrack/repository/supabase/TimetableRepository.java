package com.edutrack.repository.supabase;

import com.edutrack.model.entity.Timetable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TimetableRepository extends JpaRepository<Timetable, UUID> {
    List<Timetable> findByClassEntityIdOrderByDayOfWeekAscPeriodNumberAsc(UUID classId);
    List<Timetable> findBySubjectTeacherId(UUID teacherId);
    boolean existsByClassEntityId(UUID classId);
}
