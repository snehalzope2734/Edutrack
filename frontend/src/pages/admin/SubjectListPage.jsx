import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { adminApi } from "../../api/adminApi";

const emptyForm = {
  name: "",
  classId: "",
  teacherId: "",
};

export default function SubjectListPage() {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // STEP 5: Updated load() function
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.listSubjects();
      setSubjects(data ?? []);
    } catch {
      toast.error("Could not load subjects");
    } finally {
      setLoading(false);
    }
  };

  // STEP 6: Added loadLookups() function
  const loadLookups = async () => {
      try {
          const [cls, tch] = await Promise.all([
              adminApi.listClasses(),
              adminApi.listTeachers({
                  page: 0,
                  size: 100
              })
          ]);

          setClasses(cls.data.content ?? cls.data ?? []); 
          setTeacherOptions(tch.data.content ?? []);
      } catch {
          toast.error("Could not load dropdown data");
      }
  };

  // STEP 7: Added on mount useEffect (Debounce search removed for now)
  useEffect(() => {
      load();
      loadLookups();
  }, []);

  const filteredSubjects = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return subjects;
    return subjects.filter((subject) => {
      return [subject.name, subject.code, subject.className, subject.teacherName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [search, subjects]);

  const submit = async (e) => {
      e.preventDefault();
  
      const payload = {
          name: form.name.trim(),
          code: "",
          classId: form.classId,
          teacherId: form.teacherId || null
      };
  
      if (!payload.name)
          return toast.error("Subject name is required");
  
      if (!payload.classId)
          return toast.error("Please select a class");
  
      setSaving(true);
  
      try {
          if (form.id) {
              await adminApi.updateSubject(form.id, payload);
              toast.success("Subject updated");
          } else {
              await adminApi.createSubject(payload);
              toast.success("Subject created");
          }
  
          setForm(emptyForm);
          setShowForm(false);
          load();
  
      } catch (err) {
          toast.error(err.response?.data?.message || "Operation failed");
      } finally {
          setSaving(false);
      }
  };

  const handleEdit = (subject) => {
      setForm({
          id: subject.id,
          name: subject.name || "",
          classId: subject.classId || "",
          teacherId: subject.teacherId || ""
      });
      setShowForm(true);
  };

  // STEP 9: Delete Function
  const handleDelete = async (id) => {
      if (!window.confirm("Delete this subject?")) return;
  
      try {
          await adminApi.deleteSubject(id);
          toast.success("Subject deleted");
          load();
      } catch (err) {
          toast.error(err.response?.data?.message || "Delete failed");
      }
  };

  return (
    <div>
      {/* STEP 12: Page Header */}
      <PageHeader
        title="Subjects"
        subtitle="Manage school subjects"
        action={
          <button 
            onClick={() => { setForm(emptyForm); setShowForm(true); }} 
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Add Subject
          </button>
        }
      />

      {/* STEP 13: Search Placeholder */}
      <div className="mb-4">
        <input
            type="text"
            placeholder="Search subjects by name, code, class, or teacher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filteredSubjects.length === 0 ? (
        <EmptyState title="No subjects found" description="Add a subject to get started." />
      ) : (
        <div className="space-y-6">
          {Object.entries(
            filteredSubjects.reduce((acc, subject) => {
              const classKey = subject.className || "Unassigned class";
              if (!acc[classKey]) acc[classKey] = [];
              acc[classKey].push(subject);
              return acc;
            }, {})
          ).map(([className, subjectsForClass]) => (
            <div key={className} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Class</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{className}</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {subjectsForClass.length} subjects
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {subjectsForClass.map((subject) => (
                  <div key={subject.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-3">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Subject</p>
                      <h4 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{subject.name}</h4>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Code</p>
                        <p className="font-medium text-slate-900 dark:text-white">{subject.code}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Teacher</p>
                        <p className="font-medium text-slate-900 dark:text-white">{subject.teacherName || "Unassigned"}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEdit(subject)}
                        className="rounded-full bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(subject.id)}
                        className="rounded-full bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-20 overflow-y-auto flex items-center justify-center bg-black/30 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{form.id ? "Edit Subject" : "Add Subject"}</h2>
              <button onClick={() => { setShowForm(false); setForm(emptyForm); }}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                    Subject Name
                </label>
                <input
                    required
                    value={form.name}
                    onChange={(e)=>setForm({...form,name:e.target.value})}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                The subject code will be generated automatically from the subject name, class, and section.
              </div>
              
              {/* Class Dropdown */}
              <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Class
                  </label>
                  <select 
                      required 
                      value={form.classId || ""} 
                      onChange={(e) => setForm({ ...form, classId: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                      <option value="">Select Class</option>
                      {classes.map((c) => (
                          <option key={c.id} value={c.id}>{c.className} {c.section}</option>
                      ))}
                  </select>
              </div>

              {/* Teacher Dropdown */}
              <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Teacher
                  </label>
                  <select 
                      value={form.teacherId || ""} 
                      onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                      <option value="">Select Teacher</option>
                      {teacherOptions.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                  </select>
              </div>

              <button disabled={saving} className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 mt-2">
                {saving ? "Saving..." : (form.id ? "Update Subject" : "Create Subject")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}