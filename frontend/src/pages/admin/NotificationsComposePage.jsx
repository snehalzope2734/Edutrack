import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Send } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { adminApi } from "../../api/adminApi";
import { notificationApi } from "../../api/notificationApi";

export default function NotificationsComposePage() {
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ title: "", message: "", type: "notice", scope: "ALL", classId: "" });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await adminApi.listClasses();
      setClasses(data);
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const recipients = form.scope === "ALL" ? ["ALL"] : [`CLASS:${form.classId}`];
      await notificationApi.create({
        title: form.title, message: form.message, type: form.type,
        recipients, classId: form.scope === "CLASS" ? form.classId : null,
      });
      toast.success("Notification sent");
      setForm({ ...form, title: "", message: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not send notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHeader title="Send Notification" subtitle="Push an alert/reminder to everyone or a class" />
      <form onSubmit={submit} className="max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Title</label>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Message</label>
          <textarea required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="notice">Notice</option>
              <option value="alert">Alert</option>
              <option value="reminder">Reminder</option>
              <option value="update">Update</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Send to</label>
            <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="ALL">Everyone</option>
              <option value="CLASS">A specific class</option>
            </select>
          </div>
        </div>
        {form.scope === "CLASS" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Class</label>
            <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>Class {c.className}{c.section}</option>)}
            </select>
          </div>
        )}
        <button disabled={sending} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          <Send className="h-4 w-4" /> {sending ? "Sending…" : "Send notification"}
        </button>
      </form>
    </div>
  );
}
