// ===== PIX BR CODE (EMV) =====
import QRCode from 'qrcode';

export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';

export interface PixConfig {
  key: string;
  keyType: PixKeyType;
  merchantName: string;
  merchantCity: string;
}

export interface PixCharge {
  config: PixConfig;
  amountCents: number;
  txid: string;
  description?: string;
}

function tlv(id: string, value: string): string {
  const length = String(value.length).padStart(2, '0');
  return `${id}${length}${value}`;
}

function sanitize(value: string, max: number): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 .-]/g, '')
    .toUpperCase()
    .trim()
    .slice(0, max);
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Monta o payload EMV do PIX (BR Code), pronto para copiar e colar. */
export function buildPixPayload({ config, amountCents, txid, description }: PixCharge): string {
  const key = config.key.trim();
  if (!key) throw new Error('Chave PIX não configurada');
  if (!/^[A-Za-z0-9]{1,25}$/.test(txid)) throw new Error('Identificador PIX inválido');

  const merchantAccount = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', key);
  const additionalData = tlv('05', txid);
  const amount = amountCents > 0 ? (amountCents / 100).toFixed(2) : '';

  const parts = [
    tlv('00', '01'),
    tlv('01', amount ? '12' : '11'),
    tlv('26', merchantAccount),
    tlv('52', '0000'),
    tlv('53', '986'),
    ...(amount ? [tlv('54', amount)] : []),
    tlv('58', 'BR'),
    tlv('59', sanitize(config.merchantName || 'GREMIO', 25) || 'GREMIO'),
    tlv('60', sanitize(config.merchantCity || 'TREME TERRA', 15) || 'TREME TERRA'),
    tlv('62', additionalData),
  ];

  const withoutCrc = parts.join('') + '6304';
  return withoutCrc + crc16(withoutCrc);
}

/** Gera o QR Code do PIX como data URL (imagem PNG). */
export function buildPixQr(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: 512,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#0a0f1a', light: '#ffffff' },
  });
}

/** txid curto: identifica o integrante e o mês no comprovante. */
export function buildTxid(memberId: string, monthYear: string): string {
  const compactId = memberId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
  const month = monthYear.replace(/[^0-9]/g, '').slice(0, 6);
  return `GFZ${compactId}${month}`;
}

export function memberIdFromTxid(txid?: string): string | null {
  const match = txid?.match(/^GFZ([A-Z0-9]{1,8})\d{6}$/i);
  return match ? match[1].toUpperCase() : null;
}
