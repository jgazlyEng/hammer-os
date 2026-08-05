import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const requireFromHere = createRequire(import.meta.url);

const DEFAULT_OCR_MAX_PAGES = 180;
const DEFAULT_OCR_DPI = 200;
const MIN_SELECTABLE_TEXT_CHARS = 80;

export interface PdfTextExtractionResult {
  text: string;
  warning?: string;
  pageCount?: number;
  usedOcr?: boolean;
}

export async function extractPdfTextWithFallback(bytes: Buffer): Promise<PdfTextExtractionResult> {
  let selectable: PdfTextExtractionResult;
  try {
    selectable = await extractSelectablePdfText(bytes);
  } catch (error) {
    const ocr = await extractPdfTextWithOcr(bytes);
    return ocr.text
      ? {
          ...ocr,
          warning: `${ocr.warning} Selectable text extraction failed first, so GreenLight used OCR. Details: ${errorMessage(error)}`
        }
      : {
          text: "",
          usedOcr: true,
          warning: `Uploaded successfully, but readable script text could not be extracted. Selectable text extraction failed and OCR did not return text. Details: ${errorMessage(error)}`
        };
  }

  if (selectable.text.length >= MIN_SELECTABLE_TEXT_CHARS) return selectable;

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
    text: selectable.text,
    pageCount: selectable.pageCount,
    warning: ocr.warning ?? selectable.warning ?? "Uploaded successfully, but no readable script text could be extracted. This PDF may be scanned or image-only; OCR is needed before breakdown or diff can run."
  };
}

async function extractSelectablePdfText(bytes: Buffer): Promise<PdfTextExtractionResult> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(requireFromHere.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")).href;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableWorker: true } as Parameters<typeof pdfjs.getDocument>[0]).promise;
  const pages: string[] = [];
  let imageOnlyPageCount = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => ("str" in item ? item.str : "")).filter(Boolean).join("\n").trim();
    if (!pageText) imageOnlyPageCount += 1;
    pages.push(pageText);
  }

  const text = pages.join("\n\n").trim();
  const warning = imageOnlyPageCount
    ? `${imageOnlyPageCount} of ${pdf.numPages} page${imageOnlyPageCount === 1 ? "" : "s"} had no selectable text and may be scanned or image-only.`
    : undefined;

  return { text, warning, pageCount: pdf.numPages };
}

async function extractPdfTextWithOcr(bytes: Buffer, pageCount?: number): Promise<PdfTextExtractionResult> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "greenlight-ocr-"));
  const inputPath = path.join(tempDir, "input.pdf");
  const outputPrefix = path.join(tempDir, "page");
  const maxPages = positiveIntFromEnv("OCR_MAX_PAGES", DEFAULT_OCR_MAX_PAGES);
  const dpi = positiveIntFromEnv("OCR_DPI", DEFAULT_OCR_DPI);
  const lastPage = pageCount ? Math.min(pageCount, maxPages) : maxPages;

  try {
    await writeFile(inputPath, bytes);
    await execFileAsync("pdftoppm", ["-r", String(dpi), "-f", "1", "-l", String(lastPage), "-png", inputPath, outputPrefix], {
      timeout: 180_000,
      maxBuffer: 1024 * 1024
    });

    const imageNames = (await readdir(tempDir))
      .filter((name) => /^page-\d+\.png$/.test(name))
      .sort((left, right) => pageIndex(left) - pageIndex(right));

    const pages: string[] = [];
    for (const imageName of imageNames) {
      const imagePath = path.join(tempDir, imageName);
      const { stdout } = await execFileAsync("tesseract", [imagePath, "stdout", "-l", "eng", "--psm", "6"], {
        timeout: 60_000,
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
