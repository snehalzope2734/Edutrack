import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { changeRequestApi } from "../../api/changeRequestApi";

export default function AdminChangeRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await changeRequestApi.list({});
        setRequests(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Change Requests" subtitle="All student profile change requests, school-wide" />
      {requests.length === 0 ? <EmptyState title="No change requests" /> : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Student</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Field</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">New value</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2">{r.studentName}</td>
                  <td className="px-4 py-2">{r.fieldName}</td>
                  <td className="px-4 py-2">{r.newValue}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                      r.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>{r.status}</span>
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
