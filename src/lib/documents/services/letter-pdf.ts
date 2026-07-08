import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { stripHtml } from "@/lib/documents/services/documents-utils";
import type { LetterPlaceholders } from "@/types/documents";

export function applyPlaceholders(
  html: string,
  values: Partial<LetterPlaceholders>,
): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = values[key as keyof LetterPlaceholders];
    return value != null && String(value).length > 0 ? String(value) : "";
  });
}

export async function generateLetterPdfBytes(input: {
  companyName: string;
  subject?: string | null;
  letterNumber?: string | null;
  bodyHtml: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 54;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 14;
  const fontSize = 11;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawWrapped = (text: string, options?: { bold?: boolean; size?: number }) => {
    const usedFont = options?.bold ? bold : font;
    const size = options?.size ?? fontSize;
    const words = text.split(/\s+/).filter(Boolean);
    let line = "";

    const flush = () => {
      if (!line) return;
      if (y < margin + lineHeight) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(line, {
        x: margin,
        y,
        size,
        font: usedFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= lineHeight + 2;
      line = "";
    };

    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      const width = usedFont.widthOfTextAtSize(next, size);
      if (width > maxWidth) {
        flush();
        line = word;
      } else {
        line = next;
      }
    }
    flush();
  };

  drawWrapped(input.companyName, { bold: true, size: 16 });
  y -= 6;

  if (input.letterNumber) {
    drawWrapped(`Letter No: ${input.letterNumber}`, { size: 10 });
  }
  if (input.subject) {
    drawWrapped(`Subject: ${input.subject}`, { bold: true });
  }

  y -= 8;
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 18;

  const plain = stripHtml(input.bodyHtml);
  for (const paragraph of plain.split(/\n+/)) {
    if (!paragraph.trim()) {
      y -= 8;
      continue;
    }
    drawWrapped(paragraph.trim());
    y -= 4;
  }

  return pdf.save();
}
