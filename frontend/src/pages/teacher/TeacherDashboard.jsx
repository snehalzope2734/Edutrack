import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ClipboardList, LayoutDashboard, Layers, Mail, Users } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { teacherApi } from "../../api/teacherApi";
import { materialApi } from "../../api/materialApi";

export default function TeacherDashboard() {
  const [profile, setProfile] = useState(null);
  const [materialsCount, setMaterialsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await teacherApi.me();
        setProfile(data);

        const classIds = [...new Set((data?.subjects || []).map((subject) => subject.classId).filter(Boolean))];
        if (classIds.length > 0) {
          const materialResponses = await Promise.all(classIds.map((classId) => materialApi.list({ classId, page: 0, size: 1 })));
          const nextCount = materialResponses.reduce((sum, response) => sum + (response?.data?.totalElements ?? response?.data?.content?.length ?? 0), 0);
          setMaterialsCount(nextCount);
        } else {
          setMaterialsCount(0);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const subjects = useMemo(() => profile?.subjects || [], [profile]);
  const classTeacherOf = useMemo(() => profile?.classTeacherOf || [], [profile]);
  const totalClasses = subjects.length;
  const totalStudents = subjects.reduce((sum, subject) => sum + (subject.studentCount || 0), 0);
  const totalSubjects = new Set(subjects.map((subject) => subject.subjectName)).size;
  const actionItems = useMemo(
    () => [
      { label: "My Classes", icon: Layers, route: "/teacher/classes" },
      { label: "Students", icon: Users, route: "/teacher/students" },
      { label: "Attendance", icon: ClipboardList, route: "/teacher/attendance" },
      { label: "Marks Entry", icon: ClipboardList, route: "/teacher/marks" },
      { label: "Materials", icon: BookOpen, route: "/teacher/materials", count: materialsCount },
      { label: "Notifications", icon: Mail, route: "/teacher/notifications" },
    ],
    [materialsCount]
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${profile?.name || "Teacher"}`} subtitle="Your teacher workspace at a glance" />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Today</p>
          <h2 className="mt-4 text-3xl font-semibold text-slate-900 dark:text-slate-100">Ready to teach</h2>
          <p className="mt-3 text-sm text-slate-500">A quick summary of your current assignment and next actions.</p>
          <div className="mt-6 grid gap-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Assigned subjects</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{totalSubjects}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Classes covered</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{totalClasses}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Total students</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{totalStudents}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Your classes</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Teaching overview</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{classTeacherOf.length} class teacher roles</span>
          </div>
          {classTeacherOf.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900">
              You are not assigned as a class teacher for any section.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {classTeacherOf.map((klass) => (
                <div key={klass.classId} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-sm text-slate-500">Class teacher for</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{klass.className}</h3>
                  <p className="mt-3 text-sm text-slate-500">Section: {klass.section || "—"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Subjects</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Current classes</h2>
            </div>
            <span className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{subjects.length} subjects</span>
          </div>

          {subjects.length === 0 ? (
            <EmptyState title="No subjects assigned" description="Ask admin to assign subjects to your account." />
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {subjects.map((subject) => (
                <div key={subject.subjectId} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{subject.subjectName}</p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Class {subject.className}</h3>
                    </div>
                    <div className="rounded-3xl bg-white/90 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-700 shadow-sm dark:bg-slate-950 dark:text-slate-200">
                      {subject.studentCount || 0} students
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Quick actions</p>
          <div className="mt-5 grid gap-3">
            {actionItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.route)}
                className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-left text-sm font-semibold text-slate-900 transition hover:border-brand-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              >
                <item.icon className="h-4 w-4 text-brand-600" />
                <span>{item.label}</span>
                {item.count != null && (
                  <span className="ml-auto rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
