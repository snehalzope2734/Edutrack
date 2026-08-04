import SharedNoticesPage from "../shared/NoticesPage";

export default function AdminNoticesPage() {
  // Admin posts to everyone or a specific class (audience choice lives inside the shared component).
  return <SharedNoticesPage classId={null} className={null} />;
}
