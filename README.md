# 🎓 EduTrack — Smart School Management System

EduTrack is a modern, single-school management web application built with **Java 21 (Spring Boot 3)** on the backend and **React 19 (Tailwind CSS)** on the frontend. 

It provides dedicated, secure dashboards for **Admins**, **Teachers**, and **Students**, complete with a smooth dark/light mode toggle, Excel-based class attendance management, direct student-to-admin profile change requests, and local PDF study material storage.

---

## ✨ Features at a Glance

### 🌙 1. Smooth Dark Mode Engine
- Integrated 3-mode theme switcher (**Light**, **Dark**, **System Preference**) with `localStorage` persistence.
- High-contrast form controls and browser autofill overrides for comfortable viewing.

### 📅 2. Class Teacher Attendance Management
- **Class Teacher Authorization:** Attendance upload is strictly restricted to the assigned Class Teacher for that class.
- **Roster Template Download:** Class Teachers can download a `.xlsx` template pre-populated with student roll numbers and names.
- **Excel Batch Import:** Teachers fill in `P` (Present), `A` (Absent), or `L` (Late) and upload. The system provides a validation preview before committing to the database.
- **Daily Student Tracking:** Students can view their daily updated attendance records and subject attendance percentages.

### 📝 3. Direct Student-to-Admin Change Requests
- Students can request updates to their profile details (e.g. phone number, address, parent details).
- Requests go **directly to Admin** for immediate review, approval, or rejection (bypassing unnecessary teacher verification steps).

### 📚 4. Study Materials & Local File Storage
- Teachers can upload PDF notes for their assigned classes and subjects.
- Files are saved directly to local storage (`./uploads/`) and served securely by Spring Boot without requiring external Cloudinary configuration.
- Includes inline PDF preview, zoom controls, and direct downloads for students.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Redux Toolkit, React Router v6, Tailwind CSS, Lucide Icons, Vite |
| **Backend** | Java 21, Spring Boot 3.2, Spring Security (JWT), Spring Data JPA, Spring Data MongoDB |
| **Databases** | **PostgreSQL** (Users, Classes, Attendance, Marks, Timetable, Change Requests) <br> **MongoDB** (Notifications, Study Materials, Audit Logs) |
| **Storage & Tools** | Apache POI (Excel generation/parsing), Local Disk File Storage (`/uploads/`) |

---

## 📁 Repository Layout

```
Edu-track/
├── backend/                  # Spring Boot REST API
│   ├── src/main/java/        # Controllers, Services, Entities & Security
│   ├── src/main/resources/   # App configuration & Flyway SQL migrations
│   └── uploads/              # Local file upload storage
├── frontend/                 # React SPA
│   ├── src/components/       # Reusable components & Theme context
│   ├── src/pages/            # Admin, Teacher, and Student views
│   └── src/api/              # Axios API client functions
└── README.md
```

---

## 🚀 How to Run the Project Locally

### Prerequisites
Make sure you have the following installed:
- **Java 21** or later
- **Maven 3.8+**
- **Node.js 18+** & **npm**
- **PostgreSQL** (version 15+)
- **MongoDB** (local service or MongoDB Atlas cluster)

---

### Step 1: Database Setup
1. Create a local PostgreSQL database named `edutrack`:
   ```sql
   CREATE DATABASE edutrack;
   ```
   *(Flyway will automatically create all required tables on first boot).*

2. Make sure MongoDB is running locally at `mongodb://localhost:27017` (or provide your MongoDB Atlas URI in configuration).

---

### Step 2: Configure Environment (Optional)
Check `backend/src/main/resources/application-dev.properties`. If your local PostgreSQL username/password differs, update these lines:

```properties
spring.datasource.username=postgres
spring.datasource.password=your_password
```

---

### Step 3: Run the Backend

Open a terminal in the `backend` folder:

```bash
cd backend
mvn spring-boot:run -DskipTests
```

The Spring Boot backend will start on **`http://localhost:8080`**.

> **First-Boot Admin Account:**  
> On first startup, if no Admin account exists, one will be created automatically:  
> - **Email:** `admin@gmail.com`  
> - **Password:** `admin@123`  

---

### Step 4: Run the Frontend

Open a second terminal in the `frontend` folder:

```bash
cd frontend
npm install
npm run dev
```

Visit **`http://localhost:5173`** in your browser to log in and test the application!

---

## 🔒 Security & Authorization

- **JWT Authentication:** Stateless authentication using JWT tokens.
- **Server-Side Ownership Enforcement:** Authorization is validated server-side (`OwnershipGuard.java`) so users cannot access data outside their assigned class or role.
- **Role Permissions:**
  - `ADMIN`: Full management of school settings, teachers, students, exam schedules, and profile change requests.
  - `TEACHER`: Upload attendance (Class Teachers), upload PDF materials, manage marks and report cards.
  - `STUDENT`: View timetable, attendance, marks, study materials, and submit profile change requests.

---

## 📦 Single JAR Production Build

To package the frontend and backend into a single runnable JAR file:

```bash
# 1. Build the frontend
cd frontend
npm run build

# 2. Package Spring Boot JAR
cd ../backend
mvn clean package -DskipTests

# 3. Run the executable JAR
java -jar target/edutrack-api-1.0.0.jar
```

Now the application can be accessed directly at `http://localhost:8080`.
