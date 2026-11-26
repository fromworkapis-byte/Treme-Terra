// ===== CONFIGURAÇÃO DA COBRANÇA MENSAL =====
import * as React from 'react';
import { useState } from 'react';
import { Save, Send, AlertCircle, Copy, Download, QrCode } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, Switch } from '../ui';
import {
  buildGroupCharge, getBillingSettings, getBillingState, monthLabel, saveBillingSettings, sendMonthlyCharges,
  type BillingSettings,
} from '../../lib/billing';
import { formatBRL, getCurrentMonthYear, parseBRL } from '../../db';
import { buildPixPayload, buildPixQr, type PixKeyType } from '../../lib/pix';

export function BillingSettingsForm() {
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [amount, setAmount] = useState('20,00');
  const [lastSentMonth, setLastSentMonth] = useState('');
  const [log, setLog] = useState<{ name: string; ok: boolean; error?: string }[]>([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [chargeDescription, setChargeDescription] = useState('Mensalidade do Grêmio');
  const [groupMessage, setGroupMessage] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [generating, setGenerating] = useState(false);
  const [chargeMessage, setChargeMessage] = useState('');

  React.useEffect(() => {
    Promise.all([getBillingSettings(), getBillingState()]).then(([loadedSettings, state]) => {
      setSettings(loadedSettings);
      setAmount((loadedSettings.monthlyAmount / 100).toFixed(2).replace('.', ','));
      setChargeDescription(loadedSettings.chargeDescription);
      setLastSentMonth(state.lastSentMonth);
      setLog(state.log.slice(0, 8));
    });
  }, []);

  const update = <K extends keyof BillingSettings>(key: K, value: BillingSettings[K]) => {
    setSettings(current => current ? { ...current, [key]: value } : current);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage('');
    try {
      const monthlyAmount = parseBRL(amount);
      if (monthlyAmount <= 0) throw new Error('Informe um valor maior que zero');
      if (!chargeDescription.trim()) throw new Error('Informe a descrição da cobrança.');
      const updated = { ...settings, monthlyAmount, chargeDescription: chargeDescription.trim() };
      await saveBillingSettings(updated);
      setSettings(updated);
      setMessage('Configuração salva.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!settings) return;
    setSending(true);
    setMessage('');
    try {
      const monthlyAmount = parseBRL(amount);
      const state = await sendMonthlyCharges(getCurrentMonthYear(), { ...settings, monthlyAmount }, { force: true });
      setLastSentMonth(state.lastSentMonth);
      setLog(state.log.slice(0, 8));
      const entries = state.log.filter(entry => entry.month === getCurrentMonthYear());
      setMessage(`${entries.filter(entry => entry.ok).length} envios OK, ${entries.filter(entry => !entry.ok).length} falhas.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível enviar');
    } finally {
      setSending(false);
    }
  };

  const handleGenerateGroupCharge = async () => {
    if (!settings) return;
    setGenerating(true);
    setChargeMessage('');
    setGroupMessage('');
    setQrCode('');
    try {
      const monthlyAmount = parseBRL(amount);
      if (!settings.pixKey.trim()) throw new Error('Configure a chave PIX antes de gerar a cobrança.');
      if (monthlyAmount <= 0) throw new Error('Informe um valor mensal maior que zero.');
      if (!chargeDescription.trim()) throw new Error('Informe a descrição da cobrança.');

      const monthYear = getCurrentMonthYear();
      const { txid, message } = buildGroupCharge({
        monthYear,
        description: chargeDescription,
        amountCents: monthlyAmount,
      });
      const payload = buildPixPayload({
        config: {
          key: settings.pixKey,
          keyType: settings.pixKeyType,
          merchantName: settings.merchantName,
          merchantCity: settings.merchantCity,
        },
        amountCents: monthlyAmount,
        txid,
        description: chargeDescription.trim(),
      });
      const generatedQr = await buildPixQr(payload);
      setQrCode(generatedQr);
      setGroupMessage(message);
      setChargeMessage('Cobrança gerada. Baixe o QR Code e anexe-o junto com a mensagem no grupo.');
    } catch (error) {
      setChargeMessage(error instanceof Error ? error.message : 'Não foi possível gerar a cobrança.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyGroupMessage = async () => {
    try {
      await navigator.clipboard.writeText(groupMessage);
      setChargeMessage('Mensagem copiada. Baixe e anexe o QR Code no grupo.');
    } catch {
      setChargeMessage('Não foi possível copiar automaticamente. Selecione e copie o texto da mensagem.');
    }
  };

  if (!settings) return <p className="text-text-secondary">Carregando...</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>PIX da mensalidade</CardTitle>
          <CardDescription>Chave e valor usados no QR Code enviado todo mês</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Tipo de chave"
              options={[
                { value: 'PHONE', label: 'Celular' },
                { value: 'CPF', label: 'CPF' },
                { value: 'CNPJ', label: 'CNPJ' },
                { value: 'EMAIL', label: 'E-mail' },
                { value: 'RANDOM', label: 'Chave aleatória' },
              ]}
              value={settings.pixKeyType}
              onChange={event => update('pixKeyType', event.target.value as PixKeyType)}
            />
            <Input label="Chave PIX *" value={settings.pixKey} onChange={event => update('pixKey', event.target.value)} placeholder="(11) 99999-9999, CPF, e-mail..." />
            <Input label="Nome do favorecido" value={settings.merchantName} onChange={event => update('merchantName', event.target.value)} />
            <Input label="Cidade" value={settings.merchantCity} onChange={event => update('merchantCity', event.target.value)} />
            <Input label="Valor mensal (R$) *" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} />
          </div>
          <p className="text-xs text-text-muted">
            Padrão: {formatBRL(2000)}. Se o integrante atrasar meses, digite o valor total combinado ao registrar o pagamento.
          </p>
          <p className="text-xs text-text-secondary">Valor de referência: {formatBRL(parseBRL(amount) || 0)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gerar cobrança para o grupo</CardTitle>
          <CardDescription>Crie a mensagem do mês atual com o QR Code PIX; o envio ao grupo é manual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Descrição da cobrança"
              value={chargeDescription}
              onChange={event => setChargeDescription(event.target.value)}
              placeholder="Ex.: Mensalidade do Grêmio"
            />
            <div className="rounded-lg border border-border/70 bg-tertiary/30 px-3 py-2">
              <Label>Mês cobrado</Label>
              <p className="mt-1 text-sm font-medium text-text-primary">{monthLabel(getCurrentMonthYear())}</p>
              <p className="text-xs text-text-muted">Preenchido automaticamente</p>
            </div>
          </div>
          <div className="rounded-lg border border-info/40 bg-info/10 px-3 py-2">
            <p className="text-sm font-medium text-text-primary">Valor: {formatBRL(parseBRL(amount) || 0)}</p>
            <p className="text-xs text-text-muted">Valor mensal configurado acima, destacado na mensagem.</p>
          </div>
          <Button variant="primary" onClick={handleGenerateGroupCharge} disabled={generating}>
            <QrCode className="w-4 h-4 mr-2" /> {generating ? 'Gerando...' : 'Gerar mensagem e QR Code'}
          </Button>

          {groupMessage && (
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px] gap-5 pt-2">
              <div className="space-y-3">
                <label htmlFor="group-charge-message" className="block text-sm font-medium text-text-secondary">
                  Mensagem para copiar
                </label>
                <textarea
                  id="group-charge-message"
                  readOnly
                  value={groupMessage}
                  rows={10}
                  className="w-full rounded-lg border border-border bg-primary p-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-info"
                />
                <Button variant="outline" onClick={handleCopyGroupMessage}>
                  <Copy className="w-4 h-4 mr-2" /> Copiar mensagem
                </Button>
              </div>
              <div className="space-y-3">
                <img src={qrCode} alt="QR Code Pix da cobrança" className="w-full rounded-lg border border-border bg-white p-2" />
                <a
                  href={qrCode}
                  download="pix-gremio.png"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-tertiary focus:outline-none focus:ring-2 focus:ring-info"
                >
                  <Download className="w-4 h-4 mr-2" /> Baixar QR Code
                </a>
              </div>
            </div>
          )}
          {chargeMessage && (
            <p className="flex items-center gap-2 text-sm text-text-secondary" role="status">
              <AlertCircle className="w-4 h-4 shrink-0" /> {chargeMessage}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Envio automático por WhatsApp</CardTitle>
          <CardDescription>Usa uma instância Evolution API configurada pelo administrador</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="API URL" value={settings.whatsappApiUrl} onChange={event => update('whatsappApiUrl', event.target.value)} placeholder="https://api.exemplo.com" />
            <Input label="API Key" type="password" value={settings.whatsappApiKey} onChange={event => update('whatsappApiKey', event.target.value)} />
            <Input label="Instância" value={settings.whatsappInstance} onChange={event => update('whatsappInstance', event.target.value)} placeholder="gremio" />
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <Label>Enviar automaticamente ao abrir o sistema em um mês novo</Label>
              <p className="text-xs text-text-muted mt-1">O envio só acontece com a API configurada e o sistema aberto.</p>
            </div>
            <Switch checked={settings.autoSend} onCheckedChange={checked => update('autoSend', checked)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar configuração'}
            </Button>
            <Button variant="outline" onClick={handleSend} disabled={sending}>
              <Send className="w-4 h-4 mr-2" /> {sending ? 'Enviando...' : 'Enviar cobranças do mês'}
            </Button>
          </div>
          {message && <p className="flex items-center gap-2 text-sm text-text-secondary"><AlertCircle className="w-4 h-4" /> {message}</p>}
          {lastSentMonth && <p className="text-xs text-text-muted">Último envio registrado: {monthLabel(lastSentMonth)}</p>}
        </CardContent>
      </Card>

      {log.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Últimos envios</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {log.map((entry, index) => (
                <li key={`${entry.name}-${index}`} className="py-2 flex items-center justify-between gap-3 text-sm">
                  <span className="text-text-primary">{entry.name}</span>
                  <span className={entry.ok ? 'text-success' : 'text-danger'}>{entry.ok ? 'Enviado' : entry.error}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
