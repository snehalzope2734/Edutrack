import { useEffect, useState } from "react";
import SharedNoticesPage from "../shared/NoticesPage";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { teacherApi } from "../../api/teacherApi";

export default function TeacherNoticesPage() {
  const [classId, setClassId] = useState(null);
  const [className, setClassName] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await teacherApi.me();
      const own = data.classTeacherOf?.[0] || data.subjects?.[0];
      if (own) {
        setClassId(own.classId);
        setClassName(own.className);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingSpinner />;
  return <SharedNoticesPage classId={classId} className={className} />;
}
