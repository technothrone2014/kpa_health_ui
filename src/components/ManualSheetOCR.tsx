import React, { useEffect, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker, PSM } from 'tesseract.js';
import { ArrowLeft, Check, FileText, Loader2, RotateCcw, RotateCw, ScanText, Upload, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import api from '../api/client';
import aiService from '../api/aiService';
import { FIELD_LIMITS, validateField } from '../utils/fieldValidation';
import type { FieldKey } from '../utils/fieldValidation';

GlobalWorkerOptions.workerSrc = pdfWorker;

const OCR_PILOT_PAGE_LIMIT = 1;
// In the supplied scan, row 1 is at y=106-135 and row 2 starts at y=168.
const FIRST_ROW_Y_MIN = 80;
const FIRST_ROW_Y_MAX = 155;
const FIRST_ROW_X_RANGES = [
  { field: 'NO', left: 0, right: 50 },
  { field: 'NAME', left: 50, right: 190 },
  { field: 'CAT', left: 190, right: 235 },
  { field: 'C/NO', left: 235, right: 280 },
  { field: 'TEL', left: 280, right: 353 },
  { field: 'AGE', left: 353, right: 415 },
  { field: 'SEX', left: 415, right: 450 },
  { field: 'WT', left: 450, right: 495 },
  { field: 'HT', left: 495, right: 545 },
  { field: 'HIP', left: 545, right: 605 },
  { field: 'WAIST', left: 605, right: 655 },
  { field: 'SYST', left: 655, right: 710 },
  { field: 'DIAS', left: 710, right: 755 },
  { field: 'RBS', left: 755, right: 820 },
  { field: 'REFERRALS', left: 820, right: 900 },
];
const REVIEW_FIELD_VALIDATION: Partial<Record<keyof ReviewRow, FieldKey>> = {
  weight: 'Weight',
  height: 'Height',
  waist: 'Waist',
  hip: 'Hip',
  systolic: 'Systolic',
  diastolic: 'Diastolic',
  rbs: 'RBSValue',
};

const REFERRAL_CODES: Record<number, { title: string; match: string[] }> = {
  1: { title: 'Cancer screening', match: ['cancer'] },
  2: { title: 'Dental screening', match: ['dental'] },
  3: { title: 'Eye screening', match: ['eye'] },
  4: { title: 'HbA1c', match: ['hba1c', 'glycated'] },
  5: { title: 'Lipid profile', match: ['lipid'] },
  6: { title: 'Microalbumin', match: ['microalbumin'] },
  7: { title: 'PSA', match: ['psa'] },
  8: { title: 'FBS', match: ['fbs'] },
  9: { title: 'LFTs', match: ['lft', 'liver'] },
  10: { title: 'Creatinine clearance', match: ['creatin'] },
  11: { title: 'Hepatitis B/C', match: ['hepatitis', 'hep b', 'hep c'] },
};

const FEEDBACK_FIELD_MAP: Record<string, string> = {
  category: 'Category',
  gender: 'Gender',
  age: 'Age',
  weight: 'Weight',
  height: 'Height',
  hip: 'Hip',
  waist: 'Waist',
  systolic: 'Systolic',
  diastolic: 'Diastolic',
  rbs: 'RBS',
  referralCodes: 'Referrals',
};

const OCR_INTERPRETATION_FIELDS: Array<[string, string]> = [
  ['name', 'Name'],
  ['category', 'Category'],
  ['idNumber', 'C/NO'],
  ['phoneNumber', 'Phone'],
  ['age', 'Age'],
  ['gender', 'Sex'],
  ['weight', 'Weight'],
  ['height', 'Height'],
  ['hip', 'Hip circumference'],
  ['waist', 'Waist circumference'],
  ['systolic', 'Systolic'],
  ['diastolic', 'Diastolic'],
  ['rbs', 'RBS'],
  ['referralCodes', 'Referrals'],
];

type Lookup = { Id: number; Title: string; LegacyColumn?: string | null };
type LookupData = {
  categories: Lookup[];
  genders: Lookup[];
  stations: Lookup[];
  referrals: Lookup[];
};

type ExtractedRow = {
  rowNumber?: number;
  name?: string | null;
  category?: string | null;
  idNumber?: string | number | null;
  phoneNumber?: string | number | null;
  age?: number | string | null;
  sex?: string | null;
  weight?: number | string | null;
  height?: number | string | null;
  hip?: number | string | null;
  waist?: number | string | null;
  systolic?: number | string | null;
  diastolic?: number | string | null;
  rbs?: number | string | null;
  referrals?: string | string[] | number[] | null;
};

type ClientMatch = {
  Id: number;
  FullName: string;
  IDNumber: string | null;
  PhoneNumber: string | null;
  CategoryId: number;
  GenderId: number;
  CategoryTitle: string | null;
  GenderTitle: string | null;
};

type ReviewRow = {
  key: string;
  page: number;
  rowNumber: number;
  clientId: number | null;
  createNew: boolean;
  name: string;
  categoryId: string;
  idNumber: string;
  phoneNumber: string;
  age: string;
  genderId: string;
  weight: string;
  height: string;
  hip: string;
  waist: string;
  systolic: string;
  diastolic: string;
  rbs: string;
  referralCodes: string;
  original: Record<string, string>;
  clientMatches?: ClientMatch[];
  searching?: boolean;
};

type OCRPage = { pageNumber: number; text: string; preview: string };

interface ManualSheetOCRProps {
  stationId: number;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const groupFirstRowCandidatesByColumn = (text: string): string => {
  const grouped: Record<'A' | 'B', string[]> = { A: [], B: [] };
  let candidate: 'A' | 'B' | null = null;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('FIRST TABLE ROW CANDIDATE A -')) {
      candidate = 'A';
      continue;
    }
    if (line.startsWith('FIRST TABLE ROW CANDIDATE B -')) {
      candidate = 'B';
      continue;
    }
    if (!candidate) continue;
    const word = line.match(/^\[x=(\d+),y=(\d+)\]\s*(.+)$/);
    if (!word) continue;
    const x = Number(word[1]);
    const column = FIRST_ROW_X_RANGES.find((range) => x >= range.left && x < range.right);
    if (column) grouped[candidate].push(`${column.field}: ${word[3]} [x=${x},y=${word[2]}]`);
  }
  return [
    `Pass A by column: ${grouped.A.join(' | ') || '(no positioned words)'}`,
    `Pass B by column: ${grouped.B.join(' | ') || '(no positioned words)'}`,
  ].join('\n');
};

const getReviewFieldError = (row: ReviewRow, field: keyof ReviewRow): string | null => {
  if (field === 'age' && row.age.trim()) {
    const age = Number(row.age);
    if (!Number.isInteger(age) || age < 0 || age > 120) {
      return 'Age must be a whole number between 0 and 120.';
    }
  }
  const validationField = REVIEW_FIELD_VALIDATION[field];
  if (validationField) {
    const error = validateField(validationField, String(row[field] ?? ''));
    if (error) return error;
  }
  if (field === 'systolic' && row.systolic && row.diastolic && Number(row.systolic) <= Number(row.diastolic)) {
    return 'Systolic must be greater than diastolic.';
  }
  if (field === 'diastolic' && row.systolic && row.diastolic && Number(row.diastolic) >= Number(row.systolic)) {
    return 'Diastolic must be less than systolic.';
  }
  return null;
};

const getReviewRowErrors = (row: ReviewRow): string[] =>
  (['age', ...Object.keys(REVIEW_FIELD_VALIDATION)] as Array<keyof ReviewRow>)
    .map((field) => getReviewFieldError(row, field))
    .filter((error): error is string => Boolean(error));

const getNewClientRegistrationError = (row: ReviewRow): string | null => {
  if (!row.idNumber.trim()) return 'A check number is required to register a new client.';
  if (row.idNumber.trim().length > 20) return 'Check number must be at most 20 characters.';
  if (!row.name.trim()) return 'Client name is required for a new client.';
  const [firstName, ...lastNameParts] = row.name.trim().replace(/\s+/g, ' ').split(' ');
  if (lastNameParts.length === 0) return 'Enter both first and last name for a new client.';
  if (firstName.length > 20 || lastNameParts.join(' ').length > 20) {
    return 'The first and last names must each be at most 20 characters.';
  }
  if (!row.phoneNumber.trim()) return 'Phone number is required for a new client.';
  if (row.phoneNumber.trim().length > 20) return 'Phone number must be at most 20 characters.';
  if (!row.age.trim()) return 'Age is required to register a new client from this sheet.';
  if (!row.categoryId) return 'Category is required for a new client.';
  if (!row.genderId) return 'Sex is required for a new client.';
  return getReviewFieldError(row, 'age');
};

const getLookupId = (value: string | null | undefined, options: Lookup[]): string => {
  if (!value) return '';
  const cleaned = value.trim().toLowerCase();
  const found = options.find((option) => {
    const title = option.Title.toLowerCase();
    if (cleaned === title) return true;
    if (['d', 'dep'].includes(cleaned) || cleaned.includes('dependent')) return title.includes('dependent');
    if (['e', 'emp'].includes(cleaned) || cleaned.includes('employee')) return title.includes('employee');
    if (cleaned === 'pu' || cleaned.includes('port user')) return title.includes('port user');
    if (cleaned === 'm' || cleaned === 'male') return title === 'male';
    if (cleaned === 'f' || cleaned === 'female') return title === 'female';
    return normalize(cleaned) === normalize(title);
  });
  return found ? String(found.Id) : '';
};

const toInputValue = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  return text.toLowerCase() === 'null' || text.toLowerCase() === 'n/a' ? '' : text;
};

const toPhoneNumber = (value: string | number | null | undefined): string => {
  const phoneNumber = value === null || value === undefined ? '' : String(value).trim();
  return typeof value === 'number' && /^\d{9}$/.test(phoneNumber)
    ? `0${phoneNumber}`
    : phoneNumber;
};

const parseCaptureDate = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!dmy) return '';
  return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
};

const getReferralIds = (codes: string, options: Lookup[]): { ids: number[]; unresolved: string[] } => {
  if (!codes.trim() || /^n\s*\/\s*a$/i.test(codes.trim())) return { ids: [], unresolved: [] };
  const tokens = codes.match(/(?:PU|[ED])?\s*\d+/gi) || [];
  const codeNumbers = [...new Set(tokens.map((token) => Number(token.match(/\d+/)?.[0])))];
  const ids: number[] = [];
  const unresolved: string[] = [];
  if (codes.trim() && tokens.length === 0) unresolved.push(codes.trim());
  for (const code of codeNumbers) {
    const spec = REFERRAL_CODES[code];
    if (!spec) {
      unresolved.push(String(code));
      continue;
    }
    const match = options.find((option) => {
      const title = option.Title.toLowerCase();
      return spec.match.some((term) => title.includes(term));
    });
    if (match) ids.push(match.Id);
    else unresolved.push(String(code));
  }
  return { ids, unresolved };
};

const parseModelJson = (content: string): any => {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('The AI response did not contain a JSON object.');
  return JSON.parse(content.slice(start, end + 1));
};

const ManualSheetOCR: React.FC<ManualSheetOCRProps> = ({ stationId, onClose, onSuccess }) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rotation, setRotation] = useState(270);
  const [fineRotation, setFineRotation] = useState(0);
  const [pages, setPages] = useState<OCRPage[]>([]);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [lookups, setLookups] = useState<LookupData | null>(null);
  const [captureDate, setCaptureDate] = useState('');
  const [selectedStation, setSelectedStation] = useState(String(stationId || ''));
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [useCorrectionExamples, setUseCorrectionExamples] = useState(false);

  const loadLookups = async () => {
    if (lookups) return lookups;
    const response = await api.get('/manual-sheets/options');
    setLookups(response.data);
    if (!selectedStation && response.data.stations.length > 0) {
      setSelectedStation(String(response.data.stations[0].Id));
    }
    return response.data as LookupData;
  };

  useEffect(() => {
    loadLookups().catch((error) => {
      console.error('Manual-sheet lookup loading failed:', error);
      toast.error('Unable to load stations and lookup values for manual-sheet import.');
    });
  }, []);

  const handleFile = (selected: File | undefined) => {
    if (!selected) return;
    if (selected.type !== 'application/pdf') {
      toast.error('Upload a scanned PDF. PDF pages are rendered locally in your browser.');
      return;
    }
    if (selected.size > 20 * 1024 * 1024) {
      toast.error('The PDF must be smaller than 20 MB.');
      return;
    }
    setFile(selected);
    setPages([]);
    setRows([]);
  };

  const runLocalOCR = async () => {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setStatus('Loading PDF locally…');
    try {
      const pdf = await getDocument({ data: await file.arrayBuffer() }).promise;
      if (pdf.numPages > 30) throw new Error('The PDF may contain no more than 30 pages.');
      const pagesToProcess = Math.min(pdf.numPages, OCR_PILOT_PAGE_LIMIT);
      let pageNumberProgress = 1;
      const pageCountProgress = pagesToProcess;
      const worker = await createWorker('eng', 1, {
        logger: (message) => {
          if (message.status === 'recognizing text') {
            const pageProgress = ((pageNumberProgress - 1) + message.progress / 3) / pageCountProgress;
            setProgress(Math.round(pageProgress * 100));
          }
        },
      });
      const nextPages: OCRPage[] = [];
      try {
        for (let pageNumber = 1; pageNumber <= pagesToProcess; pageNumber++) {
          pageNumberProgress = pageNumber;
          setStatus(`Rendering page ${pageNumber} of ${pagesToProcess} for the first-row test…`);
          const page = await pdf.getPage(pageNumber);
          const pageRotation = ((page.rotate + rotation) % 360 + 360) % 360;
          const viewport = page.getViewport({ scale: 3.5, rotation: pageRotation });
          const sourceCanvas = document.createElement('canvas');
          sourceCanvas.width = Math.ceil(viewport.width);
          sourceCanvas.height = Math.ceil(viewport.height);
          const context = sourceCanvas.getContext('2d');
          if (!context) throw new Error('Your browser could not prepare a page for OCR.');
          await page.render({ canvasContext: context, viewport }).promise;

          const scanCanvas = document.createElement('canvas');
          const fineRadians = fineRotation * Math.PI / 180;
          const cosine = Math.cos(fineRadians);
          const sine = Math.sin(fineRadians);
          scanCanvas.width = Math.ceil(
            Math.abs(sourceCanvas.width * cosine) + Math.abs(sourceCanvas.height * sine)
          );
          scanCanvas.height = Math.ceil(
            Math.abs(sourceCanvas.width * sine) + Math.abs(sourceCanvas.height * cosine)
          );
          const scanContext = scanCanvas.getContext('2d');
          if (!scanContext) throw new Error('Your browser could not prepare the high-resolution scan.');
          if ('filter' in scanContext) scanContext.filter = 'grayscale(1) contrast(1.25)';
          scanContext.translate(scanCanvas.width / 2, scanCanvas.height / 2);
          scanContext.rotate(fineRadians);
          scanContext.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);

          const recognizeRegion = async (
            section: string,
            rectangle: { left: number; top: number; width: number; height: number },
            pageSegmentationMode: PSM,
            includeWordPositions = false,
            positionRectangle = rectangle
          ) => {
            setStatus(`Recognizing ${section} on page ${pageNumber} of ${pagesToProcess} locally…`);
            await worker.setParameters({
              tessedit_pageseg_mode: pageSegmentationMode,
              preserve_interword_spaces: '1',
              user_defined_dpi: '252',
            });
            const result = await worker.recognize(
              scanCanvas,
              { rectangle, rotateAuto: fineRotation === 0 },
              { blocks: includeWordPositions }
            );
            if (includeWordPositions) {
              const words = result.data.blocks?.flatMap((block) =>
                block.paragraphs.flatMap((paragraph) =>
                  paragraph.lines.flatMap((line) => line.words)
                )
              ).filter((word) =>
                word.text.trim() &&
                Number.isFinite(word.bbox.x0) &&
                Number.isFinite(word.bbox.y0) &&
                Number.isFinite(word.bbox.x1) &&
                Number.isFinite(word.bbox.y1)
              ) ?? [];
              if (words.length === 0) return result.data.text.trim();
              return words
                .sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0)
                .map((word) => {
                  const x = Math.max(0, Math.min(1000, Math.round(
                    ((word.bbox.x0 + word.bbox.x1) / 2 - positionRectangle.left) / positionRectangle.width * 1000
                  )));
                  const y = Math.max(0, Math.min(1000, Math.round(
                    ((word.bbox.y0 + word.bbox.y1) / 2 - positionRectangle.top) / positionRectangle.height * 1000
                  )));
                  return `[x=${x},y=${y}] ${word.text}`;
                })
                .join('\n');
            }
            return result.data.text.trim();
          };

          const metadataText = await recognizeRegion(
            'title, station, month, and date',
            {
              left: Math.round(scanCanvas.width * 0.07),
              top: Math.round(scanCanvas.height * 0.005),
              width: Math.round(scanCanvas.width * 0.86),
              height: Math.round(scanCanvas.height * 0.105),
            },
            PSM.SPARSE_TEXT
          );
          const tableRectangle = {
            left: Math.round(scanCanvas.width * 0.05),
            top: Math.round(scanCanvas.height * 0.10),
            width: Math.round(scanCanvas.width * 0.90),
            height: Math.round(scanCanvas.height * 0.75),
          };
          const firstRowRectangle = {
            left: tableRectangle.left,
            top: tableRectangle.top + Math.round(tableRectangle.height * FIRST_ROW_Y_MIN / 1000),
            width: tableRectangle.width,
            height: Math.round(tableRectangle.height * (FIRST_ROW_Y_MAX - FIRST_ROW_Y_MIN) / 1000),
          };
          const firstRowSparseText = await recognizeRegion(
            'the first printed row (sparse-text pass)',
            firstRowRectangle,
            PSM.SPARSE_TEXT,
            true,
            tableRectangle
          );
          const firstRowBlockText = await recognizeRegion(
            'the first printed row (single-block pass)',
            firstRowRectangle,
            PSM.SINGLE_BLOCK,
            true,
            tableRectangle
          );
          const firstRowText = [
            'DOCUMENT TITLE AND STATION / MONTH / DATE:',
            metadataText || '(No text recognized in this section)',
            'FIRST TABLE ROW CANDIDATE A - SPARSE TEXT (positions normalized across the full table region):',
            firstRowSparseText || '(No text recognized in this pass)',
            'FIRST TABLE ROW CANDIDATE B - SINGLE BLOCK (positions normalized across the full table region):',
            firstRowBlockText || '(No text recognized in this pass)',
          ].join('\n');
          const text = [
            firstRowText,
            'COLUMN-GROUPED OCR CANDIDATES (using the sheet column positions):',
            groupFirstRowCandidatesByColumn(firstRowText),
          ].join('\n');
          const previewCanvas = document.createElement('canvas');
          previewCanvas.width = Math.round(scanCanvas.width * 0.375);
          previewCanvas.height = Math.round(scanCanvas.height * 0.375);
          const previewContext = previewCanvas.getContext('2d');
          if (!previewContext) throw new Error('Your browser could not prepare the scan preview.');
          previewContext.drawImage(scanCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
          nextPages.push({
            pageNumber,
            text,
            preview: previewCanvas.toDataURL('image/jpeg', 0.6),
          });
          sourceCanvas.width = 0;
          sourceCanvas.height = 0;
          scanCanvas.width = 0;
          scanCanvas.height = 0;
          setProgress(Math.round((pageNumber / pageCountProgress) * 100));
        }
      } finally {
        await worker.terminate();
      }
      if (nextPages.every((page) => !page.text)) {
        throw new Error('No text was detected. Try a clearer scan or a higher-quality PDF.');
      }
      setPages(nextPages);
      setStatus('First-row OCR ready: page 1 only. Check the local OCR text before extracting the row.');
    } catch (error) {
      console.error('Manual-sheet OCR failed:', error);
      setStatus('');
      toast.error(error instanceof Error ? error.message : 'Unable to scan this PDF.');
    } finally {
      setBusy(false);
    }
  };

  const extractRowsWithAI = async () => {
    if (pages.length === 0) return;
    setBusy(true);
    setStatus('Preparing lookup values and AI correction examples…');
    try {
      const options = await loadLookups();
      let examples: Array<{ Field: string; OCRValue: string; CorrectedValue: string }> = [];
      if (useCorrectionExamples) {
        const feedback = await api.get('/manual-sheets/feedback');
        const supportedFields = new Set(Object.values(FEEDBACK_FIELD_MAP));
        examples = (feedback.data.examples || []).filter((example: { Field: string }) =>
          supportedFields.has(example.Field)
        );
      }

      const nextRows: ReviewRow[] = [];
      let detectedDate = '';
      let detectedStation = '';
      for (const page of pages.filter((item) => item.pageNumber === 1).slice(0, OCR_PILOT_PAGE_LIMIT)) {
        if (!page.text) continue;
        setStatus('Using AI to extract row 1 from page 1…');
        const corrections = examples.length
          ? `\nPrior de-identified human corrections (field, mistaken value, corrected value):\n${JSON.stringify(examples.slice(0, 40))}\n`
          : '';
        const prompt = `This is a first-row pilot. Extract only printed row 1 from page 1. Return exactly one JSON object with keys "captureDate", "station", and "rows". The rows array must contain at most one row and must never contain a row other than rowNumber 1. Use only the document-header region for station and capture date; captureDate must be YYYY-MM-DD or null. A month without a readable day is not a complete capture date.

The field table has exactly these columns from left to right: 1. NO (preprinted row number 1-15), 2. NAME (full name), 3. CAT (E=Employee, PU=Port User, DEP=Dependent), 4. C/NO (ID/check number; digits written on two lines belong together), 5. TEL (Kenyan mobile number, usually 10 digits and beginning 0), 6. AGE (age as written), 7. SEX (M or F), 8. WT (weight in kg), 9. HT (height in cm), 10. Hip circumference in cm, 11. Waist circumference in cm, 12. SYST (systolic), 13. DIAS (diastolic), 14. RBS, 15. REFERRALS.

Return each row with exactly these data fields: rowNumber, name, category, idNumber, phoneNumber, age, sex, weight, height, hip, waist, systolic, diastolic, rbs, referrals. Do not extract medication, comment, or other fields. Do not infer fields from column titles or use/interpret a referral key. Referrals are only the numbers written in that row, joined by commas, or "N/A" when none are written. Use the printed row number and the word positions [x=0..1000,y=0..1000] to keep values in their original row and column; x increases from left to right and y from top to bottom. Ignore table headings, document decoration, and the referral key. Do not shift values to neighboring fields to make them seem plausible.

The OCR contains two readings of the same handwritten row, with detected words grouped by their x-position into likely columns. Treat both as noisy candidates, not ground truth. Do not require the two passes to agree: use the clearest candidate for each column when its position and field type support it. Handwriting and OCR can confuse O/0, I/l/1, S/5, Z/2, B/8, and G/6; consider these only when a visible candidate and the field context support that reading. Do not replace characters mechanically. Preserve the best visible spelling for names; never guess a person's name from a client record or unrelated context. For numeric fields, use the expected field format and valid ranges to resolve a visible ambiguity, not to discard every imperfect reading. If different passes report different values at nearly the same x/y position, they are alternate readings of one handwritten mark, not multiple marks. In particular, do not combine alternate readings of a single referral mark into multiple referral codes; include multiple codes only when separate marks are visible. Use null only when no candidate can be read with reasonable confidence or the candidates remain equally plausible.

Use null for blank or uncertain values; do not guess, infer missing measurements, or create rows without evidence. Return category as E, PU, or DEP, and sex as M or F. Keep ID/check numbers and telephone numbers as strings so leading zeroes are preserved. Join the two parts of a split C/NO into one digit string. Use numeric values for age and measurements. Keep referral codes as their printed numbers, separated by commas, or return "N/A". If a digit or word is uncertain, use null. Do not use any words outside the provided first-row crop to fill a field. Do not output markdown.${corrections}\nPage 1, first-row-only OCR text:\n${page.text}`;
        const response = await aiService.chat({
          messages: [
            { role: 'system', content: 'You convert OCR text from health-screening forms into conservative structured data. Never invent missing fields or values.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 3500,
        });
        const extracted = parseModelJson(response.content);
        if (!Array.isArray(extracted.rows)) {
          throw new Error(`AI extraction on page ${page.pageNumber} did not return a rows array.`);
        }
        if (!detectedDate && typeof extracted.captureDate === 'string') detectedDate = parseCaptureDate(extracted.captureDate);
        if (!detectedStation && typeof extracted.station === 'string') detectedStation = extracted.station;

        for (const raw of extracted.rows as ExtractedRow[]) {
          const rowNumber = Number(raw.rowNumber);
          if (rowNumber !== 1) continue;
          if (nextRows.some((row) => row.page === 1 && row.rowNumber === 1)) {
            throw new Error('AI returned more than one result for page 1, row 1. Please retry extraction.');
          }
          const categoryId = getLookupId(raw.category, options.categories);
          const genderId = getLookupId(raw.sex, options.genders);
          const referrals = Array.isArray(raw.referrals)
            ? raw.referrals.map(String).join(', ')
            : String(raw.referrals || '');
          const extractedName = String(raw.name || '');
          const extractedIdNumber = String(raw.idNumber || '');
          const extractedPhoneNumber = toPhoneNumber(raw.phoneNumber);
          const sourceValues: Record<string, string> = {
            name: extractedName,
            idNumber: extractedIdNumber,
            phoneNumber: extractedPhoneNumber,
            category: raw.category || '',
            gender: raw.sex || '',
            age: toInputValue(raw.age),
            weight: toInputValue(raw.weight),
            height: toInputValue(raw.height),
            hip: toInputValue(raw.hip),
            waist: toInputValue(raw.waist),
            systolic: toInputValue(raw.systolic),
            diastolic: toInputValue(raw.diastolic),
            rbs: toInputValue(raw.rbs),
            referralCodes: referrals,
          };
          nextRows.push({
            key: `${page.pageNumber}-${rowNumber}-${nextRows.length}`,
            page: page.pageNumber,
            rowNumber,
            clientId: null,
            createNew: false,
            name: extractedName,
            categoryId,
            idNumber: extractedIdNumber,
            phoneNumber: extractedPhoneNumber,
            age: toInputValue(raw.age),
            genderId,
            weight: toInputValue(raw.weight),
            height: toInputValue(raw.height),
            hip: toInputValue(raw.hip),
            waist: toInputValue(raw.waist),
            systolic: toInputValue(raw.systolic),
            diastolic: toInputValue(raw.diastolic),
            rbs: toInputValue(raw.rbs),
            referralCodes: referrals,
            original: sourceValues,
          });
        }
      }
      if (nextRows.length === 0) {
        throw new Error('No result was extracted for page 1, row 1. Review the first-row OCR text and try again.');
      }
      setRows(nextRows);
      if (detectedDate) setCaptureDate(detectedDate);
      if (detectedStation) {
        const station = options.stations.find((item) =>
          normalize(item.Title) === normalize(detectedStation)
        );
        if (station) setSelectedStation(String(station.Id));
      }
      setStatus('AI extracted page 1, row 1. Verify every suggested field against the scan.');
    } catch (error) {
      console.error('Manual-sheet AI extraction failed:', error);
      const apiMessage = axios.isAxiosError(error) && typeof error.response?.data?.message === 'string'
        ? error.response.data.message
        : null;
      toast.error(apiMessage || (error instanceof Error ? error.message : 'AI extraction failed.'));
      setStatus('');
    } finally {
      setBusy(false);
    }
  };

  const updateRow = (key: string, field: keyof ReviewRow, value: ReviewRow[keyof ReviewRow]) => {
    setRows((current) => current.map((row) => {
      if (row.key !== key) return row;
      const updated = { ...row, [field]: value };
      return field === 'idNumber'
        ? { ...updated, clientId: null, createNew: false, clientMatches: undefined, searching: false }
        : updated;
    }));
  };

  const findClients = async (row: ReviewRow) => {
    const checkNumber = row.idNumber.trim();
    if (!checkNumber) {
      toast.error('Enter the C/NO check number before searching for an existing client.');
      return;
    }
    setRows((current) => current.map((item) => item.key === row.key
      ? { ...item, searching: true, clientMatches: undefined, clientId: null, createNew: false }
      : item));
    try {
      const response = await api.get(
        `/clients/search?q=${encodeURIComponent(checkNumber)}&field=idNumber`
      );
      const exactMatches = (response.data || []).filter((client: ClientMatch) =>
        client.IDNumber?.trim() === checkNumber
      );
      setRows((current) => current.map((item) => {
        if (item.key !== row.key) return item;
        if (item.idNumber.trim() !== checkNumber) return { ...item, searching: false };
        return { ...item, clientMatches: exactMatches, clientId: null, createNew: false, searching: false };
      }));
    } catch (error) {
      console.error('Manual-sheet client lookup failed:', error);
      updateRow(row.key, 'searching', false);
      toast.error('Could not search for an existing client.');
    }
  };

  const selectClient = (row: ReviewRow, selectedId: string) => {
    const client = row.clientMatches?.find((item) => String(item.Id) === selectedId);
    setRows((current) => current.map((item) => {
      if (item.key !== row.key) return item;
      if (!client) {
        return {
          ...item,
          clientId: null,
          createNew: false,
          name: item.original.name || '',
          categoryId: getLookupId(item.original.category, lookups?.categories || []),
          idNumber: item.original.idNumber || '',
          phoneNumber: item.original.phoneNumber || '',
          age: item.original.age || '',
          genderId: getLookupId(item.original.gender, lookups?.genders || []),
        };
      }
      return {
        ...item,
        clientId: client.Id,
        createNew: false,
        name: client.FullName,
        categoryId: String(client.CategoryId),
        idNumber: client.IDNumber || '',
        phoneNumber: client.PhoneNumber || '',
        age: '',
        genderId: String(client.GenderId),
      };
    }));
  };

  const saveReviewedRows = async () => {
    if (!lookups) return;
    if (!captureDate || !selectedStation) {
      toast.error('Choose the capture date and station.');
      return;
    }
    if (rows.some((row) => !row.clientId && !row.createNew)) {
      toast.error('Search for an existing client by C/NO or confirm registering a new client after an exact no-match.');
      return;
    }
    const newClientError = rows
      .filter((row) => !row.clientId && row.createNew)
      .map(getNewClientRegistrationError)
      .find((error) => error !== null);
    if (newClientError) {
      toast.error(newClientError);
      return;
    }
    const fieldError = rows.flatMap((row) => getReviewRowErrors(row))[0];
    if (fieldError) {
      toast.error(`Correct the field finding before importing: ${fieldError}`);
      return;
    }
    if (rows.some((row) => row.clientId && !row.clientMatches?.some((client) => client.Id === row.clientId))) {
      toast.error('The selected client is no longer available in the C/NO search results. Search again.');
      return;
    }
    const referralMappings = rows.map((row) => getReferralIds(row.referralCodes, lookups.referrals));
    if (referralMappings.some((result) => result.unresolved.length > 0)) {
      toast.error('Some referral codes have no matching active database referral. Resolve them before importing.');
      return;
    }

    setBusy(true);
    setStatus('Saving reviewed rows in one database transaction…');
    try {
      const payloadRows = rows.map((row, index) => {
        const client = row.clientMatches?.find((item) => item.Id === row.clientId);
        return {
          rowNumber: row.rowNumber,
          clientId: row.clientId,
          createNew: row.createNew,
          name: client?.FullName || row.name.trim(),
          categoryId: Number(client?.CategoryId ?? row.categoryId),
          idNumber: (client?.IDNumber ?? row.idNumber.trim()) || null,
          phoneNumber: (client?.PhoneNumber ?? row.phoneNumber.trim()) || null,
          age: client || row.age === '' ? null : Number(row.age),
          genderId: Number(client?.GenderId ?? row.genderId),
          weight: row.weight === '' ? null : Number(row.weight),
          height: row.height === '' ? null : Number(row.height),
          hip: row.hip === '' ? null : Number(row.hip),
          waist: row.waist === '' ? null : Number(row.waist),
          systolic: row.systolic === '' ? null : Number(row.systolic),
          diastolic: row.diastolic === '' ? null : Number(row.diastolic),
          rbs: row.rbs === '' ? null : Number(row.rbs),
          referralIds: referralMappings[index].ids,
        };
      });
      const result = await api.post('/manual-sheets/import', {
        captureDate,
        stationId: Number(selectedStation),
        rows: payloadRows,
      });

      if (useCorrectionExamples) {
        const feedbackEntries = rows.flatMap((row) => Object.entries(FEEDBACK_FIELD_MAP)
          .filter(([field]) => row.original[field] !== undefined)
          .filter(([field]) => !(row.clientId && field === 'age'))
          .filter(([field]) => {
            const value = field === 'category'
              ? lookups.categories.find((item) => String(item.Id) === row.categoryId)?.Title || ''
              : field === 'gender'
                ? lookups.genders.find((item) => String(item.Id) === row.genderId)?.Title || ''
                : row[field as keyof ReviewRow];
            return String(row.original[field]).trim() !== String(value ?? '').trim();
          })
          .map(([field]) => {
            const corrected = field === 'category'
              ? lookups.categories.find((item) => String(item.Id) === row.categoryId)?.Title || ''
              : field === 'gender'
                ? lookups.genders.find((item) => String(item.Id) === row.genderId)?.Title || ''
                : String(row[field as keyof ReviewRow] ?? '');
            return {
              field: FEEDBACK_FIELD_MAP[field],
              ocrValue: row.original[field],
              correctedValue: corrected,
            };
          }));
        if (feedbackEntries.length > 0) {
          try {
              for (let index = 0; index < feedbackEntries.length; index += 500) {
                await api.post('/manual-sheets/feedback', {
                  entries: feedbackEntries.slice(index, index + 500),
                });
              }
            } catch (feedbackError) {
            console.error('Could not save manual-sheet OCR feedback:', feedbackError);
            toast.error('Records were saved, but anonymous OCR correction feedback could not be saved.');
          }
        }
      }
      onSuccess(result.data.imported.length);
    } catch (error: any) {
      console.error('Manual-sheet import failed:', error);
      toast.error(error.response?.data?.message || 'Import failed. No rows were saved.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    minWidth: 0,
    padding: '9px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: '7px',
    fontSize: '13px',
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: '#475569',
    marginBottom: 4,
  };
  const selectStyle = { ...inputStyle, background: '#fff' };

  const renderInput = (
    row: ReviewRow,
    field: keyof ReviewRow,
    label: string,
    type: 'text' | 'number' = 'text'
  ) => {
    const validationField = REVIEW_FIELD_VALIDATION[field];
    const limits = validationField ? FIELD_LIMITS[validationField] : undefined;
    const error = getReviewFieldError(row, field);
    return (
      <label key={String(field)} style={labelStyle}>
        {label}
        <input
          type={type}
          value={String(row[field] ?? '')}
          onChange={(event) => updateRow(row.key, field, event.target.value)}
          min={limits?.min ?? (field === 'age' ? 0 : undefined)}
          max={limits?.max ?? (field === 'age' ? 120 : undefined)}
          step={field === 'rbs' ? 'any' : undefined}
          aria-invalid={Boolean(error)}
          style={{ ...inputStyle, borderColor: error ? '#dc2626' : '#cbd5e1' }}
        />
        {error && <span role="alert" style={{ display: 'block', color: '#b91c1c', marginTop: 3 }}>{error}</span>}
      </label>
    );
  };

  return (
    <section style={{ maxWidth: 1100, margin: '0 auto', padding: 20, color: '#1f2937' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ScanText size={22} /> Manual Sheet OCR
          </h2>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>
            First-row test: scan page 1, review row 1, then decide whether the extraction is accurate enough to continue.
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" style={{ border: 0, background: 'transparent', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </header>

      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 12, fontSize: 12, lineHeight: 1.5, marginBottom: 16 }}>
        Only page 1 and its first table row are OCR-processed in this test. Two local OCR layout passes are compared to accommodate handwriting; the browser sends their text and positions—not the PDF image—to the configured AI chat service. Existing clients are matched by exact C/NO only. No other pages or rows are extracted.
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, marginBottom: 14 }}>
        <input type="checkbox" checked={useCorrectionExamples} onChange={(e) => setUseCorrectionExamples(e.target.checked)} />
        Opt in to using and retaining de-identified field corrections (not names, ID numbers, or phone numbers) as examples for future OCR extraction.
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 16 }}>
        <label style={labelStyle}>
          Capture date
          <input type="date" value={captureDate} onChange={(e) => setCaptureDate(e.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Station / site
          <select value={selectedStation} onChange={(e) => setSelectedStation(e.target.value)} style={selectStyle}>
            <option value="">Select station</option>
            {(lookups?.stations || []).map((item) => <option key={item.Id} value={item.Id}>{item.Title}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          Rotate scanned page
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setRotation((rotation + 270) % 360)} style={selectStyle} aria-label="Rotate counterclockwise">
              <RotateCcw size={16} /> Counterclockwise
            </button>
            <button type="button" onClick={() => setRotation((rotation + 90) % 360)} style={selectStyle} aria-label="Rotate clockwise">
              <RotateCw size={16} /> Clockwise
            </button>
          </div>
          <span style={{ fontWeight: 400 }}>Current rotation: {rotation}°</span>
          <span style={{ ...labelStyle, fontWeight: 400, marginTop: 8 }}>
            Fine tilt: {fineRotation.toFixed(1)}°
            <input
              type="range"
              min={-5}
              max={5}
              step={0.1}
              value={fineRotation}
              onChange={(event) => setFineRotation(Number(event.target.value))}
              style={{ display: 'block', width: '100%', margin: '6px 0' }}
            />
            {fineRotation === 0
              ? 'Automatic small-tilt correction is on.'
              : 'Manual fine rotation is applied; automatic correction is off.'}
            {fineRotation !== 0 && ' Positive values rotate clockwise.'}
          </span>
        </label>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf"
          onChange={(event) => handleFile(event.target.files?.[0])}
          style={{ display: 'none' }}
        />
        <button type="button" onClick={() => fileInput.current?.click()} style={{ ...buttonStyle, background: '#fff', color: '#0b2f9e', border: '1px solid #cbd5e1' }}>
          <Upload size={16} /> {file ? file.name : 'Choose scanned PDF'}
        </button>
        <button type="button" onClick={runLocalOCR} disabled={!file || busy} style={buttonStyle}>
          {busy && pages.length === 0 ? <Loader2 className="spin" size={16} /> : <ScanText size={16} />}
          Scan page 1, row 1
        </button>
        <button type="button" onClick={extractRowsWithAI} disabled={pages.length === 0 || busy} style={{ ...buttonStyle, background: '#1a4d8c' }}>
          {busy && pages.length > 0 ? <Loader2 className="spin" size={16} /> : <FileText size={16} />}
          Extract row 1 with AI
        </button>
        {busy && <progress max={100} value={progress} style={{ width: 130 }} />}
      </div>
      {status && <p role="status" style={{ color: '#475569', fontSize: 13 }}>{status}</p>}

      {pages.length > 0 && (
        <details open style={{ marginBottom: 20 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Local OCR conversion — page 1, row 1 (visible by default)</summary>
          <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
            {pages.map((page) => (
              <div key={page.pageNumber} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
                <img src={page.preview} alt={`Rotated preview of page ${page.pageNumber}`} style={{ width: '100%', height: 'auto', border: '1px solid #cbd5e1' }} />
                <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: '60vh', fontSize: 11, margin: 0 }}>{page.text || '(No text detected)'}</pre>
              </div>
            ))}
          </div>
        </details>
      )}

      {rows.length > 0 && lookups && (
        <>
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: 12, fontSize: 12, marginBottom: 14 }}>
            Pilot result: only page 1, row 1 was extracted. AI values are provisional; confirm every field against the scanned sheet before importing this single row.
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            {rows.map((row) => {
              const referralResult = getReferralIds(row.referralCodes, lookups.referrals);
              const matchedClient = row.clientMatches?.find((client) => client.Id === row.clientId);
              return (
                <article key={row.key} style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: 14, background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <strong>Page {row.page}, row {row.rowNumber}</strong>
                    <button type="button" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))} style={{ border: 0, background: 'transparent', color: '#b91c1c', cursor: 'pointer' }}>
                      <X size={16} /> Exclude row
                    </button>
                  </div>
                  <section aria-label="AI interpretation before edits" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: 10, marginBottom: 12 }}>
                    <strong style={{ fontSize: 12 }}>AI interpretation (original, before edits)</strong>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginTop: 8 }}>
                      {OCR_INTERPRETATION_FIELDS.map(([field, label]) => (
                        <div key={String(field)} style={{ minWidth: 0, fontSize: 11 }}>
                          <span style={{ display: 'block', color: '#64748b' }}>{label}</span>
                          <strong style={{ display: 'block', overflowWrap: 'anywhere' }}>
                            {row.original[String(field)]?.trim() || '(blank / uncertain)'}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </section>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                    {matchedClient ? (
                      <div style={{
                        gridColumn: '1 / -1',
                        padding: 10,
                        border: '1px solid #bbf7d0',
                        borderRadius: 7,
                        background: '#f0fdf4',
                        fontSize: 12,
                      }}>
                        <strong>Existing client matched by C/NO</strong>
                        <div style={{ marginTop: 4 }}>
                          {matchedClient.FullName} · ID {matchedClient.IDNumber || '—'} · Phone {matchedClient.PhoneNumber || '—'}
                          {' · '}{matchedClient.CategoryTitle || 'Category unavailable'}
                          {' · '}{matchedClient.GenderTitle || 'Sex unavailable'}
                        </div>
                        <div style={{ marginTop: 4 }}>Identity details will be taken from the client record; only findings below will be imported.</div>
                      </div>
                    ) : (
                      <>
                        {renderInput(row, 'name', 'Client name')}
                        {renderInput(row, 'idNumber', 'C/NO check number')}
                        {renderInput(row, 'phoneNumber', 'Phone number')}
                        {renderInput(row, 'age', 'Age', 'number')}
                        <label style={labelStyle}>
                          Category
                          <select value={row.categoryId} onChange={(e) => updateRow(row.key, 'categoryId', e.target.value)} style={selectStyle}>
                            <option value="">Select category</option>
                            {lookups.categories.map((item) => <option key={item.Id} value={item.Id}>{item.Title}</option>)}
                          </select>
                        </label>
                        <label style={labelStyle}>
                          Sex
                          <select value={row.genderId} onChange={(e) => updateRow(row.key, 'genderId', e.target.value)} style={selectStyle}>
                            <option value="">Select sex</option>
                            {lookups.genders.map((item) => <option key={item.Id} value={item.Id}>{item.Title}</option>)}
                          </select>
                        </label>
                      </>
                    )}
                    {renderInput(row, 'weight', 'Weight (kg)', 'number')}
                    {renderInput(row, 'height', 'Height (cm)', 'number')}
                    {renderInput(row, 'hip', 'Hip circumference (cm)', 'number')}
                    {renderInput(row, 'waist', 'Waist circumference (cm)', 'number')}
                    {renderInput(row, 'systolic', 'Systolic', 'number')}
                    {renderInput(row, 'diastolic', 'Diastolic', 'number')}
                    {renderInput(row, 'rbs', 'RBS', 'number')}
                    {renderInput(row, 'referralCodes', 'Referral number(s), e.g. 1, 4, 7 or N/A')}
                  </div>
                  {referralResult.unresolved.length > 0 && (
                    <p style={{ color: '#b45309', fontSize: 12, margin: '8px 0' }}>
                      No active database referral matches: {referralResult.unresolved.map((code) => {
                        const title = REFERRAL_CODES[Number(code)]?.title;
                        return title ? `${code} (${title})` : code;
                      }).join(', ')}. Add the referral in system configuration or remove/correct the code before import.
                    </p>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 10 }}>
                    {!row.clientId && (
                      <button
                        type="button"
                        onClick={() => findClients(row)}
                        disabled={row.searching || !row.idNumber.trim()}
                        style={{ ...buttonStyle, padding: '7px 10px', fontSize: 12 }}
                      >
                        {row.searching ? <Loader2 className="spin" size={14} /> : <ArrowLeft size={14} />}
                        Search existing client by C/NO
                      </button>
                    )}
                    {row.clientId && (
                      <button
                        type="button"
                        onClick={() => selectClient(row, '')}
                        style={{ ...buttonStyle, background: '#64748b', padding: '7px 10px', fontSize: 12 }}
                      >
                        Clear existing-client match
                      </button>
                    )}
                    {!row.clientId && row.clientMatches?.length === 0 && (
                      <>
                        <span style={{ fontSize: 12, color: '#475569' }}>
                          No exact C/NO match. Correct the number or review the details before registering a new client.
                        </span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 400 }}>
                        <input
                          type="checkbox"
                          checked={row.createNew}
                          onChange={(e) => updateRow(row.key, 'createNew', e.target.checked)}
                        />
                        Register a new client from these reviewed details
                      </label>
                      </>
                    )}
                    {!row.clientId && row.clientMatches && row.clientMatches.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => selectClient(row, e.target.value)}
                        style={{ ...selectStyle, maxWidth: 400 }}
                      >
                        <option value="">Select exact C/NO match</option>
                        {row.clientMatches.map((client) => (
                          <option key={client.Id} value={client.Id}>
                            {client.FullName} · {client.CategoryTitle || 'Category unavailable'} · {client.GenderTitle || 'Sex unavailable'}
                          </option>
                        ))}
                      </select>
                    )}
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      {referralResult.ids.length} referral(s) mapped
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button type="button" onClick={onClose} style={{ ...buttonStyle, background: '#64748b' }}>
              Cancel
            </button>
            <button
              type="button"
              onClick={saveReviewedRows}
              disabled={
                busy ||
                rows.length === 0 ||
                rows.some((row) => !row.clientId && !row.createNew) ||
                rows.some((row) => row.createNew && getNewClientRegistrationError(row) !== null) ||
                rows.some((row) => getReviewRowErrors(row).length > 0) ||
                rows.some((row) => getReferralIds(row.referralCodes, lookups.referrals).unresolved.length > 0)
              }
              style={{ ...buttonStyle, background: '#047857' }}
            >
              {busy ? <Loader2 className="spin" size={16} /> : <Check size={16} />}
              Confirm and import {rows.length} row(s)
            </button>
          </div>
        </>
      )}
      <style>{`.spin { animation: manual-sheet-spin 1s linear infinite; } @keyframes manual-sheet-spin { to { transform: rotate(360deg); } }`}</style>
    </section>
  );
};

const buttonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  border: 0,
  borderRadius: 8,
  padding: '10px 14px',
  color: '#fff',
  background: '#0b2f9e',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
};

export default ManualSheetOCR;
