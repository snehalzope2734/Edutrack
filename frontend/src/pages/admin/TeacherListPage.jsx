import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { adminApi } from "../../api/adminApi";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  department: "",
  designation: "",
  qualification: "",
  isActive: true,
  employeeCode: "",
  joinedDate: "",
  assignedSubjects: [],
};

const QUALIFICATION_OPTIONS = ["B.Ed", "M.Ed", "B.Sc", "M.Sc", "B.A", "M.A", "B.Com", "M.Com", "BCA", "MCA", "B.Tech", "M.Tech", "PhD"];
const DESIGNATION_OPTIONS = ["Teacher", "Senior Teacher", "Class Teacher", "Vice Principal", "Principal", "Sports Teacher", "Music Teacher", "Art Teacher", "Computer Teacher"];
const SUBJECT_OPTIONS = ["Mathematics", "Science", "English", "Hindi", "Social Science", "Computer", "Sanskrit", "Art", "Music", "Physical Education", "GK"];

const dropdownOptions = {
  qualification: QUALIFICATION_OPTIONS,
  designation: DESIGNATION_OPTIONS,
  department: SUBJECT_OPTIONS,
};

export default function TeacherListPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [deptTeachers, setDeptTeachers] = useState([]);
  const [deptPage, setDeptPage] = useState(0);
  const [deptTotalPages, setDeptTotalPages] = useState(0);
  const [deptTotalElements, setDeptTotalElements] = useState(0);
  const [allTeachers, setAllTeachers] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedTeachers, setDeletedTeachers] = useState([]);
  const [deletedPage, setDeletedPage] = useState(0);
  const [deletedTotalPages, setDeletedTotalPages] = useState(0);
  const [deletedTotalElements, setDeletedTotalElements] = useState(0);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [customDropdowns, setCustomDropdowns] = useState({});

  const load = async (searchTerm = search, currentPage = page, department = null) => {
    setLoading(true);
    try {
      const { data } = await adminApi.listTeachers({
        page: currentPage,
        size: pageSize,
        search: searchTerm,
        department,
        active: true,
      });
      setTeachers(sortByEmployeeCode(data.content ?? []));
      setPage(currentPage);
      // Clear any department selection when reloading the main list
      setSelectedDepartment(null);
    } catch {
      toast.error("Could not load teachers");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all teachers (large size) for client-side grouping/filtering
  const fetchAllTeachers = async (searchTerm = search) => {
    try {
      const { data } = await adminApi.listTeachers({ page: 0, size: 10000, search: searchTerm, active: true });
      setAllTeachers(sortByEmployeeCode(data.content ?? []));
    } catch (err) {
      // ignore silently, groups will fallback to paginated list
      setAllTeachers(null);
    }
  };

  const loadDepartment = async (department, pageIndex = 0) => {
    setLoading(true);
    try {
      const { data } = await adminApi.listTeachers({
        page: pageIndex,
        size: pageSize,
        search,
        department,
        active: true,
      });
      const sorted = sortByEmployeeCode(data.content ?? []);
      setDeptTeachers(sorted);
      setDeptPage(pageIndex);
      setDeptTotalPages(data.totalPages ?? 0);
      setDeptTotalElements(data.totalElements ?? (sorted.length));
      setSelectedDepartment(department);
    } catch (err) {
      toast.error("Could not load department teachers");
    } finally {
      setLoading(false);
    }
  };

  const sortByEmployeeCode = (list) => [...list].sort((a, b) => {
    const aCode = a.employeeCode || "";
    const bCode = b.employeeCode || "";
    return aCode.localeCompare(bCode, undefined, { numeric: true, sensitivity: "base" });
  });

  const refreshTeacherInLists = (updatedTeacher) => {
    setTeachers((current) => current ? sortByEmployeeCode(current.map((teacher) => (teacher.id === updatedTeacher.id ? updatedTeacher : teacher))) : current);

    setAllTeachers((current) => current ? sortByEmployeeCode(current.map((teacher) => (teacher.id === updatedTeacher.id ? updatedTeacher : teacher))) : current);

    setDeptTeachers((current) => {
      if (!selectedDepartment || !current) return current;
      let updatedList = current.map((teacher) => (teacher.id === updatedTeacher.id ? updatedTeacher : teacher));
      const matchesDepartment = (updatedTeacher.department || "Unassigned") === selectedDepartment;

      if (selectedDepartment === "All") {
        return sortByEmployeeCode(updatedList);
      }

      if (matchesDepartment) {
        if (!updatedList.some((teacher) => teacher.id === updatedTeacher.id)) {
          updatedList = [...updatedList, updatedTeacher];
        }
        return sortByEmployeeCode(updatedList);
      }

      return updatedList.filter((teacher) => teacher.id !== updatedTeacher.id);
    });
  };

  const fetchDeletedTeachers = async (searchTerm = search, pageIndex = deletedPage) => {
    setLoading(true);
    try {
      const { data } = await adminApi.listTeachers({
        page: pageIndex,
        size: pageSize,
        search: searchTerm,
        active: false,
      });
      const sorted = sortByEmployeeCode(data.content ?? []);
      setDeletedTeachers(sorted);
      setDeletedPage(pageIndex);
      setDeletedTotalPages(data.totalPages ?? 0);
      setDeletedTotalElements(data.totalElements ?? sorted.length);
    } catch {
      toast.error("Could not load deleted teachers");
    } finally {
      setLoading(false);
    }
  };

  const reloadCurrentSelection = () => {
    if (!selectedDepartment) {
      load(search, page);
      return;
    }

    const source = allTeachers ?? teachers;
    const list = selectedDepartment === "All"
      ? source
      : source.filter((teacher) => (teacher.department || "Unassigned") === selectedDepartment);

    setDeptTeachers(list);
    setDeptPage(0);
    setDeptTotalPages(Math.max(1, Math.ceil(list.length / pageSize)));
    setDeptTotalElements(list.length);
  };

  useEffect(() => {
    load(search, 0);
    fetchAllTeachers(search);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      load(search, 0);
      fetchAllTeachers(search);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const submit = async (e) => {
    e.preventDefault();

    const payload = {
      name: (form.name || "").trim(),
      email: (form.email || "").trim(),
      password: (form.password || "").trim(),
      phone: (form.phone || "").trim(),
      department: (form.department || "").trim(),
      designation: (form.designation || "").trim(),
      qualification: (form.qualification || "").trim(),
      isActive: form.isActive,
    };

    if (payload.name.length < 3) return toast.error("Name must be at least 3 characters.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return toast.error("Enter a valid email.");
    if (!form.id && payload.password.length < 8) {
      return toast.error("Password must be at least 8 characters");
    }
    if (!/^[6-9]\d{9}$/.test(payload.phone)) return toast.error("Enter a valid 10 digit phone number.");
    if (!payload.department) return toast.error("Department is required.");
    if (!payload.designation) return toast.error("Designation is required.");
    if (!payload.qualification) return toast.error("Qualification is required.");

    setSaving(true);
    try {
      if (form.id) {
        const updatePayload = {
          name: payload.name,
          phone: payload.phone,
          department: payload.department,
          designation: payload.designation,
          qualification: payload.qualification,
          isActive: payload.isActive,
        };
        const { data } = await adminApi.updateTeacher(form.id, updatePayload);
        toast.success("Teacher updated successfully");
        refreshTeacherInLists(data);
        reloadCurrentSelection();
      } else {
        const createPayload = {
          name: payload.name,
          email: payload.email,
          password: payload.password,
          phone: payload.phone,
          department: payload.department,
          designation: payload.designation,
          qualification: payload.qualification,
        };
        const { data } = await adminApi.createTeacher(createPayload);
        toast.success("Teacher created successfully");
        setTeachers((current) => sortByEmployeeCode([data, ...(current || [])]));
        setAllTeachers((current) => sortByEmployeeCode(current ? [data, ...current] : [data]));
        if (selectedDepartment === "All" || (selectedDepartment && (data.department || "Unassigned") === selectedDepartment)) {
          setDeptTeachers((current) => sortByEmployeeCode([data, ...(current || [])]));
          setDeptTotalElements((current) => current + 1);
          setDeptTotalPages((current) => Math.max(1, Math.ceil((current + 1) / pageSize)));
        }
      }
      setShowForm(false);
      setForm(emptyForm);
      setCustomDropdowns({});
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const removeTeacherFromState = (id) => {
    setTeachers((current) => current.filter((teacher) => teacher.id !== id));
    setAllTeachers((current) => current ? current.filter((teacher) => teacher.id !== id) : current);
    setDeptTeachers((current) => {
      const next = current ? current.filter((teacher) => teacher.id !== id) : current;
      setDeptTotalElements(next.length);
      setDeptTotalPages(Math.max(1, Math.ceil(next.length / pageSize)));
      if (deptPage > 0 && deptPage >= Math.ceil(next.length / pageSize)) {
        setDeptPage(Math.max(0, Math.ceil(next.length / pageSize) - 1));
      }
      return next;
    });
  };

  const handleDelete = async (id) => {
      if (!window.confirm("Delete this teacher?")) return;
      try {
          await adminApi.deleteTeacher(id);
          toast.success("Teacher deleted successfully");
          removeTeacherFromState(id);
      } catch {
          toast.error("Delete failed");
      }
  };

  const handlePermanentDelete = async (id) => {
      if (!window.confirm("Permanently delete this teacher from the database?")) return;
      try {
          await adminApi.hardDeleteTeacher(id);
          toast.success("Teacher permanently deleted");
          setDeletedTeachers((current) => current.filter((teacher) => teacher.id !== id));
          setDeletedTotalElements((current) => Math.max(0, current - 1));
          setDeletedTotalPages((current) => Math.max(1, Math.ceil(Math.max(0, current - 1) / pageSize)));
      } catch {
          toast.error("Permanent delete failed");
      }
  };

  // C. Fetch full data on Edit
  const handleEdit = async (row) => {
    try {
      const { data } = await adminApi.getTeacher(row.id);
      setForm({
        ...emptyForm,
        ...data,
        phone: data.phone || "",
        department: data.department || "",
        designation: data.designation || "",
        qualification: data.qualification || "",
        isActive: data.isActive ?? true,
        employeeCode: data.employeeCode || "",
      });
      setCustomDropdowns({});
      setShowForm(true);
    } catch {
      toast.error("Could not fetch teacher details for editing");
    }
  };

  const displayedTeacherList = allTeachers ?? teachers;
  const totalTeachers = displayedTeacherList.length;
  const activeTeachers = displayedTeacherList.filter((teacher) => teacher.isActive).length;
  const inactiveTeachers = totalTeachers - activeTeachers;

  const fields = useMemo(() => [
    ["name", "Full name"],
    ["email", "Email"],
    ...(!form.id ? [["password", "Password"]] : []),
    ["phone", "Phone"],
    ["department", "Subject / Department"],
    ["designation", "Designation"],
    ["qualification", "Qualification"],
  ], [form.id]);

  const isCustomDropdownValue = (key) => {
    const value = form[key]?.trim();
    return Boolean(customDropdowns[key]) || (Boolean(value) && !dropdownOptions[key]?.includes(value));
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(emptyForm);
    setCustomDropdowns({});
    setPasswordVisible(false);
  };

  return (
    <div>
      <PageHeader
        title={showDeleted ? "Deleted teachers" : "Teachers"}
        subtitle={showDeleted ? `${deletedTotalElements} deleted teacher${deletedTotalElements === 1 ? "" : "s"}` : `Manage teaching staff · ${totalTeachers} teacher${totalTeachers === 1 ? "" : "s"}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {!showDeleted ? (
              <>
                <button
                  onClick={() => { setForm(emptyForm); setCustomDropdowns({}); setPasswordVisible(false); setShowForm(true); }}
                  className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  <Plus className="h-4 w-4" /> Add Teacher
                </button>
                <button
                  onClick={() => { setShowDeleted(true); setSelectedDepartment(null); fetchDeletedTeachers(); }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Deleted Teachers
                </button>
              </>
            ) : (
              <button
                onClick={() => { setShowDeleted(false); setDeletedPage(0); setDeletedTeachers([]); load(search, 0); fetchAllTeachers(search); }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to Active
              </button>
            )}
          </div>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Total teachers</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{totalTeachers}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Active</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700">{activeTeachers}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Inactive</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{inactiveTeachers}</p>
          </div>
        </div>
        <input
          type="text"
          placeholder="Search by name, email, or employee code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:max-w-md"
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* When no department selected show department cards */}
          {showDeleted ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Deleted teachers</h3>
                  <p className="text-sm text-slate-500">This list shows teachers who were soft-deleted and can be removed permanently.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={deletedPage <= 0}
                    onClick={() => fetchDeletedTeachers(search, Math.max(0, deletedPage - 1))}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-slate-600">Page {deletedPage + 1} / {Math.max(1, deletedTotalPages)}</span>
                  <button
                    disabled={deletedPage >= (deletedTotalPages - 1)}
                    onClick={() => fetchDeletedTeachers(search, deletedPage + 1)}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>

              <DataTable
                rows={(deletedTeachers || []).slice(deletedPage * pageSize, (deletedPage + 1) * pageSize)}
                emptyMessage="No deleted teachers found"
                columns={[
                  { key: "name", header: "Name" },
                  { key: "email", header: "Email" },
                  { key: "phone", header: "Phone" },
                  { key: "employeeCode", header: "Employee Code" },
                  { key: "department", header: "Department" },
                  { key: "designation", header: "Designation" },
                  {
                    key: "actions",
                    header: "Actions",
                    render: (row) => (
                      <button
                        onClick={() => handlePermanentDelete(row.id)}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
                      >
                        Delete permanently
                      </button>
                    ),
                  },
                ]}
              />
            </>
          ) : !selectedDepartment ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* All card */}
              <button
                key="All"
                onClick={() => {
                  const source = sortByEmployeeCode(allTeachers ?? teachers);
                  setSelectedDepartment("All");
                  setDeptTeachers(source);
                  setDeptPage(0);
                  setDeptTotalPages(Math.max(1, Math.ceil(source.length / pageSize)));
                  setDeptTotalElements(source.length);
                }}
                className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm hover:shadow-md"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">All</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{allTeachers ? allTeachers.length : totalTeachers}</p>
                </div>
                <div className="ml-4 flex items-center text-sm text-slate-400">View</div>
              </button>
              {Array.from(new Map((allTeachers ?? teachers).map(t => [t.department || "Unassigned", null]))).map(([dept]) => {
                const source = allTeachers ?? teachers;
                const count = source.filter((t) => (t.department || "Unassigned") === dept).length;
                return (
                  <button
                    key={dept}
                    onClick={() => {
                      if (allTeachers) {
                        const filtered = allTeachers.filter((t) => (t.department || "Unassigned") === dept);
                        setSelectedDepartment(dept);
                        setDeptTeachers(filtered);
                        setDeptPage(0);
                        setDeptTotalPages(Math.max(1, Math.ceil(filtered.length / pageSize)));
                        setDeptTotalElements(filtered.length);
                      } else {
                        loadDepartment(dept, 0);
                      }
                    }}
                    className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm hover:shadow-md"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-700">{dept}</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">{count}</p>
                    </div>
                    <div className="ml-4 flex items-center text-sm text-slate-400">View</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mb-4 flex items-center justify-between">
              <div>
                <button onClick={() => { setSelectedDepartment(null); setDeptTeachers([]); load(search, 0); }} className="mr-3 rounded-lg px-3 py-2 text-sm border">Back</button>
                <h3 className="text-lg font-semibold">{selectedDepartment} · {deptTotalElements} teacher{deptTotalElements === 1 ? "" : "s"}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button disabled={deptPage <= 0} onClick={() => setDeptPage(Math.max(0, deptPage - 1))} className="rounded-lg border px-3 py-2 text-sm">Prev</button>
                <span className="text-sm text-slate-600">Page {deptPage + 1} / {Math.max(1, deptTotalPages)}</span>
                <button disabled={deptPage >= (deptTotalPages - 1)} onClick={() => setDeptPage(deptPage + 1)} className="rounded-lg border px-3 py-2 text-sm">Next</button>
              </div>
            </div>
          )}

          {/* Only show DataTable when a department (or All) is selected */}
          {selectedDepartment && (
            <DataTable
              rows={(deptTeachers || []).slice(deptPage * pageSize, (deptPage + 1) * pageSize)}
              emptyMessage="No teachers found"
              columns={[
                { key: "name", header: "Name" },
                { key: "email", header: "Email" },
                { key: "phone", header: "Phone" },
                { key: "employeeCode", header: "Employee Code" },
                { key: "department", header: "Department" },
                { key: "designation", header: "Designation" },
                {
                  key: "isActive",
                  header: "Status",
                  render: (r) => (
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${r.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                      {r.isActive ? "Active" : "Inactive"}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  header: "Actions",
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEdit(row)}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center overflow-y-auto bg-black/30 px-4 py-6"
          onClick={closeForm}
          role="presentation"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{form.id ? "Edit Teacher" : "Add Teacher"}</h2>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Close teacher form"
                title="Close"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              {fields.map(([key, label]) => {
              const isEditing = !!form.id;
              const isReadOnly = isEditing && key === "email";

              return (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
                  {dropdownOptions[key] ? (
                    <>
                      <select
                        required
                        value={isCustomDropdownValue(key) ? "__custom__" : (form[key] || "")}
                        onChange={(e) => {
                          const isCustom = e.target.value === "__custom__";
                          setCustomDropdowns((current) => ({ ...current, [key]: isCustom }));
                          setForm({ ...form, [key]: isCustom ? "" : e.target.value });
                        }}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        <option value="">Select {label}</option>
                        {dropdownOptions[key].map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                        <option value="__custom__">Other (add custom)</option>
                      </select>
                      {isCustomDropdownValue(key) ? (
                        <input
                          required
                          type="text"
                          value={form[key] || ""}
                          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                          placeholder={`Enter custom ${label.toLowerCase()}`}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      ) : null}
                    </>
                  ) : key === "password" ? (
                    <div className="relative">
                      <input
                        required
                        type={passwordVisible ? "text" : "password"}
                        autoComplete="new-password"
                        value={form.password || ""}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => setPasswordVisible((visible) => !visible)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700"
                        aria-label={passwordVisible ? "Hide password" : "Show password"}
                      >
                        {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  ) : (
                  <input
                    required={!isEditing || key !== "password"}
                    readOnly={isReadOnly}
                    type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
                    autoComplete={key === "email" ? "email" : "off"}
                    inputMode={key === "phone" ? "numeric" : undefined}
                    maxLength={key === "phone" ? 10 : undefined}
                    onInput={key === "phone" ? (e) => { e.target.value = e.target.value.replace(/\D/g, ""); } : undefined}
                    value={form[key] || ""}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${isReadOnly ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}`}
                  />
                  )}
                </div>
              );
            })}
            {form.id && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Employee Code</label>
                <input
                  type="text"
                  readOnly
                  value={form.employeeCode || ""}
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-600"
                />
              </div>
            )}
            {form.id && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Joined Date</label>
                <input
                  type="text"
                  readOnly
                  value={form.joinedDate || "N/A"}
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-600"
                />
              </div>
            )}
            {form.id && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Assigned subjects</label>
                <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                  {form.assignedSubjects?.length ? form.assignedSubjects.map((s) => s.name).join(", ") : "No assigned subjects"}
                </div>
              </div>
            )}
            {form.id && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">Active status</label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={`rounded-full px-4 py-1 text-sm font-semibold ${form.isActive ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}
                >
                  {form.isActive ? "Active" : "Inactive"}
                </button>
              </div>
            )}
              <button disabled={saving} className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 mt-2">
                {saving ? "Saving…" : (form.id ? "Update teacher" : "Create teacher")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
