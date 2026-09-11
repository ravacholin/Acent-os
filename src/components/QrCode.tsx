import React, { useMemo } from 'react';
import { qrMatrix, qrSvgPath, QrEcc } from '../engine/qr';

/**
 * Dibuja un código QR como SVG inline a partir de un texto (acá, el enlace del
 * pack). Siempre módulos oscuros sobre fondo claro, incluso con la app en tema
 * oscuro: así escanea bien con cualquier cámara. La matriz se calcula con el
 * engine puro `qr.ts`; este componente sólo la pinta.
 */

const DARK = '#0a0a0a';
const LIGHT = '#ffffff';

interface QrCodeProps {
  /** Texto a codificar (típicamente la URL del pack). */
  value: string;
  /** Nivel de corrección de errores. */
  ecc?: QrEcc;
  /** Zona de silencio en módulos alrededor del código (mín. recomendado: 4). */
  quietZone?: number;
  /** Etiqueta accesible del código. */
  label?: string;
  className?: string;
}

export default function QrCode({ value, ecc = 'M', quietZone = 4, label = 'Código QR del pack', className }: QrCodeProps) {
  const { path, total } = useMemo(() => {
    const matrix = qrMatrix(value, ecc);
    return { path: qrSvgPath(matrix), total: matrix.length + quietZone * 2 };
  }, [value, ecc, quietZone]);

  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={total} height={total} fill={LIGHT} />
      <path transform={`translate(${quietZone} ${quietZone})`} d={path} fill={DARK} />
    </svg>
  );
}

/** Arma el string SVG completo del QR (para exportar). */
function qrSvgString(value: string, ecc: QrEcc, quietZone: number): { svg: string; total: number } {
  const matrix = qrMatrix(value, ecc);
  const total = matrix.length + quietZone * 2;
  const path = qrSvgPath(matrix);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="${LIGHT}"/>` +
    `<path transform="translate(${quietZone} ${quietZone})" d="${path}" fill="${DARK}"/>` +
    `</svg>`;
  return { svg, total };
}

/**
 * Descarga el QR como PNG. Rasteriza el SVG en un canvas del lado del cliente
 * (sin red) y dispara la descarga. `scale` es el tamaño de módulo en píxeles.
 */
export async function downloadQrPng(
  value: string,
  filename = 'pack-qr.png',
  { ecc = 'M', quietZone = 4, scale = 12 }: { ecc?: QrEcc; quietZone?: number; scale?: number } = {}
): Promise<void> {
  const { svg, total } = qrSvgString(value, ecc, quietZone);
  const px = total * scale;
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('No se pudo rasterizar el QR'));
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, px, px);

  const pngUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = pngUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
