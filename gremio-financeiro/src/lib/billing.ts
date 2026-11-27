// ===== CONFIGURAÇÃO DA COBRANÇA MENSAL =====
import { db, formatBRL, getCurrentMonthYear } from '../db';
import type { PaymentMethod } from '../types';
import type { PixKeyType } from './pix';
import { buildPixPayload, buildPixQr, buildTxid } from './pix';
import { normalizePhone, sendText, sendQrImage, type SendResult } from './whatsapp';

export interface BillingSettings {
  pixKey: string;
  pixKeyType: PixKeyType;
  merchantName: string;
  merchantCity: string;
  monthlyAmount: number; // centavos
  chargeDescription: string;
  chargeMessage: string;  // texto salvo, usado pelo botão Gerar cobrança
  qrCodeImage: string;    // data URL da imagem salva do QR Code
  incomeAccountId: string;   // conta creditada quando o efetivo paga
  incomeCategoryId: string;  // categoria da entrada gerada
  incomePaymentMethod: PaymentMethod;
  whatsappApiUrl: string;
  whatsappApiKey: string;
  whatsappInstance: string;
  autoSend: boolean;
}

export interface BillingLogEntry {
  month: string;
  memberId: string;
  name: string;
  ok: boolean;
  error?: string;
  at: string;
}

export interface BillingState {
  lastSentMonth: string;
  log: BillingLogEntry[];
}

export const DEFAULT_BILLING: BillingSettings = {
  pixKey: '',
  pixKeyType: 'PHONE',
  merchantName: '1 CFZ TREME TERRA',
  merchantCity: 'TREME TERRA',
  monthlyAmount: 2000,
  chargeDescription: 'Mensalidade do Grêmio',
  chargeMessage: '',
  qrCodeImage: '',
  incomeAccountId: '',
  incomeCategoryId: '',
  incomePaymentMethod: 'PIX',
  whatsappApiUrl: '',
  whatsappApiKey: '',
  whatsappInstance: '',
  autoSend: false,
};

export async function getBillingSettings(): Promise<BillingSettings> {
  const row = await db.settings.get('billing');
  const saved = (row?.value || {}) as Partial<BillingSettings>;
  return { ...DEFAULT_BILLING, ...saved };
}

export async function saveBillingSettings(settings: BillingSettings): Promise<void> {
  await db.settings.put({
    key: 'billing',
    value: settings as unknown as Record<string, unknown>,
    description: 'Configuração de PIX e envio via WhatsApp',
    updatedAt: new Date().toISOString(),
  });
}

export async function getBillingState(): Promise<BillingState> {
  const row = await db.settings.get('billingState');
  const saved = (row?.value || {}) as Partial<BillingState>;
  return { lastSentMonth: saved.lastSentMonth || '', log: saved.log || [] };
}

export async function saveBillingState(state: BillingState): Promise<void> {
  await db.settings.put({
    key: 'billingState',
    value: state as unknown as Record<string, unknown>,
    description: 'Controle de envio mensal',
    updatedAt: new Date().toISOString(),
  });
}

export function monthLabel(monthYear: string): string {
  const [year, month] = monthYear.split('-');
  const names = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${names[Number(month) - 1] || month}/${year}`;
}

/** Texto único da cobrança em grupo, usado na geração e na cópia pelo efetivo. */
export function buildGroupCharge({ monthYear, description, amountCents, customMessage }: {
  monthYear: string;
  description: string;
  amountCents: number;
  customMessage?: string;
}) {
  const generated = [
    `📣 *${description.trim()}*`,
    `Mês de referência: *${monthLabel(monthYear)}*`,
    '',
    `*Valor: ${formatBRL(amountCents)}*`,
    '',
    'Pague pelo QR Code PIX anexo ou pelo botão de PIX no WhatsApp.',
    '',
    '✅ *Após pagar, envie o comprovante de volta por aqui* para registrarmos no grêmio.',
  ].join('\n');
  return {
    txid: `GRM${monthYear.replace(/-/g, '')}`,
    message: customMessage?.trim() || generated,
  };
}

/** Usa o QR salvo na configuração; se não houver, gera um a partir da chave PIX. */
export async function resolveGroupQr({ settings, txid, description, amountCents }: {
  settings: BillingSettings;
  txid: string;
  description: string;
  amountCents: number;
}): Promise<string> {
  if (settings.qrCodeImage.trim()) return settings.qrCodeImage.trim();
  const payload = buildPixPayload({
    config: {
      key: settings.pixKey,
      keyType: settings.pixKeyType,
      merchantName: settings.merchantName,
      merchantCity: settings.merchantCity,
    },
    amountCents,
    txid,
    description: description.trim(),
  });
  return buildPixQr(payload);
}

export function buildCharge(memberId: string, monthYear: string, settings: BillingSettings) {
  const txid = buildTxid(memberId, monthYear);
  const payload = buildPixPayload({
    config: {
      key: settings.pixKey,
      keyType: settings.pixKeyType,
      merchantName: settings.merchantName,
      merchantCity: settings.merchantCity,
    },
    amountCents: settings.monthlyAmount,
    txid,
    description: `Mensalidade ${monthLabel(monthYear)}`,
  });
  return { txid, payload };
}

export function buildMessage(memberName: string, monthYear: string, settings: BillingSettings, payload: string): string {
  const firstName = memberName.trim().split(/\s+/)[0];
  return [
    `Olá, ${firstName}!`,
    '',
    `Mensalidade de ${monthLabel(monthYear)} da 1ª CFz - Treme Terra.`,
    `Valor: ${formatBRL(settings.monthlyAmount)}`,
    '',
    'PIX Copia e Cola:',
    payload,
    '',
    'O QR Code segue na próxima mensagem. Após pagar, envie o comprovante por aqui.',
  ].join('\n');
}

export async function sendCharge(
  member: { id: string; name: string; phone?: string },
  monthYear: string,
  settings: BillingSettings,
): Promise<SendResult> {
  const phone = normalizePhone(member.phone);
  if (!phone) return { ok: false, error: 'Sem WhatsApp cadastrado' };

  try {
    const { payload } = buildCharge(member.id, monthYear, settings);
    const text = buildMessage(member.name, monthYear, settings, payload);
    const sentText = await sendText(
      { apiUrl: settings.whatsappApiUrl, apiKey: settings.whatsappApiKey, instance: settings.whatsappInstance },
      phone,
      text,
    );
    if (!sentText.ok) return sentText;

    const dataUrl = await buildPixQr(payload);
    return await sendQrImage(
      { apiUrl: settings.whatsappApiUrl, apiKey: settings.whatsappApiKey, instance: settings.whatsappInstance },
      phone,
      dataUrl,
      `QR Code PIX - mensalidade de ${monthLabel(monthYear)}`,
    );
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Falha ao gerar cobrança' };
  }
}

export function validateBillingSettings(settings: BillingSettings): string | null {
  if (!settings.pixKey.trim()) return 'Informe a chave PIX';
  if (settings.monthlyAmount <= 0) return 'Informe o valor da mensalidade';
  if (!settings.whatsappApiUrl.trim() || !settings.whatsappApiKey.trim() || !settings.whatsappInstance.trim()) {
    return 'Configure API URL, API Key e instância do WhatsApp';
  }
  return null;
}

/** Envia o QR Code e o PIX copia-e-cola para os integrantes pendentes do mês. */
export async function sendMonthlyCharges(
  monthYear: string,
  settings: BillingSettings,
  { force = false }: { force?: boolean } = {},
): Promise<BillingState> {
  const error = validateBillingSettings(settings);
  if (error) throw new Error(error);

  const state = await getBillingState();
  if (!force && state.lastSentMonth >= monthYear) return state;

  const [members, payments] = await Promise.all([
    db.members.where('status').equals('ACTIVE').toArray(),
    db.memberPayments.where('referenceMonth').equals(monthYear).toArray(),
  ]);
  const paidIds = new Set(payments.map(payment => payment.memberId));
  const pending = members.filter(member => !paidIds.has(member.id));

  const at = new Date().toISOString();
  const entries: BillingLogEntry[] = [];
  for (const member of pending) {
    const result = await sendCharge(member, monthYear, settings);
    entries.push({ month: monthYear, memberId: member.id, name: member.name, ok: result.ok, error: result.error, at });
  }

  const next: BillingState = {
    lastSentMonth: monthYear,
    log: [...entries, ...state.log].slice(0, 100),
  };
  await saveBillingState(next);
  return next;
}

/** Envio automático na abertura do sistema quando o mês mudou. */
export async function runMonthlyBilling(): Promise<BillingState | null> {
  const month = getCurrentMonthYear();
  const settings = await getBillingSettings();
  if (!settings.autoSend) return null;
  return sendMonthlyCharges(month, settings);
}
