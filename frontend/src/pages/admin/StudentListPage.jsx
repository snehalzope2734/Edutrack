import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { adminApi } from "../../api/adminApi";

// STEP 1: emptyForm updated
const emptyForm = {
  name: "",
  email: "",
  password: "",
  classId: "",
  dob: "",
  gender: "",
  bloodGroup: "",
  parentName: "",
  parentEmail: "",
  parentPhone: "",
  address: ""
};

export default function StudentListPage() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [page, setPage] = useState(0);
  const pageSize = 10;
  
  // STEP 2: Search state
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [studentsRes, classesRes] = await Promise.all([
        // STEP 3: API call updated with search
        adminApi.listStudents({ page: 0, size: 100, search }),
        adminApi.listClasses(),
      ]);
      setStudents(studentsRes.data.content ?? []);
      setClasses(classesRes.data ?? []);
    } catch {
      toast.error("Could not load students");
    } finally {
      setLoading(false);
    }
  };

  // STEP 4: Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
        load();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const submit = async (e) => {
    e.preventDefault();

    // STEP 13: Create payload with trimming
    const payload = {
        ...form,
        name: (form.name || "").trim(),
        email: (form.email || "").trim(),
        password: (form.password || "").trim(),
        parentName: (form.parentName || "").trim(),
        parentEmail: (form.parentEmail || "").trim(),
        parentPhone: (form.parentPhone || "").trim(),
        address: (form.address || "").trim(),
    };

    // STEP 9: Validations
    if (payload.name.length < 3) return toast.error("Name must be at least 3 characters");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return toast.error("Invalid email");
    
    // STEP 14: Only validate password on Create
    if (!form.id && payload.password.length < 8) return toast.error("Password minimum 8 characters");
    
    if (!payload.classId) return toast.error("Select class");
    if (!payload.dob) return toast.error("Select DOB");
    if (!payload.gender) return toast.error("Select gender");
    if (!payload.parentName) return toast.error("Parent name required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.parentEmail)) return toast.error("Invalid parent email");
    if (!/^[6-9]\d{9}$/.test(payload.parentPhone)) return toast.error("Invalid parent phone");
    if (!payload.address) return toast.error("Address required");

    setSaving(true);
    try {
      // STEP 11: Create / Edit logic
      if (form.id) {
        await adminApi.updateStudent(form.id, payload);
        toast.success("Student updated successfully.");
      } else {
        await adminApi.createStudent(payload);
        toast.success("Student created successfully.");
      }
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  // STEP 10 & 11: Edit and Delete Handlers
  const handleEdit = async (row) => {
      try {
        const { data } = await adminApi.getStudent(row.id);
        setForm({
            ...data,
            // Ensure classId maps correctly if it comes nested from the API
            classId: data.classId || (data.classEntity ? data.classEntity.id : "")
        });
        setShowForm(true);
      } catch {
        toast.error("Could not fetch student details");
      }
  };

  const handleDelete = async (id) => {
      if (!window.confirm("Delete this student?")) return;
      try {
          await adminApi.deleteStudent(id);
          toast.success("Student deleted successfully");
          load();
      } catch {
          toast.error("Delete failed");
      }
  };

  const totalStudents = students.length;
  const activeStudents = students.filter((student) => student.isActive).length;
  const inactiveStudents = totalStudents - activeStudents;
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const displayedStudents = selectedClassId ? students.filter((student) => student.classId === selectedClassId) : [];
  const totalPages = Math.max(1, Math.ceil(displayedStudents.length / pageSize));
  const pagedStudents = displayedStudents.slice(page * pageSize, (page + 1) * pageSize);

  const classGroups = classes.map((cls) => {
    const count = students.filter((student) => student.classId === cls.id).length;
    return {
      id: cls.id,
      name: `${cls.className}${cls.section ? ` ${cls.section}` : ""}`.trim(),
      count,
    };
  }).filter((group) => group.count > 0);

  const totalClasses = classGroups.length;

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Manage student records"
        action={
          <button onClick={() => { setForm(emptyForm); setShowForm(true); }} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" /> Add Student
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_auto] mb-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Total students</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{totalStudents}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Active</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700">{activeStudents}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Inactive</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{inactiveStudents}</p>
          </div>
        </div>
        <input
            type="text"
            placeholder="Search by Name, Email or Roll Number"
            value={search}
            onChange={(e) => { setSelectedClassId(null); setSearch(e.target.value); }}
            className="w-full min-w-[280px] max-w-2xl rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => setSelectedClassId(null)}
          className={`rounded-2xl border px-4 py-4 text-left shadow-sm transition ${selectedClassId === null ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:shadow-md"}`}
        >
          <p className="text-sm font-medium text-slate-700">All classes</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{totalClasses}</p>
          <p className="mt-1 text-sm text-slate-500">Classes available</p>
        </button>
        {classGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => { setSelectedClassId(group.id); setPage(0); }}
            className={`rounded-2xl border px-4 py-4 text-left shadow-sm transition ${selectedClassId === group.id ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:shadow-md"}`}
          >
            <p className="text-sm font-medium text-slate-700">{group.name}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{group.count}</p>
            <p className="mt-1 text-sm text-slate-500">Students in this class</p>
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : selectedClassId && selectedClass ? (
        <>
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">{selectedClass.name}{selectedClass.section ? ` ${selectedClass.section}` : ""}</p>
                  <p className="mt-1 text-sm text-slate-500">{displayedStudents.length} students in this class</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClassId(null)}
                  className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Show all classes
                </button>
              </div>
            </div>

          <DataTable
            rows={displayedStudents}
            emptyMessage="No students yet"
            columns={[
            { key: "name", header: "Name" },
            // STEP 12: Roll number only visible in table
            { key: "rollNumber", header: "Roll No." },
            { key: "className", header: "Class" },
            { key: "email", header: "Email" },
            { key: "isActive", header: "Status", render: (r) => (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {r.isActive ? "Active" : "Inactive"}
              </span>
            ) },
            // STEP 10: Actions column
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

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">Showing {pagedStudents.length} of {displayedStudents.length} students</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-sm">Page {page + 1} of {totalPages}</span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-slate-500">
          <p className="text-lg font-medium text-slate-700">Select a class card to view student details</p>
          <p className="mt-2 text-sm">The student list will appear once you choose a class.</p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl my-auto max-h-screen overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{form.id ? "Edit Student" : "Add Student"}</h2>
              <button onClick={() => { setShowForm(false); setForm(emptyForm); }}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Full name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
                {/* STEP 15: Readonly email in edit mode */}
                <input required type="email" readOnly={!!form.id} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${!!form.id ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} />
              </div>

              {/* STEP 7 & 14: Password visible only on create */}
              {!form.id && (
                  <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
                      <input
                          type="password"
                          required
                          autoComplete="new-password"
                          value={form.password}
                          onChange={(e) => setForm({...form, password: e.target.value})}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                  </div>
              )}

              {/* STEP 6: Roll Number removed from form */}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Class</label>
                  <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                    <option value="">Select…</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.className} {c.section}</option>)}
                  </select>
                </div>
                {/* STEP 8: Added missing fields */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">DOB</label>
                  <input required type="date" value={form.dob ? form.dob.split('T')[0] : ""} onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Gender</label>
                  <select required value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                    <option value="">Select…</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Blood Group</label>
                  <select value={form.bloodGroup || ""} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                    <option value="">Select…</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Parent name</label>
                <input required value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Parent email</label>
                  <input required type="email" value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Parent phone</label>
                  <input 
                    required 
                    type="tel" 
                    inputMode="numeric" 
                    maxLength={10} 
                    onInput={(e) => { e.target.value = e.target.value.replace(/\D/g, '') }}
                    value={form.parentPhone} 
                    onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" 
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Address</label>
                <textarea required rows="2" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>

              <button disabled={saving} className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 mt-2">
                {saving ? "Saving…" : (form.id ? "Update student" : "Create student")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}