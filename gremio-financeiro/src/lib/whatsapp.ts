// ===== WHATSAPP (EVOLUTION API) =====

export interface WhatsAppConfig {
  apiUrl: string;
  apiKey: string;
  instance: string;
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

interface RawResult extends SendResult {
  status?: number;
}

/** Aceita 10/11 dígitos com DDD ou número completo com código do país. */
export function normalizePhone(raw?: string): string | null {
  let digits = (raw || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (!digits.startsWith('55') || digits.length < 12 || digits.length > 13) return null;
  return digits;
}

function configError(config: WhatsAppConfig): string | null {
  if (!config.apiUrl || !config.apiKey || !config.instance) {
    return 'Configure a API do WhatsApp em Configurações → Cobrança';
  }
  return null;
}

async function request(config: WhatsAppConfig, path: string, init: RequestInit): Promise<RawResult> {
  const missing = configError(config);
  if (missing) return { ok: false, error: missing };

  const base = config.apiUrl.replace(/\/+$/, '');
  try {
    const response = await fetch(`${base}/${path}`, {
      ...init,
      headers: { apikey: config.apiKey, ...init.headers },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 200);
      return { ok: false, status: response.status, error: `API retornou ${response.status}: ${detail}` };
    }
    return { ok: true, status: response.status };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Falha ao enviar' };
  }
}

function postJson(config: WhatsAppConfig, path: string, body: unknown): Promise<RawResult> {
  return request(config, path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function postForm(config: WhatsAppConfig, path: string, body: FormData): Promise<RawResult> {
  // Não definir Content-Type: o navegador precisa gerar o boundary do multipart.
  return request(config, path, { method: 'POST', body });
}

function shouldTryLegacy(result: RawResult): boolean {
  return !result.ok && !!result.status && [400, 404, 415, 422].includes(result.status);
}

function publicResult(result: RawResult): SendResult {
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

function base64ToBlob(dataUrl: string): { blob: Blob; mime: string } {
  const [header, encoded] = dataUrl.split(',');
  const mime = header?.match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(encoded || '');
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return { blob: new Blob([bytes], { type: mime }), mime };
}

export async function sendText(config: WhatsAppConfig, phone: string, text: string): Promise<SendResult> {
  const number = normalizePhone(phone);
  if (!number) return { ok: false, error: 'WhatsApp inválido (use DDD + número)' };

  const path = `message/sendText/${encodeURIComponent(config.instance)}`;
  // Evolution API 2.3+: { textMessage: { text } }. Versões antigas: { text }.
  const modern = await postJson(config, path, { number, textMessage: { text } });
  if (modern.ok) return { ok: true };
  if (!shouldTryLegacy(modern)) return publicResult(modern);

  return publicResult(await postJson(config, path, { number, text }));
}

export async function sendQrImage(config: WhatsAppConfig, phone: string, dataUrl: string, caption: string): Promise<SendResult> {
  const number = normalizePhone(phone);
  if (!number) return { ok: false, error: 'WhatsApp inválido (use DDD + número)' };

  const path = `message/sendMedia/${encodeURIComponent(config.instance)}`;
  const { blob } = base64ToBlob(dataUrl);

  // Evolution API 2.3+: multipart/form-data com arquivo binário.
  const form = new FormData();
  form.append('number', number);
  form.append('mediatype', 'image');
  form.append('media', blob, 'pix-mensalidade.png');
  form.append('fileName', 'pix-mensalidade.png');
  form.append('caption', caption);
  const modern = await postForm(config, path, form);
  if (modern.ok) return { ok: true };
  if (!shouldTryLegacy(modern)) return publicResult(modern);

  // Versões antigas aceitavam base64 em JSON.
  return publicResult(await postJson(config, path, {
    number,
    mediatype: 'image',
    media: dataUrl.replace(/^data:image\/[^;]+;base64,/, ''),
    fileName: 'pix-mensalidade.png',
    caption,
  }));
}
