import { AccessibilityInfo, Platform } from 'react-native';

import type { GameStatus } from '@/game/store/gameStore';

/**
 * Ekran okuyucu duyurulari.
 *
 * NEDEN VAR: Sprint 2 kalite kapisinda erisilebilirlik denetimi P0 verdi --
 * "gorme engelli bir oyuncu bu oyunu su an oynayamaz". Etiketleme kusursuzdu
 * (her hedefin adi, rolu, ipucu vardi) ama GERI BILDIRIM KANALI yoktu:
 * kod tabaninda `announceForAccessibility` SIFIR kez geciyordu. Oyuncu hamle
 * yapabiliyor, hamlenin NE YAPTIGINI ogrenemiyordu.
 *
 * Iki parca:
 *  1. `moveAnnouncement` -- SAF metin uretici. Test edilebilir, platformsuz.
 *  2. `announce` -- yan etki. Platform kontrolu CAGRI ANINDA okunur
 *     (`useHaptics` ile ayni gerekce: modul sabiti olsaydi testte platform
 *     degistirilemezdi ve test "fonksiyon var mi" demekten oteye gidemezdi).
 *
 * `accessibilityLiveRegion` neden yetmiyor: yalnizca ANDROID'de calisir.
 * iOS'ta canli bolge yok; duyuru acikca yapilmali.
 */

/** Duyuru metnini uretmek icin gereken en kucuk goruntu. */
export interface MoveSnapshot {
  status: GameStatus;
  score: number;
  /** Bu hamlenin kazandirdigi puan. */
  gain: number;
  /** Bu hamlede ulasilan combo carpani. */
  combo: number;
  /** Satirdaki tile sayisi. */
  filled: number;
  /** Satirin kapasitesi. */
  slotCount: number;
  moves: number;
}

/**
 * Bir hamlenin sonucunu cumleye cevirir.
 *
 * SIRA ONEMLI ve oyuncunun ilgi sirasini takip eder: once SONUC (kazandim
 * mi/kaybettim mi), sonra ODUL (puan), en son DURUM (kalan yer). Ekran
 * okuyucu uzun cumleyi bastan okur; en kritik bilgi basta olmali.
 *
 * `null` donmez -- her hamle duyurulur. Sessiz hamle, Sprint 2'nin hatasiydi.
 */
export function moveAnnouncement(snapshot: MoveSnapshot): string {
  const { status, score, gain, combo, filled, slotCount, moves } = snapshot;

  if (status === 'seviye-tamam') {
    return `Seviye tamamlandı! ${moves} hamlede ${score} puan.`;
  }
  if (status === 'oyun-bitti') {
    return `Satır doldu, oyun bitti. ${score} puan.`;
  }

  const remaining = slotCount - filled;
  const capacity = remaining === 1 ? 'Son boş slot!' : `${remaining} boş slot.`;

  if (gain <= 0) {
    return `Yerleştirildi. ${capacity}`;
  }

  const comboPart = combo > 1 ? `Combo çarpı ${combo}! ` : '';
  return `${comboPart}Eşleşme, artı ${gain} puan. Toplam ${score}. ${capacity}`;
}

/**
 * Web'de erisilebilirlik duyuru API'si yok; sessizce devre disi.
 * Cagri aninda okunur -- bkz. dosya basi.
 */
function isSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/** Ekran okuyucuya tek satirlik duyuru gonderir. Desteklenmiyorsa sessiz. */
export function announce(message: string): void {
  if (!isSupported() || message.length === 0) return;
  AccessibilityInfo.announceForAccessibility(message);
}
