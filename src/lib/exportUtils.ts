/**
 * Export utilities for CSV and PDF generation
 * Supports translations and applied filters
 */

// ─── CSV Export ───────────────────────────────────────────────────────────────

export function exportToCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][][],
  flatRows?: (string | number)[][]
) {
  const data = flatRows ?? rows.flat();
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? '');
          // Escape commas and quotes
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    ),
  ].join('\n');

  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

interface PDFReportOptions {
  title: string;
  subtitle?: string;
  period?: string;
  companyName?: string;
  headers: string[];
  rows: (string | number)[][];
  filename: string;
  summaryRows?: { label: string; value: string }[];
}

export async function exportToPDF(options: PDFReportOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB');
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  // ── Header bar ──
  doc.setFillColor(15, 23, 42); // dark bg
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(options.companyName ?? 'CCTV ERP PRO', 14, 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(options.title, 14, 17);

  doc.setFontSize(8);
  doc.text(`${dateStr} ${timeStr}`, pageWidth - 14, 10, { align: 'right' });
  if (options.period) {
    doc.text(options.period, pageWidth - 14, 17, { align: 'right' });
  }

  // ── Subtitle ──
  let yPos = 30;
  if (options.subtitle) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(options.subtitle, 14, yPos);
    yPos += 8;
  }

  // ── Summary rows ──
  if (options.summaryRows && options.summaryRows.length > 0) {
    const colWidth = (pageWidth - 28) / options.summaryRows.length;
    options.summaryRows.forEach((s, i) => {
      const x = 14 + i * colWidth;
      doc.setFillColor(30, 41, 59);
      doc.roundedRect(x, yPos, colWidth - 4, 14, 2, 2, 'F');
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(s.label, x + 4, yPos + 5);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(s.value, x + 4, yPos + 11);
    });
    yPos += 20;
  }

  // ── Data table ──
  autoTable(doc, {
    startY: yPos,
    head: [options.headers],
    body: options.rows.map((row) => row.map((cell) => String(cell ?? ''))),
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [148, 163, 184],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fillColor: [15, 23, 42],
      textColor: [226, 232, 240],
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [22, 33, 52],
    },
    styles: {
      lineColor: [30, 41, 59],
      lineWidth: 0.3,
    },
    margin: { left: 14, right: 14 },
  });

  // ── Footer ──
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    );
  }

  doc.save(`${options.filename}.pdf`);
}
