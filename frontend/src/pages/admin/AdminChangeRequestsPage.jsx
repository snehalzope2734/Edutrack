import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { BadgeCheck, CheckCircle2, Clock3, Eye, Search, ShieldCheck, XCircle, X } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { changeRequestApi } from "../../api/changeRequestApi";
import { format } from "date-fns";

const statusStyles = {
  PENDING: "bg-slate-100 text-slate-700",
  VERIFIED: "bg-sky-100 text-sky-700",
  CLARIFICATION_NEEDED: "bg-amber-100 text-amber-700",
  FORWARDED: "bg-emerald-100 text-emerald-700",
  APPROVED: "bg-violet-100 text-violet-700",
  REJECTED: "bg-rose-100 text-rose-700",
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
      const matchesStatus = statusFilter === "all" || request.status === statusFilter || request.verificationStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requests, search, statusFilter]);

  const summary = useMemo(() => ({
    pending: requests.filter((item) => item.status === "FORWARDED" || item.status === "VERIFIED" || item.status === "PENDING").length,
    approved: requests.filter((item) => item.status === "APPROVED").length,
    rejected: requests.filter((item) => item.status === "REJECTED").length,
    resolved: requests.filter((item) => ["APPROVED", "REJECTED"].includes(item.status)).length,
  }), [requests]);

  const finalizeRequest = async (requestId, action) => {
    setSubmitting(true);
    try {
      await changeRequestApi.review(requestId, { action, comment });
      toast.success(action === "APPROVE" ? "Request approved" : "Request rejected");
      setSelectedRequest(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not finalize request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Admin Review</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Final approval workspace</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-500">Review teacher-verified change requests and make the final decision for the student profile.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-800"><ShieldCheck className="h-4 w-4 text-brand-600" />Admin operations</div>
            <p className="mt-1">Approvals and rejections are handled only here.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { label: "Pending", value: summary.pending, icon: Clock3, tone: "bg-slate-50 text-slate-700" },
            { label: "Approved", value: summary.approved, icon: CheckCircle2, tone: "bg-violet-50 text-violet-700" },
            { label: "Rejected", value: summary.rejected, icon: XCircle, tone: "bg-rose-50 text-rose-700" },
            { label: "Resolved", value: summary.resolved, icon: BadgeCheck, tone: "bg-emerald-50 text-emerald-700" },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:shadow-sm">
              <div className={`inline-flex rounded-2xl p-2 ${item.tone}`}><item.icon className="h-4 w-4" /></div>
              <p className="mt-4 text-sm uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <Search className="h-4 w-4" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student or field..." className="w-full bg-transparent outline-none sm:w-64" />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <option value="all">All statuses</option>
            <option value="FORWARDED">Forwarded</option>
            <option value="VERIFIED">Verified</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-sm">
          <EmptyState title="No requests need admin attention." description="All forwarded reviews have been handled." />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredRequests.map((request) => (
            <div key={request.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{request.studentName}</h3>
                  <p className="mt-1 text-sm text-slate-500">{request.fieldLabel} • {request.studentRollNumber || "—"}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[request.status] || statusStyles.PENDING}`}>{request.status.replace(/_/g, " ")}</span>
              </div>
              <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-xs uppercase tracking-[0.24em] text-slate-400">Current</p><p className="mt-2 font-medium text-slate-700">{request.currentValue || "—"}</p></div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-xs uppercase tracking-[0.24em] text-slate-400">Requested</p><p className="mt-2 font-semibold text-brand-700">{request.newValue || "—"}</p></div>
                </div>
                <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">Teacher recommendation</p>
                  <p className="mt-2">{request.teacherRecommendation || "No recommendation has been added yet."}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => setSelectedRequest(request)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Review</button>
                <button type="button" onClick={() => finalizeRequest(request.id, "APPROVE")} className="rounded-2xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white">Approve</button>
                <button type="button" onClick={() => finalizeRequest(request.id, "REJECT")} className="rounded-2xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
          <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Admin decision</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">{selectedRequest.studentName}</h3>
              </div>
              <button type="button" onClick={() => setSelectedRequest(null)} className="rounded-full bg-slate-100 p-2 text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 p-6">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">Teacher note</p>
                <p className="mt-2 text-sm text-slate-600">{selectedRequest.teacherComment || "No teacher note yet."}</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">Recommendation</p>
                <p className="mt-2 text-sm text-slate-600">{selectedRequest.teacherRecommendation || "No recommendation yet."}</p>
              </div>
              <textarea rows={4} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add the admin decision note" className="w-full rounded-[1.25rem] border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => finalizeRequest(selectedRequest.id, "APPROVE")} className="rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white">Approve request</button>
                <button type="button" onClick={() => finalizeRequest(selectedRequest.id, "REJECT")} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Reject request</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
