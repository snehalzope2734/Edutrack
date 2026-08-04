import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { studentApi } from "../../api/studentApi";
import { materialApi } from "../../api/materialApi";

const TYPES = ["", "textbook", "notes", "reference", "assignment"];

export default function StudyMaterialsPage() {
  const [classId, setClassId] = useState("");
  const [type, setType] = useState("");
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await studentApi.me();
      setClassId(data.classId);
    })();
  }, []);

  useEffect(() => {
    if (!classId) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await materialApi.list({ classId, type: type || undefined, page: 0, size: 50 });
        setMaterials(data.content ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [classId, type]);

  return (
    <div>
      <PageHeader
        title="Study Materials"
        subtitle="Notes, references, and assignments from your teachers"
        action={
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {TYPES.map((t) => <option key={t} value={t}>{t ? t[0].toUpperCase() + t.slice(1) : "All types"}</option>)}
          </select>
        }
      />
      {loading ? <LoadingSpinner /> : materials.length === 0 ? (
        <EmptyState title="No materials yet" />
      ) : (
        <ul className="space-y-2">
          {materials.map((m) => (
            <li key={m.id}>
              <a href={m.cloudinaryUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-300">
                <FileText className="h-5 w-5 text-brand-600" />
                <div>
                  <p className="font-medium text-slate-900">{m.title}</p>
                  <p className="text-xs text-slate-500">{m.type} · {m.fileType}{m.description ? ` · ${m.description}` : ""}</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
