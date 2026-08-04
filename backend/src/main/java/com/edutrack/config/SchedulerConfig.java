package com.edutrack.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
public class SchedulerConfig {
    // @EnableScheduling also declared on the main application class;
    // kept here too so scheduling stays on even if that annotation moves.
}
