import { AccessibilityInfo, Platform } from 'react-native';

import type { GameStatus, LossReason } from '@/game/store/gameStore';

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
  /** Bu hamlede tamamlanan masa sayisi. */
  completed: number;
  /** Bu hamlede sabri tukenip giden musteri sayisi. */
  left: number;
  /** Kaybedildiyse sebebi. */
  lossReason: LossReason;
}

/**
 * MASA OLAYLARI HER SEYIN ONUNDE.
 *
 * Ekran okuyucu uzun cumleyi bastan okur; oyuncunun ilk ogrenmesi gereken
 * sey bir masanin kazanildigi ya da kaybedildigidir -- puan ayrintisi
 * ondan sonra gelir. Bos dizeyle donerse cumle dogrudan sonuca baslar.
 */
function tableEventPrefix(completed: number, left: number): string {
  const events: string[] = [];

  if (completed > 0) {
    events.push(completed === 1 ? 'Masa servis edildi!' : `${completed} masa servis edildi!`);
  }
  if (left > 0) {
    events.push(left === 1 ? 'Bir müşteri gitti.' : `${left} müşteri gitti.`);
  }

  return events.length === 0 ? '' : `${events.join(' ')} `;
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
  const { status, score, gain, combo, filled, slotCount, moves, completed, left, lossReason } =
    snapshot;

  if (status === 'seviye-tamam') {
    return `Seviye tamamlandı! ${moves} hamlede ${score} puan.`;
  }
  if (status === 'oyun-bitti') {
    // SEBEBI SOYLE: iki farkli kaybetme yolu var, "oyun bitti" demek
    // oyuncuyu ayni hatayi tekrarlamaya birakir.
    const why = lossReason === 'musteri-bitti' ? 'Çok fazla müşteri gitti.' : 'Satır doldu.';
    return `${why} Çay bahçesi kapandı, ${score} puan.`;
  }

  const prefix = tableEventPrefix(completed, left);

  const remaining = slotCount - filled;
  const capacity = remaining === 1 ? 'Son boş slot!' : `${remaining} boş slot.`;

  if (gain <= 0) {
    return `${prefix}Yerleştirildi. ${capacity}`;
  }

  const comboPart = combo > 1 ? `Combo çarpı ${combo}! ` : '';
  return `${prefix}${comboPart}Eşleşme, artı ${gain} puan. Toplam ${score}. ${capacity}`;
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
