// ===== LEITURA DE COMPROVANTE (OCR LOCAL) =====
import { createWorker } from 'tesseract.js';
import type { Member } from '../types';
import { memberIdFromTxid } from './pix';

export interface ReceiptAnalysis {
  text: string;
  amountCents?: number;
  date?: string;
  memberId?: string;
  txid?: string;
}

let workerPromise: ReturnType<typeof createWorker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker('por').catch(() => createWorker('eng'));
  }
  return workerPromise;
}

export async function readReceipt(file: File): Promise<string> {
  const worker = await getWorker();
  try {
    const { data } = await worker.recognize(file);
    return data.text || '';
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Não foi possível ler a imagem');
  }
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function parseAmount(raw: string): number | undefined {
  let cleaned = raw.replace(/[^\d.,]/g, '');
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
      ? cleaned.replace(/\./g, '')
      : cleaned.replace(/,/g, '');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  } else if ((cleaned.match(/\./g) || []).length === 1 && cleaned.split('.')[1]?.length === 2) {
    // valor em formato internacional, ex.: 30.00
  } else {
    cleaned = cleaned.replace(/\./g, '');
  }
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : undefined;
}

function extractAmount(text: string, expectedCents?: number): number | undefined {
  const candidates: number[] = [];
  const withCurrency = text.matchAll(/R\$\s*([\d.,]+)/gi);
  for (const match of withCurrency) {
    const value = parseAmount(match[1]);
    if (value) candidates.push(value);
  }
  if (candidates.length === 0) {
    for (const match of text.matchAll(/\b\d{1,7},\d{2}\b/g)) {
      const value = parseAmount(match[0]);
      if (value) candidates.push(value);
    }
  }
  if (candidates.length === 0) return undefined;
  if (expectedCents) {
    const exact = candidates.filter(value => value === expectedCents);
    if (exact.length) return expectedCents;
  }
  return candidates.sort((a, b) => b - a)[0];
}

function extractDate(text: string): string | undefined {
  for (const match of text.matchAll(/\b(\d{2})[\/\-.]\s*(\d{2})[\/\-.]\s*(\d{4})\b/g)) {
    const [, day, month, year] = match;
    const d = Number(day);
    const m = Number(month);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${year}-${month}-${day}`;
    }
  }
  return undefined;
}

function matchMember(text: string, members: Member[]): string | undefined {
  const upperText = normalize(text);
  const compactTxid = text.match(/GFZ([A-Z0-9]{1,8})\d{6}/i)?.[1]?.toUpperCase();
  const byTxid = compactTxid ? memberIdFromTxid(`GFZ${compactTxid}000000`) : null;
  if (byTxid) {
    const found = members.find(member => normalize(member.id).startsWith(byTxid));
    if (found) return found.id;
  }

  const matches = members.filter(member => {
    const parts = normalize(member.name).split(/\s+/).filter(part => part.length >= 4);
    return parts.length > 0 && parts.every(part => upperText.includes(part));
  });
  return matches.length === 1 ? matches[0].id : undefined;
}

export function analyzeReceipt(text: string, members: Member[], expectedCents?: number): ReceiptAnalysis {
  return {
    text,
    amountCents: extractAmount(text, expectedCents),
    date: extractDate(text),
    memberId: matchMember(text, members),
    txid: text.match(/GFZ[A-Z0-9]{1,8}\d{6}/i)?.[0]?.toUpperCase(),
  };
}
