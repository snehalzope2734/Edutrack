-- EduTrack initial schema
-- Single-school system: exactly one row is expected in school_info.
-- No PUBLIC role/user type exists — every row in users.role is ADMIN, TEACHER, or STUDENT.

create extension if not exists pgcrypto;

create table school_info (
    id                uuid primary key default gen_random_uuid(),
    school_name       varchar(200) not null,
    tagline           varchar(300),
    description       text,
    address           text,
    city              varchar(100),
    state             varchar(100),
    pincode           varchar(10),
    phone             varchar(20),
    email             varchar(150),
    website           varchar(200),
    logo_url          varchar(500),
    banner_url        varchar(500),
    principal_name    varchar(150),
    established_year  int,
    updated_at        timestamptz not null default now()
);

create table users (
    id                  uuid primary key default gen_random_uuid(),
    name                varchar(150) not null,
    email               varchar(200) not null unique,
    password_hash       varchar(255) not null,
    role                varchar(20) not null check (role in ('ADMIN','TEACHER','STUDENT')),
    phone               varchar(20),
    profile_photo_url   varchar(500),
    is_active           boolean not null default true,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);
create index idx_users_role on users(role);

create table teachers (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid unique references users(id) on delete cascade,
    employee_code   varchar(50) unique,
    department      varchar(100),
    designation     varchar(100),
    qualification   varchar(200),
    joined_date     date,
    created_at      timestamptz not null default now()
);

create table classes (
    id                 uuid primary key default gen_random_uuid(),
    class_name         varchar(10) not null,
    section            varchar(5) not null,
    academic_year      varchar(20) not null,
    class_teacher_id   uuid references teachers(id),
    created_at         timestamptz not null default now(),
    unique(class_name, section, academic_year)
);

create table subjects (
    id           uuid primary key default gen_random_uuid(),
    name         varchar(100) not null,
    code         varchar(20),
    class_id     uuid references classes(id) on delete cascade,
    teacher_id   uuid references teachers(id),
    created_at   timestamptz not null default now()
);
create index idx_subjects_class on subjects(class_id);
create index idx_subjects_teacher on subjects(teacher_id);

create table students (
    id               uuid primary key default gen_random_uuid(),
    user_id          uuid unique references users(id) on delete cascade,
    roll_number      varchar(20) not null,
    class_id         uuid references classes(id),
    date_of_birth    date,
    gender           varchar(10),
    blood_group      varchar(5),
    parent_name      varchar(150),
    parent_email     varchar(200),
    parent_phone     varchar(20),
    address          text,
    admission_date   date,
    created_at       timestamptz not null default now(),
    unique(roll_number, class_id)
);
create index idx_students_class on students(class_id);

-- Attendance FACTS: committed rows only ever get here via the Excel-import
-- confirm step (AttendanceImportService). There is no manual write path.
create table attendance (
    id            uuid primary key default gen_random_uuid(),
    student_id    uuid references students(id) on delete cascade,
    subject_id    uuid references subjects(id) on delete cascade,
    date          date not null,
    status        varchar(5) not null check (status in ('P','A','L')),
    marked_by     uuid references users(id),
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    unique(student_id, subject_id, date)
);
create index idx_attendance_student_date on attendance(student_id, date);
create index idx_attendance_class_lookup on attendance(subject_id, date);

create table exam_types (
    id              uuid primary key default gen_random_uuid(),
    name            varchar(50) not null,
    max_marks       int not null,
    weightage_pct   decimal(5,2),
    class_id        uuid references classes(id),
    academic_year   varchar(20),
    created_at      timestamptz not null default now()
);

create table marks (
    id               uuid primary key default gen_random_uuid(),
    student_id       uuid references students(id) on delete cascade,
    subject_id       uuid references subjects(id) on delete cascade,
    exam_type_id     uuid references exam_types(id),
    marks_obtained   decimal(6,2),
    grade            varchar(5),
    remarks          text,
    entered_by       uuid references users(id),
    entered_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    unique(student_id, subject_id, exam_type_id)
);

create table timetable (
    id              uuid primary key default gen_random_uuid(),
    class_id        uuid references classes(id) on delete cascade,
    subject_id      uuid references subjects(id) on delete cascade,
    day_of_week     varchar(10) not null,
    period_number   int not null,
    start_time      time not null,
    end_time        time not null,
    created_at      timestamptz not null default now()
);
create index idx_timetable_class on timetable(class_id);

create table notices (
    id            uuid primary key default gen_random_uuid(),
    title         varchar(300) not null,
    content       text not null,
    audience      varchar(20) not null check (audience in ('ALL','CLASS','STUDENT')),
    class_id      uuid references classes(id),
    student_id    uuid references students(id),
    posted_by     uuid references users(id),
    posted_at     timestamptz not null default now(),
    is_archived   boolean not null default false
);
create index idx_notices_feed on notices(is_archived, posted_at desc);

create table change_requests (
    id             uuid primary key default gen_random_uuid(),
    student_id     uuid references students(id) on delete cascade,
    requested_by   uuid references users(id),
    field_name     varchar(100) not null,
    old_value      text,
    new_value      text not null,
    reason         text,
    status         varchar(20) not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
    reviewed_by    uuid references users(id),
    reviewed_at    timestamptz,
    created_at     timestamptz not null default now()
);
create index idx_change_requests_status on change_requests(status);

create table report_cards (
    id              uuid primary key default gen_random_uuid(),
    student_id      uuid references students(id) on delete cascade,
    exam_type_id    uuid references exam_types(id),
    academic_year   varchar(20),
    pdf_url         varchar(500),
    uploaded_by     uuid references users(id),
    uploaded_at     timestamptz not null default now()
);

create table exam_schedule (
    id              uuid primary key default gen_random_uuid(),
    class_id        uuid references classes(id) on delete cascade,
    subject_id      uuid references subjects(id),
    exam_type_id    uuid references exam_types(id),
    exam_date       date not null,
    start_time      time,
    venue           varchar(100),
    created_at      timestamptz not null default now()
);
create index idx_exam_schedule_class on exam_schedule(class_id);
