import { Routes, Route, Navigate } from "react-router-dom";
import {
  LayoutDashboard, Users, GraduationCap, Layers, Megaphone, Bell, CalendarClock,
  BookOpen, ClipboardList, FileText, FileDown, CalendarDays, UserCheck, School, ListChecks,
  BarChart3,
} from "lucide-react";

import ProtectedRoute from "./components/common/ProtectedRoute";
import AppLayout from "./components/common/AppLayout";

import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import TeacherListPage from "./pages/admin/TeacherListPage";
import StudentListPage from "./pages/admin/StudentListPage";
import ClassListPage from "./pages/admin/ClassListPage";
import SubjectListPage from "./pages/admin/SubjectListPage";
import ExamManagementPage from "./pages/admin/ExamManagementPage";
import TimetableBuilderPage from "./pages/admin/TimetableBuilderPage";
import SchoolSettingsPage from "./pages/admin/SchoolSettingsPage";
import NotificationsComposePage from "./pages/admin/NotificationsComposePage";
import AdminChangeRequestsPage from "./pages/admin/AdminChangeRequestsPage";
import AdminAttendanceHistoryPage from "./pages/admin/AdminAttendanceHistoryPage";

// Teacher
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import MyClassesPage from "./pages/teacher/MyClassesPage";
import StudentsPage from "./pages/teacher/StudentsPage";
import StudentProfilePage from "./pages/teacher/StudentProfilePage";
import AttendanceImportPage from "./pages/teacher/AttendanceImportPage";
import MarksEntryPage from "./pages/teacher/MarksEntryPage";
import TeacherMaterialsPage from "./pages/teacher/MaterialsPage";
import TeacherReportCardsPage from "./pages/teacher/ReportCardsPage";
import ChangeRequestsPage from "./pages/teacher/ChangeRequestsPage";

// Student
import StudentDashboard from "./pages/student/StudentDashboard";
import MyAttendancePage from "./pages/student/MyAttendancePage";
import MyMarksPage from "./pages/student/MyMarksPage";
import MyProfilePage from "./pages/student/MyProfilePage";
import ChangeRequestFormPage from "./pages/student/ChangeRequestFormPage";
import NotificationsPage from "./pages/student/NotificationsPage";
import TimetablePage from "./pages/student/TimetablePage";
import StudyMaterialsPage from "./pages/student/StudyMaterialsPage";
import StudentReportCardsPage from "./pages/student/ReportCardsPage";
import ExamSchedulePage from "./pages/student/ExamSchedulePage";

const adminNav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/teachers", label: "Teachers", icon: GraduationCap },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/classes", label: "Classes", icon: Layers },
  { to: "/admin/subjects", label: "Subjects", icon: BookOpen },
  { to: "/admin/exams", label: "Exams", icon: ListChecks },
  { to: "/admin/timetable", label: "Timetable", icon: CalendarClock },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/attendance-imports", label: "Attendance Imports", icon: UserCheck },
  { to: "/admin/change-requests", label: "Change Requests", icon: ClipboardList },
  { to: "/admin/school", label: "School Settings", icon: School },
];

const teacherNav = [
  { to: "/teacher", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/teacher/classes", label: "My Classes", icon: Layers },
  { to: "/teacher/students", label: "Students", icon: Users },
  { to: "/teacher/attendance", label: "Attendance", icon: UserCheck },
  { to: "/teacher/marks", label: "Marks Entry", icon: ClipboardList },
  { to: "/teacher/materials", label: "Materials", icon: BookOpen },
  { to: "/teacher/report-cards", label: "Report Cards", icon: FileDown },
  { to: "/teacher/notifications", label: "Notifications", icon: Bell },
  { to: "/teacher/change-requests", label: "Change Requests", icon: ClipboardList },
];

const studentNav = [
  { to: "/student", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/student/attendance", label: "Attendance", icon: UserCheck },
  { to: "/student/marks", label: "Marks", icon: ClipboardList },
  { to: "/student/timetable", label: "Timetable", icon: CalendarDays },
  { to: "/student/materials", label: "Study Materials", icon: BookOpen },
  { to: "/student/report-cards", label: "Report Cards", icon: FileDown },
  { to: "/student/exam-schedule", label: "Exam Schedule", icon: FileText },
  { to: "/student/notifications", label: "Notifications", icon: Bell },
  { to: "/student/profile", label: "My Profile", icon: Users },
];

export default function App() {
  return (
    <Routes>
      {/* No PUBLIC role/landing page — login is the only unauthenticated screen */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
        <Route element={<AppLayout navItems={adminNav} roleLabel="Admin" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/teachers" element={<TeacherListPage />} />
          <Route path="/admin/students" element={<StudentListPage />} />
          <Route path="/admin/classes" element={<ClassListPage />} />
          <Route path="/admin/subjects" element={<SubjectListPage />} />
          <Route path="/admin/exams" element={<ExamManagementPage />} />
          <Route path="/admin/timetable" element={<TimetableBuilderPage />} />
          <Route path="/admin/notifications" element={<NotificationsComposePage />} />
          <Route path="/admin/attendance-imports" element={<AdminAttendanceHistoryPage />} />
          <Route path="/admin/change-requests" element={<AdminChangeRequestsPage />} />
          <Route path="/admin/school" element={<SchoolSettingsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["TEACHER"]} />}>
        <Route element={<AppLayout navItems={teacherNav} roleLabel="Teacher" />}>
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/classes" element={<MyClassesPage />} />
          <Route path="/teacher/students" element={<StudentsPage />} />
          <Route path="/teacher/students/:id" element={<StudentProfilePage />} />
          <Route path="/teacher/attendance" element={<AttendanceImportPage />} />
          <Route path="/teacher/marks" element={<MarksEntryPage />} />
          <Route path="/teacher/materials" element={<TeacherMaterialsPage />} />
          <Route path="/teacher/report-cards" element={<TeacherReportCardsPage />} />
          <Route path="/teacher/notifications" element={<NotificationsPage />} />
          <Route path="/teacher/notices" element={<Navigate to="/teacher/notifications" replace />} />
          <Route path="/teacher/change-requests" element={<ChangeRequestsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["STUDENT"]} />}>
        <Route element={<AppLayout navItems={studentNav} roleLabel="Student" />}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/attendance" element={<MyAttendancePage />} />
          <Route path="/student/marks" element={<MyMarksPage />} />
          <Route path="/student/profile" element={<MyProfilePage />} />
          <Route path="/student/profile/change-request" element={<ChangeRequestFormPage />} />
          <Route path="/student/notifications" element={<NotificationsPage />} />
          <Route path="/student/timetable" element={<TimetablePage />} />
          <Route path="/student/materials" element={<StudyMaterialsPage />} />
          <Route path="/student/report-cards" element={<StudentReportCardsPage />} />
          <Route path="/student/exam-schedule" element={<ExamSchedulePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}