package com.edutrack.service;

import com.edutrack.model.entity.Attendance;
import com.edutrack.model.entity.ExamType;
import com.edutrack.model.entity.Marks;
import com.edutrack.model.entity.Student;
import com.edutrack.model.enums.AttendanceStatus;
import com.edutrack.repository.supabase.AttendanceRepository;
import com.edutrack.repository.supabase.ExamTypeRepository;
import com.edutrack.repository.supabase.MarksRepository;
import com.edutrack.repository.supabase.StudentRepository;
import com.lowagie.text.Document;

import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.lowagie.text.PageSize;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ReportCardPdfService {

	private final StudentRepository studentRepository;
	private final MarksRepository marksRepository;
	private final AttendanceRepository attendanceRepository;
	private final ExamTypeRepository examTypeRepository;

	public byte[] generateReportCard(UUID studentId, UUID examTypeId) {

		Student student = studentRepository.findById(studentId)
				.orElseThrow(() -> new RuntimeException("Student not found"));

		ExamType exam = examTypeRepository.findById(examTypeId)
				.orElseThrow(() -> new RuntimeException("Exam not found"));

		List<Marks> marksList = marksRepository.findByStudentIdAndExamTypeId(studentId, examTypeId);

		if (marksList.isEmpty()) {
			throw new RuntimeException("No marks found");
		}

		double totalObtained = marksList.stream()
		        .map(Marks::getMarksObtained)
		        .filter(Objects::nonNull)
		        .mapToDouble(java.math.BigDecimal::doubleValue)
		        .sum();
		        
		double totalMaximum = marksList.size() * exam.getMaxMarks();
		
		double percentage =
		        totalMaximum == 0
		                ? 0
		                : (totalObtained * 100.0) / totalMaximum;

		List<Attendance> attendanceList = attendanceRepository.findByStudentIdAndAttendanceDateBetween(studentId,
				LocalDate.now().minusYears(1), LocalDate.now());

		long presentDays = attendanceList.stream().filter(a -> Objects.nonNull(a.getStatus()))
				.filter(a -> a.getStatus() == AttendanceStatus.PRESENT || a.getStatus() == AttendanceStatus.LATE)
				.count();

		double attendancePercentage = attendanceList.isEmpty() ? 0 : (double) presentDays * 100 / attendanceList.size();

		String overallGrade = getGrade(percentage);
		String result = percentage >= 35 ? "PASS" : "FAIL";

		try {

			ByteArrayOutputStream out = new ByteArrayOutputStream();

			Document document = new Document(PageSize.A4, 40, 40, 50, 50);

			PdfWriter.getInstance(document, out);

			document.open();

			Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20);

			Font headingFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);

			Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 11);

			Paragraph title = new Paragraph("EDUTRACK SCHOOL\nAcademic Report Card", titleFont);
			title.setAlignment(Element.ALIGN_CENTER);
			document.add(title);

			document.add(new Paragraph(" "));

			Paragraph examTitle = new Paragraph(
					"Exam : " + exam.getName() + "    Academic Year : " + exam.getAcademicYear(), headingFont);
			examTitle.setAlignment(Element.ALIGN_CENTER);
			document.add(examTitle);

			document.add(new Paragraph(" "));

			document.add(new Paragraph("Student Name : " + student.getUser().getName(), normalFont));

			document.add(new Paragraph("Roll Number : " + student.getRollNumber(), normalFont));

			document.add(new Paragraph("Class : " + student.getClassEntity().getClassName() + " - "
					+ student.getClassEntity().getSection(), normalFont));

			document.add(new Paragraph("Parent : " + student.getParentName(), normalFont));

			document.add(new Paragraph(" "));

			PdfPTable table = new PdfPTable(4);
			table.setWidthPercentage(100);
			table.setWidths(new float[] { 4, 2, 2, 2 });

			addHeaderCell(table, "Subject");
			addHeaderCell(table, "Obtained");
			addHeaderCell(table, "Maximum");
			addHeaderCell(table, "Grade");

			for (Marks mark : marksList) {

				table.addCell(mark.getSubject().getName());

				table.addCell(String.valueOf(mark.getMarksObtained()));

				table.addCell(String.valueOf(exam.getMaxMarks()));

				table.addCell(mark.getGrade());

			}

			document.add(table);

			document.add(new Paragraph(" "));
			Paragraph summaryHeading = new Paragraph("Summary", headingFont);
			summaryHeading.setAlignment(Element.ALIGN_LEFT);
			document.add(summaryHeading);

			document.add(new Paragraph(" "));

			document.add(new Paragraph(
			        String.format(
			                "Total Marks : %.2f / %.2f",
			                totalObtained,
			                totalMaximum),
			        normalFont));

			document.add(new Paragraph(String.format("Percentage : %.2f%%", percentage), normalFont));

			document.add(new Paragraph(String.format("Attendance : %d / %d (%.2f%%)", presentDays,
					attendanceList.size(), attendancePercentage), normalFont));

			document.add(new Paragraph("Overall Grade : " + overallGrade, normalFont));

			document.add(new Paragraph("Result : " + result, headingFont));

			document.add(new Paragraph(" "));

			Paragraph remarksHeading = new Paragraph("Remarks", headingFont);

			document.add(remarksHeading);

			String remarks;

			if (percentage >= 90) {
				remarks = "Outstanding Performance";
			} else if (percentage >= 75) {
				remarks = "Very Good Performance";
			} else if (percentage >= 60) {
				remarks = "Good Performance";
			} else if (percentage >= 35) {
				remarks = "Satisfactory";
			} else {
				remarks = "Needs Improvement";
			}

			document.add(new Paragraph(remarks, normalFont));

			document.add(new Paragraph(" "));

			document.add(new Paragraph("Generated on : " + LocalDate.now(), normalFont));

			document.add(new Paragraph(" "));

			Paragraph footer = new Paragraph(
					"\nGenerated on : " + LocalDate.now() + "\n\nAuthorized Signature\n____________________",
					FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 10));

			footer.setAlignment(Element.ALIGN_CENTER);

			document.add(footer);

			document.close();

			return out.toByteArray();

		} catch (

		Exception e) {
			throw new RuntimeException("Unable to generate report card", e);
		}

	}

	private void addHeaderCell(PdfPTable table, String text) {

		Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);

		PdfPCell cell = new PdfPCell(new Phrase(text, headerFont));

		cell.setHorizontalAlignment(Element.ALIGN_CENTER);
		cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
		cell.setPadding(8);

		table.addCell(cell);
	}

	private String getGrade(double percentage) {

		if (percentage >= 90)
			return "A+";
		if (percentage >= 80)
			return "A";
		if (percentage >= 70)
			return "B";
		if (percentage >= 60)
			return "C";
		if (percentage >= 50)
			return "D";
		if (percentage >= 35)
			return "E";

		return "F";
	}
}