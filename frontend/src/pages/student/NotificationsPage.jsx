import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Bell, BellOff } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { notificationApi } from "../../api/notificationApi";
import { useAuth } from "../../hooks/useAuth";

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
            return (
              <div key={n.id} className={`flex items-start gap-3 rounded-xl border p-4 ${isRead ? "border-slate-200 bg-white" : "border-brand-200 bg-brand-50"}`}>
                {isRead ? <BellOff className="mt-0.5 h-4 w-4 text-slate-400" /> : <Bell className="mt-0.5 h-4 w-4 text-brand-600" />}
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{n.title}</p>
                  <p className="text-sm text-slate-600">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {n.type} · {n.createdAt ? format(new Date(n.createdAt), "MMM d, yyyy h:mm a") : ""}
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
