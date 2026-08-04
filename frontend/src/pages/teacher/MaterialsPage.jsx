import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  BookOpenText,
  Download,
  Eye,
  FileText,
  FileUp,
  Filter,
  Maximize2,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { teacherApi } from "../../api/teacherApi";
import { materialApi } from "../../api/materialApi";
import { cloudinaryApi } from "../../api/cloudinaryApi";
import { useAuth } from "../../hooks/useAuth";

const MAX_PDF_SIZE = 10 * 1024 * 1024;

function formatSize(bytes) {
  if (!bytes) return "0 KB";
  const sizeInMb = bytes / (1024 * 1024);
  return sizeInMb >= 1 ? `${sizeInMb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return value;
  }
}

export default function MaterialsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [previewPdf, setPreviewPdf] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    (async () => {
      const { data } = await teacherApi.me();
      setProfile(data);
      if (data.subjects?.length) {
        const firstSubject = data.subjects[0];
        setClassId(firstSubject.classId);
        setSubjectId(firstSubject.subjectId);
      }
      setLoading(false);
    })();
  }, []);

  const classSubjects = useMemo(() => {
    if (!profile?.subjects?.length) return [];
    return profile.subjects.filter((subject) => subject.classId === classId);
  }, [classId, profile?.subjects]);

  useEffect(() => {
    if (!classId || !classSubjects.length) return;
    if (!classSubjects.some((subject) => subject.subjectId === subjectId)) {
      setSubjectId(classSubjects[0].subjectId);
    }
  }, [classId, classSubjects, subjectId]);

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

  useEffect(() => {
    if (classId) load(classId);
  }, [classId]);

  const handleFiles = (selectedFile) => {
    if (!selectedFile) return;
    const normalizedName = (selectedFile.name || "").toLowerCase();
    if (!selectedFile.type?.includes("pdf") && !normalizedName.endsWith(".pdf")) {
      toast.error("Only PDF files are allowed.");
      return;
    }
    if (selectedFile.size > MAX_PDF_SIZE) {
      toast.error("PDF exceeds maximum size.");
      return;
    }
    setFile(selectedFile);
  };

  const upload = async (event) => {
    event.preventDefault();
    if (!file) {
      toast.error("Choose a PDF file first.");
      return;
    }
    if (!title.trim()) {
      toast.error("Add a title for the note.");
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    const progressTimer = window.setInterval(() => {
      setUploadProgress((value) => (value >= 90 ? 90 : value + 10));
    }, 220);

    try {
      const uploaded = await cloudinaryApi.uploadFile(file, `edutrack/materials/${classId}/${subjectId}`, "edutrack_materials");
      await materialApi.create({
        title: title.trim(),
        description: description.trim(),
        type: "notes",
        classId,
        subjectId,
        cloudinaryUrl: uploaded.secure_url,
        cloudinaryPublicId: uploaded.public_id,
        fileType: uploaded.format === "pdf" ? "pdf" : "pdf",
        fileSizeKb: Math.round((uploaded.bytes || 0) / 1024),
        tags: [],
      });
      setUploadProgress(100);
      toast.success("PDF uploaded successfully.");
      setTitle("");
      setDescription("");
      setFile(null);
      load(classId);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Upload failed. Try again.");
    } finally {
      window.clearInterval(progressTimer);
      window.setTimeout(() => setUploadProgress(0), 600);
      setUploading(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await materialApi.remove(deleteTarget.id);
      toast.success("PDF note deleted.");
      setDeleteTarget(null);
      load(classId);
    } catch {
      toast.error("Could not delete the note.");
    }
  };

  const filteredMaterials = useMemo(() => {
    const query = search.trim().toLowerCase();
    const next = [...materials].filter((material) => {
      const matchesClass = classFilter === "all" || material.classId === classFilter;
      const matchesSubject = subjectFilter === "all" || material.subjectId === subjectFilter;
      const matchesSearch = !query || (material.title || "").toLowerCase().includes(query) || (material.description || "").toLowerCase().includes(query);
      return matchesClass && matchesSubject && matchesSearch;
    });
    next.sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.uploadedAt || 0) - new Date(b.uploadedAt || 0);
      }
      return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0);
    });
    return next;
  }, [classFilter, materials, search, sortBy, subjectFilter]);

  const canDelete = (material) => material.uploadedBy === user?.userId || material.uploadedBy === user?.id;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Study Materials"
        subtitle="Upload PDF notes for your class and subject so students can view and download them anytime."
      />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Upload Notes</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Create a polished PDF learning resource</h2>
            <p className="mt-2 text-sm text-slate-500">Only PDF notes are accepted. Keep the experience focused, professional, and easy for students to access.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700">
            <Sparkles className="h-4 w-4" /> PDF-only notes workspace
          </div>
        </div>

        <form onSubmit={upload} className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-medium text-slate-700">Class</span>
                <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-sky-400">
                  {[...new Map(profile?.subjects?.map((subject) => [subject.classId, subject.className]) ?? []).entries()].map(([id, name]) => (
                    <option key={id} value={id}>Class {name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-medium text-slate-700">Subject</span>
                <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-sky-400">
                  {classSubjects.map((subject) => (
                    <option key={subject.subjectId} value={subject.subjectId}>{subject.subjectName}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="space-y-2 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chapter 1 - Algebra" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-sky-400" required />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Description (optional)</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a short summary for students" rows="4" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-sky-400" />
            </label>

            <button type="submit" disabled={uploading} className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-70">
              {uploading ? "Uploading…" : "Upload Notes"}
            </button>
          </div>

          <label
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              handleFiles(event.dataTransfer.files?.[0]);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed px-6 py-10 text-center transition ${dragActive ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-slate-50"}`}
          >
            <input type="file" accept="application/pdf" className="hidden" onChange={(event) => handleFiles(event.target.files?.[0])} />
            <div className="rounded-full bg-white p-4 shadow-sm">
              <UploadCloud className="h-8 w-8 text-sky-600" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-900">{file ? file.name : "Drag & Drop PDF Here"}</p>
            <p className="mt-2 text-sm text-slate-500">or choose a file from your device.</p>
            <p className="mt-4 text-sm text-slate-400">Maximum size: 10 MB • PDF only</p>
            {uploading && (
              <div className="mt-6 w-full max-w-sm">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-sky-600 transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
          </label>
        </form>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none focus:border-sky-400" />
            </div>
            <div className="flex gap-3">
              <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-sky-400">
                <option value="all">All classes</option>
                {[...new Map(profile?.subjects?.map((subject) => [subject.classId, subject.className]) ?? []).entries()].map(([id, name]) => (
                  <option key={id} value={id}>Class {name}</option>
                ))}
              </select>
              <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-sky-400">
                <option value="all">All subjects</option>
                {profile?.subjects?.map((subject) => (
                  <option key={subject.subjectId} value={subject.subjectId}>{subject.subjectName}</option>
                ))}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-sky-400">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                <div className="h-4 w-24 rounded-full bg-slate-200" />
                <div className="mt-4 h-6 w-3/4 rounded bg-slate-200" />
                <div className="mt-3 h-4 w-full rounded bg-slate-200" />
                <div className="mt-2 h-4 w-2/3 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="mt-8 rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
              <FileText className="h-8 w-8 text-sky-600" />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-slate-900">No Notes Uploaded</h3>
            <p className="mt-2 text-sm text-slate-500">Upload your first PDF note to help students learn with a clear classroom resource.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredMaterials.map((material) => (
              <article key={material.id} className="group rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">PDF</span>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Notes</span>
                  </div>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">{material.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{material.description || "No description provided."}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{profile?.subjects?.find((subject) => subject.subjectId === material.subjectId)?.subjectName || "Subject"}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{profile?.subjects?.find((subject) => subject.classId === material.classId)?.className || "Class"}</span>
                </div>
                <div className="mt-5 space-y-2 text-sm text-slate-500">
                  <div className="flex items-center justify-between"><span>Uploaded by</span><span className="font-medium text-slate-700">{material.uploadedBy || "Teacher"}</span></div>
                  <div className="flex items-center justify-between"><span>Upload date</span><span className="font-medium text-slate-700">{formatDate(material.uploadedAt)}</span></div>
                  <div className="flex items-center justify-between"><span>File size</span><span className="font-medium text-slate-700">{formatSize(material.fileSizeKb ? material.fileSizeKb * 1024 : 0)}</span></div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setPreviewPdf({ url: material.cloudinaryUrl, title: material.title })} className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">
                    <Eye className="h-4 w-4" /> View PDF
                  </button>
                  <a href={material.cloudinaryUrl} target="_blank" rel="noreferrer" download className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">
                    <Download className="h-4 w-4" /> Download
                  </a>
                  {canDelete(material) && (
                    <button type="button" onClick={() => setDeleteTarget(material)} className="flex items-center gap-2 rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {previewPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">PDF preview</p>
                <h3 className="text-lg font-semibold text-slate-900">{previewPdf.title}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setZoom((value) => Math.min(2, Number((value + 0.25).toFixed(2))))} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"> <ZoomIn className="mr-2 inline h-4 w-4" />Zoom In</button>
                <button type="button" onClick={() => setZoom((value) => Math.max(0.75, Number((value - 0.25).toFixed(2))))} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"><ZoomOut className="mr-2 inline h-4 w-4" />Zoom Out</button>
                <button type="button" onClick={() => document.documentElement.requestFullscreen?.()} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"><Maximize2 className="mr-2 inline h-4 w-4" />Fullscreen</button>
                <a href={previewPdf.url} target="_blank" rel="noreferrer" download className="rounded-2xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white"> <Download className="mr-2 inline h-4 w-4" />Download</a>
                <button type="button" onClick={() => { setPreviewPdf(null); setZoom(1); }} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"><X className="mr-2 inline h-4 w-4" />Close</button>
              </div>
            </div>
            <iframe title={previewPdf.title} src={previewPdf.url} className="h-full w-full bg-slate-100" style={{ zoom }} />
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Delete this PDF?</h3>
                <p className="text-sm text-slate-500">This action removes the note from the classroom resources.</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={remove} className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
