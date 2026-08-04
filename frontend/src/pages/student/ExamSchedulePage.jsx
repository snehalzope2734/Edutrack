import { useEffect, useState } from "react";
import { format } from "date-fns";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { studentApi } from "../../api/studentApi";
import { examApi } from "../../api/examApi";

export default function ExamSchedulePage() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: me } = await studentApi.me();
        const { data } = await examApi.listSchedule(me.classId);
        setSchedule(data.sort((a, b) => new Date(a.examDate) - new Date(b.examDate)));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Exam Schedule" subtitle="Upcoming exams for your class" />
      {schedule.length === 0 ? (
        <EmptyState title="No exams scheduled yet" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Date</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Subject</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Exam</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Time</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Venue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedule.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2">{format(new Date(s.examDate), "MMM d, yyyy")}</td>
                  <td className="px-4 py-2">{s.subjectName}</td>
                  <td className="px-4 py-2">{s.examTypeName}</td>
                  <td className="px-4 py-2">{s.startTime || "—"}</td>
                  <td className="px-4 py-2">{s.venue || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
