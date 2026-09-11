import qrcode from 'qrcode-generator';

/**
 * Generación de códigos QR para compartir packs.
 *
 * El enlace de un pack ya es fácil de mandar, pero un QR le ahorra al alumno
 * tener que tipear o pegar la URL: la escanea con la cámara y listo. Como la
 * app no tiene backend, el QR codifica el mismo enlace `#pack=...` (texto ASCII,
 * porque el payload viaja en base64url), así que no hace falta nada online para
 * generarlo ni para leerlo.
 *
 * Módulo PURO: sólo depende de la librería de QR, no toca el DOM. Devuelve una
 * matriz de módulos (o un path SVG) que la UI dibuja como prefiera.
 */

/** Nivel de corrección de errores. 'M' equilibra tamaño y tolerancia a manchas. */
export type QrEcc = 'L' | 'M' | 'Q' | 'H';

/**
 * Construye la matriz de módulos del QR para `text`.
 *
 * Devuelve una matriz cuadrada `boolean[][]` (fila × columna) donde `true` es un
 * módulo oscuro. NO incluye la zona de silencio (quiet zone): eso lo agrega quien
 * dibuja. Usa selección automática de versión, así que crece según el largo del
 * texto sin que haya que elegir una versión a mano.
 */
export function qrMatrix(text: string, ecc: QrEcc = 'M'): boolean[][] {
  if (!text) throw new Error('qrMatrix: el texto no puede estar vacío');
  const qr = qrcode(0, ecc); // 0 = versión automática según el largo
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const rows: boolean[][] = [];
  for (let r = 0; r < n; r++) {
    const row: boolean[] = new Array(n);
    for (let c = 0; c < n; c++) row[c] = qr.isDark(r, c);
    rows.push(row);
  }
  return rows;
}

/**
 * Convierte la matriz en un único `d` de path SVG (un cuadradito 1×1 por módulo
 * oscuro), pensado para un `viewBox` en unidades de módulo. Un solo `<path>` es
 * mucho más liviano en el DOM que un `<rect>` por módulo.
 */
export function qrSvgPath(matrix: boolean[][]): string {
  let d = '';
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c]) d += `M${c} ${r}h1v1h-1z`;
    }
  }
  return d;
}
