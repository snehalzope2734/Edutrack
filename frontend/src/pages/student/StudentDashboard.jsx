import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import {
  Bell,
  ChartBar,
  BookOpen,
  CalendarDays,
  Sparkles,
  Trophy,
  ClipboardList,
  ClipboardCheck,
  Clock3,
  Paperclip,
  Loader2,
  ArrowRight,
  Star,
  ShieldCheck,
  SunMedium,
  Moon,
  ChevronRight,
  FileText,
} from "lucide-react";
import {
  addDays,
  differenceInDays,
  format,
  formatDistanceToNowStrict,
  isAfter,
  parse,
  parseISO,
  startOfDay,
} from "date-fns";

import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { userApi } from "../../api/userApi";
import { studentApi } from "../../api/studentApi";
import { attendanceApi } from "../../api/attendanceApi";
import { marksApi } from "../../api/marksApi";
import { materialApi } from "../../api/materialApi";
import { notificationApi } from "../../api/notificationApi";
import { reportCardApi } from "../../api/reportCardApi";
import { adminApi } from "../../api/adminApi";
import { examApi } from "../../api/examApi";

const ATTENDANCE_RING = {
  green: "from-emerald-400 to-emerald-600",
  yellow: "from-amber-400 to-amber-600",
  red: "from-rose-400 to-rose-600",
};

function parseTime(value) {
  if (!value) return null;
  const parsed = parse(value, "HH:mm", new Date());
  return isNaN(parsed.getTime()) ? null : parsed;
}

function themeOptionLabel(name) {
  return name === "system" ? "System" : name === "dark" ? "Dark" : "Light";
}

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [marks, setMarks] = useState(null);
  const [weeklyRecords, setWeeklyRecords] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [materialsCount, setMaterialsCount] = useState(0);
  const [assignments, setAssignments] = useState([]);
  const [reportCards, setReportCards] = useState([]);
  const [examSchedule, setExamSchedule] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [theme, setTheme] = useState("system");
  const [loading, setLoading] = useState(true);
  const [showCustomize, setShowCustomize] = useState(false);
  const [visibleSections, setVisibleSections] = useState({
    weeklyAttendance: true,
    marksPerformance: true,
    todayTimetable: true,
    recentNotifications: true,
    studyMaterials: true,
    upcomingEvents: true,
    reportCard: true,
    academicProgress: true,
    achievements: true,
  });

  const navigate = useNavigate();

  useEffect(() => {
    const stored = window.localStorage.getItem("dashboard-theme");
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    const syncTheme = () => {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const useDark = theme === "dark" || (theme === "system" && prefersDark);
      document.documentElement.classList.toggle("dark", useDark);
    };

    syncTheme();
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => syncTheme();
    mediaQuery.addEventListener?.("change", listener);
    return () => mediaQuery.removeEventListener?.("change", listener);
  }, [theme]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [userRes, meRes] = await Promise.all([userApi.me(), studentApi.me()]);
        const userData = userRes.data;
        const meData = meRes.data;

        setUser(userData);
        setMe(meData);

        const start = format(addDays(startOfDay(new Date()), -6), "yyyy-MM-dd");
        const end = format(new Date(), "yyyy-MM-dd");

        const [attendanceRes, marksRes, recordsRes, notifsRes, materialsRes, assignmentsRes, reportCardRes, timetableRes, examRes] =
          await Promise.all([
            attendanceApi.studentSummary(meData.studentId),
            marksApi.studentSummary(meData.studentId),
            attendanceApi.studentRecords(meData.studentId, { from: start, to: end }),
            notificationApi.list({ page: 0, size: 5 }),
            materialApi.list({ classId: meData.classId, page: 0, size: 6 }),
            materialApi.list({ classId: meData.classId, type: "assignment", page: 0, size: 6 }),
            reportCardApi.listForStudent(meData.studentId),
            adminApi.getTimetable(meData.classId),
            examApi.listSchedule(meData.classId),
          ]);

        setAttendance(attendanceRes.data);
        setMarks(marksRes.data);
        setWeeklyRecords(recordsRes.data || []);
        setNotifications(notifsRes.data.content ?? []);
        setMaterials(materialsRes.data.content ?? []);
        setMaterialsCount(materialsRes.data.totalElements ?? materialsRes.data.content?.length ?? 0);
        setAssignments(assignmentsRes.data.content ?? []);
        setReportCards(reportCardRes.data ?? []);
        setTimetable(timetableRes.data ?? []);
        setExamSchedule(examRes.data ?? []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const attendancePercent = Number(attendance?.overall ?? 0);
  const marksPercent = Number(marks?.overall ?? 0);
  const unreadNotifications = notifications.filter((item) => !item.isReadBy?.includes(user?.userId)).length;
  const assignmentCount = assignments.length;
  const subjectCount = marks?.subjectWise?.length ?? 0;
  const actionCards = useMemo(
    () => [
      { label: "View Timetable", icon: CalendarDays, route: "/student/timetable" },
      { label: "View Report Card", icon: FileText, route: "/student/report-cards" },
      { label: "Study Materials", icon: BookOpen, route: "/student/materials", count: materialsCount },
      { label: "Attendance", icon: ClipboardList, route: "/student/attendance" },
      { label: "Marks", icon: ChartBar, route: "/student/marks" },
      { label: "Exam Schedule", icon: Clock3, route: "/student/exam-schedule" },
    ],
    [materialsCount]
  );

  const nextExam = useMemo(() => {
    return examSchedule
      .map((exam) => ({ ...exam, dateTime: exam.examDate ? parseISO(exam.examDate) : null }))
      .filter((exam) => exam.dateTime && isAfter(exam.dateTime, new Date()))
      .sort((a, b) => a.dateTime - b.dateTime)[0];
  }, [examSchedule]);

  const heroCards = useMemo(
    () => [
      {
        label: "Attendance",
        value: `${attendancePercent.toFixed(0)}%`,
        sub: "Present Today",
        icon: ShieldCheck,
        action: "/student/attendance",
        bg: "from-emerald-400 to-emerald-600",
      },
      {
        label: "Overall Marks",
        value: `${marksPercent.toFixed(0)}%`,
        sub: "Average score",
        icon: ChartBar,
        action: "/student/marks",
        bg: "from-sky-400 to-blue-600",
      },
      {
        label: "Upcoming Exams",
        value: String(examSchedule.filter((item) => item.examDate && isAfter(parseISO(item.examDate), new Date())).length),
        sub: nextExam ? `${differenceInDays(parseISO(nextExam.examDate), new Date())} days left` : "No upcoming exams",
        icon: CalendarDays,
        action: "/student/exam-schedule",
        bg: "from-amber-400 to-orange-500",
      },
      {
        label: "Notifications",
        value: String(unreadNotifications),
        sub: "Unread updates",
        icon: Bell,
        action: "/student/notifications",
        bg: "from-violet-400 to-fuchsia-600",
      },
    ],
    [attendancePercent, marksPercent, examSchedule, nextExam, unreadNotifications]
  );

  const weeklyAttendance = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, idx) => addDays(startOfDay(new Date()), idx - 6));
    return days.map((day) => {
      const sameDay = weeklyRecords.filter((record) => format(new Date(record.date), "yyyy-MM-dd") === format(day, "yyyy-MM-dd"));
      const status = sameDay.some((r) => r.status === "A")
        ? "Absent"
        : sameDay.some((r) => r.status === "L")
        ? "Late"
        : sameDay.some((r) => r.status === "P")
        ? "Present"
        : "No record";
      return { label: format(day, "EEE"), status, count: sameDay.length ? 100 : 20 };
    });
  }, [weeklyRecords]);

  const marksData = useMemo(
    () =>
      (marks?.subjectWise ?? []).map((item) => ({
        subject: item.subjectName,
        percentage: item.maxMarks ? Number(((Number(item.marks ?? 0) / Number(item.maxMarks)) * 100).toFixed(0)) : 0,
        score: `${Number(item.marks ?? 0)}/${item.maxMarks ?? "—"}`,
      })),
    [marks]
  );

  const todayName = format(new Date(), "EEEE");
  const todaySlots = useMemo(
    () =>
      timetable
        .filter((slot) => slot.dayOfWeek === todayName)
        .map((slot) => ({ ...slot, startAt: parseTime(slot.startTime), endAt: parseTime(slot.endTime) }))
        .sort((a, b) => (a.startAt?.getTime() || 0) - (b.startAt?.getTime() || 0)),
    [timetable, todayName]
  );

  const currentPeriod = useMemo(
    () => todaySlots.find((slot) => slot.startAt && slot.endAt && new Date() >= slot.startAt && new Date() <= slot.endAt),
    [todaySlots]
  );
  const nextPeriod = useMemo(() => todaySlots.find((slot) => slot.startAt && new Date() < slot.startAt), [todaySlots]);

  const upcomingExams = useMemo(
    () =>
      examSchedule
        .map((exam) => ({ ...exam, examDateTime: exam.examDate ? parseISO(exam.examDate) : null }))
        .filter((exam) => exam.examDateTime && isAfter(exam.examDateTime, new Date()))
        .sort((a, b) => a.examDateTime - b.examDateTime)
        .slice(0, 3),
    [examSchedule]
  );

  const latestReport = useMemo(
    () =>
      [...reportCards]
        .sort((a, b) => new Date(b.uploadedAt || b.createdAt || 0) - new Date(a.uploadedAt || a.createdAt || 0))
        .shift(),
    [reportCards]
  );

  const latestMaterials = materials.slice(0, 4);

  const timelineItems = useMemo(() => {
    const notificationItems = notifications.map((item) => ({
      id: item.id,
      date: item.createdAt ? parseISO(item.createdAt) : new Date(),
      title: item.title,
      detail: item.type || "Notification",
      icon: Bell,
    }));
    const materialItems = latestMaterials.map((item) => ({
      id: item.id,
      date: item.uploadedAt ? parseISO(item.uploadedAt) : new Date(),
      title: item.title,
      detail: item.type ? `${item.type} uploaded` : "Study material",
      icon: BookOpen,
    }));
    const examItems = upcomingExams.map((exam) => ({
      id: exam.id,
      date: exam.examDateTime || new Date(),
      title: exam.subjectName || "Exam",
      detail: exam.examTypeName || "Scheduled exam",
      icon: CalendarDays,
    }));
    return [...notificationItems, ...materialItems, ...examItems]
      .sort((a, b) => b.date - a.date)
      .slice(0, 6);
  }, [notifications, latestMaterials, upcomingExams]);

  const academicProgress = useMemo(
    () => [
      { label: "Attendance", value: attendancePercent, suffix: "%" },
      { label: "Marks", value: marksPercent, suffix: "%" },
      { label: "Assignments", value: Math.min((assignmentCount / 8) * 100, 100), suffix: `${assignmentCount}/8` },
      { label: "Subjects", value: subjectCount ? Math.min((subjectCount / 10) * 100, 100) : 0, suffix: String(subjectCount) },
    ],
    [attendancePercent, marksPercent, assignmentCount, subjectCount]
  );

  const attendanceRingClass = attendancePercent >= 90 ? ATTENDANCE_RING.green : attendancePercent >= 75 ? ATTENDANCE_RING.yellow : ATTENDANCE_RING.red;

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
    window.localStorage.setItem("dashboard-theme", next);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-48 rounded-[2rem] bg-slate-200 shadow-sm animate-pulse dark:bg-slate-800" />
        <div className="grid gap-6 lg:grid-cols-4">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="h-40 rounded-[2rem] bg-slate-200 shadow-sm animate-pulse dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-8 pb-10 bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-[1.75rem] bg-slate-100 text-slate-600 dark:bg-slate-800">
                {user?.profilePhotoUrl ? (
                  <img src={user.profilePhotoUrl} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-2xl font-semibold text-slate-500">
                    {user?.name?.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Welcome back</p>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">👋 Good Morning, {user?.name || "Student"}</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Class {me?.className || "—"} · Roll No. {me?.rollNumber || "—"}</p>
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Today is {format(new Date(), "EEEE, d MMMM yyyy")}</p>
              <p className="mt-2">Your personalized school dashboard has all key details in one place. Track attendance, marks, timetable and study resources at a glance.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-between xl:justify-end">
            <button
              onClick={() => setShowCustomize((value) => !value)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <Sparkles className="h-4 w-4" />
              Customize
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
            >
              {theme === "dark" ? <Moon className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
              {themeOptionLabel(theme)} Mode
            </button>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/20">
              <Trophy className="h-4 w-4" />
              Top Learner
            </div>
          </div>
        </div>

        {showCustomize && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Object.keys(visibleSections).map((sectionKey) => (
              <button
                key={sectionKey}
                type="button"
                onClick={() => setVisibleSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }))}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  visibleSections[sectionKey]
                    ? "border-brand-300 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold capitalize">{sectionKey.replace(/([A-Z])/g, " $1")}</span>
                  <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {visibleSections[sectionKey] ? "Visible" : "Hidden"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr,1fr]">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {heroCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => navigate(card.action)}
                  className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:from-slate-900 dark:to-slate-950"
                >
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br ${card.bg} text-white shadow-lg transition group-hover:scale-105`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-6 text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{card.value}</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{card.sub}</p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-brand-600 dark:text-brand-300">
                    View details <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              );
            })}
          </div>

          {visibleSections.weeklyAttendance && (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Weekly Attendance</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">At a glance</h2>
                </div>
                <span className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">Last 7 days</span>
              </div>
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={weeklyAttendance} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="attendanceArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b" }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: 18, border: "1px solid #cbd5e1", backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff" }} />
                    <Area type="monotone" dataKey="count" stroke="#4f46e5" fill="url(#attendanceArea)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="grid gap-3 sm:grid-cols-3">
                  {weeklyAttendance.map((item) => (
                    <div key={item.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{item.label}</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{item.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {visibleSections.marksPerformance && (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Marks Performance</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Subject progress</h2>
                </div>
                <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{subjectCount} subjects</div>
              </div>
              <div className="grid gap-4 lg:grid-cols-[1fr,240px]">
                <div className="space-y-4">
                  {marksData.length === 0 ? (
                    <EmptyState title="No marks found" />
                  ) : (
                    marksData.slice(0, 4).map((item) => (
                      <div key={item.subject} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{item.subject}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{item.score}</p>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                          <div className="h-2 rounded-full bg-brand-500" style={{ width: `${item.percentage}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Progress chart</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={marksData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                      <XAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="percentage" fill="#2563eb" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {visibleSections.todayTimetable && (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Today's Timetable</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Your schedule for {todayName}</h2>
                </div>
                <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{todaySlots.length} periods</div>
              </div>
              {todaySlots.length === 0 ? (
                <EmptyState title="No classes scheduled today" />
              ) : (
                <div className="space-y-3">
                  {todaySlots.map((slot) => {
                    const isCurrent = currentPeriod?.id === slot.id;
                    const isNext = !isCurrent && nextPeriod?.id === slot.id;
                    return (
                      <div
                        key={slot.id}
                        className={`rounded-3xl border p-4 transition ${
                          isCurrent
                            ? "border-brand-500/30 bg-brand-50 dark:border-brand-400/20 dark:bg-brand-500/10"
                            : isNext
                            ? "border-amber-300/40 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10"
                            : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Period {slot.periodNumber}: {slot.subjectName}</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{slot.startTime} – {slot.endTime}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {isCurrent ? "Current" : isNext ? "Next" : "Upcoming"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {visibleSections.recentNotifications && (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Recent Notifications</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">What matters right now</h2>
                </div>
                <span className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{unreadNotifications} unread</span>
              </div>
              {notifications.length === 0 ? (
                <EmptyState title="No notifications yet" />
              ) : (
                <ul className="space-y-3">
                  {notifications.map((item) => (
                    <li key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{item.message}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {item.type || "Info"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Attendance Circle</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Today’s attendance</h2>
              </div>
            </div>
            <div className="mt-8 flex items-center justify-center">
              <div className={`relative flex h-44 w-44 items-center justify-center rounded-full bg-slate-100 text-slate-900 shadow-inner dark:bg-slate-950 dark:text-slate-100`}>
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${attendanceRingClass} opacity-30 blur-2xl`} />
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-white text-center dark:bg-slate-900">
                  <p className="text-4xl font-semibold text-slate-900 dark:text-slate-100">{attendancePercent.toFixed(0)}%</p>
                </div>
              </div>
            </div>
            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">Your attendance is {attendancePercent >= 90 ? "excellent" : attendancePercent >= 75 ? "stable" : "at risk"} this term.</p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Upcoming Exams</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">What’s next</h2>
              </div>
              <button onClick={() => navigate("/student/exam-schedule")} className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                View all <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {upcomingExams.length === 0 ? (
              <EmptyState title="No upcoming exams" />
            ) : (
              <div className="space-y-4">
                {upcomingExams.map((exam) => (
                  <div key={exam.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{exam.subjectName || "Exam"}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{exam.examTypeName || "Scheduled exam"}</p>
                      </div>
                      <span className="rounded-2xl bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">{format(parseISO(exam.examDate), "d MMM")}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-400 sm:grid-cols-2">
                      <div><span className="font-semibold">Time:</span> {exam.startTime || "TBA"}</div>
                      <div><span className="font-semibold">Venue:</span> {exam.venue || "Room 201"}</div>
                      <div><span className="font-semibold">Countdown:</span> {differenceInDays(parseISO(exam.examDate), new Date())} days left</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {visibleSections.studyMaterials && (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Study Materials</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Latest uploads</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-brand-600/10 px-3 py-1 text-sm font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                    {materialsCount} available
                  </span>
                  <button onClick={() => navigate("/student/materials")} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                    Browse all
                  </button>
                </div>
              </div>
              {latestMaterials.length === 0 ? (
                <EmptyState title="No recent materials" />
              ) : (
                <ul className="space-y-3">
                  {latestMaterials.map((item) => (
                    <li key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-start gap-4">
                        <div className="rounded-3xl bg-brand-600/10 p-3 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                          <Paperclip className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.type || "Material"} · {item.fileType?.toUpperCase() || "FILE"}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.uploadedAt ? formatDistanceToNowStrict(parseISO(item.uploadedAt), { addSuffix: true }) : "Just now"}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Report Card</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Latest result</h2>
                </div>
                <Trophy className="h-6 w-6 text-brand-600" />
              </div>
              {latestReport ? (
                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{latestReport.examTypeName || "Report Card"}</p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{latestReport.academicYear || "Current year"}</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button onClick={() => window.open(latestReport.pdfUrl, "_blank")} className="flex-1 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700">
                      View Report Card
                    </button>
                    <button onClick={() => window.open(latestReport.pdfUrl, "_blank")} className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900">
                      Download PDF
                    </button>
                  </div>
                </div>
              ) : (
                <EmptyState title="No report cards yet" />
              )}
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Motivation</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Daily inspiration</h2>
                </div>
                <Sparkles className="h-6 w-6 text-amber-500" />
              </div>
              <div className="rounded-[1.5rem] bg-gradient-to-br from-slate-900 to-brand-600 p-6 text-white shadow-2xl">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Keep going</p>
                <p className="mt-4 text-2xl font-semibold">Attendance above 90% — you're on track for a great term.</p>
                <p className="mt-4 text-sm text-slate-200">Complete your pending assignments and review today’s classes to stay ahead.</p>
              </div>
            </div>
          </div>

          {visibleSections.academicProgress && (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Academic Progress</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Your current status</h2>
                </div>
                <span className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">Updated now</span>
              </div>
              <div className="space-y-4">
                {academicProgress.map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{item.label}</p>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{item.suffix}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                      <div className="h-2 rounded-full bg-brand-500" style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {visibleSections.achievements && (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Achievements</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Badges earned</h2>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Perfect Attendance", icon: Star, tone: "bg-amber-50 text-amber-700" },
                  { label: "Top Performer", icon: Trophy, tone: "bg-emerald-50 text-emerald-700" },
                  { label: "Assignment Master", icon: ClipboardCheck, tone: "bg-sky-50 text-sky-700" },
                  { label: "Science Champion", icon: BookOpen, tone: "bg-fuchsia-50 text-fuchsia-700" },
                ].map((badge) => (
                  <div key={badge.label} className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className={`mb-4 inline-flex rounded-3xl px-3 py-2 text-sm font-semibold ${badge.tone}`}>
                      <badge.icon className="h-4 w-4" />
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{badge.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Quick Actions</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Jump to tools</h2>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {actionCards.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(action.route)}
                className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                <action.icon className="h-5 w-5 text-brand-600" />
                <span>{action.label}</span>
                {action.count != null && (
                  <span className="ml-auto rounded-full bg-brand-600/10 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                    {action.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Upcoming Events</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Calendar preview</h2>
            </div>
          </div>
          {upcomingExams.length === 0 ? (
            <EmptyState title="No events scheduled" />
          ) : (
            <div className="space-y-4">
              {upcomingExams.map((event) => (
                <div key={event.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{format(parseISO(event.examDate), "d MMM")}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{event.subjectName || "Exam"}</p>
                    </div>
                    <span className="rounded-2xl bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">{event.examTypeName || "Exam"}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{event.startTime || "TBA"} · {event.venue || "Room 201"}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Homework</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Pending assignments</h2>
            </div>
            <span className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{assignmentCount} items</span>
          </div>
          {assignments.length === 0 ? (
            <EmptyState title="No pending assignments" />
          ) : (
            <ul className="space-y-3">
              {assignments.slice(0, 4).map((item) => {
                const dueDays = item.uploadedAt ? differenceInDays(addDays(parseISO(item.uploadedAt), 7), new Date()) : 0;
                return (
                  <li key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Due {dueDays > 0 ? `${dueDays} days` : "Soon"}</p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">{item.type || "Assignment"}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
