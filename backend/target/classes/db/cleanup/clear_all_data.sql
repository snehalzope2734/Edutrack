-- Reset all application data while keeping the schema and tables intact.
-- This does NOT drop tables or delete the database structure.
-- Run this only against the EduTrack database you want to reset.

TRUNCATE TABLE
    attendance,
    marks,
    report_cards,
    exam_schedule,
    change_requests,
    notices,
    timetable,
    subjects,
    students,
    teachers,
    classes,
    exam_types,
    school_info,
    users
RESTART IDENTITY CASCADE;

-- After running this script:
-- 1. all rows are removed from the app tables
-- 2. the tables still exist
-- 3. the app will recreate the default admin on next boot if no ADMIN account exists
