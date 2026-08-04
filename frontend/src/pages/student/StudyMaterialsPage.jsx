import { useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText, Search } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { studentApi } from "../../api/studentApi";
import { materialApi } from "../../api/materialApi";

function formatSize(bytes) {
  if (!bytes) return "0 KB";
  const sizeInMb = bytes / (1024 * 1024);
  return sizeInMb >= 1 ? `${sizeInMb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default function StudyMaterialsPage() {
  const [classId, setClassId] = useState("");
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [previewPdf, setPreviewPdf] = useState(null);

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
        const { data } = await materialApi.list({ classId, page: 0, size: 50 });
        setMaterials(data.content ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [classId]);

  const filteredMaterials = useMemo(() => {
    const query = search.trim().toLowerCase();
    return materials.filter((material) => !query || (material.title || "").toLowerCase().includes(query) || (material.description || "").toLowerCase().includes(query));
  }, [materials, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Study Materials"
        subtitle="PDF notes shared by your teachers are listed here for easy access."
      />

      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none focus:border-sky-400" />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-[1.75rem] border border-slate-200 bg-white p-5">
              <div className="h-4 w-24 rounded-full bg-slate-200" />
              <div className="mt-4 h-6 w-3/4 rounded bg-slate-200" />
              <div className="mt-3 h-4 w-full rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <EmptyState title="No Notes Uploaded" description="Your teacher has not shared any PDF notes for this class yet." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMaterials.map((material) => (
            <article key={material.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">PDF Note</p>
                  <h3 className="text-lg font-semibold text-slate-900">{material.title}</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-500">{material.description || "No description provided."}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{material.subjectId || "Subject"}</span>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">PDF</span>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-500">
                <div className="flex items-center justify-between"><span>File size</span><span className="font-medium text-slate-700">{formatSize(material.fileSizeKb ? material.fileSizeKb * 1024 : 0)}</span></div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => setPreviewPdf({ url: material.cloudinaryUrl, title: material.title })} className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">
                  <Eye className="h-4 w-4" /> View PDF
                </button>
                <a href={material.cloudinaryUrl} target="_blank" rel="noreferrer" download className="flex items-center gap-2 rounded-2xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">
                  <Download className="h-4 w-4" /> Download
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      {previewPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">PDF preview</p>
                <h3 className="text-lg font-semibold text-slate-900">{previewPdf.title}</h3>
              </div>
              <button type="button" onClick={() => setPreviewPdf(null)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Close</button>
            </div>
            <iframe title={previewPdf.title} src={previewPdf.url} className="h-full w-full bg-slate-100" />
          </div>
        </div>
      )}
    </div>
  );
}
