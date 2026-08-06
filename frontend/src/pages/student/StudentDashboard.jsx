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
  ClipboardList,
  Clock3,
  Paperclip,
  Loader2,
  ArrowRight,
  ShieldCheck,
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

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [marks, setMarks] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [materialsCount, setMaterialsCount] = useState(0);
  const [assignments, setAssignments] = useState([]);
  const [examSchedule, setExamSchedule] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const navigate = useNavigate();

  const loadDashboard = async () => {
    setLoading(true);
    setApiError("");
    try {
      const [userRes, meRes] = await Promise.all([userApi.me(), studentApi.me()]);
      const userData = userRes.data;
      const meData = meRes.data;

      setUser(userData);
      setMe(meData);

      const start = format(addDays(startOfDay(new Date()), -6), "yyyy-MM-dd");
      const end = format(new Date(), "yyyy-MM-dd");

      const results = await Promise.allSettled([
        attendanceApi.studentSummary(meData.studentId),
        marksApi.studentSummary(meData.studentId),
        notificationApi.list({ page: 0, size: 5 }),
        materialApi.list({ classId: meData.classId, page: 0, size: 6 }),
        materialApi.list({ classId: meData.classId, type: "assignment", page: 0, size: 6 }),
        adminApi.getTimetable(meData.classId),
        examApi.listSchedule(meData.classId),
      ]);

      const [attendanceRes, marksRes, notifsRes, materialsRes, assignmentsRes, timetableRes, examRes] = results;
      const failedSections = [];

      if (attendanceRes.status === "fulfilled") {
        setAttendance(attendanceRes.value.data);
      } else {
        console.error("Attendance load failed", attendanceRes.reason);
        failedSections.push("attendance");
      }

      if (marksRes.status === "fulfilled") {
        setMarks(marksRes.value.data);
      } else {
        console.error("Marks load failed", marksRes.reason);
        failedSections.push("marks");
      }

      if (notifsRes.status === "fulfilled") {
        setNotifications(notifsRes.value.data.content ?? []);
      } else {
        console.error("Notifications load failed", notifsRes.reason);
        failedSections.push("notifications");
      }

      if (materialsRes.status === "fulfilled") {
        setMaterials(materialsRes.value.data.content ?? []);
        setMaterialsCount(materialsRes.value.data.totalElements ?? materialsRes.value.data.content?.length ?? 0);
      } else {
        console.error("Materials load failed", materialsRes.reason);
        failedSections.push("materials");
      }

      if (assignmentsRes.status === "fulfilled") {
        setAssignments(assignmentsRes.value.data.content ?? []);
      } else {
        console.error("Assignments load failed", assignmentsRes.reason);
        failedSections.push("assignments");
      }

      if (timetableRes.status === "fulfilled") {
        setTimetable(timetableRes.value.data ?? []);
      } else {
        console.error("Timetable load failed", timetableRes.reason);
        failedSections.push("timetable");
      }

      if (examRes.status === "fulfilled") {
        setExamSchedule(examRes.value.data ?? []);
      } else {
        console.error("Exam schedule load failed", examRes.reason);
        failedSections.push("exam schedule");
      }

      if (failedSections.length > 0) {
        setApiError(`Some dashboard data could not be loaded: ${failedSections.join(", ")}. Please refresh or try again later.`);
      }
    } catch (error) {
      console.error(error);
      setApiError("Unable to load student dashboard. Please refresh or try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      { label: "View Report Card", icon: FileText, route: "/student/marks" },
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

  const isDarkTheme = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

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
    <div className="relative min-h-screen space-y-8 pb-10 bg-slate-50/95 px-4 py-6 text-slate-900 dark:bg-slate-950/95 dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-2xl shadow-slate-200/20 backdrop-blur-xl transition duration-200 dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-slate-950/40">
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
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/95 p-5 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Today is {format(new Date(), "EEEE, d MMMM yyyy")}</p>
              <p className="mt-2">Your personalized school dashboard has all key details in one place. Track attendance, marks, timetable and study resources at a glance.</p>
            </div>
          </div>

        </div>
      </div>

      {apiError && (
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-900 shadow-sm dark:border-rose-800 dark:bg-rose-950/90 dark:text-rose-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>{apiError}</p>
            <button
              type="button"
              onClick={loadDashboard}
              className="inline-flex items-center justify-center rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}

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
                  className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-2xl dark:border-slate-800 dark:from-slate-900 dark:to-slate-950"
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

      </div>
    </div>
  );
}
