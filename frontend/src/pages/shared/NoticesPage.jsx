import { useEffect, useState } from "react";
import { Plus, X, Megaphone } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { noticeApi } from "../../api/noticeApi";
import { useAuth } from "../../hooks/useAuth";

export default function NoticesPage({ classId, className }) {
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", audience: isAdmin ? "ALL" : "CLASS", classId: classId ?? "" });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await noticeApi.list({ classId, page: 0, size: 30 });
      setNotices(data.content ?? []);
    } catch {
      toast.error("Could not load notices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setForm({ title: "", content: "", audience: isAdmin ? "ALL" : "CLASS", classId: classId ?? "" });
    load();
  }, [classId, isAdmin]);

  const openNewNotice = () => {
    setSelectedNotice(null);
    setForm({ title: "", content: "", audience: isAdmin ? "ALL" : "CLASS", classId: classId ?? "" });
    setShowForm(true);
  };

  const openEditNotice = (notice) => {
    setSelectedNotice(notice);
    setForm({
      title: notice.title || "",
      content: notice.content || "",
      audience: notice.audience || (isAdmin ? "ALL" : "CLASS"),
      classId: notice.classId ?? "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setSelectedNotice(null);
    setShowForm(false);
    setForm({ title: "", content: "", audience: isAdmin ? "ALL" : "CLASS", classId: classId ?? "" });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        audience: form.audience,
        classId: form.audience === "CLASS" ? form.classId : null,
      };

      if (!payload.title) return toast.error("Title is required");
      if (!payload.content) return toast.error("Content is required");
      if (payload.audience === "CLASS" && !payload.classId) return toast.error("Select a class for class-level notices");

      if (selectedNotice) {
        await noticeApi.update(selectedNotice.id, payload);
        toast.success("Notice updated");
      } else {
        await noticeApi.create(payload);
        toast.success("Notice posted");
      }

      closeForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save notice");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this notice?")) return;

    try {
      await noticeApi.remove(id);
      toast.success("Notice deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete notice");
    }
  };

  return (
    <div>
      <PageHeader
        title="Notices"
        subtitle={role === "TEACHER" ? `Announcements for ${className || "your class"}` : "School-wide announcements"}
        action={
          <button onClick={openNewNotice} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" /> New Notice
          </button>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : notices.length === 0 ? (
        <EmptyState title="No notices yet" description="Post your first announcement." />
      ) : (
        <div className="space-y-3">
          {notices.map((n) => (
            <div key={n.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-brand-600" />
                    <p className="font-medium text-slate-900">{n.title}</p>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-600">{n.content}</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-2 text-right">
                    <button
                      onClick={() => openEditNotice(n)}
                      className="rounded bg-blue-500 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="rounded bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {n.postedByName} · {n.postedAt ? format(new Date(n.postedAt), "MMM d, yyyy h:mm a") : ""} · {n.audience}
              </p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selectedNotice ? "Edit Notice" : "New Notice"}</h2>
              <button onClick={closeForm}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Title</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Content</label>
                <textarea
                  required
                  rows={4}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              {isAdmin && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Audience</label>
                  <select
                    value={form.audience}
                    onChange={(e) => setForm({ ...form, audience: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="ALL">Everyone</option>
                    <option value="CLASS">A specific class</option>
                  </select>
                </div>
              )}
              {form.audience === "CLASS" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Class</label>
                  <input
                    required
                    value={form.classId || ""}
                    onChange={(e) => setForm({ ...form, classId: e.target.value })}
                    placeholder="Enter class id"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              )}
              <button
                disabled={saving}
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : selectedNotice ? "Update notice" : "Post notice"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
