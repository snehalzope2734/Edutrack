import { useEffect, useState } from "react";
import { Download, Eye, FileText } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { studentApi } from "../../api/studentApi";
import { reportCardApi } from "../../api/reportCardApi";

export default function ReportCardsPage() {
  const [cards, setCards] = useState([]);
  const [studentId, setStudentId] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleOpenPdf = async (card) => {
    try {
      if (card?.pdfUrl) {
        window.open(card.pdfUrl, "_blank", "noopener,noreferrer");
        return;
      }

      if (!studentId || !card?.examTypeId) return;
      const { data } = await reportCardApi.downloadPdf(studentId, card.examTypeId);
      const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Could not open report card", error);
    }
  };

  const handleDownloadPdf = async (card) => {
    try {
      if (card?.pdfUrl) {
        const link = document.createElement("a");
        link.href = card.pdfUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = `${card.examTypeName || "report-card"}.pdf`;
        link.click();
        return;
      }

      if (!studentId || !card?.examTypeId) return;
      const { data } = await reportCardApi.downloadPdf(studentId, card.examTypeId);
      const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${card.examTypeName || "report-card"}.pdf`;
      link.click();
    } catch (error) {
      console.error("Could not download report card", error);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { data: me } = await studentApi.me();
        setStudentId(me.studentId);
        const { data } = await reportCardApi.listForStudent(me.studentId);
        setCards(Array.isArray(data) ? data.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)) : []);
      } catch (error) {
        console.error("Failed to load report cards", error);
        setCards([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Report Cards" subtitle="Download your report cards" />

      {cards.length === 0 ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 shadow-sm">
          <EmptyState title="No report cards uploaded yet" description="Your published report cards will appear here once your school uploads them." />
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex flex-col gap-3 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <FileText className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-semibold text-slate-900">{card.examTypeName || "Report Card"}</p>
                  <p className="text-xs text-slate-500">
                    {card.academicYear || "Academic year"}
                    {card.uploadedAt ? ` • ${new Date(card.uploadedAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenPdf(card)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                >
                  <Eye className="h-4 w-4" />
                  View
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadPdf(card)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}