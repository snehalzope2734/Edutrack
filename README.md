# EduTrack — Smart School Management System

A single-school management system: one Spring Boot application serving a
React SPA, backed by PostgreSQL (relational records) and MongoDB (documents:
notifications, study materials, exam papers, and attendance-import history).

## Architecture decisions worth knowing before you read the code

- **Three roles only: ADMIN, TEACHER, STUDENT.** There is no PUBLIC role and
  no public marketing/landing page. The only unauthenticated screens are
  Login and Forgot Password; everything else requires a JWT.
- **Single school.** No tenant id, no school switcher, no multi-tenant
  authorization anywhere. `school_info` has exactly one row, managed from
  Admin → School Settings.
- **Attendance is Excel-only.** There is intentionally **no manual
  "mark attendance" screen or endpoint anywhere** in this codebase. A teacher
  uploads a `.xlsx` roster for one class/subject/date, reviews a row-by-row
  preview (validation errors, in-file duplicates, "will overwrite" flags for
  existing records), and explicitly confirms before anything is written.
  Corrections are made by re-uploading a corrected file — every upload
  (confirmed or discarded) is kept in an audit trail (`GET /api/attendance/imports`).
- **One deployable artifact.** `mvn clean package` produces a single
  executable jar. The React production build is copied into
  `backend/src/main/resources/static` and served directly by Spring Boot;
  `/api/**` is the REST API; everything else falls through to `index.html`
  so React Router can handle client-side routes. There is no separate
  Vercel/Render split — see "Production build" below.
- **Authorization is enforced server-side**, not just by hiding buttons in
  the UI. A `STUDENT` cannot fetch another student's attendance/marks/report
  cards by changing an id in the URL; a `TEACHER` cannot upload attendance,
  enter marks, or view a roster for a class/subject they aren't assigned to.
  This is centralized in `OwnershipGuard` (`backend/.../security/OwnershipGuard.java`)
  and called from every controller endpoint that takes a `studentId`,
  `classId`, or `subjectId`.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + Redux Toolkit + React Router v6 + Tailwind CSS + Recharts + Vite |
| Backend | Java 21 + Spring Boot 3.2 (Web, Security, Data JPA, Data MongoDB, Mail, Validation) |
| Relational DB | PostgreSQL (Supabase in prod, any Postgres 15+ locally) — users, classes, subjects, students, teachers, attendance facts, marks, timetable, notices, exam types/schedule, report cards, change requests |
| Document DB | MongoDB (Atlas in prod, local `mongod` for dev) — notifications, study materials, exam question banks, **attendance import audit trail** |
| File storage | Cloudinary — profile photos, study materials, report card PDFs |
| Auth | JWT (stateless) + bcrypt |
| Migrations | Flyway |
| Excel parsing | Apache POI |

## Repository layout

```
edutrack/
├── backend/     Spring Boot API (+ serves the built frontend in production)
│   ├── src/main/java/com/edutrack/...
│   ├── src/main/resources/application*.properties
│   ├── src/main/resources/db/migration/       Flyway SQL migrations
│   └── src/main/resources/static/             React production build lands here
├── frontend/    React (Vite) SPA
│   └── src/...
└── README.md    (this file)
```

---

## Local development

### Prerequisites

- Java 21, Maven 3.9+
- Node.js 20+, npm
- PostgreSQL 15+ (local or Supabase)
- MongoDB (local `mongod`, or a free Atlas cluster)
- A Cloudinary account (free tier is fine) — only needed to exercise file
  uploads (profile photos, study materials, report cards); the app boots fine
  without valid credentials, uploads will just fail until configured.
- An SMTP account for outgoing mail (Gmail + an App Password works) — again,
  optional for local dev; `EmailService` swallows send failures so account
  creation still works, the person just won't receive a credentials email.

### 1. Backend

```bash
cd backend
cp .env.example .env   # then edit values; or export them in your shell

# Create the local Postgres database if you don't have one yet:
#   createdb edutrack
# Flyway will create all tables automatically on first boot.

mvn spring-boot:run
# or: mvn clean package && java -jar target/edutrack-api-1.0.0.jar
```

On first boot, if no ADMIN account exists yet, one is created automatically
from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (see `.env.example`) — there is no
sign-up UI by design. **Log in and change that password immediately.**

API docs (Swagger UI) are available at `http://localhost:8080/swagger-ui/index.html`.
Health check: `GET http://localhost:8080/api/health`.

### 2. Frontend (dev mode, hot reload)

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`. Vite's dev server proxies `/api/**` to
`http://localhost:8080` (see `vite.config.js`), so the backend must already
be running.

---

## Production build — single deployable jar

This is the important part: the frontend is **not** deployed separately.

**Option A — two explicit steps (works anywhere, no extra tooling):**

```bash
cd frontend
npm install
npm run build
cp -r dist/* ../backend/src/main/resources/static/

cd ../backend
mvn clean package
java -jar target/edutrack-api-1.0.0.jar
```

**Option B — one command, Maven builds the frontend for you** (downloads its
own local Node — no system Node/npm required):

```bash
cd backend
mvn clean package -Pbuild-frontend
java -jar target/edutrack-api-1.0.0.jar
```

Either way, the resulting jar serves:
- `/api/**` → the Spring Boot REST API
- everything else → the React SPA (`SpaController` forwards unknown
  non-API routes to `index.html` so refreshing `/teacher/marks` doesn't 404)

Set `SPRING_PROFILES_ACTIVE=prod` and the Supabase/MongoDB/Cloudinary/mail
env vars from `.env.example` before running in production.

---

## Excel attendance — file format & workflow

Attendance can **only** be entered by uploading an Excel file. There is no
manual marking UI or API anywhere in this app.

**Expected file format** (`.xlsx` or `.xls`, max 5MB):

| Roll Number | Status |
|---|---|
| R001 | Present |
| R002 | A |
| R003 | Late |

- Row 1 is treated as a header and skipped.
- **Status** accepts, case-insensitively: `P` / `Present`, `A` / `Absent`,
  `L` / `Late`.
- One file = one class + one subject + one date, chosen in the upload form
  (not read from the sheet).

**Workflow:**

1. `POST /api/attendance/imports/preview` (multipart: `file`, query params
   `classId`, `subjectId`, `date`) — the teacher must actually be assigned to
   teach that subject/class (enforced server-side). Apache POI parses every
   row and returns a **preview**, not a commit: each row is checked for a
   missing/unknown roll number, an in-file duplicate roll number, an invalid
   status, and whether it would overwrite an existing record for that
   student/subject/date.
2. The teacher reviews the preview in the UI (valid / error / "will
   overwrite" counts, plus the full row list).
3. `POST /api/attendance/imports/{importId}/confirm` — only rows without
   errors are written (upserted) to the `attendance` table, inside a single
   transaction. `POST .../discard` cancels instead.
4. Every import (confirmed or discarded) is kept forever in MongoDB
   (`attendance_imports` collection) as an audit trail —
   `GET /api/attendance/imports` (teachers see their own; admins see all).
5. **Corrections** are made by re-uploading a corrected file for the same
   class/subject/date; the preview will flag the affected rows as
   "will overwrite an existing record" so the teacher can see exactly what's
   about to change before confirming.

---

## Testing

```bash
cd backend
mvn test
```

Included tests (see `backend/src/test/java/com/edutrack`):
- `util/GradeCalculatorTest`, `util/AttendanceStatusNormalizerTest` — pure-function unit tests.
- `service/AttendanceImportServiceTest` — builds a real in-memory `.xlsx` with
  Apache POI and exercises the actual preview/parsing/validation pipeline
  (status normalization, unknown roll numbers, in-file duplicates, existing-
  record "will overwrite" detection, rejecting non-Excel files, rejecting
  empty files) against mocked repositories.
- `service/AuthServiceTest` — deactivated accounts are rejected at login even
  with the correct password; active accounts receive a token.
- `security/OwnershipGuardTest` — the IDOR-prevention logic directly: a
  student cannot view another student's records, a teacher cannot view a
  student outside classes they teach, and ADMIN bypasses these checks.

```bash
cd frontend
npm run build   # production build must succeed; this is also the CI check
```

> **Sandbox note:** this project was scaffolded in an environment without
> access to Maven Central, so the backend could not be `mvn`-compiled or
> `mvn test`-run in that sandbox — only statically reviewed. Frontend
> `npm run build` **was** run successfully. Run `mvn clean package` /
> `mvn test` locally to confirm the backend compiles; see the completion
> report for exact commands.

---

## Environment variables

See `backend/.env.example` and `frontend/.env.example` for the full, commented
list. Summary of required external services:

| Service | Used for | Required? |
|---|---|---|
| PostgreSQL | Users, classes, students, teachers, attendance facts, marks, timetable, notices, exam types/schedule, report card metadata, change requests | Yes |
| MongoDB | Notifications, study materials, exam question banks, attendance-import audit trail | Yes |
| Cloudinary | Profile photos, study material files, report card PDFs | Only for file uploads |
| SMTP (Gmail or similar) | Emailing new teacher/student credentials, password-reset OTPs | Only for those flows — app still runs without it |

## Database migrations

Flyway owns the Postgres schema (`backend/src/main/resources/db/migration/V1__init_schema.sql`);
Hibernate is set to `ddl-auto=validate` in both dev and prod, so it checks the
schema matches the JPA entities but never auto-generates or alters tables —
schema changes always go through a new Flyway migration file.
