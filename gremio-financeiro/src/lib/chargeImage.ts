// ===== IMAGEM ÚNICA DA COBRANÇA (TEXTO + QR) =====

const WIDTH = 720;
const PADDING = 48;
const QR_SIZE = 420;
const FONT_SIZE = 26;
const LINE_HEIGHT = 38;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível carregar a imagem do QR Code.'));
    image.src = src;
  });
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\*/g, '').split('\n')) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/** Desenha o texto da cobrança abaixo do QR Code e devolve a imagem pronta para copiar. */
export async function buildChargeImage({ message, qrDataUrl }: {
  message: string;
  qrDataUrl: string;
}): Promise<string> {
  const qr = await loadImage(qrDataUrl);
  const measuring = document.createElement('canvas').getContext('2d');
  if (!measuring) throw new Error('Não foi possível gerar a imagem da cobrança.');
  measuring.font = `500 ${FONT_SIZE}px Inter, system-ui, sans-serif`;
  const lines = wrapText(measuring, message, WIDTH - PADDING * 2);

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = PADDING + QR_SIZE + 48 + lines.length * LINE_HEIGHT + PADDING;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível gerar a imagem da cobrança.');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(qr, (WIDTH - QR_SIZE) / 2, PADDING, QR_SIZE, QR_SIZE);

  context.fillStyle = '#0a0f1a';
  context.font = `500 ${FONT_SIZE}px Inter, system-ui, sans-serif`;
  context.textBaseline = 'top';
  let y = PADDING + QR_SIZE + 48;
  for (const line of lines) {
    context.fillText(line, PADDING, y);
    y += LINE_HEIGHT;
  }

  return canvas.toDataURL('image/png');
}
