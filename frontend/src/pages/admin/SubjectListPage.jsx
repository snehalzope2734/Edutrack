import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { adminApi } from "../../api/adminApi";

const emptyForm = {
  name: "",
  code: "",
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
          code: form.code.trim(),
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
          code: subject.code || "",
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
      ) : (
        <DataTable
          rows={filteredSubjects}
          emptyMessage="No subjects found"
          columns={[
            { key: "name", header: "Subject" },
            { key: "code", header: "Code" },
            { key: "className", header: "Class" },
            { key: "teacherName", header: "Teacher" },
            {
                key: "actions",
                header: "Actions",
                render: (row) => (
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleEdit(row)}
                            className="rounded bg-blue-500 px-2 py-1 text-white hover:bg-blue-600"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => handleDelete(row.id)}
                            className="rounded bg-red-500 px-2 py-1 text-white hover:bg-red-600"
                        >
                            Delete
                        </button>
                    </div>
                )
            }
          ]}
        />
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

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                    Subject Code
                </label>
                <input
                    required
                    value={form.code}
                    onChange={(e)=>setForm({...form,code:e.target.value})}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
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