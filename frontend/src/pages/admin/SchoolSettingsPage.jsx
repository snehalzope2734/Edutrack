import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { schoolApi } from "../../api/schoolApi";
import { cloudinaryApi } from "../../api/cloudinaryApi";

const FIELDS = [
  ["schoolName", "School name"], ["tagline", "Tagline"], ["principalName", "Principal name"],
  ["phone", "Phone"], ["email", "Email"], ["website", "Website"],
  ["address", "Address"], ["city", "City"], ["state", "State"], ["pincode", "Pincode"],
  ["establishedYear", "Established year"],
];

export default function SchoolSettingsPage() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await schoolApi.get();
      setForm(data);
      setLoading(false);
    })();
  }, []);

  const uploadLogo = async (file) => {
    try {
      const uploaded = await cloudinaryApi.uploadFile(file, "edutrack/school", "edutrack_profiles");
      setForm({ ...form, logoUrl: uploaded.secure_url });
      toast.success("Logo uploaded — remember to save");
    } catch {
      toast.error("Upload failed");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await schoolApi.update(form);
      setForm(data);
      toast.success("School info updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="School Settings" subtitle="Edit school info and branding" />
      <form onSubmit={submit} className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-4">
          {form.logoUrl && <img src={form.logoUrl} alt="logo" className="h-14 w-14 rounded-lg object-cover" />}
          <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Upload logo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FIELDS.map(([key, label]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
              <input value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          ))}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
          <textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <button disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
