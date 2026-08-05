package com.edutrack.dto.dashboard;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassStatsDto {

    @JsonProperty("name")
    private String className;

    private long studentCount;

    private double attendance;

    private double averageMarks;
}