import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { teacherApi } from "../../api/teacherApi";
import { changeRequestApi } from "../../api/changeRequestApi";

export default function ChangeRequestsPage() {
  const [profile, setProfile] = useState(null);
  const [classId, setClassId] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await teacherApi.me();
      setProfile(data);
      const own = data.classTeacherOf?.[0]?.classId || data.subjects?.[0]?.classId;
      if (own) setClassId(own);
      setLoading(false);
    })();
  }, []);

  const load = async (cid) => {
    if (!cid) return;
    setLoading(true);
    try {
      const { data } = await changeRequestApi.list({ classId: cid, status: "PENDING" });
      setRequests(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(classId); }, [classId]);

  const review = async (id, status) => {
    try {
      await changeRequestApi.review(id, status);
      toast.success(status === "APPROVED" ? "Approved" : "Rejected");
      load(classId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not review request");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Change Requests" subtitle="Pending profile change requests from your students" />

      {requests.length === 0 ? (
        <EmptyState title="Nothing pending" description="All caught up!" />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-medium text-slate-900">{r.studentName} — {r.fieldName}</p>
              <p className="mt-1 text-sm text-slate-500">
                <span className="line-through">{r.oldValue || "—"}</span> → <span className="font-medium text-slate-700">{r.newValue}</span>
              </p>
              {r.reason && <p className="mt-1 text-sm italic text-slate-400">"{r.reason}"</p>}
              <div className="mt-3 flex gap-2">
                <button onClick={() => review(r.id, "APPROVED")} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
                  <Check className="h-4 w-4" /> Approve
                </button>
                <button onClick={() => review(r.id, "REJECTED")} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <X className="h-4 w-4" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
