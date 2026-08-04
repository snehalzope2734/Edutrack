import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, subDays } from "date-fns";
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Filter,
  FileText,
  Mail,
  Search,
  ShieldCheck,
  Star,
  Users,
  UserCheck,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { teacherApi } from "../../api/teacherApi";
import { attendanceApi } from "../../api/attendanceApi";
import { marksApi } from "../../api/marksApi";

const filterOptions = [
  { key: "all", label: "All" },
  { key: "highAttendance", label: "High Attendance" },
  { key: "lowAttendance", label: "Low Attendance" },
  { key: "topPerformers", label: "Top Performers" },
  { key: "attention", label: "Needs Attention" },
];

const badgeStyles = {
  Excellent: "bg-sky-100 text-sky-700 ring-sky-200",
  Good: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  Average: "bg-amber-100 text-amber-700 ring-amber-200",
  "Needs Attention": "bg-rose-100 text-rose-700 ring-rose-200",
};

function initials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function classNameForStatus(status) {
  return badgeStyles[status] ?? "bg-slate-100 text-slate-700 ring-slate-200";
}

function aggregateClasses(subjects, teacherName) {
  const map = new Map();
  (subjects ?? []).forEach((subject) => {
    const existing = map.get(subject.classId) ?? {
      classId: subject.classId,
      className: subject.className,
      section: subject.section,
      subjectCount: 0,
      studentCount: subject.studentCount,
      totalAttendance: 0,
      totalMarks: 0,
      pendingAttendance: 0,
      todayLecture: subject.todayPeriod,
      teacherName,
    };

    existing.subjectCount += 1;
    existing.totalAttendance += Number(subject.attendancePercent ?? 0);
    existing.totalMarks += Number(subject.averageMarks ?? 0);
    existing.pendingAttendance += Number(subject.pendingAttendance ?? 0);
    if (!existing.todayLecture && subject.todayPeriod) {
      existing.todayLecture = subject.todayPeriod;
    }
    map.set(subject.classId, existing);
  });

  return Array.from(map.values()).map((klass) => ({
    ...klass,
    attendancePercent: klass.subjectCount ? Math.round(klass.totalAttendance / klass.subjectCount) : 0,
    averageMarks: klass.subjectCount ? Math.round(klass.totalMarks / klass.subjectCount) : 0,
    title: `${klass.className}`,
    subtitle: `${klass.subjectCount} subject${klass.subjectCount > 1 ? "s" : ""}`,
  }));
}

export default function StudentsPage() {
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [studentDrawerOpen, setStudentDrawerOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [marksRecords, setMarksRecords] = useState([]);
  const [privateNotes, setPrivateNotes] = useState({});
  const [notesDraft, setNotesDraft] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await teacherApi.me();
        setProfile(data);
        const classSummaries = aggregateClasses(data.subjects, data.name || "You");
        setClasses(classSummaries);
        if (classSummaries.length > 0) {
          setSelectedClass((prev) => prev || classSummaries[0].classId);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await teacherApi.students(selectedClass);
        setStudents(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedStudent) {
      setStudentProfile(null);
      setAttendanceRecords([]);
      setMarksRecords([]);
      setNotesDraft("");
      return;
    }

    (async () => {
      setDetailLoading(true);
      try {
        const [detailRes, attendanceRes, marksRes] = await Promise.all([
          teacherApi.studentDetail(selectedStudent.id),
          attendanceApi.studentRecords(selectedStudent.id),
          marksApi.studentMarks(selectedStudent.id),
        ]);
        setStudentProfile(detailRes.data);
        setAttendanceRecords(attendanceRes.data ?? []);
        setMarksRecords(marksRes.data ?? []);
        setNotesDraft(privateNotes[selectedStudent.id] ?? "");
      } finally {
        setDetailLoading(false);
      }
    })();
  }, [selectedStudent, privateNotes]);

  const classCards = useMemo(() => classes, [classes]);

  const selectedClassMeta = useMemo(
    () => classCards.find((klass) => klass.classId === selectedClass) ?? classCards[0],
    [classCards, selectedClass]
  );

  const studentCount = students.length;
  const stats = useMemo(() => {
    const totalStudents = classCards.reduce((sum, klass) => sum + Number(klass.studentCount || 0), 0);
    const averageAttendance = classCards.length
      ? Math.round(classCards.reduce((sum, klass) => sum + Number(klass.attendancePercent || 0), 0) / classCards.length)
      : 0;
    const pendingAttendance = classCards.reduce((sum, klass) => sum + Number(klass.pendingAttendance || 0), 0);

    return [
      { title: "Classes", value: classCards.length, icon: BookOpen, accent: "from-sky-500 to-blue-600" },
      { title: "Students", value: totalStudents, icon: Users, accent: "from-cyan-500 to-sky-600" },
      { title: "Average Attendance", value: `${averageAttendance}%`, icon: ShieldCheck, accent: "from-emerald-500 to-slate-500" },
      { title: "Pending Attendance", value: pendingAttendance, icon: Clock3, accent: "from-slate-500 to-slate-700" },
    ];
  }, [classCards]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (students ?? []).filter((student) => {
      const score = typeof student.attendancePercent === "number" ? student.attendancePercent : 0;
      const average = typeof student.averageMarks === "number" ? student.averageMarks : 0;
      const matchSearch =
        !query ||
        student.name?.toLowerCase().includes(query) ||
        student.rollNumber?.toLowerCase().includes(query);

      const matchFilter =
        activeFilter === "all" ||
        (activeFilter === "highAttendance" && score >= 90) ||
        (activeFilter === "lowAttendance" && score < 75) ||
        (activeFilter === "topPerformers" && average >= 85 && score >= 90) ||
        (activeFilter === "attention" && student.status === "Needs Attention");

      return matchSearch && matchFilter;
    });
  }, [students, search, activeFilter]);

  const attendanceTrend = useMemo(() => {
    const last14 = Array.from({ length: 14 }).map((_, idx) => {
      const date = subDays(new Date(), 13 - idx);
      return {
        date: format(date, "MMM d"),
        present: 0,
        absent: 0,
        leave: 0,
      };
    });

    attendanceRecords.forEach((record) => {
      const dateLabel = format(new Date(record.date), "MMM d");
      const item = last14.find((row) => row.date === dateLabel);
      if (!item) return;
      const status = String(record.status).toLowerCase();
      if (status.includes("present") || status.includes("late")) item.present += 1;
      else if (status.includes("absent")) item.absent += 1;
      else item.leave += 1;
    });

    return last14;
  }, [attendanceRecords]);

  const subjectPerformance = useMemo(() => {
    const map = new Map();
    marksRecords.forEach((record) => {
      const subject = record.subjectName || "Unknown";
      const current = map.get(subject) ?? { subject, total: 0, count: 0 };
      if (record.marksObtained != null && record.maxMarks) {
        current.total += (record.marksObtained / record.maxMarks) * 100;
        current.count += 1;
      }
      map.set(subject, current);
    });
    return Array.from(map.values()).map((item) => ({
      subject: item.subject,
      score: item.count ? Math.round(item.total / item.count) : 0,
    }));
  }, [marksRecords]);

  const activityTimeline = useMemo(() => {
    const events = [];

    attendanceRecords.slice(-4).reverse().forEach((record) => {
      events.push({
        id: `att-${record.id || record.date}`,
        title: `Attendance ${String(record.status)}`,
        subtitle: record.subjectName || "Today",
        date: format(new Date(record.date), "PPP"),
        color: String(record.status).toLowerCase().includes("present") ? "bg-emerald-500" : "bg-rose-500",
      });
    });

    marksRecords.slice(-3).reverse().forEach((record) => {
      events.push({
        id: `mark-${record.id || record.subjectName}`,
        title: `Marks uploaded`,
        subtitle: `${record.subjectName} — ${record.grade || record.marksObtained}/${record.maxMarks}`,
        date: record.examTypeName ? record.examTypeName : "Recent",
        color: "bg-sky-500",
      });
    });

    return events.slice(0, 5);
  }, [attendanceRecords, marksRecords]);

  const saveNotes = () => {
    if (!selectedStudent) return;
    setPrivateNotes((prev) => ({ ...prev, [selectedStudent.id]: notesDraft }));
  };

  const closeDrawer = () => {
    setStudentDrawerOpen(false);
    setSelectedStudent(null);
  };

  if (loading && !profile) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-8">
      <PageHeader title="My Students" subtitle="Manage students from your assigned classes." />

      <section className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="uppercase tracking-[0.35em] text-sm text-slate-400">Teacher workspace</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900">Students command center</h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-500">
                Browse your assigned classes, drill into student performance, and manage class-level attendance at a glance.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-3xl bg-sky-500 px-5 py-4 text-white shadow-sm ring-1 ring-sky-200/40">
                <p className="text-xs uppercase tracking-[0.35em] text-sky-100/80">Classes</p>
                <p className="mt-3 text-3xl font-semibold">{classCards.length}</p>
              </div>
              <div className="rounded-3xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Today's attendance pending</p>
                <p className="mt-3 text-3xl font-semibold">{stats[3]?.value ?? 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {stats.map((card) => (
            <div key={card.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${card.accent} text-white`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">{card.title}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Your classes</h3>
            <p className="mt-1 text-sm text-slate-500">Select a class to reveal its student roster and action center.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {classCards.map((klass) => (
              <button
                key={klass.classId}
                type="button"
                onClick={() => setSelectedClass(klass.classId)}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${selectedClass === klass.classId ? "bg-sky-600 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
              >
                {klass.title}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {classCards.map((klass) => (
            <button
              key={klass.classId}
              type="button"
              onClick={() => setSelectedClass(klass.classId)}
              className={`group rounded-[2rem] border p-6 text-left transition ${selectedClass === klass.classId ? "border-sky-500 bg-sky-50 shadow-lg" : "border-slate-200 bg-white hover:-translate-y-1 hover:shadow-lg"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{klass.subtitle}</p>
                  <h3 className="mt-3 text-xl font-semibold text-slate-900">{klass.title}</h3>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-500 text-white shadow-sm">
                  <BookOpen className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Students</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{klass.studentCount}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-white p-4 shadow-sm">
                    <p className="text-[0.65rem] uppercase tracking-[0.32em] text-slate-400">Attendance</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">{klass.attendancePercent}%</p>
                  </div>
                  <div className="rounded-3xl bg-white p-4 shadow-sm">
                    <p className="text-[0.65rem] uppercase tracking-[0.32em] text-slate-400">Avg marks</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">{klass.averageMarks}%</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-500">
                  <div className="space-y-1">
                    <p className="font-medium text-slate-700">Next lecture</p>
                    <p>{klass.todayLecture ?? "No class today"}</p>
                  </div>
                  <CircleDot className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <div className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Students of {selectedClassMeta?.title ?? "this class"}</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">{selectedClassMeta?.title ?? "Loading..."}</h3>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search student..."
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setActiveFilter(option.key)}
                    className={`rounded-full px-4 py-2 text-sm transition ${activeFilter === option.key ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : filteredStudents.length === 0 ? (
            <EmptyState
              title="No students match your selection"
              description="Try a different class, search query, or filter badge to reveal students." />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredStudents.map((student) => (
                <div key={student.id} className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-sky-500 text-lg font-semibold text-white shadow-sm">
                        {initials(student.name || "?")}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{student.name}</p>
                        <p className="mt-1 text-sm text-slate-500">Roll No. {student.rollNumber}</p>
                      </div>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${classNameForStatus(student.status)}`}>
                      {student.status || "Active"}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-[0.65rem] uppercase tracking-[0.28em] text-slate-400">Attendance</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{student.attendancePercent ?? 0}%</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-[0.65rem] uppercase tracking-[0.28em] text-slate-400">Average</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{student.averageMarks ?? 0}%</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <div className="rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Last present</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{student.lastPresent ?? "Recently"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudent(student);
                        setStudentDrawerOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-3xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
                    >
                      View Profile <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <button type="button" className="flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-sky-500" /> Attendance
                    </button>
                    <button type="button" className="flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300">
                      <BarChart3 className="h-4 w-4 text-slate-500" /> Marks
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-6 rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div className="rounded-[1.75rem] bg-white p-5 shadow-sm">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Class snapshot</p>
            <h4 className="mt-3 text-xl font-semibold text-slate-900">{selectedClassMeta?.title ?? "Class"}</h4>
            <p className="mt-2 text-sm text-slate-500">{selectedClassMeta?.subtitle ?? ""}</p>
            <div className="mt-6 grid gap-3">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-[0.65rem] uppercase tracking-[0.24em] text-slate-400">Student count</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{selectedClassMeta?.studentCount ?? 0}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-[0.65rem] uppercase tracking-[0.24em] text-slate-400">Attendance</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{selectedClassMeta?.attendancePercent ?? 0}%</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-[0.65rem] uppercase tracking-[0.24em] text-slate-400">Avg marks</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{selectedClassMeta?.averageMarks ?? 0}%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Today</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{selectedClassMeta?.todayLecture ?? "No lecture scheduled"}</p>
              </div>
              <Clock3 className="h-6 w-6 text-slate-500" />
            </div>
            <p className="mt-4 text-sm text-slate-500">Tap a student card to inspect profile, attendance, and marks.</p>
          </div>

          <div className="rounded-[1.75rem] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Teacher</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{profile?.name ?? "You"}</p>
              </div>
              <Users className="h-6 w-6 text-slate-500" />
            </div>
            <p className="mt-4 text-sm text-slate-500">Recommended actions: view attendance, marks, and report cards for students with attendance gaps.</p>
          </div>
        </aside>
      </section>

      <div className={`fixed inset-0 z-50 flex items-stretch justify-end ${studentDrawerOpen ? "" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-slate-950/50 transition-opacity ${studentDrawerOpen ? "opacity-100" : "opacity-0"}`}
          onClick={closeDrawer}
        />
        <div className={`relative z-10 h-full w-full max-w-4xl overflow-y-auto bg-slate-50 p-6 shadow-2xl transition-transform ${studentDrawerOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Student profile</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">{selectedStudent?.name ?? "Student details"}</h2>
            </div>
            <button
              type="button"
              onClick={closeDrawer}
              className="rounded-full border border-slate-200 bg-white p-3 text-slate-600 transition hover:bg-slate-100"
            >
              Close
            </button>
          </div>

          {detailLoading ? (
            <div className="mt-10 flex items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : selectedStudent && studentProfile ? (
            <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-6">
                <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-5">
                    <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-sky-500 text-3xl font-semibold text-white shadow-sm">
                      {initials(studentProfile.name || selectedStudent.name)}
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">{studentProfile.className}</p>
                      <h3 className="mt-2 text-2xl font-semibold text-slate-900">{studentProfile.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">Roll No. {studentProfile.rollNumber}</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Attendance</p>
                      <p className="mt-2 text-3xl font-semibold text-slate-900">{studentProfile.attendancePercent ?? 0}%</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Average marks</p>
                      <p className="mt-2 text-3xl font-semibold text-slate-900">{studentProfile.averageMarks ?? 0}%</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Guardian</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{studentProfile.parentName || "—"}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Contact</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{studentProfile.parentPhone || studentProfile.parentEmail || "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Student details</h3>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Date of birth</p>
                      <p className="mt-2 text-sm text-slate-700">{studentProfile.dob ?? "Not available"}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Blood group</p>
                      <p className="mt-2 text-sm text-slate-700">{studentProfile.bloodGroup || "—"}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Email</p>
                      <p className="mt-2 text-sm text-slate-700">{studentProfile.parentEmail || "—"}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Phone</p>
                      <p className="mt-2 text-sm text-slate-700">{studentProfile.parentPhone || "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Private teacher notes</p>
                      <p className="mt-1 text-sm text-slate-500">Your notes are saved locally in this session.</p>
                    </div>
                    <button
                      type="button"
                      onClick={saveNotes}
                      className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                    >
                      Save notes
                    </button>
                  </div>
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    rows={5}
                    className="mt-4 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    placeholder="Needs improvement in Mathematics, always participates in group activities..."
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Subject performance</p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-900">Focus areas</h3>
                    </div>
                    <BarChart3 className="h-6 w-6 text-slate-500" />
                  </div>
                  <div className="mt-6 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectPerformance} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="subject" tick={{ fill: "#64748B", fontSize: 12 }} />
                        <YAxis tick={{ fill: "#64748B", fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="score" fill="#0EA5E9" radius={[12, 12, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Attendance history</p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-900">Last 2 weeks</h3>
                    </div>
                    <Activity className="h-6 w-6 text-slate-500" />
                  </div>
                  <div className="mt-6 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={attendanceTrend} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 11 }} />
                        <YAxis hide />
                        <Tooltip />
                        <Line type="monotone" dataKey="present" stroke="#22C55E" strokeWidth={3} dot={false} />
                        <Line type="monotone" dataKey="absent" stroke="#EF4444" strokeWidth={3} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Recent activity</p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-900">Timeline</h3>
                    </div>
                    <Clock3 className="h-6 w-6 text-slate-500" />
                  </div>
                  <div className="mt-6 space-y-4">
                    {activityTimeline.length === 0 ? (
                      <p className="text-sm text-slate-500">No recent activity yet.</p>
                    ) : (
                      activityTimeline.map((item) => (
                        <div key={item.id} className="rounded-3xl bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-slate-900">{item.title}</p>
                            <span className={`inline-flex h-2.5 w-2.5 rounded-full ${item.color}`} />
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{item.subtitle}</p>
                          <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-400">{item.date}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-10 rounded-[2rem] bg-white p-10 text-center text-slate-500 shadow-sm">
              <p className="text-lg font-semibold text-slate-900">Select a student to review their profile.</p>
              <p className="mt-2 text-sm">All student cards include attendance, marks, and quick actions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
