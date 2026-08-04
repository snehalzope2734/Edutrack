import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { changeRequestApi } from "../../api/changeRequestApi";

const EDITABLE_FIELDS = [
  { key: "phone", label: "Phone number" },
  { key: "address", label: "Address" },
  { key: "parentName", label: "Parent name" },
  { key: "parentEmail", label: "Parent email" },
  { key: "parentPhone", label: "Parent phone" },
  { key: "bloodGroup", label: "Blood group" },
];

export default function ChangeRequestFormPage() {
  const [form, setForm] = useState({ fieldName: "phone", oldValue: "", newValue: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await changeRequestApi.create(form);
      toast.success("Request submitted to your class teacher");
      setForm({ fieldName: "phone", oldValue: "", newValue: "", reason: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not submit request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Request a Profile Change" subtitle="Your class teacher will review and approve or reject this" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Field to change</label>
            <select value={form.fieldName} onChange={(e) => setForm({ ...form, fieldName: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {EDITABLE_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Current value (optional)</label>
            <input value={form.oldValue} onChange={(e) => setForm({ ...form, oldValue: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">New value</label>
            <input required value={form.newValue} onChange={(e) => setForm({ ...form, newValue: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Reason</label>
            <textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <button disabled={saving} className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
            {saving ? "Submitting…" : "Submit request"}
          </button>
        </form>

        <div>
          <p className="mb-3 text-sm font-medium text-slate-700">Your requests</p>
          {loading ? <LoadingSpinner /> : mine.length === 0 ? <EmptyState title="No requests yet" /> : (
            <ul className="space-y-2">
              {mine.map((r) => (
                <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.fieldName}: {r.newValue}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                      r.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>{r.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
