import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { attendanceApi } from "../../api/attendanceApi";
import { marksApi } from "../../api/marksApi";

export default function StudentProfilePage() {
  const { id } = useParams();
  const [attendance, setAttendance] = useState(null);
  const [marks, setMarks] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [attRes, marksRes] = await Promise.all([
          attendanceApi.studentSummary(id),
          marksApi.studentSummary(id),
        ]);
        setAttendance(attRes.data);
        setMarks(marksRes.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Student Profile" subtitle="Attendance and marks overview" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-medium text-slate-900">Attendance — {attendance?.overall ?? 0}% overall</h2>
          <ul className="space-y-2 text-sm">
            {attendance?.subjectWise?.map((s) => (
              <li key={s.subjectName} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span>{s.subjectName}</span>
                <span className="text-slate-500">{s.percentage}% ({s.present}P / {s.absent}A / {s.late}L)</span>
              </li>
            ))}
            {(!attendance?.subjectWise || attendance.subjectWise.length === 0) && <li className="text-slate-400">No attendance records yet</li>}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-medium text-slate-900">Marks — {marks?.overall ?? 0}% overall</h2>
          <ul className="space-y-2 text-sm">
            {marks?.subjectWise?.map((m, i) => (
              <li key={i} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span>{m.subjectName} · {m.examType}</span>
                <span className="text-slate-500">{m.marks ?? "—"}/{m.maxMarks} ({m.grade || "—"})</span>
              </li>
            ))}
            {(!marks?.subjectWise || marks.subjectWise.length === 0) && <li className="text-slate-400">No marks recorded yet</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
