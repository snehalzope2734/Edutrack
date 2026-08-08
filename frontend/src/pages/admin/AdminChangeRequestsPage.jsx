import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { BadgeCheck, CheckCircle2, Clock3, Search, ShieldCheck, XCircle, X } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { changeRequestApi } from "../../api/changeRequestApi";

const statusStyles = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  REJECTED: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
};

export default function AdminChangeRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const { data } = await changeRequestApi.list({});
      setRequests(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesSearch = !query || `${request.studentName || ""} ${request.fieldLabel || ""} ${request.reason || ""}`.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || request.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requests, search, statusFilter]);

  const summary = useMemo(() => ({
    pending: requests.filter((item) => item.status === "PENDING" || item.status === "FORWARDED" || item.status === "VERIFIED").length,
    approved: requests.filter((item) => item.status === "APPROVED").length,
    rejected: requests.filter((item) => item.status === "REJECTED").length,
    resolved: requests.filter((item) => ["APPROVED", "REJECTED"].includes(item.status)).length,
  }), [requests]);

  const finalizeRequest = async (requestId, action) => {
    setSubmitting(true);
    try {
      await changeRequestApi.review(requestId, { action, comment });
      toast.success(action === "APPROVE" ? "Request approved successfully" : "Request rejected");
      setSelectedRequest(null);
      setComment("");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not process request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading profile change requests..." />;

  return (
    <div className="space-y-6 pb-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Direct Admin Approval</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Profile Change Requests</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Student profile update requests arrive directly here for your immediate review and approval.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
              <ShieldCheck className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Direct Admin Decision
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">No teacher approval required.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { label: "Pending", value: summary.pending, icon: Clock3, tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
            { label: "Approved", value: summary.approved, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
            { label: "Rejected", value: summary.rejected, icon: XCircle, tone: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
            { label: "Total Resolved", value: summary.resolved, icon: BadgeCheck, tone: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 transition-all">
              <div className={`inline-flex rounded-xl p-2.5 ${item.tone}`}><item.icon className="h-4 w-4" /></div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-700 dark:text-slate-200">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student name or field..." className="w-full bg-transparent outline-none sm:w-64 placeholder-slate-400 dark:placeholder-slate-500" />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <option value="all">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <EmptyState title="No change requests found" description="No pending student profile update requests require attention." />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredRequests.map((request) => (
            <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition duration-200 hover:-translate-y-0.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{request.studentName}</h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{request.studentClassName || "Class"} • Roll No. {request.studentRollNumber || "—"}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${statusStyles[request.status] || statusStyles.PENDING}`}>{request.status}</span>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Field Requested</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{request.fieldLabel}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">New Value</p>
                    <p className="mt-1 text-sm font-bold text-brand-600 dark:text-brand-400">{request.newValue || "—"}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Current Value: </span>
                  <span className="text-slate-700 dark:text-slate-300">{request.currentValue || request.oldValue || "None"}</span>
                </div>

                {request.reason && (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Student's Reason: </span>
                    <span className="text-slate-700 dark:text-slate-300">{request.reason}</span>
                  </div>
                )}
              </div>

              {request.status === "PENDING" || request.status === "FORWARDED" || request.status === "VERIFIED" ? (
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <button type="button" onClick={() => setSelectedRequest(request)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                    Review with note
                  </button>
                  <button type="button" disabled={submitting} onClick={() => finalizeRequest(request.id, "APPROVE")} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition">
                    Approve
                  </button>
                  <button type="button" disabled={submitting} onClick={() => finalizeRequest(request.id, "REJECT")} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition">
                    Reject
                  </button>
                </div>
              ) : (
                <div className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Reviewed by Admin: <span className="font-semibold">{request.adminComment || "Completed"}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4 py-6">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Admin Decision</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{selectedRequest.studentName}</h3>
              </div>
              <button type="button" onClick={() => setSelectedRequest(null)} className="rounded-full bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950 text-sm">
                <p className="font-semibold text-slate-900 dark:text-slate-100">Changing {selectedRequest.fieldLabel}:</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">From "{selectedRequest.currentValue || selectedRequest.oldValue || '—'}" to <span className="font-bold text-brand-600 dark:text-brand-400">"{selectedRequest.newValue}"</span></p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Admin Decision Note (Optional)</label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Enter a comment or reason for approval/rejection..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setSelectedRequest(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                  Cancel
                </button>
                <button type="button" disabled={submitting} onClick={() => finalizeRequest(selectedRequest.id, "REJECT")} className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-rose-700">
                  Reject Request
                </button>
                <button type="button" disabled={submitting} onClick={() => finalizeRequest(selectedRequest.id, "APPROVE")} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700">
                  Approve Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
