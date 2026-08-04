import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { studentApi } from "../../api/studentApi";
import { adminApi } from "../../api/adminApi";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TimetablePage() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: me } = await studentApi.me();
        const { data } = await adminApi.getTimetable(me.classId);
        setSlots(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  const byDay = DAYS.map((day) => ({
    day,
    periods: slots.filter((s) => s.dayOfWeek === day).sort((a, b) => a.periodNumber - b.periodNumber),
  }));

  return (
    <div>
      <PageHeader title="Timetable" subtitle="Your weekly class schedule" />
      {slots.length === 0 ? (
        <EmptyState title="Timetable not published yet" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {byDay.filter((d) => d.periods.length > 0).map((d) => (
            <div key={d.day} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-2 font-medium text-slate-900">{d.day}</p>
              <ul className="space-y-1.5">
                {d.periods.map((p) => (
                  <li key={p.id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span>{p.subjectName}</span>
                    <span className="text-slate-500">{p.startTime}–{p.endTime}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
