import { describe, it, expect } from 'vitest';
import {
  createPack,
  encodePack,
  decodePack,
  resolvePackWords,
  packUrl,
  readPackFromHash,
  MAX_PACK_WORDS
} from './pack';
import { Word } from '../types';

function word(id: string): Word {
  return {
    id,
    word: id,
    wordClean: id,
    syllables: [id],
    stressedSyllableIdx: 0,
    classification: 'aguda',
    category: 'aguda',
    level: 'A1',
    hasTilde: false,
    rule: 'r',
    explanation: 'e',
    frequency: 'alta'
  };
}

describe('createPack', () => {
  it('deduplica, recorta espacios y descarta vacíos', () => {
    const pack = createPack([' camión ', 'camión', 'árbol', '', '  '], 'Semana 3');
    expect(pack).toEqual({ v: 1, n: 'Semana 3', w: ['camión', 'árbol'] });
  });

  it('omite el nombre cuando está vacío o solo espacios', () => {
    expect(createPack(['él'], '   ').n).toBeUndefined();
    expect(createPack(['él']).n).toBeUndefined();
  });

  it('capa al máximo permitido', () => {
    const ids = Array.from({ length: MAX_PACK_WORDS + 10 }, (_, i) => `w${i}`);
    expect(createPack(ids).w).toHaveLength(MAX_PACK_WORDS);
  });
});

describe('encode/decode', () => {
  it('hace round-trip preservando ids unicode y nombre', () => {
    const pack = createPack(['camión', 'árbol', 'él', 'niño'], 'Prueba ñ/á');
    const decoded = decodePack(encodePack(pack));
    expect(decoded).toEqual(pack);
  });

  it('produce base64url sin caracteres no seguros para URL', () => {
    const enc = encodePack(createPack(['camión', 'árbol', 'él'], 'x'));
    expect(enc).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('devuelve null ante entrada corrupta o no-pack', () => {
    expect(decodePack('no-es-base64-!!!')).toBeNull();
    expect(decodePack('')).toBeNull();
    // JSON válido pero forma inválida (v distinto de 1).
    expect(decodePack(encodePack({ v: 2 as unknown as 1, w: ['a'] }))).toBeNull();
  });
});

describe('resolvePackWords', () => {
  const bank = [word('camión'), word('árbol'), word('él')];

  it('mapea ids preservando el orden del pack', () => {
    const pack = createPack(['él', 'camión']);
    expect(resolvePackWords(pack, bank).map(w => w.id)).toEqual(['él', 'camión']);
  });

  it('descarta ids desconocidos y deduplica', () => {
    const pack = { v: 1 as const, w: ['camión', 'fantasma', 'camión', 'árbol'] };
    expect(resolvePackWords(pack, bank).map(w => w.id)).toEqual(['camión', 'árbol']);
  });

  it('devuelve vacío si ningún id existe', () => {
    expect(resolvePackWords({ v: 1, w: ['x', 'y'] }, bank)).toEqual([]);
  });
});

describe('packUrl / readPackFromHash', () => {
  it('arma una URL con base inyectada y la puede releer', () => {
    const pack = createPack(['camión', 'él'], 'Repaso');
    const url = packUrl(pack, 'https://ejemplo.com/app');
    expect(url.startsWith('https://ejemplo.com/app#pack=')).toBe(true);

    const hash = url.slice(url.indexOf('#'));
    expect(readPackFromHash(hash)).toEqual(pack);
  });

  it('devuelve null cuando el hash no tiene pack', () => {
    expect(readPackFromHash('')).toBeNull();
    expect(readPackFromHash('#')).toBeNull();
    expect(readPackFromHash('#otra=cosa')).toBeNull();
  });

  it('lee el pack aunque haya otros parámetros en el hash', () => {
    const pack = createPack(['árbol']);
    const hash = `#foo=1&pack=${encodePack(pack)}`;
    expect(readPackFromHash(hash)).toEqual(pack);
  });
});
