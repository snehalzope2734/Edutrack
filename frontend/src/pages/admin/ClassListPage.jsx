import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
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
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [subjects, setSubjects] = useState({});
  const [form, setForm] = useState({ className: "", section: "", academicYear: "2026-2027", classTeacherId: "" });
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "", teacherId: "" });
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

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
      setCurrentPage(1);
    } catch {
      toast.error("Could not load classes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const normalize = (value) => String(value ?? "").trim();
      const labelA = `${normalize(a.className)}${a.section ? ` ${normalize(a.section)}` : ""}`.trim();
      const labelB = `${normalize(b.className)}${b.section ? ` ${normalize(b.section)}` : ""}`.trim();

      const parseLabel = (label) => {
        const numericPrefix = label.match(/^\s*(\d+)\s*(.*)$/);
        if (numericPrefix) {
          return {
            number: Number(numericPrefix[1]),
            remainder: numericPrefix[2].trim().toLowerCase(),
          };
        }

        return {
          number: null,
          remainder: label.toLowerCase(),
        };
      };

      const aParts = parseLabel(labelA);
      const bParts = parseLabel(labelB);

      if (aParts.number !== null && bParts.number !== null) {
        if (aParts.number !== bParts.number) {
          return aParts.number - bParts.number;
        }
        return aParts.remainder.localeCompare(bParts.remainder);
      }

      if (aParts.number !== null) return -1;
      if (bParts.number !== null) return 1;

      return aParts.remainder.localeCompare(bParts.remainder);
    });
  }, [classes]);

  const totalPages = Math.max(1, Math.ceil(sortedClasses.length / pageSize));
  const paginatedClasses = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedClasses.slice(startIndex, startIndex + pageSize);
  }, [sortedClasses, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const openClassDetails = async (classId) => {
    setSelectedClassId(classId);
    if (!subjects[classId]) {
      const { data } = await adminApi.listSubjects({ classId });
      setSubjects((prev) => ({ ...prev, [classId]: data }));
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const openEditClass = (klass) => {
    setSelectedClassId(null);
    setEditingClass(klass);
    setEditForm({
      className: klass.className,
      section: klass.section,
      academicYear: klass.academicYear,
      classTeacherId: klass.classTeacherId || "",
    });
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

  const updateSubjectTeacher = async (classId, subjectId, teacherId) => {
    try {
      const subject = (subjects[classId] ?? []).find((item) => item.id === subjectId);
      if (!subject) {
        toast.error("Subject not found");
        return;
      }

      await adminApi.updateSubject(subjectId, {
        name: subject.name,
        code: subject.code,
        classId: subject.classId,
        teacherId: teacherId || null,
      });

      toast.success("Teacher assignment updated");
      const { data } = await adminApi.listSubjects({ classId });
      setSubjects((prev) => ({ ...prev, [classId]: data }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update teacher assignment");
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

      {sortedClasses.length === 0 ? (
        <EmptyState title="No classes yet" description="Create your first class and section to get started." />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
            <p>Showing {paginatedClasses.length} of {sortedClasses.length} classes</p>
            <p>Page {currentPage} of {totalPages}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedClasses.map((c) => {
              return (
                <div key={c.id} className="group rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-950/95">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => openClassDetails(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openClassDetails(c.id);
                      }
                    }}
                    className="w-full cursor-pointer text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Class</p>
                        <h3 className="mt-2 text-2xl font-semibold text-slate-900">{c.className}{c.section ? ` ${c.section}` : ""}</h3>
                      </div>
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {c.academicYear}
                      </span>
                    </div>
                    <div className="mt-5 space-y-3 text-sm text-slate-600">
                      <p>
                        <span className="font-medium text-slate-900">Students:</span> {c.studentCount}
                      </p>
                      <p>
                        <span className="font-medium text-slate-900">Class Teacher:</span>{" "}
                        <span className="text-slate-700">{c.classTeacherName || "Not assigned"}</span>
                      </p>
                      <p className="rounded-2xl bg-slate-50 px-3 py-2 text-slate-500">
                        Click to view subjects and teacher assignments
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditClass(c);
                    }}
                    className="mt-4 inline-flex items-center justify-center rounded-full border border-brand-500 px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                  >
                    Assign class teacher
                  </button>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`rounded-full px-3 py-2 text-sm font-semibold transition ${currentPage === page ? "bg-brand-600 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-100"}`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {selectedClass && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm dark:bg-slate-950/80">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/20 transition duration-200 dark:border-slate-800 dark:bg-slate-950 dark:shadow-slate-950/40">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Class details</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Subjects and assigned teachers for {selectedClass.className}{selectedClass.section ? ` ${selectedClass.section}` : ""}.
                </p>
              </div>
              <button type="button" onClick={() => setSelectedClassId(null)} className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Class</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{selectedClass.className}{selectedClass.section ? ` ${selectedClass.section}` : ""}</p>
                <p className="mt-3 text-sm text-slate-600">Academic Year: {selectedClass.academicYear}</p>
                <p className="mt-1 text-sm text-slate-600">Students: {selectedClass.studentCount}</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  {selectedClass.classTeacherName || "No class teacher assigned"}
                </div>
                <button
                  type="button"
                  onClick={() => openEditClass(selectedClass)}
                  className="mt-4 inline-flex items-center justify-center rounded-full border border-brand-500 bg-white px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                >
                  {selectedClass.classTeacherName ? "Change class teacher" : "Assign class teacher"}
                </button>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Subjects</p>
                <div className="mt-4 space-y-3">
                  {(subjects[selectedClass.id] ?? []).map((s) => (
                    <div key={s.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{s.name}</p>
                          {s.code && <p className="text-sm text-slate-500">{s.code}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            value={s.teacherId || ""}
                            onChange={(e) => updateSubjectTeacher(selectedClass.id, s.id, e.target.value)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          >
                            <option value="">Teacher unassigned</option>
                            {teachers.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(subjects[selectedClass.id] ?? []).length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                      No subjects added for this class yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {showForm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm dark:bg-slate-950/80">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition duration-200 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add Class</h2>
              <button onClick={() => setShowForm(false)} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={createClass} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Class</label>
                  <input required placeholder="9" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 transition duration-150 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-500/20" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Section</label>
                  <input required placeholder="A" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 transition duration-150 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-500/20" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Academic year</label>
                <input required value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 transition duration-150 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-500/20" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Class teacher (optional)</label>
                <select value={form.classTeacherId} onChange={(e) => setForm({ ...form, classTeacherId: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 transition duration-150 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-500/20">
                  <option value="">None</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <button disabled={saving} className="w-full rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-700 disabled:opacity-60">
                {saving ? "Saving…" : "Create class"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STEP 4: Edit Class Modal */}
      {editingClass && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm dark:bg-slate-950/80">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit Class</h2>
              <button type="button" onClick={() => setEditingClass(null)} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100">
                <X className="h-5 w-5" />
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