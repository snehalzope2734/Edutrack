import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { studentApi } from "../../api/studentApi";
import { marksApi } from "../../api/marksApi";

const COLORS = ["#3652f5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#0891b2", "#db2777"];

export default function MyMarksPage() {
  const [summary, setSummary] = useState(null);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: me } = await studentApi.me();
        const [summaryRes, allRes] = await Promise.all([
          marksApi.studentSummary(me.studentId),
          marksApi.studentMarks(me.studentId, {}),
        ]);
        setSummary(summaryRes.data);
        setAll(allRes.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  // Build a per-exam-type progression per subject: { examType, [subjectName]: pct }
  const examTypeOrder = [...new Set(all.map((m) => m.examTypeName))];
  const subjectNames = [...new Set(all.map((m) => m.subjectName))];
  const chartData = examTypeOrder.map((examType) => {
    const row = { examType };
    subjectNames.forEach((subj) => {
      const rec = all.find((m) => m.examTypeName === examType && m.subjectName === subj);
      row[subj] = rec && rec.marksObtained != null ? Math.round((rec.marksObtained / rec.maxMarks) * 100) : null;
    });
    return row;
  });

  return (
    <div>
      <PageHeader title="My Marks" subtitle={`${summary?.overall ?? 0}% overall`} />

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <p className="mb-3 text-sm font-medium text-slate-700">Progress across exams (% of max marks)</p>
        {chartData.length === 0 ? <EmptyState title="No marks recorded yet" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="examType" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {subjectNames.map((subj, i) => (
                <Line key={subj} type="monotone" dataKey={subj} stroke={COLORS[i % COLORS.length]} strokeWidth={2} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="mb-3 text-sm font-medium text-slate-700">All results</p>
      {summary?.subjectWise?.length === 0 ? (
        <EmptyState title="No marks recorded yet" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Subject</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Exam</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Marks</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary?.subjectWise?.map((m, i) => (
                <tr key={i}>
                  <td className="px-4 py-2">{m.subjectName}</td>
                  <td className="px-4 py-2">{m.examType}</td>
                  <td className="px-4 py-2">{m.marks ?? "—"} / {m.maxMarks}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{m.grade || "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
