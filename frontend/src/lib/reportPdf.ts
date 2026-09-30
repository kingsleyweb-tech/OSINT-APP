/**
 * Renders a CaseReport (lib/caseReport.ts) as an A4 PDF: cover page, numbered sections, tables with
 * clickable links, a running header and "Page x of y" on every page. jsPDF is loaded only when a report
 * is generated, so it adds nothing to the app's normal loading.
 */
import type { Block, CaseReport, Cell } from './caseReport';
import { fmtDate } from './workspace';

const ACCENT: [number, number, number] = [140, 75, 39];
const INK: [number, number, number] = [28, 25, 23];
const MUTED: [number, number, number] = [120, 113, 108];
const LINE: [number, number, number] = [214, 211, 209];
const SOFT: [number, number, number] = [251, 244, 239];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const TOP = 24;
const BOTTOM = 20;
const WIDTH = PAGE_W - MARGIN * 2;

// The PDF's built-in fonts only cover Windows-1252; other characters are simplified or left out.
const CP1252_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');
function safe(text: string): string {
  return (text || '')
    .normalize('NFC')
    .replace(/[‐-‒−]/g, '-')
    .replace(/[′ʼ]/g, "'")
    .replace(/[  -​  　]/g, ' ')
    .split('')
    .map(ch => {
      const c = ch.charCodeAt(0);
      if (c === 9 || c === 10 || (c >= 32 && c <= 126) || (c >= 160 && c <= 255) || CP1252_EXTRA.has(ch)) return ch;
      const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
      return base.length === 1 && base.charCodeAt(0) < 256 ? base : '';
    })
    .join('')
    .replace(/[ \t]{2,}/g, ' ');
}

const cellText = (c: Cell) => safe(typeof c === 'string' ? c : c.text);

export async function renderCaseReportPdf(report: CaseReport): Promise<{ blob: Blob; pages: number }> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: safe(`${report.title} — ${report.subtitle}`), subject: 'OSINT investigation report', creator: 'OSINT Intelligence Platform' });
  const lastY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;

  let y = TOP;
  const newPage = () => { doc.addPage(); y = TOP; };
  const ensure = (h: number) => { if (y + h > PAGE_H - BOTTOM) newPage(); };

  // ── Cover ──
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, PAGE_W, 92, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('OSINT INVESTIGATION REPORT', MARGIN, 26, { charSpace: 0.6 });
  doc.setFontSize(26);
  const titleLines = doc.splitTextToSize(safe(report.title), WIDTH) as string[];
  doc.text(titleLines.slice(0, 3), MARGIN, 44, { lineHeightFactor: 1.15 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(safe(report.subtitle), MARGIN, 44 + Math.min(titleLines.length, 3) * 10.5 + 4);

  autoTable(doc, {
    startY: 108,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    body: report.cover.map(([k, v]) => [safe(k), safe(v)]),
    styles: { font: 'helvetica', fontSize: 10.5, textColor: INK, cellPadding: { top: 3, bottom: 3, left: 0, right: 4 }, overflow: 'linebreak' },
    columnStyles: { 0: { cellWidth: 48, fontStyle: 'bold', textColor: MUTED } },
    didParseCell: data => { data.cell.styles.lineColor = LINE; data.cell.styles.lineWidth = { bottom: 0.2 }; }
  });

  const noteY = Math.max(lastY() + 16, 214);
  doc.setFillColor(...SOFT);
  doc.roundedRect(MARGIN, noteY, WIDTH, 46, 2, 2, 'F');
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('About this report', MARGIN + 6, noteY + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const about = safe('This report contains only what the investigation found in publicly available sources, as saved in the case when the report was generated. Details that no source provided are marked "Not found". Links were cleaned before inclusion: search-result pages, tracking, image, thumbnail, internal and malformed links were removed, and duplicates merged. Public pages can change after they were collected. Handle this report under your organisation\'s data protection and responsible-use rules.');
  doc.text(doc.splitTextToSize(about, WIDTH - 12) as string[], MARGIN + 6, noteY + 15, { lineHeightFactor: 1.4 });

  // ── Blocks ──
  const heading = (n: number, title: string) => {
    ensure(22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...ACCENT);
    doc.text(safe(`${n}. ${title}`), MARGIN, y + 6);
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y + 9, MARGIN + WIDTH, y + 9);
    y += 16;
  };

  const paragraph = (text: string, opts: { size?: number; color?: [number, number, number]; style?: 'normal' | 'italic' | 'bold'; indent?: number } = {}) => {
    const size = opts.size ?? 10;
    const lh = size * 0.47;
    doc.setFont('helvetica', opts.style ?? 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? INK));
    const lines = doc.splitTextToSize(safe(text), WIDTH - (opts.indent ?? 0)) as string[];
    lines.forEach(line => {
      ensure(lh + 1);
      doc.text(line, MARGIN + (opts.indent ?? 0), y + lh);
      y += lh;
    });
    y += 2.5;
  };

  const drawBlock = (b: Block) => {
    switch (b.kind) {
      case 'para':
        paragraph(b.text);
        break;
      case 'note':
        paragraph(b.text, { size: 8.5, color: MUTED, style: 'italic' });
        break;
      case 'sub':
        ensure(14);
        y += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11.5);
        doc.setTextColor(...INK);
        doc.text(safe(b.text), MARGIN, y + 5);
        y += 9;
        break;
      case 'bullets':
        b.items.forEach(item => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          const lines = doc.splitTextToSize(safe(item), WIDTH - 6) as string[];
          ensure(lines.length * 4.7 + 1);
          doc.setFillColor(...ACCENT);
          doc.circle(MARGIN + 1.4, y + 3.1, 0.8, 'F');
          doc.setTextColor(...INK);
          doc.text(lines, MARGIN + 6, y + 4.4, { lineHeightFactor: 1.35 });
          y += lines.length * 4.7 + 1.2;
        });
        y += 2;
        break;
      case 'kv':
        autoTable(doc, {
          startY: y,
          margin: { left: MARGIN, right: MARGIN, top: TOP, bottom: BOTTOM },
          theme: 'plain',
          body: b.rows.map(([k, v]) => [safe(k), { content: cellText(v), url: typeof v === 'string' ? undefined : v.url }]),
          styles: { font: 'helvetica', fontSize: 9.5, textColor: INK, cellPadding: { top: 1.8, bottom: 1.8, left: 1, right: 3 }, overflow: 'linebreak', valign: 'top' },
          columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold', textColor: MUTED } },
          didParseCell: data => {
            data.cell.styles.lineColor = LINE;
            data.cell.styles.lineWidth = { bottom: 0.15 };
            if ((data.cell.raw as { url?: string })?.url) data.cell.styles.textColor = ACCENT;
          },
          didDrawCell: data => {
            const url = (data.cell.raw as { url?: string })?.url;
            if (url) doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
          }
        });
        y = lastY() + 5;
        break;
      case 'table': {
        const total = (b.widths || b.head.map(() => 1)).reduce((s, w) => s + w, 0);
        const columnStyles: Record<number, { cellWidth: number }> = {};
        (b.widths || []).forEach((w, i) => { columnStyles[i] = { cellWidth: (w / total) * WIDTH }; });
        ensure(18);
        autoTable(doc, {
          startY: y,
          margin: { left: MARGIN, right: MARGIN, top: TOP, bottom: BOTTOM },
          theme: 'grid',
          head: [b.head.map(safe)],
          body: b.rows.map(r => r.map(c => ({ content: cellText(c), url: typeof c === 'string' ? undefined : c.url }))),
          styles: { font: 'helvetica', fontSize: 8, textColor: INK, cellPadding: 1.7, overflow: 'linebreak', valign: 'top', lineColor: LINE, lineWidth: 0.15 },
          headStyles: { fillColor: ACCENT, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.2 },
          alternateRowStyles: { fillColor: [250, 250, 249] },
          columnStyles,
          showHead: 'everyPage',
          rowPageBreak: 'avoid',
          didParseCell: data => {
            if (data.section === 'body' && (data.cell.raw as { url?: string })?.url) data.cell.styles.textColor = ACCENT;
          },
          didDrawCell: data => {
            const url = data.section === 'body' ? (data.cell.raw as { url?: string })?.url : undefined;
            if (url) doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
          }
        });
        y = lastY() + 5;
        break;
      }
    }
  };

  report.sections.forEach((section, i) => {
    if (i === 0) newPage();
    else { y += 4; ensure(40); }
    heading(i + 1, section.title);
    section.blocks.forEach(drawBlock);
  });

  // ── Running header and page numbers ──
  const pages = doc.getNumberOfPages();
  const generated = safe(`Generated ${fmtDate(report.generatedAt, true)}`);
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    if (p > 1) {
      doc.text(safe(report.title).slice(0, 80), MARGIN, 12);
      doc.text('OSINT Investigation Report', PAGE_W - MARGIN, 12, { align: 'right' });
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, 14.5, PAGE_W - MARGIN, 14.5);
    }
    doc.setDrawColor(...LINE);
    doc.line(MARGIN, PAGE_H - 13, PAGE_W - MARGIN, PAGE_H - 13);
    doc.text(generated, MARGIN, PAGE_H - 8);
    doc.text('Confidential — public-source intelligence', PAGE_W / 2, PAGE_H - 8, { align: 'center' });
    doc.text(`Page ${p} of ${pages}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
  }

  return { blob: doc.output('blob'), pages };
}
