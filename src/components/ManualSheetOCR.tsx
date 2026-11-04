import React, { useEffect, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker, PSM } from 'tesseract.js';
import { ArrowLeft, Check, FileText, Loader2, RotateCcw, RotateCw, ScanText, Upload, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import api from '../api/client';
import aiService from '../api/aiService';

GlobalWorkerOptions.workerSrc = pdfWorker;

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
  bpMedication: 'BPMedication',
  diabetesMedication: 'DiabetesMedication',
  referralCodes: 'Referrals',
};

type Lookup = { Id: number; Title: string; LegacyColumn?: string | null };
type LookupData = {
  categories: Lookup[];
  genders: Lookup[];
  stations: Lookup[];
  referrals: Lookup[];
  bpRemarks: Lookup[];
  rbsRemarks: Lookup[];
};

type ExtractedRow = {
  rowNumber?: number;
  name?: string | null;
  category?: string | null;
  idNumber?: string | null;
  phoneNumber?: string | null;
  age?: number | string | null;
  sex?: string | null;
  weight?: number | string | null;
  height?: number | string | null;
  hip?: number | string | null;
  waist?: number | string | null;
  systolic?: number | string | null;
  diastolic?: number | string | null;
  rbs?: number | string | null;
  bpMedication?: string | null;
  diabetesMedication?: string | null;
  referrals?: string | string[] | number[] | null;
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
  bpRemarkId: string;
  rbsRemarkId: string;
  referralCodes: string;
  original: Record<string, string>;
  clientMatches?: Array<{ Id: number; FullName: string; IDNumber: string | null; PhoneNumber: string | null }>;
  searching?: boolean;
};

type OCRPage = { pageNumber: number; text: string; preview: string };

interface ManualSheetOCRProps {
  stationId: number;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const getLookupId = (value: string | null | undefined, options: Lookup[]): string => {
  if (!value) return '';
  const cleaned = value.trim().toLowerCase();
  const found = options.find((option) => {
    const title = option.Title.toLowerCase();
    if (cleaned === title) return true;
    if (cleaned === 'd' || cleaned.includes('dependent')) return title.includes('dependent');
    if (cleaned === 'e' || cleaned.includes('employee')) return title.includes('employee');
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

const normalizeMedication = (value: string | null | undefined): string => {
  const answer = (value || '').trim().toLowerCase();
  if (['y', 'yes', 'true', 'on tx', 'known on tx', '1'].includes(answer)) return 'yes';
  if (['n', 'no', 'false', 'not on tx', '0'].includes(answer)) return 'no';
  return '';
};

const resolveRemark = (answer: string, options: Lookup[]): string => {
  if (!answer) return '';
  const exact = options.find((option) => normalize(option.Title) === normalize(answer));
  if (exact) return String(exact.Id);
  const candidate = options.find((option) => {
    const title = option.Title.toLowerCase();
    const saysYes = answer === 'yes';
    if (saysYes) {
      return (title.includes('known') || title.includes('yes') || title.includes('on tx')) &&
        !title.includes('not known') && !title.includes('not on');
    }
    return title.includes('not known') || title.includes('not on') ||
      title.includes('no ') || title === 'no' || title.includes('negative');
  });
  return candidate ? String(candidate.Id) : '';
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
      let pageNumberProgress = 1;
      const pageCountProgress = pdf.numPages;
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
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          pageNumberProgress = pageNumber;
          setStatus(`Rendering page ${pageNumber} of ${pdf.numPages} at high resolution…`);
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
          scanCanvas.width = sourceCanvas.width;
          scanCanvas.height = sourceCanvas.height;
          const scanContext = scanCanvas.getContext('2d');
          if (!scanContext) throw new Error('Your browser could not prepare the high-resolution scan.');
          if ('filter' in scanContext) scanContext.filter = 'grayscale(1) contrast(1.25)';
          scanContext.drawImage(sourceCanvas, 0, 0);

          const recognizeRegion = async (
            section: string,
            rectangle: { left: number; top: number; width: number; height: number },
            pageSegmentationMode: PSM
          ) => {
            setStatus(`Recognizing ${section} on page ${pageNumber} of ${pdf.numPages} locally…`);
            await worker.setParameters({
              tessedit_pageseg_mode: pageSegmentationMode,
              preserve_interword_spaces: '1',
              user_defined_dpi: '252',
            });
            const result = await worker.recognize(scanCanvas, { rectangle });
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
          const tableText = await recognizeRegion(
            'table headings and handwritten rows',
            {
              left: Math.round(scanCanvas.width * 0.05),
              top: Math.round(scanCanvas.height * 0.10),
              width: Math.round(scanCanvas.width * 0.90),
              height: Math.round(scanCanvas.height * 0.75),
            },
            PSM.SPARSE_TEXT
          );
          const keyText = await recognizeRegion(
            'referral key',
            {
              left: Math.round(scanCanvas.width * 0.02),
              top: Math.round(scanCanvas.height * 0.84),
              width: Math.round(scanCanvas.width * 0.96),
              height: Math.round(scanCanvas.height * 0.14),
            },
            PSM.SINGLE_BLOCK
          );
          const text = [
            'DOCUMENT TITLE AND STATION / MONTH / DATE:',
            metadataText || '(No text recognized in this section)',
            'FIELD TABLE (read each line as one numbered row):',
            tableText || '(No text recognized in this section)',
            'REFERRAL KEY:',
            keyText || '(No text recognized in this section)',
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
          setProgress(Math.round((pageNumber / pdf.numPages) * 100));
        }
      } finally {
        await worker.terminate();
      }
      if (nextPages.every((page) => !page.text)) {
        throw new Error('No text was detected. Try a clearer scan or a higher-quality PDF.');
      }
      setPages(nextPages);
      setStatus(`Local OCR complete: ${nextPages.length} page(s).`);
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
        examples = feedback.data.examples || [];
      }

      const nextRows: ReviewRow[] = [];
      let detectedDate = '';
      let detectedStation = '';
      for (const page of pages) {
        if (!page.text) continue;
        setStatus(`Using AI to organize page ${page.pageNumber} of ${pages.length}…`);
        const corrections = examples.length
          ? `\nPrior de-identified human corrections (field, mistaken value, corrected value):\n${JSON.stringify(examples.slice(0, 40))}\n`
          : '';
        const prompt = `Extract the field-screening sheet from the OCR text, which has been separated into document-header, field-table, and referral-key regions. Return exactly one JSON object with keys "captureDate", "station", and "rows". Use only the document-header region for station and capture date; captureDate must be YYYY-MM-DD or null. A month without a readable day is not a complete capture date.

The printed table columns from left to right are: NO, NAME, CAT, C/NO (ID/check number), TEL, AGE, SEX, WT, HT, HIP CIRCU (cm), WAIST CIRCUM (cm), SYST, DIAS, RBS, HIGH BP (known/on-treatment Y/N), DIABETES (known/on-treatment Y/N), REFERRALS, COMMENT. The first column is a pre-printed row number 1-15. Extract only rows supported by the table region. Carefully keep values in their printed column and row; do not shift a value into a neighboring field to make it look plausible. Comments are not a substitute for the two medication columns.

Each row must have rowNumber (1-15), name, category (Employee, Dependent, or Port User), idNumber, phoneNumber, age, sex (Male or Female), weight, height, hip, waist, systolic, diastolic, rbs, bpMedication, diabetesMedication, referrals. Use null for blank or uncertain values; do not guess, infer missing measurements, or create rows without evidence. Medication answers should be "Y", "N", or null. Referrals must contain the printed referral codes, including prefixes such as E, D, or PU where visible. The referral key is: E=Employee, D=Dependent, PU=Port User; 1=Cancer Screening, 2=Dental Screening, 3=Eye Screening, 4=HbA1c, 5=Lipid Profile, 6=Microalbumin, 7=PSA, 8=FBS, 9=LFTs, 10=Creatinine Clearance, 11=Hepatitis B/C. Keep all extracted values as written; do not correct or clinically interpret them. If a digit or word is uncertain, use null. Do not output markdown.${corrections}\nPage ${page.pageNumber} OCR text:\n${page.text}`;
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
          if (!Number.isInteger(rowNumber) || rowNumber < 1 || rowNumber > 15) {
            throw new Error(`AI returned an invalid row number on page ${page.pageNumber}. Please retry extraction.`);
          }
          const categoryId = getLookupId(raw.category, options.categories);
          const genderId = getLookupId(raw.sex, options.genders);
          const referrals = Array.isArray(raw.referrals)
            ? raw.referrals.map(String).join(', ')
            : String(raw.referrals || '');
          const sourceValues: Record<string, string> = {
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
            bpMedication: normalizeMedication(raw.bpMedication),
            diabetesMedication: normalizeMedication(raw.diabetesMedication),
            referralCodes: referrals,
          };
          nextRows.push({
            key: `${page.pageNumber}-${rowNumber}-${nextRows.length}`,
            page: page.pageNumber,
            rowNumber,
            clientId: null,
            createNew: false,
            name: String(raw.name || ''),
            categoryId,
            idNumber: String(raw.idNumber || ''),
            phoneNumber: String(raw.phoneNumber || ''),
            age: toInputValue(raw.age),
            genderId,
            weight: toInputValue(raw.weight),
            height: toInputValue(raw.height),
            hip: toInputValue(raw.hip),
            waist: toInputValue(raw.waist),
            systolic: toInputValue(raw.systolic),
            diastolic: toInputValue(raw.diastolic),
            rbs: toInputValue(raw.rbs),
            bpRemarkId: resolveRemark(sourceValues.bpMedication, options.bpRemarks),
            rbsRemarkId: resolveRemark(sourceValues.diabetesMedication, options.rbsRemarks),
            referralCodes: referrals,
            original: sourceValues,
          });
        }
      }
      if (nextRows.length === 0) {
        throw new Error('No numbered rows were extracted. Review the OCR text and try again.');
      }
      setRows(nextRows);
      if (detectedDate) setCaptureDate(detectedDate);
      if (detectedStation) {
        const station = options.stations.find((item) =>
          normalize(item.Title) === normalize(detectedStation)
        );
        if (station) setSelectedStation(String(station.Id));
      }
      setStatus(`AI organized ${nextRows.length} row(s). Verify every suggested field before import.`);
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
    setRows((current) => current.map((row) => row.key === key ? { ...row, [field]: value } : row));
  };

  const findClients = async (row: ReviewRow) => {
    const query = row.idNumber || row.phoneNumber || row.name;
    if (!query.trim()) return;
    updateRow(row.key, 'searching', true);
    try {
      const response = await api.get(`/clients/search?q=${encodeURIComponent(query)}`);
      const exactMatches = (response.data || []).filter((client: any) =>
        (row.idNumber && client.IDNumber === row.idNumber) ||
        (row.phoneNumber && client.PhoneNumber === row.phoneNumber) ||
        (!row.idNumber && !row.phoneNumber)
      );
      setRows((current) => current.map((item) => item.key === row.key
        ? { ...item, clientMatches: exactMatches, searching: false }
        : item));
    } catch (error) {
      console.error('Manual-sheet client lookup failed:', error);
      updateRow(row.key, 'searching', false);
      toast.error('Could not search for an existing client.');
    }
  };

  const saveReviewedRows = async () => {
    if (!lookups) return;
    if (!captureDate || !selectedStation) {
      toast.error('Choose the capture date and station.');
      return;
    }
    if (rows.some((row) => !row.name.trim() || !row.categoryId || !row.genderId)) {
      toast.error('Every imported row needs a client name, category, and sex.');
      return;
    }
    if (rows.some((row) => !row.clientId && !row.createNew)) {
      toast.error('Search for an existing client or explicitly confirm creating a new client for unmatched rows.');
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
      const payloadRows = rows.map((row, index) => ({
        rowNumber: row.rowNumber,
        clientId: row.clientId,
        createNew: row.createNew,
        name: row.name.trim(),
        categoryId: Number(row.categoryId),
        idNumber: row.idNumber.trim() || null,
        phoneNumber: row.phoneNumber.trim() || null,
        age: row.age === '' ? null : Number(row.age),
        genderId: Number(row.genderId),
        weight: row.weight === '' ? null : Number(row.weight),
        height: row.height === '' ? null : Number(row.height),
        hip: row.hip === '' ? null : Number(row.hip),
        waist: row.waist === '' ? null : Number(row.waist),
        systolic: row.systolic === '' ? null : Number(row.systolic),
        diastolic: row.diastolic === '' ? null : Number(row.diastolic),
        rbs: row.rbs === '' ? null : Number(row.rbs),
        bpRemarkId: row.bpRemarkId ? Number(row.bpRemarkId) : null,
        rbsRemarkId: row.rbsRemarkId ? Number(row.rbsRemarkId) : null,
        referralIds: referralMappings[index].ids,
      }));
      const result = await api.post('/manual-sheets/import', {
        captureDate,
        stationId: Number(selectedStation),
        rows: payloadRows,
      });

      if (useCorrectionExamples) {
        const feedbackEntries = rows.flatMap((row) => Object.entries(FEEDBACK_FIELD_MAP)
          .filter(([field]) => row.original[field] !== undefined)
          .filter(([field]) => {
            const value = field === 'category'
              ? lookups.categories.find((item) => String(item.Id) === row.categoryId)?.Title || ''
              : field === 'gender'
                ? lookups.genders.find((item) => String(item.Id) === row.genderId)?.Title || ''
                : field === 'bpMedication'
                  ? lookups.bpRemarks.find((item) => String(item.Id) === row.bpRemarkId)?.Title || ''
                  : field === 'diabetesMedication'
                    ? lookups.rbsRemarks.find((item) => String(item.Id) === row.rbsRemarkId)?.Title || ''
                    : row[field as keyof ReviewRow];
            return String(row.original[field]).trim() !== String(value ?? '').trim();
          })
          .map(([field]) => {
            const corrected = field === 'category'
              ? lookups.categories.find((item) => String(item.Id) === row.categoryId)?.Title || ''
              : field === 'gender'
                ? lookups.genders.find((item) => String(item.Id) === row.genderId)?.Title || ''
                : field === 'bpMedication'
                  ? lookups.bpRemarks.find((item) => String(item.Id) === row.bpRemarkId)?.Title || ''
                  : field === 'diabetesMedication'
                    ? lookups.rbsRemarks.find((item) => String(item.Id) === row.rbsRemarkId)?.Title || ''
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
  ) => (
    <label key={String(field)} style={labelStyle}>
      {label}
      <input
        type={type}
        value={String(row[field] ?? '')}
        onChange={(event) => updateRow(row.key, field, event.target.value)}
        style={inputStyle}
      />
    </label>
  );

  return (
    <section style={{ maxWidth: 1100, margin: '0 auto', padding: 20, color: '#1f2937' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ScanText size={22} /> Manual Sheet OCR
          </h2>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>
            Scan, review, correct, then import. OCR suggestions are never saved without your confirmation.
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" style={{ border: 0, background: 'transparent', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </header>

      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 12, fontSize: 12, lineHeight: 1.5, marginBottom: 16 }}>
        PDF pages are rendered and OCR-processed locally in this browser. OCR text—not the PDF image—is sent to the configured AI chat service to organize the rows. Verify every field before saving.
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
          Run local OCR
        </button>
        <button type="button" onClick={extractRowsWithAI} disabled={pages.length === 0 || busy} style={{ ...buttonStyle, background: '#1a4d8c' }}>
          {busy && pages.length > 0 ? <Loader2 className="spin" size={16} /> : <FileText size={16} />}
          Organize text with AI
        </button>
        {busy && <progress max={100} value={progress} style={{ width: 130 }} />}
      </div>
      {status && <p role="status" style={{ color: '#475569', fontSize: 13 }}>{status}</p>}

      {pages.length > 0 && (
        <details style={{ marginBottom: 20 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>View local OCR text ({pages.length} pages)</summary>
          <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
            {pages.map((page) => (
              <div key={page.pageNumber} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
                <img src={page.preview} alt={`Rotated preview of page ${page.pageNumber}`} style={{ width: '100%', height: 'auto', border: '1px solid #cbd5e1' }} />
                <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: 240, fontSize: 11, margin: 0 }}>{page.text || '(No text detected)'}</pre>
              </div>
            ))}
          </div>
        </details>
      )}

      {rows.length > 0 && lookups && (
        <>
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: 12, fontSize: 12, marginBottom: 14 }}>
            AI-extracted values are provisional. Confirm identity, category, sex, measurements, medication remarks, and referral codes against the scanned sheet before importing.
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            {rows.map((row) => {
              const referralResult = getReferralIds(row.referralCodes, lookups.referrals);
              return (
                <article key={row.key} style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: 14, background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <strong>Page {row.page}, row {row.rowNumber}</strong>
                    <button type="button" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))} style={{ border: 0, background: 'transparent', color: '#b91c1c', cursor: 'pointer' }}>
                      <X size={16} /> Exclude row
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                    {renderInput(row, 'name', 'Client name')}
                    {renderInput(row, 'idNumber', 'ID / check number')}
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
                    {renderInput(row, 'weight', 'Weight (kg)', 'number')}
                    {renderInput(row, 'height', 'Height (cm)', 'number')}
                    {renderInput(row, 'hip', 'Hip circumference (cm)', 'number')}
                    {renderInput(row, 'waist', 'Waist circumference (cm)', 'number')}
                    {renderInput(row, 'systolic', 'Systolic', 'number')}
                    {renderInput(row, 'diastolic', 'Diastolic', 'number')}
                    {renderInput(row, 'rbs', 'RBS', 'number')}
                    <label style={labelStyle}>
                      High BP medication
                      <select value={row.bpRemarkId} onChange={(e) => updateRow(row.key, 'bpRemarkId', e.target.value)} style={selectStyle}>
                        <option value="">Not stated on sheet</option>
                        {lookups.bpRemarks.map((item) => <option key={item.Id} value={item.Id}>{item.Title}</option>)}
                      </select>
                    </label>
                    <label style={labelStyle}>
                      Diabetes medication
                      <select value={row.rbsRemarkId} onChange={(e) => updateRow(row.key, 'rbsRemarkId', e.target.value)} style={selectStyle}>
                        <option value="">Not stated on sheet</option>
                        {lookups.rbsRemarks.map((item) => <option key={item.Id} value={item.Id}>{item.Title}</option>)}
                      </select>
                    </label>
                    {renderInput(row, 'referralCodes', 'Referral code(s), e.g. E1, D3, PU11')}
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
                    <button type="button" onClick={() => findClients(row)} disabled={row.searching} style={{ ...buttonStyle, padding: '7px 10px', fontSize: 12 }}>
                      {row.searching ? <Loader2 className="spin" size={14} /> : <ArrowLeft size={14} />}
                      Find existing client
                    </button>
                    {row.clientId && (
                      <button type="button" onClick={() => updateRow(row.key, 'clientId', null)} style={{ ...buttonStyle, background: '#64748b', padding: '7px 10px', fontSize: 12 }}>
                        Use automatic match / create new
                      </button>
                    )}
                    {!row.clientId && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 400 }}>
                        <input
                          type="checkbox"
                          checked={row.createNew}
                          onChange={(e) => updateRow(row.key, 'createNew', e.target.checked)}
                        />
                        Create a new client if no exact ID/phone match exists
                      </label>
                    )}
                    {row.clientMatches && (
                      <select
                        value={row.clientId || ''}
                        onChange={(e) => updateRow(row.key, 'clientId', e.target.value ? Number(e.target.value) : null)}
                        style={{ ...selectStyle, maxWidth: 400 }}
                      >
                        <option value="">Auto-match by exact ID/phone or create new</option>
                        {row.clientMatches.map((client) => (
                          <option key={client.Id} value={client.Id}>
                            {client.FullName} · ID {client.IDNumber || '—'} · {client.PhoneNumber || '—'}
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
              disabled={busy || rows.length === 0 || rows.some((row) => getReferralIds(row.referralCodes, lookups.referrals).unresolved.length > 0)}
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
