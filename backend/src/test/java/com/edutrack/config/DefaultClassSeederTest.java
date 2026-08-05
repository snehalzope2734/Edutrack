package com.edutrack.config;

import com.edutrack.model.entity.ClassEntity;
import com.edutrack.repository.supabase.ClassRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DefaultClassSeederTest {

    @Mock
    private ClassRepository classRepository;

    private DefaultClassSeeder seeder;

    @BeforeEach
    void setUp() {
        seeder = new DefaultClassSeeder(classRepository);
    }

    @Test
    void seedsDefaultClassesWhenNoClassesExist() {
        when(classRepository.findAll()).thenReturn(List.of());
        when(classRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        seeder.run();

        verify(classRepository).saveAll(org.mockito.ArgumentMatchers.argThat((List<ClassEntity> classes) ->
                classes.stream().anyMatch(c -> "Nursery".equals(c.getClassName()) && "A".equals(c.getSection())) &&
                classes.stream().anyMatch(c -> "10".equals(c.getClassName()) && "A".equals(c.getSection()))
        ));
    }
}
