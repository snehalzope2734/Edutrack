import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Clock3,
  Filter,
  GraduationCap,
  ListFilter,
  MapPin,
  Search,
  Sparkles,
  TimerReset,
  UserRound,
} from "lucide-react";
import { addDays, differenceInCalendarDays, format, isAfter, isBefore, isSameDay, isToday, isTomorrow, parseISO, startOfMonth, endOfMonth } from "date-fns";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { studentApi } from "../../api/studentApi";
import { examApi } from "../../api/examApi";

const subjectIcons = {
  Mathematics: "📘",
  Science: "🧪",
  Computer: "💻",
  English: "📖",
  History: "🌍",
  default: "📚",
};

function prettyTime(value) {
  if (!value) return "TBA";

  const timeString = value.includes(":") ? value : `${value}:00`;
  const [hours, minutes] = timeString.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function prettyDate(value) {
  if (!value) return "TBA";
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? value : format(date, "d MMM yyyy");
}

function getStatusMeta(item) {
  const examDate = item?.examDate ? parseISO(item.examDate) : null;
  if (!examDate || Number.isNaN(examDate.getTime())) {
    return { label: "Upcoming", tone: "bg-blue-100 text-blue-700 border-blue-200", badge: "🔵 Upcoming" };
  }

  const examDateTime = item.startTime ? new Date(`${item.examDate}T${item.startTime}`) : new Date(examDate);
  const now = new Date();

  if (isBefore(examDateTime, now)) {
    return { label: "Completed", tone: "bg-slate-200 text-slate-700 border-slate-300", badge: "⚪ Completed" };
  }

  if (isToday(examDateTime)) {
    return { label: "Today", tone: "bg-emerald-100 text-emerald-700 border-emerald-200", badge: "🟢 Today" };
  }

  if (isTomorrow(examDateTime)) {
    return { label: "Tomorrow", tone: "bg-amber-100 text-amber-700 border-amber-200", badge: "🟠 Tomorrow" };
  }

  return { label: "Upcoming", tone: "bg-blue-100 text-blue-700 border-blue-200", badge: "🔵 Upcoming" };
}

function getCountdownLabel(item) {
  const examDate = item?.examDate ? parseISO(item.examDate) : null;
  if (!examDate || Number.isNaN(examDate.getTime())) return "Upcoming";

  const examDateTime = item.startTime ? new Date(`${item.examDate}T${item.startTime}`) : new Date(examDate);
  const now = new Date();

  if (isBefore(examDateTime, now)) return "Completed";
  if (isToday(examDateTime)) {
    const diffInHours = Math.max(0, Math.round((examDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)));
    return diffInHours > 0 ? `Starts in ${diffInHours} Hours` : "Today";
  }
  if (isTomorrow(examDateTime)) return "Tomorrow";

  const days = differenceInCalendarDays(examDateTime, now);
  return days > 0 ? `Starts in ${days} Days` : "Starts soon";
}

function getExamMonthLabel(value) {
  if (!value) return "All Months";
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? "All Months" : format(date, "MMM yyyy");
}

function buildCalendarDays(exams) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const startDay = new Date(monthStart);
  startDay.setDate(startDay.getDate() - ((monthStart.getDay() + 6) % 7));

  const days = [];
  for (let index = 0; index < 42; index += 1) {
    const current = new Date(startDay);
    current.setDate(startDay.getDate() + index);
    const dayMatches = exams.filter((exam) => exam.examDate && isSameDay(parseISO(exam.examDate), current));

    days.push({
      key: `${current.toISOString()}-${index}`,
      date: new Date(current),
      inMonth: current.getMonth() === monthStart.getMonth(),
      examCount: dayMatches.length,
      exams: dayMatches,
    });
  }

  return days;
}

export default function ExamSchedulePage() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [examTypeFilter, setExamTypeFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list");

  useEffect(() => {
    (async () => {
      try {
        const { data: me } = await studentApi.me();
        const { data } = await examApi.listSchedule(me.classId);
        const sorted = [...(data || [])].sort((a, b) => {
          const aDate = a.examDate ? new Date(`${a.examDate}T${a.startTime || "00:00"}`) : new Date(0);
          const bDate = b.examDate ? new Date(`${b.examDate}T${b.startTime || "00:00"}`) : new Date(0);
          return aDate - bDate;
        });
        setSchedule(sorted);
      } catch (error) {
        console.error("Failed to load exam schedule", error);
        setSchedule([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const examTypes = useMemo(() => ["all", ...new Set(schedule.map((item) => item.examTypeName).filter(Boolean))], [schedule]);
  const months = useMemo(() => {
    const unique = [...new Set(schedule.map((item) => getExamMonthLabel(item.examDate)).filter((label) => label !== "All Months"))];
    return ["all", ...unique];
  }, [schedule]);

  const filteredSchedule = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return schedule.filter((item) => {
      const meta = getStatusMeta(item);
      const matchesSearch = !query || [item.subjectName, item.examTypeName, item.venue].join(" ").toLowerCase().includes(query);
      const matchesType = examTypeFilter === "all" || item.examTypeName === examTypeFilter;
      const matchesMonth = monthFilter === "all" || getExamMonthLabel(item.examDate) === monthFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "today" && meta.label === "Today") ||
        (statusFilter === "tomorrow" && meta.label === "Tomorrow") ||
        (statusFilter === "upcoming" && (meta.label === "Upcoming" || meta.label === "Today" || meta.label === "Tomorrow")) ||
        (statusFilter === "completed" && meta.label === "Completed");

      return matchesSearch && matchesType && matchesMonth && matchesStatus;
    });
  }, [schedule, searchTerm, examTypeFilter, monthFilter, statusFilter]);

  const upcomingExams = useMemo(
    () => filteredSchedule.filter((item) => !isBefore(new Date(`${item.examDate}T${item.startTime || "00:00"}`), new Date())),
    [filteredSchedule]
  );

  const completedExams = useMemo(
    () => filteredSchedule.filter((item) => isBefore(new Date(`${item.examDate}T${item.startTime || "00:00"}`), new Date())),
    [filteredSchedule]
  );

  const nextExam = useMemo(() => upcomingExams[0] || null, [upcomingExams]);

  const thisWeekCount = useMemo(() => {
    const now = new Date();
    const future = upcomingExams.filter((item) => {
      const examDateTime = new Date(`${item.examDate}T${item.startTime || "00:00"}`);
      return isAfter(examDateTime, now) && differenceInCalendarDays(examDateTime, now) <= 7;
    });
    return future.length;
  }, [upcomingExams]);

  const calendarDays = useMemo(() => buildCalendarDays(filteredSchedule), [filteredSchedule]);

  const summaryStats = [
    { label: "Next exam", value: nextExam ? prettyDate(nextExam.examDate) : "—" },
    { label: "Upcoming", value: `${upcomingExams.length}` },
    { label: "Completed", value: `${completedExams.length}` },
    { label: "This week", value: `${thisWeekCount} Exams` },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title="Exam Schedule" subtitle="Track your upcoming assessments with clarity" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryStats.map((stat) => (
          <div key={stat.label} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
            <p className="mt-3 text-xl font-semibold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[2rem] border border-blue-200 bg-white p-5 shadow-sm ring-1 ring-blue-50">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Next exam</p>
              <h2 className="text-2xl font-semibold text-slate-900">📚 Next Exam</h2>
            </div>
          </div>
          {nextExam && (
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 animate-pulse">
              {getCountdownLabel(nextExam)}
            </span>
          )}
        </div>

        {nextExam ? (
          <div className="rounded-[1.5rem] border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-slate-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">{subjectIcons[nextExam.subjectName] || subjectIcons.default} {nextExam.subjectName}</p>
                <h3 className="mt-2 text-3xl font-semibold text-slate-900">{nextExam.examTypeName}</h3>
                <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-blue-600" /> {prettyDate(nextExam.examDate)}</div>
                  <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-blue-600" /> {prettyTime(nextExam.startTime)}</div>
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-blue-600" /> {nextExam.venue || "Room TBA"}</div>
                  <div className="flex items-center gap-2"><TimerReset className="h-4 w-4 text-blue-600" /> {nextExam.duration || "Duration TBA"}</div>
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-blue-200 bg-white px-4 py-3 text-right shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Starts in</p>
                <p className="mt-2 text-xl font-bold text-blue-700">{getCountdownLabel(nextExam).replace("Starts in ", "")}</p>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="📅 No upcoming exams scheduled."
            description="Relax and keep preparing!"
          />
        )}
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by subject..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
              />
            </div>

            <div className="flex min-w-[200px] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Filter className="h-4 w-4 text-slate-400" />
              <select value={examTypeFilter} onChange={(e) => setExamTypeFilter(e.target.value)} className="w-full bg-transparent text-sm outline-none">
                {examTypes.map((type) => (
                  <option key={type} value={type}>{type === "all" ? "All Exam Types" : type}</option>
                ))}
              </select>
            </div>

            <div className="flex min-w-[160px] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="w-full bg-transparent text-sm outline-none">
                {months.map((month) => (
                  <option key={month} value={month}>{month === "all" ? "All Months" : month}</option>
                ))}
              </select>
            </div>

            <div className="flex min-w-[155px] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <ListFilter className="h-4 w-4 text-slate-400" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full bg-transparent text-sm outline-none">
                <option value="all">All Status</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="flex rounded-2xl border border-slate-200 bg-slate-100 p-1">
            <button type="button" onClick={() => setViewMode("list")} className={`rounded-xl px-3 py-2 text-sm font-medium ${viewMode === "list" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}>
              List View
            </button>
            <button type="button" onClick={() => setViewMode("calendar")} className={`rounded-xl px-3 py-2 text-sm font-medium ${viewMode === "calendar" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}>
              Calendar View
            </button>
          </div>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Calendar</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">{format(new Date(), "MMMM yyyy")}</h3>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="py-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{day}</div>
            ))}

            {calendarDays.map((day) => (
              <div key={day.key} className={`min-h-[110px] rounded-2xl border p-2 text-left ${day.inMonth ? "border-slate-200 bg-slate-50" : "border-slate-100 bg-slate-50/60 text-slate-400"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{format(day.date, "d")}</span>
                  {day.examCount > 0 && <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">{day.examCount}</span>}
                </div>
                <div className="mt-2 space-y-1">
                  {day.exams.slice(0, 2).map((exam) => (
                    <div key={exam.id} className="rounded-lg bg-white px-2 py-1 text-[10px] font-medium text-slate-700 shadow-sm">
                      {exam.subjectName}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-slate-900">Upcoming Exams</h3>
              {upcomingExams.length > 0 && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">{thisWeekCount} Exams this Week</span>}
            </div>

            {upcomingExams.length === 0 ? (
              <EmptyState title="📅 No upcoming exams scheduled." description="Relax and keep preparing!" />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
                {upcomingExams.map((exam) => {
                  const meta = getStatusMeta(exam);
                  return (
                    <div key={exam.id} className="group rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-xl">{subjectIcons[exam.subjectName] || subjectIcons.default}</div>
                          <div>
                            <p className="text-lg font-semibold text-slate-900">{exam.subjectName}</p>
                            <p className="text-sm text-slate-500">{exam.examTypeName}</p>
                          </div>
                        </div>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${meta.tone}`}>{meta.badge}</span>
                      </div>

                      <div className="mt-4 space-y-3 rounded-[1.25rem] bg-slate-50 p-4 text-sm text-slate-600">
                        <div className="flex items-center justify-between"><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-blue-600" /> Date</span><span className="font-medium text-slate-800">{prettyDate(exam.examDate)}</span></div>
                        <div className="flex items-center justify-between"><span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-blue-600" /> Time</span><span className="font-medium text-slate-800">{prettyTime(exam.startTime)}</span></div>
                        <div className="flex items-center justify-between"><span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-blue-600" /> Venue</span><span className="font-medium text-slate-800">{exam.venue || "Room TBA"}</span></div>
                        <div className="flex items-center justify-between"><span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-600" /> Duration</span><span className="font-medium text-slate-800">{exam.duration || "TBA"}</span></div>
                        {exam.teacherName && (
                          <div className="flex items-center justify-between"><span className="flex items-center gap-2"><UserRound className="h-4 w-4 text-blue-600" /> Teacher</span><span className="font-medium text-slate-800">{exam.teacherName}</span></div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Countdown</span>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{getCountdownLabel(exam)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-slate-900">Completed Exams</h3>
            </div>

            {completedExams.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No completed exams yet.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {completedExams.map((exam) => (
                  <div key={exam.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-100 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-200 text-lg">{subjectIcons[exam.subjectName] || subjectIcons.default}</div>
                        <div>
                          <p className="font-semibold text-slate-800">{exam.subjectName}</p>
                          <p className="text-sm text-slate-500">{exam.examTypeName}</p>
                        </div>
                      </div>
                      <span className="rounded-full border border-slate-300 bg-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700">⚪ Completed</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                      <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-500" /> {prettyDate(exam.examDate)}</span>
                      <span className="font-medium text-slate-700">{prettyTime(exam.startTime)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {filteredSchedule.length === 0 && viewMode === "list" && (
        <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <div className="mb-3 text-4xl">📅</div>
          <p className="text-xl font-semibold text-slate-800">No upcoming exams scheduled.</p>
          <p className="mt-2 text-sm text-slate-500">Relax and keep preparing!</p>
        </div>
      )}
    </div>
  );
}
