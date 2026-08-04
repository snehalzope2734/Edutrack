package com.edutrack.service;

import com.edutrack.exception.ResourceNotFoundException;
import com.edutrack.model.dto.request.TimetableItemRequest;
import com.edutrack.model.entity.ClassEntity;
import com.edutrack.model.entity.Subject;
import com.edutrack.model.entity.Timetable;
import com.edutrack.repository.supabase.ClassRepository;
import com.edutrack.repository.supabase.SubjectRepository;
import com.edutrack.repository.supabase.TimetableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TimetableService {

    private final TimetableRepository timetableRepository;
    private final ClassRepository classRepository;
    private final SubjectRepository subjectRepository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getForClass(UUID classId) {
        return timetableRepository.findByClassEntityIdOrderByDayOfWeekAscPeriodNumberAsc(classId)
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public List<Map<String, Object>> replaceForClass(UUID classId, List<TimetableItemRequest> items) {
        // Simplest consistent behaviour: wipe and recreate the week for the class.
        List<Timetable> existing = timetableRepository.findByClassEntityIdOrderByDayOfWeekAscPeriodNumberAsc(classId);
        timetableRepository.deleteAll(existing);

        List<Map<String, Object>> result = items.stream().map(item -> {
            ClassEntity klass = classRepository.findById(item.classId() != null ? item.classId() : classId)
                    .orElseThrow(() -> new ResourceNotFoundException("Class not found"));
            Subject subject = subjectRepository.findById(item.subjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));

            Timetable slot = Timetable.builder()
                    .classEntity(klass)
                    .subject(subject)
                    .dayOfWeek(item.dayOfWeek())
                    .periodNumber(item.periodNumber())
                    .startTime(item.startTime())
                    .endTime(item.endTime())
                    .build();
            return toDto(timetableRepository.save(slot));
        }).toList();

        return result;
    }

    @Transactional
    public Map<String, Object> updateSlot(UUID id, TimetableItemRequest item) {
        Timetable slot = timetableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Timetable slot not found"));
        if (item.subjectId() != null) {
            Subject subject = subjectRepository.findById(item.subjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
            slot.setSubject(subject);
        }
        if (item.dayOfWeek() != null) slot.setDayOfWeek(item.dayOfWeek());
        if (item.periodNumber() != null) slot.setPeriodNumber(item.periodNumber());
        if (item.startTime() != null) slot.setStartTime(item.startTime());
        if (item.endTime() != null) slot.setEndTime(item.endTime());
        slot = timetableRepository.save(slot);
        return toDto(slot);
    }

    @Transactional
    public void deleteSlot(UUID id) {
        if (!timetableRepository.existsById(id)) {
            throw new ResourceNotFoundException("Timetable slot not found");
        }
        timetableRepository.deleteById(id);
    }

    private Map<String, Object> toDto(Timetable t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("classId", t.getClassEntity().getId());
        m.put("subjectId", t.getSubject().getId());
        m.put("subjectName", t.getSubject().getName());
        m.put("dayOfWeek", t.getDayOfWeek());
        m.put("periodNumber", t.getPeriodNumber());
        m.put("startTime", t.getStartTime());
        m.put("endTime", t.getEndTime());
        return m;
    }
}
