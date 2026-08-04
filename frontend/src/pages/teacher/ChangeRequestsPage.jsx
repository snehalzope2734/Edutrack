import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AlertCircle, ArrowRight, BadgeCheck, CheckCircle2, Clock3, Eye, FileText, Search, Sparkles, UserRound, XCircle, X } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { teacherApi } from "../../api/teacherApi";
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

const actionStyles = {
  VERIFY: "bg-brand-600 text-white hover:bg-brand-700",
  CLARIFICATION: "bg-amber-500 text-white hover:bg-amber-600",
  FORWARD: "bg-emerald-600 text-white hover:bg-emerald-700",
};

const requestTypeStyles = {
  phone: "bg-sky-50 text-sky-700",
  address: "bg-emerald-50 text-emerald-700",
  parentName: "bg-violet-50 text-violet-700",
  parentEmail: "bg-orange-50 text-orange-700",
  parentPhone: "bg-amber-50 text-amber-700",
  bloodGroup: "bg-rose-50 text-rose-700",
};

function getRequestTypeMeta(field) {
  switch (field) {
    case "phone": return { label: "Contact Number", icon: "📞" };
    case "address": return { label: "Address", icon: "🏠" };
    case "parentName": return { label: "Parent Details", icon: "👨‍👩‍👧" };
    case "parentEmail": return { label: "Email", icon: "✉️" };
    case "parentPhone": return { label: "Parent Contact", icon: "📲" };
    case "bloodGroup": return { label: "Blood Group", icon: "🩸" };
    default: return { label: "Profile Detail", icon: "📝" };
  }
}

export default function ChangeRequestsPage() {
  const [profile, setProfile] = useState(null);
  const [classId, setClassId] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await teacherApi.me();
      setProfile(data);
      const own = data.classTeacherOf?.[0]?.classId || data.subjects?.[0]?.classId;
      if (own) setClassId(own);
      setLoading(false);
    })();
  }, []);

  const load = async (cid) => {
    if (!cid) return;
    setLoading(true);
    try {
      const { data } = await changeRequestApi.list({ classId: cid });
      setRequests(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(classId); }, [classId]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesSearch = !query || `${request.studentName || ""} ${request.fieldLabel || ""} ${request.reason || ""}`.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || request.status === statusFilter || request.verificationStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requests, search, statusFilter]);

  const summary = useMemo(() => ({
    pending: requests.filter((item) => item.status === "PENDING" || item.verificationStatus === "PENDING").length,
    reviewed: requests.filter((item) => ["VERIFIED", "CLARIFICATION_NEEDED", "FORWARDED"].includes(item.status)).length,
    forwarded: requests.filter((item) => item.status === "FORWARDED").length,
    resolved: requests.filter((item) => ["APPROVED", "REJECTED"].includes(item.status)).length,
  }), [requests]);

  const submitAction = async (requestId, action) => {
    const comment = drafts[requestId]?.comment || "";
    const recommendation = drafts[requestId]?.recommendation || "";
    setSubmitting(true);
    try {
      await changeRequestApi.review(requestId, { action, comment, recommendation });
      toast.success(action === "FORWARD" ? "Forwarded to admin" : action === "CLARIFICATION" ? "Clarification requested" : "Request verified");
      load(classId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update request");
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
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Change Requests</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Profile change review workspace</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-500">Review student profile updates, add your recommendation, and forward only the strongest cases to admin.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-800"><BadgeCheck className="h-4 w-4 text-brand-600" />{profile?.name || "Teacher"}</div>
            <p className="mt-1">Managing requests for class {profile?.classTeacherOf?.[0]?.className || "your assigned class"}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { label: "Pending", value: summary.pending, icon: Clock3, tone: "bg-slate-50 text-slate-700" },
            { label: "Reviewed", value: summary.reviewed, icon: Eye, tone: "bg-sky-50 text-sky-700" },
            { label: "Forwarded", value: summary.forwarded, icon: ArrowRight, tone: "bg-emerald-50 text-emerald-700" },
            { label: "Resolved", value: summary.resolved, icon: CheckCircle2, tone: "bg-violet-50 text-violet-700" },
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
          <div className="flex flex-wrap gap-2">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              <option value="all">All statuses</option>
              <option value="PENDING">Pending review</option>
              <option value="VERIFIED">Verified</option>
              <option value="CLARIFICATION_NEEDED">Needs clarification</option>
              <option value="FORWARDED">Forwarded</option>
            </select>
          </div>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-sm">
          <EmptyState title="You're all caught up." description="No profile change requests require your review." />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredRequests.map((request) => {
            const requestMeta = getRequestTypeMeta(request.fieldName);
            const status = request.status || request.verificationStatus || "PENDING";
            return (
              <div key={request.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-brand-50 p-3 text-brand-600">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{request.studentName}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[status] || statusStyles.PENDING}`}>{status.replace(/_/g, " ")}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">Roll No {request.studentRollNumber || "—"} • {request.studentClassName || "—"}{request.studentClassSection ? ` ${request.studentClassSection}` : ""}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${requestTypeStyles[request.fieldName] || requestTypeStyles.phone}`}>{requestMeta.icon} {requestMeta.label}</span>
                </div>

                <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Submitted</span>
                    <span>{request.createdAt ? format(new Date(request.createdAt), "MMM d, yyyy") : "—"}</span>
                  </div>
                  <div className="mt-3 flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 text-brand-600" />
                    <p className="text-sm text-slate-600">{request.reason || "No additional context provided."}</p>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Current</p>
                      <p className="mt-2 font-medium text-slate-700">{request.currentValue || "—"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Requested</p>
                      <p className="mt-2 font-medium text-brand-700">{request.newValue || "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setSelectedRequest(request)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">View request</button>
                  <button type="button" onClick={() => submitAction(request.id, "VERIFY")} className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${actionStyles.VERIFY}`} disabled={submitting}>{submitting ? "Working…" : "Verify"}</button>
                  <button type="button" onClick={() => submitAction(request.id, "CLARIFICATION")} className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${actionStyles.CLARIFICATION}`}>Needs clarification</button>
                  <button type="button" onClick={() => submitAction(request.id, "FORWARD")} className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${actionStyles.FORWARD}`}>Forward to admin</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
          <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Request details</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">{selectedRequest.studentName} • {selectedRequest.fieldLabel}</h3>
              </div>
              <button type="button" onClick={() => setSelectedRequest(null)} className="rounded-full bg-slate-100 p-2 text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto p-6">
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-6">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><FileText className="h-4 w-4" /> Student details</div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-xs uppercase tracking-[0.24em] text-slate-400">Student</p><p className="mt-2 font-semibold text-slate-900">{selectedRequest.studentName}</p></div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-xs uppercase tracking-[0.24em] text-slate-400">Roll No</p><p className="mt-2 font-semibold text-slate-900">{selectedRequest.studentRollNumber || "—"}</p></div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-xs uppercase tracking-[0.24em] text-slate-400">Class</p><p className="mt-2 font-semibold text-slate-900">{selectedRequest.studentClassName || "—"} {selectedRequest.studentClassSection || ""}</p></div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-xs uppercase tracking-[0.24em] text-slate-400">Email</p><p className="mt-2 font-semibold text-slate-900">{selectedRequest.studentEmail || "—"}</p></div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><AlertCircle className="h-4 w-4" /> Change comparison</div>
                    <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-slate-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-3 text-left font-semibold text-slate-600">Field</th>
                            <th className="px-3 py-3 text-left font-semibold text-slate-600">Current</th>
                            <th className="px-3 py-3 text-left font-semibold text-slate-600">Requested</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-slate-200">
                            <td className="px-3 py-3 font-medium text-slate-700">{selectedRequest.fieldLabel}</td>
                            <td className="px-3 py-3 text-slate-600">{selectedRequest.currentValue || "—"}</td>
                            <td className="px-3 py-3 font-semibold text-brand-700">{selectedRequest.newValue || "—"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><BadgeCheck className="h-4 w-4" /> Teacher recommendation</div>
                    <textarea rows={4} value={drafts[selectedRequest.id]?.comment || ""} onChange={(event) => setDrafts((current) => ({ ...current, [selectedRequest.id]: { ...current[selectedRequest.id], comment: event.target.value } }))} placeholder="Add your verification note" className="mt-3 w-full rounded-[1.25rem] border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                    <textarea rows={3} value={drafts[selectedRequest.id]?.recommendation || ""} onChange={(event) => setDrafts((current) => ({ ...current, [selectedRequest.id]: { ...current[selectedRequest.id], recommendation: event.target.value } }))} placeholder="Add your recommendation for admin" className="mt-3 w-full rounded-[1.25rem] border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => submitAction(selectedRequest.id, "VERIFY")} className="rounded-2xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white">Verify</button>
                      <button type="button" onClick={() => submitAction(selectedRequest.id, "CLARIFICATION")} className="rounded-2xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white">Needs clarification</button>
                      <button type="button" onClick={() => submitAction(selectedRequest.id, "FORWARD")} className="rounded-2xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Forward to admin</button>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Clock3 className="h-4 w-4" /> Workflow timeline</div>
                    <div className="mt-4 space-y-3">
                      {[
                        { label: "Student submitted", value: selectedRequest.createdAt ? format(new Date(selectedRequest.createdAt), "MMM d, yyyy • h:mm a") : "—" },
                        { label: "Teacher reviewed", value: selectedRequest.teacherComment ? "Teacher added review note" : "Pending" },
                        { label: "Forwarded to admin", value: selectedRequest.forwardedToAdminAt ? format(new Date(selectedRequest.forwardedToAdminAt), "MMM d, yyyy • h:mm a") : "Pending" },
                        { label: "Admin decision", value: selectedRequest.status === "APPROVED" ? "Approved" : selectedRequest.status === "REJECTED" ? "Rejected" : "Awaiting admin" },
                      ].map((step, index) => (
                        <div key={step.label} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                          <div className={`mt-0.5 rounded-full ${index === 0 ? "bg-brand-600" : "bg-slate-300"} p-1.5`}><CheckCircle2 className="h-3.5 w-3.5 text-white" /></div>
                          <div>
                            <p className="font-semibold text-slate-800">{step.label}</p>
                            <p className="text-sm text-slate-500">{step.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
