import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { attendanceApi } from "../../api/attendanceApi";

export default function AdminAttendanceHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await attendanceApi.importHistory({ page: 0, size: 50 });
        setHistory(data.content ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Attendance Imports" subtitle="Every Excel attendance upload, school-wide — full audit trail" />
      {history.length === 0 ? <EmptyState title="No imports yet" /> : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">File</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Date</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Rows</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="px-4 py-2">{h.fileName}</td>
                  <td className="px-4 py-2">{h.date}</td>
                  <td className="px-4 py-2">{h.totalRows} total · {h.validRows} valid · {h.errorRows} errors</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      h.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700" :
                      h.status === "DISCARDED" ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-700"
                    }`}>{h.status}</span>
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
