import { useEffect, useState } from "react";
import { FileDown, ExternalLink } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { studentApi } from "../../api/studentApi";
import { reportCardApi } from "../../api/reportCardApi";

export default function ReportCardsPage() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: me } = await studentApi.me();
        const { data } = await reportCardApi.listForStudent(me.studentId);
        setCards(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Report Cards"
        subtitle="Download your report cards"
      />

      {cards.length === 0 ? (
        <EmptyState title="No report cards uploaded yet" />
      ) : (
        <ul className="space-y-3">
          {cards.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <FileDown className="h-5 w-5 text-brand-600" />

                <div>
                  <p className="font-medium text-slate-900">
                    {c.examTypeName}
                  </p>

                  <p className="text-xs text-slate-500">
                    {c.academicYear}
                  </p>
                </div>
              </div>

              <a
                href={c.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <ExternalLink className="h-4 w-4" />
                View PDF
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}