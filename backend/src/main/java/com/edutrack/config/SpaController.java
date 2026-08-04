package com.edutrack.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forwards any non-API, non-asset browser route to index.html so React Router
 * can handle client-side routing (e.g. a hard refresh on /teacher/marks).
 * This is what makes EduTrack a single deployable Spring Boot jar: the built
 * frontend lives under src/main/resources/static and Spring serves it directly,
 * no separate Vercel/Render split.
 */
@Controller
public class SpaController {

    @GetMapping({
            "/",
            "/login",
            "/forgot-password",
            "/admin/**",
            "/teacher/**",
            "/student/**"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
