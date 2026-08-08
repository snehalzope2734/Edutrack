import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, Clock3, FileText, Search, UserRound } from "lucide-react";
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
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  REJECTED: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
};

export default function ChangeRequestFormPage() {
  const [form, setForm] = useState({ fieldName: "phone", oldValue: "", newValue: "", reason: "", attachmentNames: "" });
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
      toast.success("Request submitted directly to Admin for approval");
      setForm({ fieldName: "phone", oldValue: "", newValue: "", reason: "", attachmentNames: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not submit request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Profile Updates</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Request a Profile Change</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Submit profile change requests directly to the Admin for fast review and approval.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
              <CheckCircle2 className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Direct Admin Review
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Submitted directly to Admin for approval</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Field to change</label>
            <select value={form.fieldName} onChange={(e) => setForm({ ...form, fieldName: e.target.value })} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
              {EDITABLE_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Current value (optional)</label>
            <input value={form.oldValue} onChange={(e) => setForm({ ...form, oldValue: e.target.value })} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" placeholder="Enter current value" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">New requested value</label>
            <input required value={form.newValue} onChange={(e) => setForm({ ...form, newValue: e.target.value })} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" placeholder="Enter new value" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Supporting documents (optional)</label>
            <input value={form.attachmentNames} onChange={(e) => setForm({ ...form, attachmentNames: e.target.value })} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" placeholder="e.g. Aadhaar, Parent Approval Letter" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Reason for change</label>
            <textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" placeholder="Explain why you are requesting this change..." />
          </div>

          <button disabled={saving} className="w-full rounded-xl bg-brand-600 dark:bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 dark:hover:bg-brand-600 disabled:opacity-60 shadow-md">
            {saving ? "Submitting..." : "Submit Request to Admin"}
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Request History</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">Your Submissions</h2>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
              <Search className="h-3.5 w-3.5" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter..." className="w-24 bg-transparent outline-none" />
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : filteredRequests.length === 0 ? (
            <div className="mt-4"><EmptyState title="No requests submitted yet" description="Your submitted profile update requests will be listed here." /></div>
          ) : (
            <div className="mt-4 space-y-3">
              {filteredRequests.map((request) => (
                <div key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-white p-2 text-brand-600 dark:bg-slate-900 dark:text-brand-400"><UserRound className="h-4 w-4" /></div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{request.fieldLabel || request.fieldName}</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">New value: <span className="font-semibold text-brand-600 dark:text-brand-400">{request.newValue || "—"}</span></p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${statusStyles[request.status] || statusStyles.PENDING}`}>{request.status}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{request.createdAt ? format(new Date(request.createdAt), "MMM d, yyyy") : "—"}</span>
                    {request.attachmentNames && <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{request.attachmentNames}</span>}
                  </div>

                  {request.adminComment && (
                    <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Admin Note: </span>{request.adminComment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
