import { useEffect, useState } from "react";
import { Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { adminApi } from "../../api/adminApi";

export default function ClassListPage() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [subjects, setSubjects] = useState({});
  const [form, setForm] = useState({ className: "", section: "", academicYear: "2026-2027", classTeacherId: "" });
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "", teacherId: "" });
  const [saving, setSaving] = useState(false);

  // STEP 1: Edit states
  const [editingClass, setEditingClass] = useState(null);
  const [editForm, setEditForm] = useState({
    className: "",
    section: "",
    academicYear: "",
    classTeacherId: "",
  });
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [classesRes, teachersRes] = await Promise.all([
        adminApi.listClasses(),
        adminApi.listTeachers({ page: 0, size: 200 }),
      ]);
      setClasses(classesRes.data ?? []);
      setTeachers(teachersRes.data.content ?? []);
    } catch {
      toast.error("Could not load classes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleExpand = async (classId) => {
    if (expanded === classId) {
      setExpanded(null);
      return;
    }
    setExpanded(classId);
    if (!subjects[classId]) {
      const { data } = await adminApi.listSubjects({ classId });
      setSubjects((prev) => ({ ...prev, [classId]: data }));
    }
  };

  const createClass = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.createClass({ ...form, classTeacherId: form.classTeacherId || null });
      toast.success("Class created");
      setShowForm(false);
      setForm({ className: "", section: "", academicYear: "2026-2027", classTeacherId: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not create class");
    } finally {
      setSaving(false);
    }
  };

  const createSubject = async (classId, e) => {
    e.preventDefault();
    try {
      await adminApi.createSubject({ ...subjectForm, classId, teacherId: subjectForm.teacherId || null });
      toast.success("Subject added");
      const { data } = await adminApi.listSubjects({ classId });
      setSubjects((prev) => ({ ...prev, [classId]: data }));
      setSubjectForm({ name: "", code: "", teacherId: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not add subject");
    }
  };

  // STEP 3: Update function
  const updateClass = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await adminApi.updateClass(editingClass.id, {
        ...editForm,
        classTeacherId: editForm.classTeacherId || null,
      });
      toast.success("Class updated");
      setEditingClass(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setUpdating(false);
    }
  };

  const deleteClass = async (id) => {
    if (!window.confirm("Delete this class?")) return;

    try {
      await adminApi.deleteClass(id);
      toast.success("Class deleted");
      load();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        "Cannot delete class"
      );
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Classes"
        subtitle="Manage classes, sections, and subjects"
        action={
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" /> Add Class
          </button>
        }
      />

      {classes.length === 0 ? (
        <EmptyState title="No classes yet" description="Create your first class and section to get started." />
      ) : (
        <div className="space-y-3">
          {classes.map((c) => {
            // STEP 5: Delete disable logic
            const canDelete =
              c.studentCount === 0 &&
              (subjects[c.id]?.length ?? 0) === 0;

            return (
              <div key={c.id} className="rounded-xl border border-slate-200 bg-white">
                <button onClick={() => toggleExpand(c.id)} className="flex w-full items-center justify-between px-5 py-4 text-left">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Class {c.className}-{c.section}
                    </h3>
                    <p className="text-sm text-slate-600">
                      Academic Year: {c.academicYear}
                    </p>
                    <p className="text-sm text-slate-600">
                      Students: {c.studentCount}
                    </p>
                    {/* STEP 6: Class teacher badge */}
                    <div className="mt-1">
                      <span className="text-sm text-slate-600">
                        Class Teacher :
                      </span>
                      <span className="ml-2 inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                        {c.classTeacherName || "Not Assigned"}
                      </span>
                    </div>
                  </div>
                  {expanded === c.id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>

                {expanded === c.id && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    
                    <div className="mb-4 flex justify-end gap-2">
                      {/* STEP 2: Edit button */}
                      <button
                        onClick={() => {
                          setEditingClass(c);
                          setEditForm({
                            className: c.className,
                            section: c.section,
                            academicYear: c.academicYear,
                            classTeacherId: c.classTeacherId || "",
                          });
                        }}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 text-sm font-medium"
                      >
                        Edit
                      </button>

                      {/* STEP 5: Delete button with validation */}
                      <button
                        disabled={!canDelete}
                        onClick={() => deleteClass(c.id)}
                        className={
                          canDelete
                            ? "rounded-lg bg-red-600 px-3 py-2 text-white hover:bg-red-700 text-sm font-medium"
                            : "rounded-lg bg-gray-400 px-3 py-2 text-white cursor-not-allowed text-sm font-medium"
                        }
                      >
                        Delete
                      </button>
                    </div>

                    <p className="mb-2 text-sm font-medium text-slate-700">Subjects</p>
                    <ul className="mb-3 space-y-1">
                      {(subjects[c.id] ?? []).map((s) => (
                        <li key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                          <span>{s.name} {s.code && <span className="text-slate-400">({s.code})</span>}</span>
                          <span className="text-slate-500">{s.teacherName || "Unassigned"}</span>
                        </li>
                      ))}
                      {(subjects[c.id] ?? []).length === 0 && <li className="text-sm text-slate-400">No subjects yet</li>}
                    </ul>
                    <form onSubmit={(e) => createSubject(c.id, e)} className="flex flex-wrap gap-2">
                      <input required placeholder="Subject name" value={subjectForm.name}
                        onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                      <input placeholder="Code" value={subjectForm.code}
                        onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                        className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                      <select value={subjectForm.teacherId} onChange={(e) => setSubjectForm({ ...subjectForm, teacherId: e.target.value })}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                        <option value="">Assign teacher…</option>
                        {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">Add</button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Class Modal */}
      {showForm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Class</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={createClass} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Class</label>
                  <input required placeholder="9" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Section</label>
                  <input required placeholder="A" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Academic year</label>
                <input required value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Class teacher (optional)</label>
                <select value={form.classTeacherId} onChange={(e) => setForm({ ...form, classTeacherId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">None</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <button disabled={saving} className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                {saving ? "Saving…" : "Create class"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STEP 4: Edit Class Modal */}
      {editingClass && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit Class</h2>
              <button type="button" onClick={() => setEditingClass(null)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={updateClass} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Class</label>
                  <input
                    required
                    value={editForm.className}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        className: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Section</label>
                  <input
                    required
                    value={editForm.section}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        section: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Academic year</label>
                <input
                  required
                  value={editForm.academicYear}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      academicYear: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Class teacher (optional)</label>
                <select
                  value={editForm.classTeacherId}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      classTeacherId: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">None</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="rounded bg-gray-200 px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </button>

                <button
                  disabled={updating}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {updating ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}