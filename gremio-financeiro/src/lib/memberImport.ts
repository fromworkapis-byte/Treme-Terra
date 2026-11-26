// ===== IMPORTAÇÃO DE LISTA DE INTEGRANTES =====
import type { MilitaryRank } from '../types';

export interface ParsedMember {
  rank: MilitaryRank;
  name: string;
  phone: string;
}

const GROUPS: { pattern: RegExp; rank: MilitaryRank }[] = [
  { pattern: /^\s*cabos?\s*:?\s*-?\s*$/i, rank: 'CB' },
  { pattern: /^\s*soldados?\s*:?\s*-?\s*$/i, rank: 'SD_ENG' },
];

function maskPhone(digits: string): string {
  return digits.length === 11
    ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    : `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
}

/** Interpreta uma lista com cabeçalhos de grupo e linhas "N. Nome - telefone". */
export function parseMemberList(text: string): { members: ParsedMember[]; errors: string[] } {
  const members: ParsedMember[] = [];
  const errors: string[] = [];
  let currentRank: MilitaryRank | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const group = GROUPS.find(candidate => candidate.pattern.test(line));
    if (group) {
      currentRank = group.rank;
      continue;
    }

    if (!currentRank) {
      errors.push(`"${line}": informe o grupo (Cabos ou Soldados) antes dos nomes.`);
      continue;
    }

    const phoneMatch = line.match(/\+?\d[\d\s().-]{8,16}\d/);
    if (!phoneMatch) {
      errors.push(`"${line}": telefone não encontrado.`);
      continue;
    }

    const rawDigits = phoneMatch[0].replace(/\D/g, '');
    const digits = rawDigits.length > 11 && rawDigits.startsWith('55') ? rawDigits.slice(2) : rawDigits;
    if (digits.length !== 10 && digits.length !== 11) {
      errors.push(`"${line}": telefone com ${digits.length} dígitos (esperado 10 ou 11).`);
      continue;
    }

    const name = line.slice(0, phoneMatch.index)
      .replace(/^\s*\d+\s*[.)-]?\s*/, '')
      .replace(/\s*[-–—:]\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (name.length < 2) {
      errors.push(`"${line}": nome inválido.`);
      continue;
    }

    members.push({ rank: currentRank, name, phone: maskPhone(digits) });
  }

  return { members, errors };
}
