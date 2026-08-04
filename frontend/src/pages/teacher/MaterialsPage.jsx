import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, X, FileText, Trash2 } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { teacherApi } from "../../api/teacherApi";
import { materialApi } from "../../api/materialApi";
import { cloudinaryApi } from "../../api/cloudinaryApi";
import { useAuth } from "../../hooks/useAuth";

export default function MaterialsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [classId, setClassId] = useState("");
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", type: "notes", subjectId: "", file: null });

  useEffect(() => {
    (async () => {
      const { data } = await teacherApi.me();
      setProfile(data);
      if (data.subjects?.length) {
        setClassId(data.subjects[0].classId);
        setForm((f) => ({ ...f, subjectId: data.subjects[0].subjectId }));
      }
      setLoading(false);
    })();
  }, []);

  const load = async (cid) => {
    if (!cid) return;
    setLoading(true);
    try {
      const { data } = await materialApi.list({ classId: cid, page: 0, size: 50 });
      setMaterials(data.content ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(classId); }, [classId]);

  const upload = async (e) => {
    e.preventDefault();
    if (!form.file) { toast.error("Choose a file"); return; }
    setUploading(true);
    try {
      const uploaded = await cloudinaryApi.uploadFile(form.file, `edutrack/materials/${classId}/${form.subjectId}`, "edutrack_materials");
      await materialApi.create({
        title: form.title,
        description: form.description,
        type: form.type,
        classId,
        subjectId: form.subjectId,
        cloudinaryUrl: uploaded.secure_url,
        cloudinaryPublicId: uploaded.public_id,
        fileType: uploaded.resource_type === "image" ? "image" : "pdf",
        fileSizeKb: Math.round((uploaded.bytes || 0) / 1024),
        tags: [],
      });
      toast.success("Material uploaded");
      setShowForm(false);
      setForm({ ...form, title: "", description: "", file: null });
      load(classId);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id) => {
    try {
      await materialApi.remove(id);
      toast.success("Removed");
      load(classId);
    } catch {
      toast.error("Could not remove");
    }
  };

  return (
    <div>
      <PageHeader
        title="Study Materials"
        subtitle="Share notes, references, and assignments with your class"
        action={
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" /> Upload
          </button>
        }
      />

      {profile?.subjects?.length > 1 && (
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="mb-4 rounded-lg border border-slate-300 px-3 py-2 text-sm">
          {[...new Map(profile.subjects.map((s) => [s.classId, s.className])).entries()].map(([id, name]) => (
            <option key={id} value={id}>Class {name}</option>
          ))}
        </select>
      )}

      {loading ? <LoadingSpinner /> : materials.length === 0 ? (
        <EmptyState title="No materials yet" />
      ) : (
        <ul className="space-y-2">
          {materials.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
              <a href={m.cloudinaryUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-brand-600" />
                <div>
                  <p className="font-medium text-slate-900">{m.title}</p>
                  <p className="text-xs text-slate-500">{m.type} · {m.fileType}</p>
                </div>
              </a>
              {m.uploadedBy === user?.userId && (
                <button onClick={() => remove(m.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              )}
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Upload Material</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={upload} className="space-y-3">
              <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {profile?.subjects?.filter((s) => s.classId === classId).map((s) => (
                  <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>
                ))}
              </select>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="textbook">Textbook</option>
                <option value="notes">Notes</option>
                <option value="reference">Reference</option>
                <option value="assignment">Assignment</option>
              </select>
              <input required type="file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
                className="w-full text-sm" />
              <button disabled={uploading} className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
