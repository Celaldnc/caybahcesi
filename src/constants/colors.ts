/**
 * Cay Bahcesi renk paleti.
 *
 * Yon: sicak tonlar (demli cay, Turk kahvesi, kiremit) + Bogaz mavisi vurgu.
 *
 * Iki katmanli: ham renkler `Palette`, anlamsal token'lar `Colors`.
 * Kural: bilesenler HER ZAMAN `Colors[tema].token` kullanir, `Palette.*` degil.
 * `Palette` yalnizca bu dosyada ve tema disi baglamlarda (web ilk-boya CSS'i)
 * dogrudan tuketilir.
 *
 * Kontrast: asagidaki metin/zemin ciftleri WCAG 2.1 relative luminance
 * formuluyle olculdu; kucuk metin >= 4.5:1, UI elemani >= 3:1.
 */

/** Markaya ozel ham renkler. Bilesende dogrudan kullanma, semantic token'lari tercih et. */
export const Palette = {
  // --- Marka ---
  cayKoyu: '#7B2E1D', // demli cay / kiremit
  cayAcik: '#C8622F', // tavsan kani cay
  bardakCam: '#F5E6D3', // ince belli bardak cami
  kahve: '#3E2723', // Turk kahvesi telvesi
  bogazMavi: '#1B6CA8', // nazar / Bogaz
  nazarAcik: '#4FA3D1',
  lokumPembe: '#D98E9E',
  fistikYesil: '#7A9E5B',
  simitSusam: '#E8C07D',

  // --- Yuzeyler ---
  krem: '#FBF6EF',
  beyaz: '#FFFFFF',
  gece: '#1A1412',
  geceYuzey: '#2A211D',

  // --- Notr tonlar (metin/ikon) ---
  // tabIconDefaultAcik/Koyu: sekme etiketi KUCUK METIN sayilir, yani 3:1 degil
  // 4.5:1 gerekir. Ilk secimler (#9C8A7E -> 3.08:1, #8A7A70 -> 4.42:1) kaliyordu.
  notrKoyu: '#6B5B52', // krem uzerinde 6.02:1
  notrAcik: '#B0A197', // gece uzerinde 7.28:1
  tabIconDefaultAcik: '#75675E', // krem uzerinde 5.06:1
  tabIconDefaultKoyu: '#96877E', // gece uzerinde 5.26:1
  slotBosAcik: '#E5D5C3',
  slotBosKoyu: '#3A2E28',

  // --- Durum ---
  basari: '#4C8C4A',
  uyari: '#C9541A',
} as const;

const Colors = {
  light: {
    text: Palette.kahve,
    background: Palette.krem,
    surface: Palette.beyaz,
    tint: Palette.cayKoyu,
    accent: Palette.bogazMavi,
    muted: Palette.notrKoyu,
    slotEmpty: Palette.slotBosAcik,
    success: Palette.basari,
    warning: Palette.uyari,
    tabIconDefault: Palette.tabIconDefaultAcik,
    tabIconSelected: Palette.cayKoyu,
  },
  dark: {
    text: Palette.krem,
    background: Palette.gece,
    surface: Palette.geceYuzey,
    tint: Palette.simitSusam,
    accent: Palette.nazarAcik,
    muted: Palette.notrAcik,
    slotEmpty: Palette.slotBosKoyu,
    success: Palette.basari,
    warning: Palette.uyari,
    tabIconDefault: Palette.tabIconDefaultKoyu,
    tabIconSelected: Palette.simitSusam,
  },
} as const;

export default Colors;
