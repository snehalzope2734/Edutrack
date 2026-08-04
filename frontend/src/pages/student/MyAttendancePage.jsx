import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { format } from "date-fns";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { studentApi } from "../../api/studentApi";
import { attendanceApi } from "../../api/attendanceApi";

const COLORS = { Present: "#10b981", Absent: "#ef4444", Late: "#f59e0b" };

export default function MyAttendancePage() {
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: me } = await studentApi.me();
        const [summaryRes, recordsRes] = await Promise.all([
          attendanceApi.studentSummary(me.studentId),
          attendanceApi.studentRecords(me.studentId, {}),
        ]);
        setSummary(summaryRes.data);
        setRecords(recordsRes.data.sort((a, b) => new Date(b.date) - new Date(a.date)));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  const totals = records.reduce(
    (acc, r) => {
      if (r.status === "P") acc.Present++;
      else if (r.status === "A") acc.Absent++;
      else if (r.status === "L") acc.Late++;
      return acc;
    },
    { Present: 0, Absent: 0, Late: 0 }
  );
  const pieData = Object.entries(totals).map(([name, value]) => ({ name, value })).filter((d) => d.value > 0);

  const barData = (summary?.subjectWise ?? []).map((s) => ({ subject: s.subjectName, percentage: s.percentage }));

  return (
    <div>
      <PageHeader title="My Attendance" subtitle={`${summary?.overall ?? 0}% overall`} />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="mb-3 text-sm font-medium text-slate-700">Present / Absent / Late</p>
          {pieData.length === 0 ? <EmptyState title="No attendance data yet" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {pieData.map((entry) => <Cell key={entry.name} fill={COLORS[entry.name]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="mb-3 text-sm font-medium text-slate-700">Attendance % by subject</p>
          {barData.length === 0 ? <EmptyState title="No subject-wise data yet" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="percentage" fill="#3652f5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <p className="mb-3 text-sm font-medium text-slate-700">Recent records</p>
      {records.length === 0 ? (
        <EmptyState title="No attendance records yet" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Date</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Subject</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.slice(0, 30).map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2">{format(new Date(r.date), "MMM d, yyyy")}</td>
                  <td className="px-4 py-2">{r.subjectName}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === "P" ? "bg-emerald-100 text-emerald-700" :
                      r.status === "A" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {r.status === "P" ? "Present" : r.status === "A" ? "Absent" : "Late"}
                    </span>
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
