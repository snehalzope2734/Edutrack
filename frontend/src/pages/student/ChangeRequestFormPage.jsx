import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, Clock3, FileText, Search, Sparkles, UserRound } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { changeRequestApi } from "../../api/changeRequestApi";
import { format } from "date-fns";

const EDITABLE_FIELDS = [
  { key: "phone", label: "Phone number" },
  { key: "address", label: "Address" },
  { key: "parentName", label: "Parent name" },
  { key: "parentEmail", label: "Parent email" },
  { key: "parentPhone", label: "Parent phone" },
  { key: "bloodGroup", label: "Blood group" },
];

const statusStyles = {
  PENDING: "bg-slate-100 text-slate-700",
  VERIFIED: "bg-sky-100 text-sky-700",
  CLARIFICATION_NEEDED: "bg-amber-100 text-amber-700",
  FORWARDED: "bg-emerald-100 text-emerald-700",
  APPROVED: "bg-violet-100 text-violet-700",
  REJECTED: "bg-rose-100 text-rose-700",
};

export default function ChangeRequestFormPage() {
  const [form, setForm] = useState({ fieldName: "phone", oldValue: "", newValue: "", reason: "", attachmentNames: "Aadhaar, Parent Letter" });
  const [saving, setSaving] = useState(false);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await changeRequestApi.my();
      setMine(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return mine.filter((request) => !query || `${request.fieldLabel || ""} ${request.reason || ""} ${request.status || ""}`.toLowerCase().includes(query));
  }, [mine, search]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await changeRequestApi.create(form);
      toast.success("Request submitted for teacher review");
      setForm({ fieldName: "phone", oldValue: "", newValue: "", reason: "", attachmentNames: "Aadhaar, Parent Letter" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not submit request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Profile updates</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Request a profile change</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-500">Submit your request, attach supporting documents, and track the teacher-to-admin workflow from one place.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-800"><CheckCircle2 className="h-4 w-4 text-brand-600" />Workflow status</div>
            <p className="mt-1">Teacher verifies first • Admin makes the final decision</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={submit} className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Field to change</label>
            <select value={form.fieldName} onChange={(e) => setForm({ ...form, fieldName: e.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500">
              {EDITABLE_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Current value</label>
            <input value={form.oldValue} onChange={(e) => setForm({ ...form, oldValue: e.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">New value</label>
            <input required value={form.newValue} onChange={(e) => setForm({ ...form, newValue: e.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Supporting documents</label>
            <input value={form.attachmentNames} onChange={(e) => setForm({ ...form, attachmentNames: e.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Reason</label>
            <textarea rows={4} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
          </div>
          <button disabled={saving} className="w-full rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">
            {saving ? "Submitting…" : "Submit request"}
          </button>
        </form>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Your requests</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Request history</h2>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <Search className="h-4 w-4" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" className="bg-transparent outline-none" />
            </div>
          </div>

          {loading ? <LoadingSpinner /> : filteredRequests.length === 0 ? <div className="mt-4"><EmptyState title="No requests yet" description="Your profile changes will appear here once submitted." /></div> : (
            <div className="mt-4 space-y-3">
              {filteredRequests.map((request) => (
                <div key={request.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-white p-2 text-brand-600"><UserRound className="h-4 w-4" /></div>
                      <div>
                        <p className="font-semibold text-slate-900">{request.fieldLabel || request.fieldName}</p>
                        <p className="mt-1 text-sm text-slate-500">{request.newValue || "—"}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[request.status] || statusStyles.PENDING}`}>{request.status.replace(/_/g, " ")}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" />{request.createdAt ? format(new Date(request.createdAt), "MMM d") : "—"}</span>
                    <span className="inline-flex items-center gap-1"><FileText className="h-4 w-4" />{request.attachmentNames || "No documents attached"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
