import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock3,
  Filter,
  GraduationCap,
  ListFilter,
  MapPin,
  Search,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { addDays, addMonths, differenceInCalendarDays, format, isAfter, isBefore, isSameDay, isToday, isTomorrow, parseISO, startOfMonth, endOfMonth } from "date-fns";
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

function CustomDropdown({ label, options, value, onChange, icon: Icon }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((option) => option.value === value) || options[0];

  return (
    <div ref={ref} className="relative h-full">
      <div className="h-full rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-soft)] p-3 transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-[var(--surface)] hover:shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          {Icon && <Icon className="h-4 w-4 text-slate-400" />}
          {label}
        </div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-[52px] w-full items-center justify-between rounded-[28px] border border-[var(--border)] bg-[var(--surface)] px-4 text-left text-sm font-medium text-[var(--text)] transition duration-200 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <span>{selectedOption?.label}</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="dropdown-panel absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] shadow-2xl shadow-slate-900/10">
          <ul className="divide-y divide-slate-200">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`dropdown-item flex w-full items-center justify-between gap-3 px-4 py-3 text-sm text-[var(--text)] transition duration-200 ${
                      isSelected ? "bg-blue-50 text-blue-700" : "bg-[var(--surface)] hover:bg-slate-100"
                    }`}
                  >
                    <span>{option.label}</span>
                    {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
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

function buildCalendarDays(exams, currentMonth) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
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
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(null);
  const [studentSession, setStudentSession] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: me } = await studentApi.me();
        setStudentSession(me.academicYear || null);
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

  const calendarBounds = useMemo(() => {
    const examDates = schedule
      .filter((item) => item.examDate)
      .map((item) => startOfMonth(parseISO(item.examDate)));

    const sessionBounds = (() => {
      if (!studentSession) return null;
      const [startYear, endYear] = studentSession.split("-").map((part) => Number(part.trim()));
      if (Number.isNaN(startYear) || Number.isNaN(endYear)) return null;
      return {
        min: startOfMonth(new Date(startYear, 3, 1)), // April start
        max: startOfMonth(new Date(endYear, 2, 1)), // March end
      };
    })();

    if (!examDates.length) {
      if (sessionBounds) return sessionBounds;
      const current = startOfMonth(new Date());
      return { min: current, max: current };
    }

    const min = examDates.reduce((earliest, date) => (isBefore(date, earliest) ? date : earliest), examDates[0]);
    const max = examDates.reduce((latest, date) => (isAfter(date, latest) ? date : latest), examDates[0]);

    if (sessionBounds) {
      return {
        min: isBefore(min, sessionBounds.min) ? sessionBounds.min : min,
        max: isAfter(max, sessionBounds.max) ? sessionBounds.max : max,
      };
    }

    return { min, max };
  }, [schedule, studentSession]);

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

  const calendarDays = useMemo(() => buildCalendarDays(filteredSchedule, currentMonth), [filteredSchedule, currentMonth]);

  const handleSelectDay = (day) => {
    if (!day?.exams?.length) return;
    setSelectedDay(day);
  };

  const changeMonth = (direction) => {
    const next = addMonths(currentMonth, direction);

    if (isBefore(next, calendarBounds.min) || isAfter(next, calendarBounds.max)) return;

    setCurrentMonth(next);
    setSelectedDay(null);
  };

  useEffect(() => {
    if (!calendarBounds || !calendarBounds.min || !calendarBounds.max) return;
    if (isBefore(currentMonth, calendarBounds.min) || isAfter(currentMonth, calendarBounds.max)) {
      setCurrentMonth(calendarBounds.min);
      setSelectedDay(null);
    }
  }, [calendarBounds, currentMonth]);

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

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/20">
        <div className="grid gap-4 lg:grid-cols-[1.8fr_2fr] xl:grid-cols-[2.4fr_2fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              <span className="flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-100 text-slate-700 dark:bg-slate-800">🔎</span>
              <span>Find exams instantly</span>
            </div>
            <div className="relative h-[52px] rounded-[28px] border border-transparent bg-[var(--surface)] px-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-sm focus-within:border-transparent focus-within:ring-2 focus-within:ring-blue-100">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by subject, exam type, or venue..."
                className="h-full w-full bg-transparent border-none outline-none shadow-none appearance-none px-0 pl-14 text-sm font-medium text-[var(--text)] placeholder:text-slate-500 focus:outline-none focus:ring-0 active:outline-none active:ring-0"
                style={{ background: "transparent", border: "none", outline: "none", boxShadow: "none" }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 items-stretch">
            <CustomDropdown
              label="Exam type"
              icon={Filter}
              value={examTypeFilter}
              onChange={setExamTypeFilter}
              options={examTypes.map((type) => ({
                value: type,
                label: type === "all" ? "All Exam Types" : type,
              }))}
            />

            <CustomDropdown
              label="Month"
              icon={CalendarDays}
              value={monthFilter}
              onChange={setMonthFilter}
              options={months.map((month) => ({
                value: month,
                label: month === "all" ? "All Months" : month,
              }))}
            />

            <CustomDropdown
              label="Status"
              icon={ListFilter}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All Status" },
                { value: "today", label: "Today" },
                { value: "tomorrow", label: "Tomorrow" },
                { value: "upcoming", label: "Upcoming" },
                { value: "completed", label: "Completed" },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Calendar</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">{format(currentMonth, "MMMM yyyy")}</h3>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              disabled={isBefore(addMonths(currentMonth, -1), calendarBounds.min)}
              className="rounded-full p-2 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              disabled={isAfter(addMonths(currentMonth, 1), calendarBounds.max)}
              className="rounded-full p-2 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="py-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{day}</div>
          ))}

          {calendarDays.map((day) => (
            <button
              type="button"
              key={day.key}
              onClick={() => handleSelectDay(day)}
              className={`min-h-[110px] rounded-2xl border p-2 text-left transition ${day.inMonth ? "border-slate-200 bg-slate-50 hover:border-blue-300 hover:shadow-sm" : "border-slate-100 bg-slate-50/60 text-slate-400"} ${day.examCount ? "cursor-pointer" : "cursor-default"}`}
            >
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
            </button>
          ))}
        </div>

        {filteredSchedule.length === 0 && (
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <div className="mb-3 text-4xl">📅</div>
            <p className="text-xl font-semibold text-slate-800">No exams found.</p>
            <p className="mt-2 text-sm text-slate-500">Adjust the filters above to view scheduled exams.</p>
          </div>
        )}
      </div>

      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <button type="button" onClick={() => setSelectedDay(null)} className="absolute inset-0 h-full w-full cursor-auto bg-transparent" aria-label="Close exam details overlay" />
          <div className="relative w-full max-w-3xl overflow-hidden rounded-[1.5rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Exam details</p>
                <h2 className="text-xl font-semibold text-slate-900">{format(selectedDay.date, "d MMM yyyy")}</h2>
              </div>
              <button type="button" onClick={() => setSelectedDay(null)} className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                Close
              </button>
            </div>
            <div className="px-6 py-6">
              <div className="flex gap-4 overflow-x-auto pb-3 pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 snap-x snap-mandatory">
                {selectedDay.exams.map((exam) => {
                  const meta = getStatusMeta(exam);
                  return (
                    <div key={exam.id} className="min-w-[320px] snap-start rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 shadow-sm">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{exam.subjectName}</p>
                          <p className="text-sm text-slate-500">{exam.examTypeName}</p>
                        </div>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${meta.tone}`}>{meta.badge}</span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white p-4 shadow-sm">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Time</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{prettyTime(exam.startTime)}</p>
                        </div>
                        <div className="rounded-2xl bg-white p-4 shadow-sm">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Venue</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{exam.venue || "Room TBA"}</p>
                        </div>
                        <div className="rounded-2xl bg-white p-4 shadow-sm">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Duration</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{exam.duration || "TBA"}</p>
                        </div>
                        {exam.teacherName && (
                          <div className="rounded-2xl bg-white p-4 shadow-sm">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Teacher</p>
                            <p className="mt-2 text-sm font-medium text-slate-900">{exam.teacherName}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
