import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Clock3,
  MapPin,
  Sparkles,
  UserRound,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { studentApi } from "../../api/studentApi";
import { adminApi } from "../../api/adminApi";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const subjectBorder = {
  Mathematics: "border-blue-300 bg-blue-50/70",
  Science: "border-emerald-300 bg-emerald-50/70",
  English: "border-violet-300 bg-violet-50/70",
  Computer: "border-indigo-300 bg-indigo-50/70",
  Hindi: "border-amber-300 bg-amber-50/70",
  default: "border-slate-300 bg-slate-50/80",
};

const subjectAccent = {
  Mathematics: "text-blue-700",
  Science: "text-emerald-700",
  English: "text-violet-700",
  Computer: "text-indigo-700",
  Hindi: "text-amber-700",
  default: "text-slate-700",
};

const formatTime = (value) => {
  if (!value) return "—";
  const [hours, minutes] = String(value).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;

  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

const timeToMinutes = (value) => {
  if (!value) return null;
  const [hours, minutes] = String(value).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const isSameDay = (day1, day2) => day1 === day2;

export default function TimetablePage() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: me } = await studentApi.me();
        const { data } = await adminApi.getTimetable(me.classId);
        setSlots(data || []);
      } catch (error) {
        console.error("Failed to load timetable", error);
        setSlots([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const byDay = useMemo(() => {
    return DAYS.map((day) => ({
      day,
      periods: slots
        .filter((slot) => slot.dayOfWeek === day)
        .sort((a, b) => (a.periodNumber ?? 0) - (b.periodNumber ?? 0)),
    }));
  }, [slots]);

  const todayPeriods = byDay.find((day) => isSameDay(day.day, todayName))?.periods ?? [];

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  const currentClass = todayPeriods.find((slot) => {
    const start = timeToMinutes(slot.startTime);
    const end = timeToMinutes(slot.endTime);
    return start !== null && end !== null && nowMinutes >= start && nowMinutes < end;
  });

  const nextClass = useMemo(() => {
    const candidates = todayPeriods.filter((slot) => {
      const start = timeToMinutes(slot.startTime);
      return start !== null && start > nowMinutes;
    });

    if (candidates.length > 0) {
      return candidates.sort((a, b) => (timeToMinutes(a.startTime) ?? 0) - (timeToMinutes(b.startTime) ?? 0))[0];
    }

    for (const day of DAYS) {
      const nextDayPeriods = slots.filter((slot) => slot.dayOfWeek === day).sort((a, b) => (a.periodNumber ?? 0) - (b.periodNumber ?? 0));
      if (nextDayPeriods.length > 0) {
        return nextDayPeriods[0];
      }
    }

    return null;
  }, [slots, todayPeriods, nowMinutes]);

  const nextClassMinutes = nextClass ? Math.max(0, (timeToMinutes(nextClass.startTime) ?? 0) - nowMinutes) : null;

  if (loading) return <LoadingSpinner />;

  if (slots.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Timetable" subtitle="Your weekly class schedule" />
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-10 shadow-sm">
          <EmptyState title="📅 Your timetable will appear here once your school publishes it." description="" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="📅 Timetable" subtitle="Your weekly class schedule" />
      <div className="text-sm text-slate-500">Today is {todayName}</div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Today's Classes</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">{todayPeriods.length} Classes</h2>
          </div>
          <div className="rounded-2xl bg-blue-50 px-3 py-2 text-blue-700">
            <CalendarDays className="h-5 w-5" />
          </div>
        </div>

        {todayPeriods.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-slate-600">
            <p className="text-lg font-semibold">No classes today 🎉</p>
            <p className="mt-1 text-sm text-slate-500">Enjoy your day.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Next Class</p>
              <div className="mt-3">
                {nextClass ? (
                  <>
                    <p className="text-xl font-bold text-slate-900">{nextClass.subjectName}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatTime(nextClass.startTime)} – {formatTime(nextClass.endTime)}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      <Clock3 className="h-3.5 w-3.5" />
                      Starts in {nextClassMinutes != null ? `${Math.max(1, Math.ceil(nextClassMinutes / 60))} minutes` : "soon"}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-600">No upcoming class found.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Current Class</p>
              {currentClass ? (
                <div className="mt-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-700">
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    LIVE NOW
                  </div>
                  <p className="mt-3 text-lg font-bold text-slate-900">{currentClass.subjectName}</p>
                  <p className="text-sm text-slate-600">
                    {formatTime(currentClass.startTime)} – {formatTime(currentClass.endTime)}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-600">No class in progress right now.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {byDay.map((day) => {
          const isToday = day.day === todayName;
          const hasClasses = day.periods.length > 0;

          return (
            <div
              key={day.day}
              className={`rounded-[1.5rem] border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                isToday ? "border-blue-200 bg-blue-50/40" : "border-slate-200 bg-white"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{day.day}</h3>
                  <p className="text-xs text-slate-500">{hasClasses ? `${day.periods.length} period${day.periods.length > 1 ? "s" : ""}` : "Holiday"}</p>
                </div>
                {isToday && <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-700">Today</span>}
              </div>

              {hasClasses ? (
                <div className="space-y-3">
                  {day.periods.map((slot) => {
                    const isCurrent = currentClass && slot.id === currentClass.id;
                    const borderClass = subjectBorder[slot.subjectName] || subjectBorder.default;
                    const accentClass = subjectAccent[slot.subjectName] || subjectAccent.default;

                    return (
                      <div
                        key={slot.id}
                        className={`rounded-2xl border p-3 transition ${borderClass} ${isCurrent ? "ring-2 ring-blue-200" : ""}`}
                      >
                        {isCurrent && (
                          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-blue-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                            Live now
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className={`text-base font-semibold ${accentClass}`}>{slot.subjectName}</p>
                            <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                              <Clock3 className="h-3.5 w-3.5" />
                              {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                            </div>
                          </div>
                          <div className="rounded-lg bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                            {slot.periodNumber}
                          </div>
                        </div>

                        <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <span>Room {slot.roomNumber || "TBA"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <UserRound className="h-3.5 w-3.5 text-slate-400" />
                            <span>{slot.teacherName || "Teacher assigned"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  <div className="mb-2 flex items-center justify-center text-2xl">📅</div>
                  <p className="text-center font-medium text-slate-700">No classes scheduled</p>
                  <p className="mt-1 text-center">Enjoy a break today.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Today's Schedule</h3>
        </div>

        {todayPeriods.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-slate-500">
            <p className="text-2xl">📅</p>
            <p className="mt-3 font-medium text-slate-700">No classes today</p>
            <p className="mt-1 text-sm">Enjoy your day and come back for tomorrow's timetable.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayPeriods.map((slot) => (
              <div key={slot.id} className={`flex items-center justify-between rounded-2xl border bg-slate-50 p-3 ${currentClass && currentClass.id === slot.id ? "border-blue-200 bg-blue-50" : "border-slate-200"}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${subjectBorder[slot.subjectName] || subjectBorder.default}`}>
                    <BookOpen className={`h-4 w-4 ${subjectAccent[slot.subjectName] || subjectAccent.default}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{slot.subjectName}</p>
                    <p className="text-sm text-slate-500">{formatTime(slot.startTime)} – {formatTime(slot.endTime)}</p>
                  </div>
                </div>

                <div className="text-right text-sm">
                  <p className="font-medium text-slate-700">Room {slot.roomNumber || "TBA"}</p>
                  <p className="text-slate-500">{slot.teacherName || "Teacher assigned"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
