import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Bell, BellOff } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { notificationApi } from "../../api/notificationApi";
import { useAuth } from "../../hooks/useAuth";

const TYPE_STYLES = {
  notice: "border-yellow-300 bg-yellow-100 text-yellow-800",
  alert: "border-red-300 bg-red-100 text-red-800",
  reminder: "border-blue-300 bg-blue-100 text-blue-800",
  update: "border-emerald-300 bg-emerald-100 text-emerald-800",
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await notificationApi.list({ page: 0, size: 30 });
      setNotifications(data.content ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await notificationApi.markRead(id);
    load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Updates from your school" />
      {notifications.length === 0 ? (
        <EmptyState title="You're all caught up" />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const isRead = n.isReadBy?.includes(user?.userId);
            const typeClass = TYPE_STYLES[n.type] || "border-slate-300 bg-slate-100 text-slate-800";
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 rounded-xl border p-4 ${isRead ? "border-slate-200 bg-white" : "shadow-sm"}`}
              >
                <div className="mt-0.5">
                  {isRead ? (
                    <BellOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Bell className="h-4 w-4 text-brand-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{n.title}</p>
                    <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${typeClass}`}>{n.type || "notice"}</span>
                  </div>
                  <p className="text-sm text-slate-600">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {n.createdAt ? format(new Date(n.createdAt), "MMM d, yyyy h:mm a") : ""}
                  </p>
                </div>
                {!isRead && (
                  <button onClick={() => markRead(n.id)} className="text-xs font-medium text-brand-600 hover:underline">
                    Mark read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
