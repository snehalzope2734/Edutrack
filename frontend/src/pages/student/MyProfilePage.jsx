import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { userApi } from "../../api/userApi";
import { studentApi } from "../../api/studentApi";

export default function MyProfilePage() {
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const [userRes, meRes] = await Promise.all([userApi.me(), studentApi.me()]);
      setUser(userRes.data);
      setMe(meRes.data);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  const fields = [
    ["Name", user?.name],
    ["Email", user?.email],
    ["Roll Number", me?.rollNumber],
    ["Class", me?.className],
  ];

  return (
    <div>
      <PageHeader
        title="My Profile"
        subtitle="Request a teacher-approved change if any detail below is wrong"
        action={
          <button onClick={() => navigate("/student/profile/change-request")}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Request a change
          </button>
        }
      />
      <div className="max-w-lg divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {fields.map(([label, value]) => (
          <div key={label} className="flex justify-between px-5 py-3 text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="font-medium text-slate-900">{value || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
