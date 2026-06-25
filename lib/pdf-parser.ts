export async function extractPdfText(file: File) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(groupPdfTextItemsIntoLines(content.items));
  }

  const text = pages.join("\n\n").trim();
  if (!text) {
    throw new Error("No selectable text found in PDF.");
  }

  return text;
}

type PdfTextItem = {
  str?: string;
  transform?: number[];
};

function groupPdfTextItemsIntoLines(items: unknown[]) {
  const rows = new Map<number, Array<{ x: number; text: string }>>();

  for (const item of items as PdfTextItem[]) {
    if (!item.str?.trim()) continue;
    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    const rowKey = Math.round(y / 3) * 3;
    const row = rows.get(rowKey) ?? [];
    row.push({ x, text: item.str.trim() });
    rows.set(rowKey, row);
  }

  return Array.from(rows.entries())
    .sort(([a], [b]) => b - a)
    .map(([, row]) => row.sort((a, b) => a.x - b.x).map((item) => item.text).join(" "))
    .join("\n");
}
