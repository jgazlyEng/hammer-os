import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_OCR_MAX_PAGES = 60;
const DEFAULT_OCR_DPI = 160;
const DEFAULT_OCR_MAX_BYTES = 35 * 1024 * 1024;
const MIN_SELECTABLE_TEXT_CHARS = 80;

export interface PdfTextExtractionResult {
  text: string;
  warning?: string;
  pageCount?: number;
  usedOcr?: boolean;
}

export async function extractPdfTextWithFallback(bytes: Buffer): Promise<PdfTextExtractionResult> {
  const poppler = await extractPdfTextWithPopplerText(bytes);
  if (poppler.text.length >= MIN_SELECTABLE_TEXT_CHARS) return poppler;

  let selectable: PdfTextExtractionResult;
  try {
    selectable = await extractSelectablePdfText(bytes);
  } catch (error) {
    const ocr = await extractPdfTextWithOcr(bytes);
    return ocr.text
      ? {
          ...ocr,
          warning: `${ocr.warning} Poppler text extraction returned too little text and PDF.js extraction failed, so GreenLight used OCR. Details: ${errorMessage(error)}`
        }
      : {
          text: poppler.text,
          pageCount: poppler.pageCount,
          usedOcr: true,
          warning: `Uploaded successfully, but readable script text could not be fully extracted. Poppler returned too little text, PDF.js extraction failed, and OCR did not return text. Details: ${errorMessage(error)}`
        };
  }

  if (selectable.text.length >= MIN_SELECTABLE_TEXT_CHARS) return selectable;

  const shouldAttemptOcr = canAttemptInlineOcr(bytes, selectable.pageCount);
  if (!shouldAttemptOcr.allowed) {
    return {
      text: selectable.text || poppler.text,
      pageCount: selectable.pageCount,
      warning: `${selectable.warning ? `${selectable.warning} ` : ""}${poppler.warning ? `${poppler.warning} ` : ""}Uploaded successfully, but GreenLight skipped inline OCR to keep the upload responsive. ${shouldAttemptOcr.reason}`
    };
  }

  const ocr = await extractPdfTextWithOcr(bytes, selectable.pageCount);
  if (ocr.text) {
    return {
      ...ocr,
      warning: selectable.warning
        ? `${ocr.warning} ${selectable.warning}`
        : ocr.warning
    };
  }

  return {
    text: selectable.text || poppler.text,
    pageCount: selectable.pageCount,
    warning: ocr.warning ?? selectable.warning ?? poppler.warning ?? "Uploaded successfully, but no readable script text could be extracted. This PDF may be scanned or image-only; OCR is needed before breakdown or diff can run."
  };
}

async function extractSelectablePdfText(bytes: Buffer): Promise<PdfTextExtractionResult> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableWorker: true } as Parameters<typeof pdfjs.getDocument>[0]).promise;
  const pages: string[] = [];
  let imageOnlyPageCount = 0;
  let failedPageCount = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    try {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => ("str" in item ? item.str : "")).filter(Boolean).join("\n").trim();
      if (!pageText) imageOnlyPageCount += 1;
      pages.push(pageText);
    } catch {
      failedPageCount += 1;
      pages.push("");
    }
  }

  const text = pages.join("\n\n").trim();
  const warnings = [
    imageOnlyPageCount
      ? `${imageOnlyPageCount} of ${pdf.numPages} page${imageOnlyPageCount === 1 ? "" : "s"} had no selectable text and may be scanned or image-only.`
      : "",
    failedPageCount
      ? `${failedPageCount} of ${pdf.numPages} page${failedPageCount === 1 ? "" : "s"} could not be read by PDF.js and were skipped.`
      : ""
  ].filter(Boolean);

  return { text, warning: warnings.join(" ") || undefined, pageCount: pdf.numPages };
}

async function extractPdfTextWithPopplerText(bytes: Buffer, pageCount?: number): Promise<PdfTextExtractionResult> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "greenlight-pdftotext-"));
  const inputPath = path.join(tempDir, "input.pdf");
  try {
    await writeFile(inputPath, bytes);
    const { stdout } = await execFileAsync("pdftotext", ["-layout", inputPath, "-"], {
      timeout: positiveIntFromEnv("PDF_TEXT_TIMEOUT_MS", 120_000),
      maxBuffer: 24 * 1024 * 1024
    });
    const text = stdout.trim();
    return {
      text,
      pageCount,
      warning: text
        ? "Uploaded successfully. GreenLight used Poppler text extraction for this PDF."
        : "Poppler text extraction did not find readable text in this PDF."
    };
  } catch (error) {
    return {
      text: "",
      pageCount,
      warning: `Poppler text extraction could not run on this server. Details: ${errorMessage(error)}`
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function extractPdfTextWithOcr(bytes: Buffer, pageCount?: number): Promise<PdfTextExtractionResult> {
  const guard = canAttemptInlineOcr(bytes, pageCount);
  if (!guard.allowed) {
    return {
      text: "",
      pageCount,
      usedOcr: true,
      warning: `Uploaded successfully, but GreenLight skipped inline OCR to keep the upload responsive. ${guard.reason}`
    };
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), "greenlight-ocr-"));
  const inputPath = path.join(tempDir, "input.pdf");
  const outputPrefix = path.join(tempDir, "page");
  const maxPages = positiveIntFromEnv("OCR_MAX_PAGES", DEFAULT_OCR_MAX_PAGES);
  const dpi = positiveIntFromEnv("OCR_DPI", DEFAULT_OCR_DPI);
  const lastPage = pageCount ? Math.min(pageCount, maxPages) : maxPages;

  try {
    await writeFile(inputPath, bytes);
    await execFileAsync("pdftoppm", ["-r", String(dpi), "-f", "1", "-l", String(lastPage), "-png", inputPath, outputPrefix], {
      timeout: positiveIntFromEnv("OCR_RENDER_TIMEOUT_MS", 120_000),
      maxBuffer: 1024 * 1024
    });

    const imageNames = (await readdir(tempDir))
      .filter((name) => /^page-\d+\.png$/.test(name))
      .sort((left, right) => pageIndex(left) - pageIndex(right));

    const pages: string[] = [];
    for (const imageName of imageNames) {
      const imagePath = path.join(tempDir, imageName);
      const { stdout } = await execFileAsync("tesseract", [imagePath, "stdout", "-l", "eng", "--psm", "6"], {
        timeout: positiveIntFromEnv("OCR_PAGE_TIMEOUT_MS", 45_000),
        maxBuffer: 8 * 1024 * 1024
      });
      pages.push(stdout.trim());
    }

    const text = pages.join("\n\n").trim();
    if (!text) {
      return {
        text: "",
        pageCount,
        usedOcr: true,
        warning: "Uploaded successfully, but OCR did not find readable text in this PDF."
      };
    }

    const truncated = pageCount && pageCount > lastPage;
    return {
      text,
      pageCount,
      usedOcr: true,
      warning: truncated
        ? `Uploaded successfully. GreenLight used OCR on the first ${lastPage} of ${pageCount} pages; increase OCR_MAX_PAGES if the full script needs to be parsed.`
        : "Uploaded successfully. GreenLight used OCR because this PDF did not contain selectable text."
    };
  } catch (error) {
    return {
      text: "",
      pageCount,
      usedOcr: true,
      warning: `Uploaded successfully, but OCR could not run on this server. Install Poppler and Tesseract in the app container to parse scanned PDFs. Details: ${errorMessage(error)}`
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}


function canAttemptInlineOcr(bytes: Buffer, pageCount?: number) {
  if (process.env.OCR_INLINE_ENABLED === "false") {
    return { allowed: false, reason: "Inline OCR is disabled on this server; the original file is stored and can be processed later." };
  }
  const maxBytes = positiveIntFromEnv("OCR_MAX_INLINE_BYTES", DEFAULT_OCR_MAX_BYTES);
  if (bytes.byteLength > maxBytes) {
    return { allowed: false, reason: `The PDF is ${formatBytes(bytes.byteLength)}, above the inline OCR limit of ${formatBytes(maxBytes)}. The original file is stored; run offline OCR or upload a text-selectable PDF for breakdown/diff.` };
  }
  const maxPages = positiveIntFromEnv("OCR_MAX_PAGES", DEFAULT_OCR_MAX_PAGES);
  if (pageCount && pageCount > maxPages) {
    return { allowed: false, reason: `The PDF has ${pageCount} pages, above the inline OCR limit of ${maxPages}. The original file is stored; raise OCR_MAX_PAGES or run offline OCR if this script must be parsed immediately.` };
  }
  return { allowed: true, reason: "" };
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / 1024 / 1024)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

function pageIndex(fileName: string) {
  return Number(fileName.match(/page-(\d+)\.png$/)?.[1] ?? "0");
}

function positiveIntFromEnv(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown OCR error.";
}
