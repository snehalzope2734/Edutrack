import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { teacherApi } from "../../api/teacherApi";

export default function StudentsPage() {
  const [searchParams] = useSearchParams();
  const classId = searchParams.get("classId");
  const [profile, setProfile] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState(classId || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await teacherApi.me();
      setProfile(data);
      const initial = classId || data.subjects?.[0]?.classId;
      if (initial) setSelectedClass(initial);
    })();
  }, [classId]);

  useEffect(() => {
    if (!selectedClass) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await teacherApi.students(selectedClass);
        setStudents(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedClass]);

  const uniqueClasses = Array.from(
    new Map((profile?.subjects ?? []).map((s) => [s.classId, s.className])).entries()
  );

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Students in classes you teach"
        action={
          uniqueClasses.length > 1 && (
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {uniqueClasses.map(([id, name]) => <option key={id} value={id}>Class {name}</option>)}
            </select>
          )
        }
      />
      {loading ? <LoadingSpinner /> : (
        <DataTable
          rows={students}
          emptyMessage="No students in this class"
          columns={[
            { key: "rollNumber", header: "Roll No." },
            { key: "name", header: "Name" },
            { key: "view", header: "", render: (r) => (
              <Link to={`/teacher/students/${r.id}`} className="text-brand-600 hover:underline">View profile</Link>
            ) },
          ]}
        />
      )}
    </div>
  );
}
