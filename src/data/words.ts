import { Word, WordClassification, WordCategory, LevelMCER } from '../types';

/**
 * -------------------------------------------------------------------------
 * AcentOS — Base de datos de palabras
 * -------------------------------------------------------------------------
 * Cada palabra se construye con `makeWord`, que DERIVA automáticamente los
 * campos redundantes para garantizar consistencia y evitar errores de tipeo:
 *   - `id`        → la palabra tal cual (con tildes); es única entre homógrafos
 *                   (p. ej. "el" vs "él").
 *   - `wordClean` → la palabra sin tildes ni diéresis (conserva la ñ).
 *   - `hasTilde`  → true si contiene alguna vocal con tilde (á é í ó ú).
 *
 * Esto hace la base mucho más robusta y fácil de ampliar: agregar una palabra
 * es una sola línea y es imposible que `hasTilde`/`wordClean` queden
 * desincronizados de la ortografía real.
 * -------------------------------------------------------------------------
 */

const stripAccents = (s: string): string =>
  s
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ü/g, 'u')
    .replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I').replace(/Ó/g, 'O').replace(/Ú/g, 'U').replace(/Ü/g, 'U');

const TILDE_RE = /[áéíóú]/i;

function makeWord(
  word: string,
  syllables: string[],
  stressedSyllableIdx: number,
  classification: WordClassification,
  category: WordCategory,
  level: LevelMCER,
  frequency: 'alta' | 'media' | 'baja',
  rule: string,
  explanation: string
): Word {
  return {
    id: word,
    word,
    wordClean: stripAccents(word),
    syllables,
    stressedSyllableIdx,
    classification,
    category,
    level,
    hasTilde: TILDE_RE.test(word),
    rule,
    explanation,
    frequency
  };
}

// Reglas reutilizables (texto corto y consistente)
const R = {
  agV: 'Agudas terminadas en vocal',
  agN: 'Agudas terminadas en N',
  agS: 'Agudas terminadas en S',
  agNo: 'Agudas terminadas en consonante distinta de N o S',
  grT: 'Graves terminadas en consonante distinta de N o S',
  grNo: 'Graves terminadas en N, S o vocal',
  esd: 'Todas las esdrújulas llevan tilde',
  sob: 'Todas las sobreesdrújulas llevan tilde',
  hiato: 'Hiato con vocal cerrada tónica (rompe el diptongo)',
  dip: 'Diptongo: se acentúa según las reglas generales',
  trip: 'Triptongo: se acentúa según las reglas generales',
  mono: 'Los monosílabos no se acentúan salvo tilde diacrítica',
  diac: 'Tilde diacrítica (distingue palabras homófonas)',
  interr: 'Tilde en interrogativos y exclamativos',
  mente: 'Los adverbios en -mente conservan la tilde del adjetivo base',
  extr: 'Extranjerismo adaptado: sigue las reglas generales',
  lat: 'Latinismo adaptado: sigue las reglas generales',
  may: 'Las mayúsculas se acentúan igual que las minúsculas'
};

export const WORDS_DATABASE: Word[] = [
  // ============================================================
  //  AGUDAS — con tilde (terminan en vocal, N o S)
  // ============================================================
  makeWord('café', ['ca', 'fé'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agV, 'Aguda con tónica en "fé"; lleva tilde por terminar en vocal.'),
  makeWord('sofá', ['so', 'fá'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agV, 'Aguda terminada en vocal: la tónica "fá" se acentúa.'),
  makeWord('mamá', ['ma', 'má'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agV, 'Aguda con tónica final en vocal; requiere tilde.'),
  makeWord('papá', ['pa', 'pá'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agV, 'Aguda terminada en vocal; se acentúa la última sílaba.'),
  makeWord('bebé', ['be', 'bé'], 1, 'aguda', 'aguda', 'A1', 'media', R.agV, 'Aguda con tónica "bé"; lleva tilde por terminar en vocal.'),
  makeWord('menú', ['me', 'nú'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agV, 'Aguda terminada en vocal; la "ú" tónica se acentúa.'),
  makeWord('rubí', ['ru', 'bí'], 1, 'aguda', 'aguda', 'B1', 'media', R.agV, 'Aguda terminada en vocal; tónica en "bí".'),
  makeWord('ají', ['a', 'jí'], 1, 'aguda', 'aguda', 'B1', 'media', R.agV, 'Aguda terminada en vocal; se acentúa la última sílaba.'),
  makeWord('maní', ['ma', 'ní'], 1, 'aguda', 'aguda', 'B1', 'media', R.agV, 'Aguda terminada en vocal; la tónica "ní" lleva tilde.'),
  makeWord('bambú', ['bam', 'bú'], 1, 'aguda', 'aguda', 'B2', 'baja', R.agV, 'Aguda terminada en vocal; se acentúa "bú".'),
  makeWord('jabalí', ['ja', 'ba', 'lí'], 2, 'aguda', 'aguda', 'B1', 'baja', R.agV, 'Aguda terminada en vocal; la tónica es la última sílaba "lí".'),
  makeWord('colibrí', ['co', 'li', 'brí'], 2, 'aguda', 'aguda', 'B2', 'baja', R.agV, 'Aguda terminada en vocal; se acentúa la última sílaba.'),
  makeWord('jamón', ['ja', 'món'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agN, 'Aguda con tónica "món"; lleva tilde por terminar en N.'),
  makeWord('ratón', ['ra', 'tón'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agN, 'Aguda terminada en N; la tónica final se acentúa.'),
  makeWord('limón', ['li', 'món'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agN, 'Aguda terminada en N; se acentúa "món".'),
  makeWord('balcón', ['bal', 'cón'], 1, 'aguda', 'aguda', 'A2', 'media', R.agN, 'Aguda terminada en N; la tónica "cón" lleva tilde.'),
  makeWord('rincón', ['rin', 'cón'], 1, 'aguda', 'aguda', 'A2', 'media', R.agN, 'Aguda terminada en N; se acentúa la última sílaba.'),
  makeWord('corazón', ['co', 'ra', 'zón'], 2, 'aguda', 'aguda', 'A2', 'alta', R.agN, 'Aguda terminada en N; la tónica es "zón".'),
  makeWord('compás', ['com', 'pás'], 1, 'aguda', 'aguda', 'B1', 'media', R.agS, 'Aguda terminada en S; la tónica "pás" se acentúa.'),
  makeWord('además', ['a', 'de', 'más'], 2, 'aguda', 'aguda', 'A2', 'alta', R.agS, 'Aguda terminada en S; lleva tilde en "más".'),
  makeWord('interés', ['in', 'te', 'rés'], 2, 'aguda', 'aguda', 'B2', 'alta', R.agS, 'Aguda terminada en S; la tónica final "rés" se acentúa.'),
  makeWord('francés', ['fran', 'cés'], 1, 'aguda', 'aguda', 'A2', 'media', R.agS, 'Aguda terminada en S; se acentúa "cés".'),
  makeWord('inglés', ['in', 'glés'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agS, 'Aguda terminada en S; la tónica "glés" lleva tilde.'),
  makeWord('ciprés', ['ci', 'prés'], 1, 'aguda', 'aguda', 'B2', 'baja', R.agS, 'Aguda terminada en S; se acentúa la última sílaba.'),
  makeWord('revés', ['re', 'vés'], 1, 'aguda', 'aguda', 'B1', 'media', R.agS, 'Aguda terminada en S; la tónica "vés" se acentúa.'),

  // ============================================================
  //  AGUDAS — sin tilde (terminan en consonante distinta de N/S)
  // ============================================================
  makeWord('reloj', ['re', 'loj'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agNo, 'Aguda tónica en "loj"; no lleva tilde por terminar en J.'),
  makeWord('pared', ['pa', 'red'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agNo, 'Aguda tónica en "red"; termina en D, sin tilde.'),
  makeWord('cantar', ['can', 'tar'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agNo, 'Infinitivo agudo; termina en R, no lleva tilde.'),
  makeWord('correr', ['co', 'rrer'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agNo, 'Infinitivo agudo terminado en R; sin tilde.'),
  makeWord('vivir', ['vi', 'vir'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agNo, 'Aguda terminada en R; no se acentúa.'),
  makeWord('feliz', ['fe', 'liz'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agNo, 'Aguda terminada en Z; no lleva tilde.'),
  makeWord('amor', ['a', 'mor'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agNo, 'Aguda terminada en R; sin tilde.'),
  makeWord('calor', ['ca', 'lor'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agNo, 'Aguda terminada en R; no se acentúa.'),
  makeWord('verdad', ['ver', 'dad'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agNo, 'Aguda terminada en D; sin tilde.'),
  makeWord('papel', ['pa', 'pel'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agNo, 'Aguda terminada en L; no lleva tilde.'),
  makeWord('hotel', ['ho', 'tel'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agNo, 'Aguda terminada en L; sin tilde.'),
  makeWord('azul', ['a', 'zul'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agNo, 'Aguda terminada en L; no se acentúa.'),
  makeWord('nariz', ['na', 'riz'], 1, 'aguda', 'aguda', 'A1', 'media', R.agNo, 'Aguda terminada en Z; sin tilde.'),
  makeWord('feroz', ['fe', 'roz'], 1, 'aguda', 'aguda', 'B1', 'baja', R.agNo, 'Aguda terminada en Z; no lleva tilde.'),
  makeWord('capaz', ['ca', 'paz'], 1, 'aguda', 'aguda', 'A2', 'media', R.agNo, 'Aguda terminada en Z; sin tilde.'),
  makeWord('abril', ['a', 'bril'], 1, 'aguda', 'aguda', 'A1', 'media', R.agNo, 'Aguda terminada en L; no se acentúa.'),
  makeWord('señor', ['se', 'ñor'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agNo, 'Aguda terminada en R; sin tilde.'),
  makeWord('doctor', ['doc', 'tor'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agNo, 'Aguda terminada en R; no lleva tilde.'),
  makeWord('ciudad', ['ciu', 'dad'], 1, 'aguda', 'aguda', 'A1', 'alta', R.agNo, 'Aguda terminada en D; sin tilde (el diptongo "iu" no cambia la regla).'),

  // ============================================================
  //  GRAVES / LLANAS — con tilde (NO terminan en N, S ni vocal)
  // ============================================================
  makeWord('árbol', ['ár', 'bol'], 0, 'grave', 'grave', 'A1', 'alta', R.grT, 'Grave con tónica "ár"; lleva tilde por terminar en L.'),
  makeWord('lápiz', ['lá', 'piz'], 0, 'grave', 'grave', 'A1', 'alta', R.grT, 'Grave tónica en "lá"; termina en Z, lleva tilde.'),
  makeWord('difícil', ['di', 'fí', 'cil'], 1, 'grave', 'grave', 'A2', 'alta', R.grT, 'Grave con tónica "fí"; lleva tilde por terminar en L.'),
  makeWord('fácil', ['fá', 'cil'], 0, 'grave', 'grave', 'A1', 'alta', R.grT, 'Grave terminada en L; la tónica "fá" se acentúa.'),
  makeWord('útil', ['ú', 'til'], 0, 'grave', 'grave', 'A2', 'alta', R.grT, 'Grave terminada en L; lleva tilde en "ú".'),
  makeWord('túnel', ['tú', 'nel'], 0, 'grave', 'grave', 'A2', 'media', R.grT, 'Grave terminada en L; se acentúa "tú".'),
  makeWord('árbitro', ['ár', 'bi', 'tro'], 0, 'esdrújula', 'esdrújula', 'B1', 'media', R.esd, 'Esdrújula con tónica "ár"; todas llevan tilde.'),
  makeWord('azúcar', ['a', 'zú', 'car'], 1, 'grave', 'grave', 'A2', 'alta', R.grT, 'Grave con tónica "zú"; lleva tilde por terminar en R.'),
  makeWord('cárcel', ['cár', 'cel'], 0, 'grave', 'grave', 'B1', 'media', R.grT, 'Grave terminada en L; se acentúa "cár".'),
  makeWord('mármol', ['már', 'mol'], 0, 'grave', 'grave', 'B1', 'media', R.grT, 'Grave terminada en L; lleva tilde en "már".'),
  makeWord('móvil', ['mó', 'vil'], 0, 'grave', 'grave', 'A2', 'alta', R.grT, 'Grave terminada en L; la tónica "mó" se acentúa.'),
  makeWord('débil', ['dé', 'bil'], 0, 'grave', 'grave', 'A2', 'media', R.grT, 'Grave terminada en L; lleva tilde en "dé".'),
  makeWord('cráter', ['crá', 'ter'], 0, 'grave', 'grave', 'B2', 'baja', R.grT, 'Grave terminada en R; se acentúa "crá".'),
  makeWord('carácter', ['ca', 'rác', 'ter'], 1, 'grave', 'grave', 'B1', 'media', R.grT, 'Grave con tónica "rác"; lleva tilde por terminar en R.'),
  makeWord('líder', ['lí', 'der'], 0, 'grave', 'grave', 'A2', 'alta', R.grT, 'Grave terminada en R; la tónica "lí" se acentúa.'),
  makeWord('césped', ['cés', 'ped'], 0, 'grave', 'grave', 'A2', 'media', R.grT, 'Grave terminada en D; lleva tilde en "cés".'),
  makeWord('álbum', ['ál', 'bum'], 0, 'grave', 'grave', 'B1', 'media', R.grT, 'Grave terminada en M; se acentúa "ál".'),
  makeWord('tórax', ['tó', 'rax'], 0, 'grave', 'grave', 'B2', 'baja', R.grT, 'Grave terminada en X; lleva tilde en "tó".'),
  makeWord('fénix', ['fé', 'nix'], 0, 'grave', 'grave', 'B2', 'baja', R.grT, 'Grave terminada en X; se acentúa "fé".'),
  makeWord('dócil', ['dó', 'cil'], 0, 'grave', 'grave', 'B1', 'baja', R.grT, 'Grave terminada en L; lleva tilde en "dó".'),

  // ============================================================
  //  GRAVES / LLANAS — sin tilde (terminan en N, S o vocal)
  // ============================================================
  makeWord('mesa', ['me', 'sa'], 0, 'grave', 'grave', 'A1', 'alta', R.grNo, 'Grave tónica en "me"; termina en vocal, sin tilde.'),
  makeWord('casa', ['ca', 'sa'], 0, 'grave', 'grave', 'A1', 'alta', R.grNo, 'Grave terminada en vocal; no lleva tilde.'),
  makeWord('perro', ['pe', 'rro'], 0, 'grave', 'grave', 'A1', 'alta', R.grNo, 'Grave terminada en vocal; sin tilde.'),
  makeWord('gato', ['ga', 'to'], 0, 'grave', 'grave', 'A1', 'alta', R.grNo, 'Grave terminada en vocal; no se acentúa.'),
  makeWord('libro', ['li', 'bro'], 0, 'grave', 'grave', 'A1', 'alta', R.grNo, 'Grave terminada en vocal; sin tilde.'),
  makeWord('ventana', ['ven', 'ta', 'na'], 1, 'grave', 'grave', 'A1', 'alta', R.grNo, 'Grave con tónica "ta"; termina en vocal, sin tilde.'),
  makeWord('camisa', ['ca', 'mi', 'sa'], 1, 'grave', 'grave', 'A1', 'alta', R.grNo, 'Grave terminada en vocal; no lleva tilde.'),
  makeWord('zapato', ['za', 'pa', 'to'], 1, 'grave', 'grave', 'A1', 'alta', R.grNo, 'Grave terminada en vocal; sin tilde.'),
  makeWord('montaña', ['mon', 'ta', 'ña'], 1, 'grave', 'grave', 'A1', 'alta', R.grNo, 'Grave terminada en vocal; no se acentúa.'),
  makeWord('examen', ['e', 'xa', 'men'], 1, 'grave', 'grave', 'A2', 'alta', R.grNo, 'Grave con tónica "xa"; termina en N, sin tilde (ojo: exámenes sí lleva).'),
  makeWord('joven', ['jo', 'ven'], 0, 'grave', 'grave', 'A2', 'alta', R.grNo, 'Grave terminada en N; no lleva tilde.'),
  makeWord('imagen', ['i', 'ma', 'gen'], 1, 'grave', 'grave', 'A2', 'alta', R.grNo, 'Grave con tónica "ma"; termina en N, sin tilde.'),
  makeWord('resumen', ['re', 'su', 'men'], 1, 'grave', 'grave', 'A2', 'media', R.grNo, 'Grave terminada en N; no se acentúa (plural: resúmenes).'),
  makeWord('lunes', ['lu', 'nes'], 0, 'grave', 'grave', 'A1', 'alta', R.grNo, 'Grave terminada en S; sin tilde.'),
  makeWord('martes', ['mar', 'tes'], 0, 'grave', 'grave', 'A1', 'alta', R.grNo, 'Grave terminada en S; no lleva tilde.'),
  makeWord('crisis', ['cri', 'sis'], 0, 'grave', 'grave', 'A2', 'media', R.grNo, 'Grave terminada en S; sin tilde.'),
  makeWord('silla', ['si', 'lla'], 0, 'grave', 'grave', 'A1', 'alta', R.grNo, 'Grave terminada en vocal; no se acentúa.'),
  makeWord('caballo', ['ca', 'ba', 'llo'], 1, 'grave', 'grave', 'A1', 'alta', R.grNo, 'Grave terminada en vocal; sin tilde.'),

  // ============================================================
  //  ESDRÚJULAS (siempre con tilde)
  // ============================================================
  makeWord('teléfono', ['te', 'lé', 'fo', 'no'], 1, 'esdrújula', 'esdrújula', 'A1', 'alta', R.esd, 'Esdrújula con tónica en la antepenúltima "lé"; siempre lleva tilde.'),
  makeWord('sábado', ['sá', 'ba', 'do'], 0, 'esdrújula', 'esdrújula', 'A1', 'alta', R.esd, 'Esdrújula con tónica "sá"; se acentúa obligatoriamente.'),
  makeWord('música', ['mú', 'si', 'ca'], 0, 'esdrújula', 'esdrújula', 'A1', 'alta', R.esd, 'Esdrújula con tónica "mú"; todas llevan tilde.'),
  makeWord('pájaro', ['pá', 'ja', 'ro'], 0, 'esdrújula', 'esdrújula', 'A2', 'alta', R.esd, 'Esdrújula con tónica "pá"; siempre se acentúa.'),
  makeWord('médico', ['mé', 'di', 'co'], 0, 'esdrújula', 'esdrújula', 'A1', 'alta', R.esd, 'Esdrújula con tónica "mé"; lleva tilde.'),
  makeWord('príncipe', ['prín', 'ci', 'pe'], 0, 'esdrújula', 'esdrújula', 'B1', 'media', R.esd, 'Esdrújula con tónica "prín"; se acentúa siempre.'),
  makeWord('lámpara', ['lám', 'pa', 'ra'], 0, 'esdrújula', 'esdrújula', 'A2', 'media', R.esd, 'Esdrújula con tónica "lám"; lleva tilde.'),
  makeWord('máquina', ['má', 'qui', 'na'], 0, 'esdrújula', 'esdrújula', 'A2', 'alta', R.esd, 'Esdrújula con tónica "má"; siempre se acentúa.'),
  makeWord('número', ['nú', 'me', 'ro'], 0, 'esdrújula', 'esdrújula', 'A1', 'alta', R.esd, 'Esdrújula con tónica "nú"; lleva tilde.'),
  makeWord('rápido', ['rá', 'pi', 'do'], 0, 'esdrújula', 'esdrújula', 'A1', 'alta', R.esd, 'Esdrújula con tónica "rá"; se acentúa siempre.'),
  makeWord('último', ['úl', 'ti', 'mo'], 0, 'esdrújula', 'esdrújula', 'A2', 'alta', R.esd, 'Esdrújula con tónica "úl"; lleva tilde.'),
  makeWord('página', ['pá', 'gi', 'na'], 0, 'esdrújula', 'esdrújula', 'A2', 'alta', R.esd, 'Esdrújula con tónica "pá"; siempre se acentúa.'),
  makeWord('fantástico', ['fan', 'tás', 'ti', 'co'], 1, 'esdrújula', 'esdrújula', 'B1', 'media', R.esd, 'Esdrújula con tónica "tás"; lleva tilde.'),
  makeWord('gramática', ['gra', 'má', 'ti', 'ca'], 1, 'esdrújula', 'esdrújula', 'B1', 'media', R.esd, 'Esdrújula con tónica "má"; se acentúa siempre.'),
  makeWord('matemática', ['ma', 'te', 'má', 'ti', 'ca'], 2, 'esdrújula', 'esdrújula', 'B1', 'media', R.esd, 'Esdrújula con tónica "má"; lleva tilde.'),
  makeWord('pública', ['pú', 'bli', 'ca'], 0, 'esdrújula', 'esdrújula', 'B1', 'media', R.esd, 'Esdrújula con tónica "pú"; se acentúa siempre.'),
  makeWord('brújula', ['brú', 'ju', 'la'], 0, 'esdrújula', 'esdrújula', 'B1', 'baja', R.esd, 'Esdrújula con tónica "brú"; lleva tilde.'),
  makeWord('cámara', ['cá', 'ma', 'ra'], 0, 'esdrújula', 'esdrújula', 'A2', 'alta', R.esd, 'Esdrújula con tónica "cá"; siempre se acentúa.'),
  makeWord('ejército', ['e', 'jér', 'ci', 'to'], 1, 'esdrújula', 'esdrújula', 'B2', 'media', R.esd, 'Esdrújula con tónica "jér"; lleva tilde.'),
  makeWord('kilómetro', ['ki', 'ló', 'me', 'tro'], 1, 'esdrújula', 'esdrújula', 'B1', 'media', R.esd, 'Esdrújula con tónica "ló"; se acentúa siempre.'),
  makeWord('sílaba', ['sí', 'la', 'ba'], 0, 'esdrújula', 'esdrújula', 'B1', 'media', R.esd, 'Esdrújula con tónica "sí"; lleva tilde.'),
  makeWord('clásico', ['clá', 'si', 'co'], 0, 'esdrújula', 'esdrújula', 'B1', 'media', R.esd, 'Esdrújula con tónica "clá"; se acentúa siempre.'),
  makeWord('física', ['fí', 'si', 'ca'], 0, 'esdrújula', 'esdrújula', 'A2', 'media', R.esd, 'Esdrújula con tónica "fí"; lleva tilde.'),
  makeWord('química', ['quí', 'mi', 'ca'], 0, 'esdrújula', 'esdrújula', 'A2', 'media', R.esd, 'Esdrújula con tónica "quí"; siempre se acentúa.'),
  makeWord('semáforo', ['se', 'má', 'fo', 'ro'], 1, 'esdrújula', 'esdrújula', 'A2', 'media', R.esd, 'Esdrújula con tónica "má"; lleva tilde.'),
  makeWord('pánico', ['pá', 'ni', 'co'], 0, 'esdrújula', 'esdrújula', 'B1', 'media', R.esd, 'Esdrújula con tónica "pá"; se acentúa siempre.'),

  // ============================================================
  //  SOBREESDRÚJULAS (siempre con tilde)
  // ============================================================
  makeWord('tráigamelo', ['trái', 'ga', 'me', 'lo'], 0, 'sobreesdrújula', 'sobreesdrújula', 'B1', 'media', R.sob, 'La tónica "trái" está antes de la antepenúltima; toda sobreesdrújula lleva tilde.'),
  makeWord('cómpraselo', ['cóm', 'pra', 'se', 'lo'], 0, 'sobreesdrújula', 'sobreesdrújula', 'B1', 'media', R.sob, 'Imperativo con enclíticos ("compra"+"se"+"lo"); tónica "cóm", lleva tilde.'),
  makeWord('dígamelo', ['dí', 'ga', 'me', 'lo'], 0, 'sobreesdrújula', 'sobreesdrújula', 'B1', 'media', R.sob, 'Sobreesdrújula con tónica "dí"; siempre se acentúa.'),
  makeWord('cuéntamelo', ['cuén', 'ta', 'me', 'lo'], 0, 'sobreesdrújula', 'sobreesdrújula', 'B1', 'media', R.sob, 'Sobreesdrújula con tónica "cuén"; lleva tilde obligatoria.'),
  makeWord('explícamelo', ['ex', 'plí', 'ca', 'me', 'lo'], 1, 'sobreesdrújula', 'sobreesdrújula', 'B2', 'baja', R.sob, 'Sobreesdrújula con tónica "plí"; se acentúa siempre.'),
  makeWord('permítemelo', ['per', 'mí', 'te', 'me', 'lo'], 1, 'sobreesdrújula', 'sobreesdrújula', 'B2', 'baja', R.sob, 'Sobreesdrújula con tónica "mí"; lleva tilde.'),
  makeWord('devuélvemelo', ['de', 'vuél', 've', 'me', 'lo'], 1, 'sobreesdrújula', 'sobreesdrújula', 'C1', 'baja', R.sob, 'Sobreesdrújula con tónica "vuél"; siempre se acentúa.'),

  // ============================================================
  //  HIATOS (vocal cerrada tónica rompe el diptongo)
  // ============================================================
  makeWord('baúl', ['ba', 'úl'], 1, 'aguda', 'hiato', 'A2', 'media', R.hiato, 'La "ú" cerrada tónica choca con la "a" abierta; el hiato exige tilde.'),
  makeWord('maíz', ['ma', 'íz'], 1, 'aguda', 'hiato', 'A2', 'alta', R.hiato, 'La "í" tónica junto a la "a" forma hiato y lleva tilde obligatoria.'),
  makeWord('país', ['pa', 'ís'], 1, 'aguda', 'hiato', 'A1', 'alta', R.hiato, 'La "í" cerrada tónica rompe el diptongo con "a"; requiere tilde.'),
  makeWord('raíz', ['ra', 'íz'], 1, 'aguda', 'hiato', 'A2', 'media', R.hiato, 'Hiato "a-í": la vocal cerrada tónica "í" lleva tilde.'),
  makeWord('ataúd', ['a', 'ta', 'úd'], 2, 'aguda', 'hiato', 'B1', 'baja', R.hiato, 'La "ú" tónica junto a "a" forma hiato; lleva tilde a pesar de terminar en D.'),
  makeWord('reía', ['re', 'í', 'a'], 1, 'grave', 'hiato', 'B1', 'media', R.hiato, 'La "í" tónica entre vocales abiertas forma hiato y lleva tilde.'),
  makeWord('búho', ['bú', 'ho'], 0, 'grave', 'hiato', 'B2', 'media', R.hiato, 'La "h" muda no impide el hiato; la "ú" tónica se acentúa.'),
  makeWord('vacío', ['va', 'cí', 'o'], 1, 'grave', 'hiato', 'A2', 'alta', R.hiato, 'La "í" tónica junto a "o" forma hiato; lleva tilde aunque sea grave en vocal.'),
  makeWord('río', ['rí', 'o'], 0, 'grave', 'hiato', 'A1', 'alta', R.hiato, 'La "í" tónica rompe el diptongo con "o"; requiere tilde.'),
  makeWord('día', ['dí', 'a'], 0, 'grave', 'hiato', 'A1', 'alta', R.hiato, 'La "í" tónica junto a "a" forma hiato y lleva tilde.'),
  makeWord('tía', ['tí', 'a'], 0, 'grave', 'hiato', 'A1', 'alta', R.hiato, 'Hiato "í-a": la vocal cerrada tónica se acentúa.'),
  makeWord('mío', ['mí', 'o'], 0, 'grave', 'hiato', 'A1', 'alta', R.hiato, 'La "í" tónica choca con "o"; el hiato exige tilde.'),
  makeWord('frío', ['frí', 'o'], 0, 'grave', 'hiato', 'A1', 'alta', R.hiato, 'La "í" tónica junto a "o" forma hiato y lleva tilde.'),
  makeWord('oído', ['o', 'í', 'do'], 1, 'grave', 'hiato', 'A2', 'alta', R.hiato, 'La "í" tónica entre "o" e "i" forma hiato; se acentúa.'),
  makeWord('energía', ['e', 'ner', 'gí', 'a'], 2, 'grave', 'hiato', 'A2', 'alta', R.hiato, 'La "í" tónica junto a "a" forma hiato y lleva tilde.'),
  makeWord('policía', ['po', 'li', 'cí', 'a'], 2, 'grave', 'hiato', 'A1', 'alta', R.hiato, 'La "í" tónica rompe el diptongo con "a"; requiere tilde.'),
  makeWord('todavía', ['to', 'da', 'ví', 'a'], 2, 'grave', 'hiato', 'A2', 'alta', R.hiato, 'La "í" tónica junto a "a" forma hiato; lleva tilde.'),
  makeWord('había', ['ha', 'bí', 'a'], 1, 'grave', 'hiato', 'A2', 'alta', R.hiato, 'La "í" tónica forma hiato con "a"; se acentúa (pretérito imperfecto).'),
  makeWord('sería', ['se', 'rí', 'a'], 1, 'grave', 'hiato', 'A2', 'alta', R.hiato, 'La "í" tónica junto a "a" forma hiato y lleva tilde (condicional).'),
  makeWord('grúa', ['grú', 'a'], 0, 'grave', 'hiato', 'B1', 'baja', R.hiato, 'La "ú" tónica choca con "a"; el hiato exige tilde.'),
  makeWord('dúo', ['dú', 'o'], 0, 'grave', 'hiato', 'B1', 'baja', R.hiato, 'La "ú" tónica junto a "o" forma hiato y lleva tilde.'),
  makeWord('geografía', ['ge', 'o', 'gra', 'fí', 'a'], 3, 'grave', 'hiato', 'B1', 'media', R.hiato, 'La "í" tónica junto a "a" forma hiato; se acentúa.'),

  // ============================================================
  //  DIPTONGOS (se acentúan según reglas generales)
  // ============================================================
  makeWord('canción', ['can', 'ción'], 1, 'aguda', 'diptongo', 'A1', 'alta', R.dip, 'Diptongo "ió" en sílaba aguda terminada en N; tilde sobre la vocal abierta.'),
  makeWord('camión', ['ca', 'mión'], 1, 'aguda', 'diptongo', 'A1', 'alta', R.dip, 'Diptongo "ió"; aguda terminada en N, lleva tilde en la "o".'),
  makeWord('avión', ['a', 'vión'], 1, 'aguda', 'diptongo', 'A1', 'alta', R.dip, 'Diptongo "ió"; aguda terminada en N con tilde en la vocal abierta.'),
  makeWord('también', ['tam', 'bién'], 1, 'aguda', 'diptongo', 'A1', 'alta', R.dip, 'Diptongo "ié"; aguda terminada en N, lleva tilde.'),
  makeWord('después', ['des', 'pués'], 1, 'aguda', 'diptongo', 'A1', 'alta', R.dip, 'Diptongo "ué"; aguda terminada en S, lleva tilde en la "e".'),
  makeWord('adiós', ['a', 'diós'], 1, 'aguda', 'diptongo', 'A1', 'alta', R.dip, 'Diptongo "ió"; aguda terminada en S con tilde en la vocal abierta.'),
  makeWord('ruido', ['rui', 'do'], 0, 'grave', 'diptongo', 'A2', 'alta', R.dip, 'Diptongo "ui" de dos vocales cerradas; grave en vocal, sin tilde.'),
  makeWord('hielo', ['hie', 'lo'], 0, 'grave', 'diptongo', 'A1', 'alta', R.dip, 'Diptongo "ie"; grave terminada en vocal, no lleva tilde.'),
  makeWord('agua', ['a', 'gua'], 0, 'grave', 'diptongo', 'A1', 'alta', R.dip, 'Diptongo "ua"; grave terminada en vocal, sin tilde.'),
  makeWord('fuego', ['fue', 'go'], 0, 'grave', 'diptongo', 'A1', 'alta', R.dip, 'Diptongo "ue"; grave terminada en vocal, no se acentúa.'),
  makeWord('cuento', ['cuen', 'to'], 0, 'grave', 'diptongo', 'A1', 'alta', R.dip, 'Diptongo "ue"; grave en vocal, sin tilde.'),
  makeWord('tiempo', ['tiem', 'po'], 0, 'grave', 'diptongo', 'A1', 'alta', R.dip, 'Diptongo "ie"; grave terminada en vocal, no lleva tilde.'),
  makeWord('puerta', ['puer', 'ta'], 0, 'grave', 'diptongo', 'A1', 'alta', R.dip, 'Diptongo "ue"; grave en vocal, sin tilde.'),
  makeWord('aire', ['ai', 're'], 0, 'grave', 'diptongo', 'A1', 'alta', R.dip, 'Diptongo "ai"; grave terminada en vocal, no se acentúa.'),
  makeWord('peine', ['pei', 'ne'], 0, 'grave', 'diptongo', 'A2', 'media', R.dip, 'Diptongo "ei"; grave en vocal, sin tilde.'),
  makeWord('causa', ['cau', 'sa'], 0, 'grave', 'diptongo', 'A2', 'alta', R.dip, 'Diptongo "au"; grave terminada en vocal, no lleva tilde.'),
  makeWord('reina', ['rei', 'na'], 0, 'grave', 'diptongo', 'A2', 'media', R.dip, 'Diptongo "ei"; grave en vocal, sin tilde.'),
  makeWord('Europa', ['Eu', 'ro', 'pa'], 1, 'grave', 'diptongo', 'A2', 'media', R.dip, 'Diptongo "eu"; grave terminada en vocal, no se acentúa.'),
  makeWord('cielo', ['cie', 'lo'], 0, 'grave', 'diptongo', 'A1', 'alta', R.dip, 'Diptongo "ie"; grave terminada en vocal, sin tilde.'),
  makeWord('baile', ['bai', 'le'], 0, 'grave', 'diptongo', 'A1', 'alta', R.dip, 'Diptongo "ai"; grave en vocal, no lleva tilde.'),

  // ============================================================
  //  TRIPTONGOS (tres vocales en una sílaba)
  // ============================================================
  makeWord('averigüéis', ['a', 've', 'ri', 'güéis'], 3, 'aguda', 'triptongo', 'C1', 'baja', R.trip, 'Triptongo "üéi"; aguda terminada en S, tilde en la vocal abierta central.'),
  makeWord('estudiáis', ['es', 'tu', 'diáis'], 2, 'aguda', 'triptongo', 'B2', 'media', R.trip, 'Triptongo "iái"; aguda terminada en S, tilde en la "a" central.'),
  makeWord('limpiáis', ['lim', 'piáis'], 1, 'aguda', 'triptongo', 'B2', 'baja', R.trip, 'Triptongo "iái"; aguda terminada en S, lleva tilde.'),
  makeWord('despreciáis', ['des', 'pre', 'ciáis'], 2, 'aguda', 'triptongo', 'C1', 'baja', R.trip, 'Triptongo "iái"; aguda terminada en S, tilde en la vocal abierta.'),
  makeWord('Paraguay', ['Pa', 'ra', 'guay'], 2, 'aguda', 'triptongo', 'A2', 'alta', R.trip, 'Triptongo "uay"; termina en Y (consonante), por eso no lleva tilde.'),
  makeWord('Uruguay', ['U', 'ru', 'guay'], 2, 'aguda', 'triptongo', 'A2', 'alta', R.trip, 'Triptongo "uay"; termina en Y, no se acentúa.'),
  makeWord('Camagüey', ['Ca', 'ma', 'güey'], 2, 'aguda', 'triptongo', 'B2', 'baja', R.trip, 'Triptongo "üey"; termina en Y, sin tilde (la diéresis solo indica que la "u" suena).'),
  makeWord('buey', ['buey'], 0, 'aguda', 'triptongo', 'A2', 'media', R.trip, 'Triptongo "uey" en monosílabo; termina en Y, no lleva tilde.'),

  // ============================================================
  //  MONOSÍLABOS (sin tilde salvo diacrítica)
  // ============================================================
  makeWord('sol', ['sol'], 0, 'aguda', 'monosílabo', 'A1', 'alta', R.mono, 'Monosílabo: por regla general no se acentúa.'),
  makeWord('pan', ['pan'], 0, 'aguda', 'monosílabo', 'A1', 'alta', R.mono, 'Monosílabo sin diacrítica; no lleva tilde.'),
  makeWord('pie', ['pie'], 0, 'aguda', 'monosílabo', 'A1', 'alta', R.mono, 'Monosílabo con diptongo "ie"; no se acentúa.'),
  makeWord('fui', ['fui'], 0, 'aguda', 'monosílabo', 'A1', 'alta', R.mono, 'Monosílabo con diptongo "ui"; no requiere tilde.'),
  makeWord('fue', ['fue'], 0, 'aguda', 'monosílabo', 'A1', 'alta', R.mono, 'Monosílabo verbal; la RAE prohíbe acentuarlo.'),
  makeWord('vio', ['vio'], 0, 'aguda', 'monosílabo', 'A2', 'media', R.mono, 'Monosílabo con diptongo "io"; no lleva tilde.'),
  makeWord('dio', ['dio'], 0, 'aguda', 'monosílabo', 'A2', 'media', R.mono, 'Monosílabo con diptongo; sin tilde (regla de 1959/2010).'),
  makeWord('gris', ['gris'], 0, 'aguda', 'monosílabo', 'A2', 'media', R.mono, 'Monosílabo; no se acentúa.'),
  makeWord('tren', ['tren'], 0, 'aguda', 'monosílabo', 'A1', 'alta', R.mono, 'Monosílabo; sin tilde.'),
  makeWord('mar', ['mar'], 0, 'aguda', 'monosílabo', 'A1', 'alta', R.mono, 'Monosílabo; no lleva tilde.'),
  makeWord('luz', ['luz'], 0, 'aguda', 'monosílabo', 'A1', 'alta', R.mono, 'Monosílabo; no se acentúa.'),
  makeWord('pez', ['pez'], 0, 'aguda', 'monosílabo', 'A1', 'alta', R.mono, 'Monosílabo; sin tilde.'),
  makeWord('flor', ['flor'], 0, 'aguda', 'monosílabo', 'A1', 'alta', R.mono, 'Monosílabo; no lleva tilde.'),
  makeWord('voy', ['voy'], 0, 'aguda', 'monosílabo', 'A1', 'alta', R.mono, 'Monosílabo terminado en Y; no se acentúa.'),

  // ============================================================
  //  TILDE DIACRÍTICA (pares homófonos)
  // ============================================================
  makeWord('tú', ['tú'], 0, 'aguda', 'diacrítica', 'A1', 'alta', R.diac, 'Pronombre personal "tú" (tú eres) frente al posesivo "tu" (tu casa).'),
  makeWord('tu', ['tu'], 0, 'aguda', 'diacrítica', 'A1', 'alta', R.diac, 'Posesivo "tu" (tu casa); sin tilde. El pronombre "tú" sí la lleva.'),
  makeWord('él', ['él'], 0, 'aguda', 'diacrítica', 'A1', 'alta', R.diac, 'Pronombre personal "él" (él sabe) frente al artículo "el" (el coche).'),
  makeWord('el', ['el'], 0, 'aguda', 'diacrítica', 'A1', 'alta', R.diac, 'Artículo "el" (el coche); sin tilde. El pronombre "él" sí la lleva.'),
  makeWord('mí', ['mí'], 0, 'aguda', 'diacrítica', 'A1', 'alta', R.diac, 'Pronombre "mí" (para mí) frente al posesivo "mi" (mi libro).'),
  makeWord('mi', ['mi'], 0, 'aguda', 'diacrítica', 'A1', 'alta', R.diac, 'Posesivo "mi" (mi libro); sin tilde. El pronombre "mí" sí la lleva.'),
  makeWord('sí', ['sí'], 0, 'aguda', 'diacrítica', 'A1', 'alta', R.diac, 'Afirmación o pronombre "sí" frente a la conjunción condicional "si".'),
  makeWord('si', ['si'], 0, 'aguda', 'diacrítica', 'A1', 'alta', R.diac, 'Conjunción condicional "si" (si quieres); sin tilde.'),
  makeWord('té', ['té'], 0, 'aguda', 'diacrítica', 'A1', 'alta', R.diac, 'Sustantivo "té" (bebida) frente al pronombre "te" (te veo).'),
  makeWord('te', ['te'], 0, 'aguda', 'diacrítica', 'A1', 'alta', R.diac, 'Pronombre "te" (te veo); sin tilde. La bebida "té" sí la lleva.'),
  makeWord('más', ['más'], 0, 'aguda', 'diacrítica', 'A1', 'alta', R.diac, 'Cuantificador "más" (quiero más) frente a la conjunción "mas" (= pero).'),
  makeWord('mas', ['mas'], 0, 'aguda', 'diacrítica', 'B1', 'baja', R.diac, 'Conjunción adversativa "mas" (= pero); sin tilde. El cuantificador "más" sí la lleva.'),
  makeWord('dé', ['dé'], 0, 'aguda', 'diacrítica', 'A2', 'media', R.diac, 'Verbo dar "dé" (que le dé) frente a la preposición "de".'),
  makeWord('de', ['de'], 0, 'aguda', 'diacrítica', 'A1', 'alta', R.diac, 'Preposición "de" (casa de Ana); sin tilde. El verbo "dé" sí la lleva.'),
  makeWord('sé', ['sé'], 0, 'aguda', 'diacrítica', 'A2', 'media', R.diac, 'Verbo saber/ser "sé" (yo sé) frente al pronombre "se".'),
  makeWord('se', ['se'], 0, 'aguda', 'diacrítica', 'A1', 'alta', R.diac, 'Pronombre "se" (se fue); sin tilde. El verbo "sé" sí la lleva.'),
  makeWord('aún', ['a', 'ún'], 1, 'aguda', 'diacrítica', 'B1', 'media', R.diac, '"aún" (= todavía) lleva tilde; "aun" (= incluso) no la lleva.'),

  // ============================================================
  //  INTERROGATIVOS / EXCLAMATIVOS
  // ============================================================
  makeWord('qué', ['qué'], 0, 'aguda', 'interrogativo', 'A1', 'alta', R.interr, '"qué" con valor interrogativo/exclamativo (¿Qué quieres?) frente al relativo "que".'),
  makeWord('cómo', ['có', 'mo'], 0, 'grave', 'interrogativo', 'A1', 'alta', R.interr, '"cómo" interrogativo/exclamativo (No sé cómo) frente al adverbio "como".'),
  makeWord('cuándo', ['cuán', 'do'], 0, 'grave', 'interrogativo', 'A2', 'alta', R.interr, '"cuándo" interrogativo (¿Cuándo?) frente a la conjunción "cuando".'),
  makeWord('dónde', ['dón', 'de'], 0, 'grave', 'interrogativo', 'A1', 'alta', R.interr, '"dónde" interrogativo (¿Dónde?) frente al relativo "donde".'),
  makeWord('quién', ['quién'], 0, 'aguda', 'interrogativo', 'A1', 'alta', R.interr, '"quién" interrogativo/exclamativo (¿Quién?) frente al relativo "quien".'),
  makeWord('cuánto', ['cuán', 'to'], 0, 'grave', 'interrogativo', 'A2', 'alta', R.interr, '"cuánto" interrogativo/exclamativo (¡Cuánto!) frente a "cuanto".'),
  makeWord('cuál', ['cuál'], 0, 'aguda', 'interrogativo', 'A2', 'alta', R.interr, '"cuál" interrogativo (¿Cuál?) frente al relativo "cual".'),
  makeWord('cuáles', ['cuá', 'les'], 0, 'grave', 'interrogativo', 'A2', 'media', R.interr, '"cuáles" interrogativo (¿Cuáles?) frente a "cuales".'),
  makeWord('quiénes', ['quié', 'nes'], 0, 'grave', 'interrogativo', 'A2', 'media', R.interr, '"quiénes" interrogativo (¿Quiénes?) frente a "quienes".'),
  makeWord('adónde', ['a', 'dón', 'de'], 1, 'grave', 'interrogativo', 'B1', 'media', R.interr, '"adónde" interrogativo (¿Adónde vas?) frente a "adonde".'),
  makeWord('cuántas', ['cuán', 'tas'], 0, 'grave', 'exclamativo', 'A2', 'media', R.interr, '"cuántas" exclamativo/interrogativo (¡Cuántas!) frente a "cuantas".'),

  // ============================================================
  //  SOLO / DEMOSTRATIVOS (tilde diacrítica histórica)
  // ============================================================
  makeWord('sólo', ['só', 'lo'], 0, 'grave', 'solo-solo', 'B2', 'media', R.diac, 'La RAE lo desaconseja; solo se admite tilde en "sólo" (=solamente) si hay ambigüedad.'),
  makeWord('éste', ['és', 'te'], 0, 'grave', 'demostrativo', 'B2', 'baja', R.diac, 'Pronombre demostrativo con tilde histórica; hoy la RAE aconseja escribir "este".'),
  makeWord('ése', ['é', 'se'], 0, 'grave', 'demostrativo', 'B2', 'baja', R.diac, 'Demostrativo con tilde histórica; hoy se recomienda "ese" sin tilde.'),
  makeWord('aquél', ['a', 'quél'], 1, 'aguda', 'demostrativo', 'B2', 'baja', R.diac, 'Demostrativo con tilde histórica; hoy se recomienda "aquel" sin tilde.'),

  // ============================================================
  //  MAYÚSCULAS (se acentúan igual)
  // ============================================================
  makeWord('Ángel', ['Án', 'gel'], 0, 'grave', 'mayúscula', 'A2', 'media', R.may, 'Grave terminada en L; las mayúsculas también se acentúan.'),
  makeWord('África', ['Á', 'fri', 'ca'], 0, 'esdrújula', 'mayúscula', 'A2', 'media', R.may, 'Esdrújula; la mayúscula lleva tilde igual que la minúscula.'),
  makeWord('Óscar', ['Ós', 'car'], 0, 'grave', 'mayúscula', 'A2', 'media', R.may, 'Grave terminada en R; la mayúscula se acentúa.'),
  makeWord('Índico', ['Ín', 'di', 'co'], 0, 'esdrújula', 'mayúscula', 'B2', 'baja', R.may, 'Esdrújula; la mayúscula lleva tilde.'),
  makeWord('Álvaro', ['Ál', 'va', 'ro'], 0, 'esdrújula', 'mayúscula', 'B1', 'baja', R.may, 'Esdrújula; la mayúscula inicial se acentúa igual.'),

  // ============================================================
  //  EXTRANJERISMOS ADAPTADOS
  // ============================================================
  makeWord('béisbol', ['béis', 'bol'], 0, 'grave', 'extranjerismo', 'B1', 'media', R.extr, 'Anglicismo adaptado; grave terminada en L, lleva tilde.'),
  makeWord('fútbol', ['fút', 'bol'], 0, 'grave', 'extranjerismo', 'A1', 'alta', R.extr, 'Anglicismo adaptado; grave terminada en L, se acentúa.'),
  makeWord('cóctel', ['cóc', 'tel'], 0, 'grave', 'extranjerismo', 'B1', 'media', R.extr, 'Extranjerismo adaptado; grave terminada en L, lleva tilde.'),
  makeWord('escáner', ['es', 'cá', 'ner'], 1, 'grave', 'extranjerismo', 'B1', 'media', R.extr, 'Anglicismo adaptado; grave terminada en R, se acentúa.'),
  makeWord('láser', ['lá', 'ser'], 0, 'grave', 'extranjerismo', 'B1', 'media', R.extr, 'Extranjerismo adaptado; grave terminada en R, lleva tilde.'),
  makeWord('récord', ['ré', 'cord'], 0, 'grave', 'extranjerismo', 'B1', 'media', R.extr, 'Anglicismo adaptado; grave terminada en D, se acentúa.'),
  makeWord('pádel', ['pá', 'del'], 0, 'grave', 'extranjerismo', 'B1', 'media', R.extr, 'Extranjerismo adaptado; grave terminada en L, lleva tilde.'),
  makeWord('máster', ['más', 'ter'], 0, 'grave', 'extranjerismo', 'B2', 'media', R.extr, 'Anglicismo adaptado; grave terminada en R, se acentúa.'),

  // ============================================================
  //  LATINISMOS ADAPTADOS
  // ============================================================
  makeWord('currículum', ['cu', 'rrí', 'cu', 'lum'], 1, 'esdrújula', 'latinismo', 'B2', 'alta', R.lat, 'Latinismo adaptado; esdrújula (tónica en "rrí"), siempre lleva tilde.'),
  makeWord('memorándum', ['me', 'mo', 'rán', 'dum'], 2, 'grave', 'latinismo', 'B2', 'baja', R.lat, 'Latinismo adaptado; grave terminada en M, se acentúa.'),
  makeWord('referéndum', ['re', 'fe', 'rén', 'dum'], 2, 'grave', 'latinismo', 'B2', 'media', R.lat, 'Latinismo adaptado; grave terminada en M, lleva tilde.'),
  makeWord('hábitat', ['há', 'bi', 'tat'], 0, 'esdrújula', 'latinismo', 'B1', 'media', R.lat, 'Latinismo adaptado; esdrújula, siempre lleva tilde.'),
  makeWord('ultimátum', ['ul', 'ti', 'má', 'tum'], 2, 'grave', 'latinismo', 'B2', 'baja', R.lat, 'Latinismo adaptado; grave terminada en M, se acentúa.'),
  makeWord('déficit', ['dé', 'fi', 'cit'], 0, 'esdrújula', 'latinismo', 'B2', 'media', R.lat, 'Latinismo adaptado; esdrújula, siempre lleva tilde.'),
  makeWord('superávit', ['su', 'pe', 'rá', 'vit'], 2, 'grave', 'latinismo', 'C1', 'baja', R.lat, 'Latinismo adaptado; grave terminada en T, lleva tilde.'),
  makeWord('tándem', ['tán', 'dem'], 0, 'grave', 'latinismo', 'B2', 'baja', R.lat, 'Latinismo adaptado; grave terminada en M, se acentúa.'),

  // ============================================================
  //  ADVERBIOS EN -MENTE (conservan la tilde del adjetivo base)
  // ============================================================
  makeWord('fácilmente', ['fá', 'cil', 'men', 'te'], 0, 'esdrújula', 'mente', 'B1', 'alta', R.mente, 'El adjetivo base "fácil" lleva tilde, así que "fácilmente" también.'),
  makeWord('rápidamente', ['rá', 'pi', 'da', 'men', 'te'], 0, 'esdrújula', 'mente', 'B1', 'alta', R.mente, 'El adjetivo base "rápido" lleva tilde; el adverbio la conserva.'),
  makeWord('difícilmente', ['di', 'fí', 'cil', 'men', 'te'], 1, 'esdrújula', 'mente', 'B1', 'media', R.mente, 'El adjetivo base "difícil" lleva tilde; "difícilmente" la mantiene.'),
  makeWord('cortésmente', ['cor', 'tés', 'men', 'te'], 1, 'grave', 'mente', 'B2', 'baja', R.mente, 'El adjetivo base "cortés" lleva tilde; el adverbio la conserva.'),
  makeWord('últimamente', ['úl', 'ti', 'ma', 'men', 'te'], 0, 'esdrújula', 'mente', 'B1', 'media', R.mente, 'El adjetivo base "último" lleva tilde; "últimamente" la mantiene.'),
  makeWord('comúnmente', ['co', 'mún', 'men', 'te'], 1, 'grave', 'mente', 'B1', 'media', R.mente, 'El adjetivo base "común" lleva tilde; el adverbio la conserva.'),
  makeWord('tímidamente', ['tí', 'mi', 'da', 'men', 'te'], 0, 'esdrújula', 'mente', 'B2', 'baja', R.mente, 'El adjetivo base "tímido" lleva tilde; "tímidamente" la mantiene.'),
  makeWord('felizmente', ['fe', 'liz', 'men', 'te'], 1, 'grave', 'mente', 'B1', 'media', R.mente, 'El adjetivo base "feliz" no lleva tilde, así que "felizmente" tampoco.'),
  makeWord('lentamente', ['len', 'ta', 'men', 'te'], 2, 'grave', 'mente', 'A2', 'media', R.mente, 'El adjetivo base "lento" no lleva tilde; el adverbio tampoco.'),
  makeWord('claramente', ['cla', 'ra', 'men', 'te'], 2, 'grave', 'mente', 'A2', 'media', R.mente, 'El adjetivo base "claro" no lleva tilde, así que "claramente" tampoco.'),

  // ============================================================
  //  VERBOS CON PRONOMBRES ENCLÍTICOS
  // ============================================================
  makeWord('dámelo', ['dá', 'me', 'lo'], 0, 'esdrújula', 'pronombre', 'A2', 'alta', R.esd, 'Imperativo con enclíticos ("da"+"me"+"lo"); resulta esdrújula y lleva tilde.'),
  makeWord('míralo', ['mí', 'ra', 'lo'], 0, 'esdrújula', 'pronombre', 'A2', 'alta', R.esd, 'Verbo con enclítico ("mira"+"lo"); esdrújula, se acentúa.'),
  makeWord('dímelo', ['dí', 'me', 'lo'], 0, 'esdrújula', 'pronombre', 'A2', 'alta', R.esd, 'Imperativo con enclíticos; esdrújula resultante, lleva tilde.'),
  makeWord('tómalo', ['tó', 'ma', 'lo'], 0, 'esdrújula', 'pronombre', 'A2', 'media', R.esd, 'Verbo con enclítico ("toma"+"lo"); esdrújula, se acentúa.'),
  makeWord('cállate', ['cá', 'lla', 'te'], 0, 'esdrújula', 'pronombre', 'A2', 'media', R.esd, 'Imperativo con enclítico ("calla"+"te"); esdrújula, lleva tilde.'),
  makeWord('siéntate', ['sién', 'ta', 'te'], 0, 'esdrújula', 'pronombre', 'A2', 'media', R.esd, 'Imperativo con enclítico; esdrújula resultante, se acentúa.'),
  makeWord('levántate', ['le', 'ván', 'ta', 'te'], 1, 'esdrújula', 'pronombre', 'A2', 'media', R.esd, 'Imperativo con enclítico ("levanta"+"te"); esdrújula, lleva tilde.'),
  makeWord('quítate', ['quí', 'ta', 'te'], 0, 'esdrújula', 'pronombre', 'A2', 'media', R.esd, 'Imperativo con enclítico; esdrújula resultante, se acentúa.'),
  makeWord('cómetelo', ['có', 'me', 'te', 'lo'], 0, 'sobreesdrújula', 'pronombre', 'B1', 'media', R.sob, 'Verbo con dos enclíticos ("come"+"te"+"lo"); sobreesdrújula, lleva tilde.'),
  makeWord('pídeselo', ['pí', 'de', 'se', 'lo'], 0, 'sobreesdrújula', 'pronombre', 'B1', 'baja', R.sob, 'Imperativo con dos enclíticos; sobreesdrújula, se acentúa siempre.'),
  makeWord('entrégamelo', ['en', 'tré', 'ga', 'me', 'lo'], 1, 'sobreesdrújula', 'pronombre', 'B2', 'baja', R.sob, 'Imperativo con dos enclíticos; sobreesdrújula, lleva tilde.')
];
