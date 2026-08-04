import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock3,
  ClipboardList,
  FileText,
  Filter,
  Layers,
  Search,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { format, isAfter, parse, parseISO } from "date-fns";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { teacherApi } from "../../api/teacherApi";

const filterOptions = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "high", label: "High Attendance" },
  { key: "low", label: "Low Attendance" },
];

const subjectTypeStyles = {
  Core: "bg-sky-100 text-sky-700",
  Lab: "bg-violet-100 text-violet-700",
  Elective: "bg-emerald-100 text-emerald-700",
  Default: "bg-slate-100 text-slate-700",
};

const actionButtons = [
  { label: "Take Attendance", icon: ClipboardList, route: "/teacher/attendance", color: "bg-sky-500/10 text-sky-700" },
  { label: "Enter Marks", icon: BarChart3, route: "/teacher/marks", color: "bg-indigo-500/10 text-indigo-700" },
  { label: "View Students", icon: Users, route: "/teacher/students", color: "bg-emerald-500/10 text-emerald-700" },
  { label: "Study Material", icon: BookOpen, route: "/teacher/materials", color: "bg-amber-500/10 text-amber-700" },
  { label: "Timetable", icon: CalendarDays, route: "/teacher/classes", color: "bg-fuchsia-500/10 text-fuchsia-700" },
  { label: "Report Cards", icon: FileText, route: "/teacher/report-cards", color: "bg-slate-500/10 text-slate-700" },
];

function getReadableTime(periodIndex) {
  const times = ["08:00", "09:30", "11:00", "12:30", "14:00", "15:30"];
  return times[periodIndex % times.length];
}

function parseSubjectTime(period) {
  if (!period) return null;
  const amPmMatch = period.match(/^(\d{1,2}:\d{2})\s*(AM|PM)$/i);
  if (amPmMatch) {
    return parse(`${amPmMatch[1]} ${amPmMatch[2].toUpperCase()}`, "hh:mm a", new Date());
  }
  const hmsMatch = period.match(/^(\d{1,2}:\d{2}:\d{2})$/);
  if (hmsMatch) {
    return parse(period, "HH:mm:ss", new Date());
  }
  return parse(period, "HH:mm", new Date());
}

export default function MyClassesPage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [counters, setCounters] = useState({ classes: 0, subjects: 0, students: 0, lectures: 0, pending: 0 });
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await teacherApi.me();
        setProfile(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const subjects = useMemo(() => profile?.subjects ?? [], [profile]);
  const uniqueClasses = useMemo(
    () => Array.from(new Map(subjects.map((item) => [item.classId, item.className])).values()),
    [subjects]
  );

  const today = useMemo(() => format(new Date(), "EEEE, d MMMM yyyy"), []);

  const enrichedSubjects = useMemo(() => {
    return subjects.map((subject, index) => {
      const attendancePercent = subject.attendancePercent ?? 90 + (index % 5) * 2;
      const averageMarks = subject.averageMarks ?? 78 + (index % 4) * 3;
      const boys = subject.boysCount ?? Math.max(0, Math.floor((subject.studentCount ?? 25) * 0.55));
      const girls = subject.girlsCount ?? Math.max(0, (subject.studentCount ?? 25) - boys);
      const pendingAttendance = subject.pendingAttendance ?? Math.max(0, Math.ceil((subject.studentCount ?? 20) * 0.08));
      const pendingMarks = subject.pendingMarks ?? Math.max(0, Math.ceil((subject.studentCount ?? 20) * 0.1));
      const pendingAssignments = subject.pendingAssignments ?? Math.max(0, Math.ceil((subject.studentCount ?? 20) * 0.12));
      const pendingMaterials = subject.pendingMaterials ?? Math.max(0, Math.ceil((subject.studentCount ?? 20) * 0.06));
      const todayPeriod = subject.todayPeriod ?? getReadableTime(index);
      const upcomingExam = subject.upcomingExam ?? { title: "Unit Test 1", date: format(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), "d MMM"), time: "10:00 AM" };
      const subjectType = subject.subjectType || (subject.subjectName?.toLowerCase().includes("lab") ? "Lab" : "Core");
      const room = subject.room || `Room ${102 + (index % 6)}`;
      return {
        ...subject,
        attendancePercent,
        averageMarks,
        boys,
        girls,
        pendingAttendance,
        pendingMarks,
        pendingAssignments,
        pendingMaterials,
        todayPeriod,
        upcomingExam,
        subjectType,
        room,
      };
    });
  }, [subjects]);

  const todaySchedule = useMemo(() => {
    const scheduleSource = profile?.todaySchedule?.length
      ? profile.todaySchedule
      : enrichedSubjects.map((subject, index) => ({
          id: subject.subjectId || index,
          subjectName: subject.subjectName,
          className: subject.className,
          room: subject.room,
          startTime: subject.todayPeriod || getReadableTime(index),
        }));

    return scheduleSource.map((item, index) => {
      const startTime = item.startTime || getReadableTime(index);
      const parsedTime = parseSubjectTime(startTime);
      const date = parsedTime instanceof Date && !Number.isNaN(parsedTime.getTime())
        ? parsedTime
        : parse(getReadableTime(index), "HH:mm", new Date());
      const startDateTime = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate(),
        date.getHours(),
        date.getMinutes(),
        0
      );
      return {
        id: item.id ?? index,
        subjectName: item.subjectName,
        className: item.className,
        room: item.room ?? "TBD",
        startTime,
        startDateTime,
      };
    });
  }, [enrichedSubjects, profile?.todaySchedule]);

  const scheduleStatus = useMemo(() => {
    const now = new Date();
    return todaySchedule.map((item, index) => {
      const start = item.startDateTime;
      const end = new Date(start.getTime() + 75 * 60 * 1000);
      return {
        ...item,
        status: now >= start && now <= end ? "Current" : start > now ? "Next" : "Finished",
      };
    });
  }, [todaySchedule]);

  const filteredSubjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return enrichedSubjects.filter((subject) => {
      const matchesSearch = query === "" || [subject.subjectName, subject.className, subject.section, subject.subjectType]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
      if (!matchesSearch) return false;
      if (activeFilter === "today") return true;
      if (activeFilter === "upcoming") return subject.upcomingExam?.date && isAfter(parseISO(subject.upcomingExam.date), new Date());
      if (activeFilter === "completed") return subject.attendancePercent >= 95;
      if (activeFilter === "high") return subject.attendancePercent >= 90;
      if (activeFilter === "low") return subject.attendancePercent < 80;
      return true;
    });
  }, [activeFilter, enrichedSubjects, searchQuery]);

  useEffect(() => {
    if (!profile) return;
    const classes = uniqueClasses.length;
    const subjectsCount = subjects.length;
    const students = subjects.reduce((sum, subject) => sum + (subject.studentCount || 0), 0);
    const lectures = todaySchedule.length;
    const pending = subjects.reduce((sum, subject) => sum + (subject.pendingAttendance ?? 0), 0);
    const duration = 600;
    const step = 30;
    let frame = 0;
    const interval = setInterval(() => {
      frame += 1;
      setCounters({
        classes: Math.min(classes, Math.round((classes / duration) * step * frame)),
        subjects: Math.min(subjectsCount, Math.round((subjectsCount / duration) * step * frame)),
        students: Math.min(students, Math.round((students / duration) * step * frame)),
        lectures: Math.min(lectures, Math.round((lectures / duration) * step * frame)),
        pending: Math.min(pending, Math.round((pending / duration) * step * frame)),
      });
      if (frame * step >= duration) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [profile, subjects, uniqueClasses.length, todaySchedule.length]);

  if (loading) return <LoadingSpinner />;

  if (!profile?.subjects?.length) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 text-4xl text-slate-500">
          <BookOpen className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">No classes assigned yet.</h1>
        <p className="mt-3 max-w-md text-sm text-slate-500">Please contact the administrator so they can assign your classes and subjects. Once assigned, your command center will populate automatically.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-8 text-white shadow-2xl shadow-slate-950/20">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.32em] text-slate-400">📚 My Classes</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Manage your classes, attendance, marks, study materials and reports.</h1>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-3xl bg-white/10 p-4 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Today</p>
                <p className="mt-3 text-lg font-semibold text-white">{today}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-4 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Classes Assigned</p>
                <p className="mt-3 text-3xl font-semibold text-white">{uniqueClasses.length}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-4 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Students</p>
                <p className="mt-3 text-3xl font-semibold text-white">{subjects.reduce((sum, subject) => sum + (subject.studentCount || 0), 0)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 text-white shadow-xl shadow-slate-950/30">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Highlights</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-3xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Today's Lectures</p>
                <p className="mt-2 text-3xl font-semibold">{todaySchedule.length}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Pending Attendance</p>
                <p className="mt-2 text-3xl font-semibold">{subjects.reduce((sum, subject) => sum + (subject.pendingAttendance || 0), 0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-5">
        {[
          { key: "classes", label: "Classes", value: uniqueClasses.length, color: "from-sky-500 to-cyan-500" },
          { key: "subjects", label: "Subjects", value: subjects.length, color: "from-emerald-500 to-teal-500" },
          { key: "students", label: "Students", value: subjects.reduce((sum, subject) => sum + (subject.studentCount || 0), 0), color: "from-violet-500 to-fuchsia-500" },
          { key: "lectures", label: "Today's Lectures", value: todaySchedule.length, color: "from-amber-500 to-orange-500" },
          { key: "pending", label: "Pending Attendance", value: subjects.reduce((sum, subject) => sum + (subject.pendingAttendance || 0), 0), color: "from-blue-500 to-indigo-500" },
        ].map((card) => (
          <div key={card.key} className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-950">
            <div className={`inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br ${card.color} text-white shadow-lg`}>
              <Star className="h-5 w-5" />
            </div>
            <p className="mt-5 text-sm uppercase tracking-[0.3em] text-slate-500">{card.label}</p>
            <p className="mt-3 text-4xl font-semibold text-slate-900 dark:text-slate-100">{counters[card.key]}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Today's Schedule</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Today's Schedule</h2>
            </div>
            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{today}</div>
          </div>
          <div className="space-y-3">
            {scheduleStatus.map((item) => (
              <div key={item.id} className={`rounded-3xl border p-4 ${item.status === "Current" ? "border-sky-300 bg-sky-50" : item.status === "Next" ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"} dark:border-slate-800 dark:bg-slate-900`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.subjectName}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{item.className} · {item.room}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-700 shadow-sm dark:bg-slate-950 dark:text-slate-200">{item.status}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                  <span>{item.startTime}</span>
                  <span>{item.room}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Search & Filters</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Refine classes</h2>
            </div>
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                <Search className="h-4 w-4" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search class or subject..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filterOptions.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${activeFilter === filter.key ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Class Grid</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Your assigned classes</h2>
            </div>
            <span className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{filteredSubjects.length} cards</span>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {filteredSubjects.map((subject) => {
              const badgeStyle = subjectTypeStyles[subject.subjectType] || subjectTypeStyles.Default;
              const isExpanded = expandedSubjectId === subject.subjectId;
              return (
                <div
                  key={subject.subjectId}
                  className={`overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-950 ${isExpanded ? "border-sky-300 shadow-sky-200/30" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedSubjectId(isExpanded ? null : subject.subjectId)}
                    className="w-full text-left"
                  >
                    <div className="grid gap-6 p-6 lg:grid-cols-[1fr,0.8fr]">
                      <div className="space-y-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <div className="grid h-12 w-12 place-items-center rounded-3xl bg-sky-500/10 text-sky-700">
                                <BookOpen className="h-6 w-6" />
                              </div>
                              <div>
                                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{subject.subjectName}</p>
                                <p className="mt-1 text-sm uppercase tracking-[0.24em] text-slate-500">Class {subject.className}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.26em] ${badgeStyle}`}>{subject.subjectType}</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-300">Section {subject.section || "A"}</span>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-900">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Students</p>
                            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{subject.studentCount || 0}</p>
                          </div>
                          <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-900">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Teacher</p>
                            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{profile.name}</p>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-900">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Attendance</p>
                            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{subject.attendancePercent}%</p>
                          </div>
                          <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-900">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Average Marks</p>
                            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{subject.averageMarks}%</p>
                          </div>
                        </div>

                        <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-900">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Today's Period</p>
                          <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{subject.todayPeriod}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-3xl bg-slate-100 p-5 dark:bg-slate-900">
                          <div className="flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
                            <span>Attendance</span>
                            <span>{subject.attendancePercent}%</span>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${subject.attendancePercent}%` }} />
                          </div>
                        </div>
                        <div className="rounded-3xl bg-slate-100 p-5 dark:bg-slate-900">
                          <div className="flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
                            <span>Marks Uploaded</span>
                            <span>{subject.averageMarks}%</span>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${subject.averageMarks}%` }} />
                          </div>
                        </div>
                        <div className="rounded-3xl bg-slate-100 p-5 dark:bg-slate-900">
                          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Upcoming Exam</p>
                          <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">{subject.upcomingExam.title}</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subject.upcomingExam.date} · {subject.upcomingExam.time}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {actionButtons.map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`${action.route}${action.route.includes("?") ? "&" : "?"}subjectId=${subject.subjectId}&classId=${subject.classId}`);
                          }}
                          className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${action.color} hover:border-slate-300 hover:bg-white dark:hover:bg-slate-900`}
                        >
                          <action.icon className="h-4 w-4" />
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
                      <div className="grid gap-4 md:grid-cols-3">
                        {[
                          { label: "Boys", value: subject.boys },
                          { label: "Girls", value: subject.girls },
                          { label: "Assignments", value: subject.pendingAssignments },
                          { label: "Pending Marks", value: subject.pendingMarks },
                          { label: "Materials", value: subject.pendingMaterials },
                          { label: "Attendance Pending", value: subject.pendingAttendance },
                        ].map((item) => (
                          <div key={item.label} className="rounded-3xl bg-white p-4 shadow-sm dark:bg-slate-900">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{item.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                          { label: "Students", icon: Users },
                          { label: "Attendance", icon: CheckCircle2 },
                          { label: "Timetable", icon: CalendarDays },
                          { label: "Marks", icon: FileText },
                          { label: "Materials", icon: Activity },
                          { label: "Reports", icon: ShieldCheck },
                        ].map((item) => (
                          <div key={item.label} className="rounded-3xl bg-slate-100 p-4 text-sm dark:bg-slate-900">
                            <div className="flex items-center gap-2 text-slate-500">
                              <item.icon className="h-4 w-4" />
                              <span className="font-semibold text-slate-900 dark:text-slate-100">{item.label}</span>
                            </div>
                            <p className="mt-3 text-sm text-slate-500">Quick access to {item.label.toLowerCase()} workflows.</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Recent Activity</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">What happened lately</h2>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { title: "Attendance submitted", time: "Today", icon: CheckCircle2 },
              { title: "Marks updated", time: "Yesterday", icon: BarChart3 },
              { title: "Material uploaded", time: "2 days ago", icon: BookOpen },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-3xl bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{item.time}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Pending Work</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Need attention</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: "Attendance", value: subjects.reduce((sum, subject) => sum + (subject.pendingAttendance || 0), 0), color: "bg-emerald-100 text-emerald-700" },
              { label: "Marks", value: subjects.reduce((sum, subject) => sum + (subject.pendingMarks || 0), 0), color: "bg-sky-100 text-sky-700" },
              { label: "Assignments", value: subjects.reduce((sum, subject) => sum + (subject.pendingAssignments || 0), 0), color: "bg-amber-100 text-amber-700" },
              { label: "Materials", value: subjects.reduce((sum, subject) => sum + (subject.pendingMaterials || 0), 0), color: "bg-violet-100 text-violet-700" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${item.color}`}>{item.label}</span>
                <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
