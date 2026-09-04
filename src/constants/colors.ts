/**
 * Cay Bahcesi renk paleti.
 *
 * Yon: sicak tonlar (demli cay, Turk kahvesi, kiremit) + Bogaz mavisi vurgu.
 * Kontrast notu: metin/zemin ciftleri WCAG AA (>= 4.5:1) hedefiyle secildi;
 * Sprint 2'de ux-reviewer ajani bunlari olcecek.
 */

/** Markaya ozel ham renkler. Tema disinda dogrudan kullanma, semantic token'lari tercih et. */
export const Palette = {
  cayKoyu: '#7B2E1D', // demli cay / kiremit
  cayAcik: '#C8622F', // tavsan kani cay
  bardakCam: '#F5E6D3', // ince belli bardak camı
  kahve: '#3E2723', // Turk kahvesi telvesi
  bogazMavi: '#1B6CA8', // nazar / Bogaz
  nazarAcik: '#4FA3D1',
  lokumPembe: '#D98E9E',
  fistikYesil: '#7A9E5B',
  simitSusam: '#E8C07D',
  krem: '#FBF6EF',
  gece: '#1A1412',
  geceYuzey: '#2A211D',
  basari: '#4C8C4A',
  uyari: '#C9541A',
} as const;

const tintColorLight = Palette.cayKoyu;
const tintColorDark = Palette.simitSusam;

const Colors = {
  light: {
    text: Palette.kahve,
    background: Palette.krem,
    surface: '#FFFFFF',
    tint: tintColorLight,
    accent: Palette.bogazMavi,
    muted: '#6B5B52',
    slotEmpty: '#E5D5C3',
    tabIconDefault: '#9C8A7E',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: Palette.krem,
    background: Palette.gece,
    surface: Palette.geceYuzey,
    tint: tintColorDark,
    accent: Palette.nazarAcik,
    muted: '#B0A197',
    slotEmpty: '#3A2E28',
    tabIconDefault: '#8A7A70',
    tabIconSelected: tintColorDark,
  },
} as const;

export default Colors;
