import { LEVEL } from '@/constants/config';

import { createRng } from '../rng';
import {
  ALL_FAMILIES,
  ALL_TILE_IDS,
  FAMILY_SHAPE,
  TILE_DEFINITIONS,
  createTile,
  getTileDefinition,
  pickTilePool,
} from '../tiles';
import type { TileId } from '../types';

describe('TILE_DEFINITIONS', () => {
  it('spec in istedigi 15+ tile tipini tanimlar', () => {
    expect(ALL_TILE_IDS.length).toBeGreaterThanOrEqual(15);
  });

  it('en fazla tile tipi ihtiyacini karsilayacak kadar cesitlilik var', () => {
    expect(ALL_TILE_IDS.length).toBeGreaterThanOrEqual(LEVEL.MAX_TILE_TYPES);
  });

  it('her tanimin id si kendi anahtariyla ayni (kopyala-yapistir hatasi korumasi)', () => {
    for (const [key, def] of Object.entries(TILE_DEFINITIONS)) {
      expect(def.id).toBe(key);
    }
  });

  it('id ler benzersizdir', () => {
    expect(new Set(ALL_TILE_IDS).size).toBe(ALL_TILE_IDS.length);
  });

  it('her tile in Turkce adi vardir (erisilebilirlik etiketi olarak kullanilir)', () => {
    for (const id of ALL_TILE_IDS) {
      const def = getTileDefinition(id);
      expect(def.nameTr.length).toBeGreaterThan(0);
    }
  });

  it('Turkce adlar benzersizdir (ekran okuyucu ayirt edebilsin)', () => {
    const names = ALL_TILE_IDS.map((id) => getTileDefinition(id).nameTr);
    expect(new Set(names).size).toBe(names.length);
  });

  it('her tile in gorsel yer tutucusu vardir', () => {
    for (const id of ALL_TILE_IDS) {
      expect(getTileDefinition(id).glyph.length).toBeGreaterThan(0);
    }
  });

  it('her tile in agirligi pozitiftir', () => {
    for (const id of ALL_TILE_IDS) {
      expect(getTileDefinition(id).weight).toBeGreaterThan(0);
    }
  });

  /**
   * WCAG 1.4.1: bilgi yalnizca renkle aktarilamaz.
   *
   * ONEMLI: bu bolum bir kez YANLIS EKSENDE yazilmisti. "Ayni ailedeki
   * tile'lar farkli forma sahiptir" diye test ediyordu -- oysa `pickTilePool`
   * aileler arasinda round-robin sectigi icin bir havuzda ASLA ayni aileden
   * iki tile bulunmuyor. Yani test, oyunda hic gerceklesmeyen bir senaryoyu
   * koruyordu; her zaman gerceklesen senaryo (9 farkli aileden 9 tile ayni
   * anda tahtada) hic korunmuyordu. Olculdu: size-9 havuzlarin %99.83'unde
   * form cakismasi vardi.
   */
  describe('renk korlugu erisilebilirligi', () => {
    it('her ailenin tek bir formu vardir', () => {
      for (const id of ALL_TILE_IDS) {
        const def = getTileDefinition(id);
        expect(def.shape).toBe(FAMILY_SHAPE[def.family]);
      }
    });

    it('formlar aileler arasinda benzersizdir (bijeksiyon)', () => {
      const shapes = Object.values(FAMILY_SHAPE);
      expect(new Set(shapes).size).toBe(shapes.length);
    });

    it('form sayisi aile sayisindan az degildir', () => {
      expect(new Set(Object.values(FAMILY_SHAPE)).size).toBeGreaterThanOrEqual(ALL_FAMILIES.length);
    });

    /**
     * GUARD: bijeksiyonun tasidigi garanti "aile sayisi >= MAX_TILE_TYPES"
     * kosuluna baglidir. Bu asilirsa round-robin ikinci tura gecer, ayni
     * aileden iki tile havuza girer ve form garantisi SESSIZCE olur.
     */
    it('en fazla tile tipi sayisi aile sayisini asmaz', () => {
      expect(LEVEL.MAX_TILE_TYPES).toBeLessThanOrEqual(ALL_FAMILIES.length);
    });

    it('ayni ailedeki tile lar farkli DOKU (pattern) kullanir', () => {
      const byFamily = new Map<string, string[]>();
      for (const id of ALL_TILE_IDS) {
        const def = getTileDefinition(id);
        byFamily.set(def.family, [...(byFamily.get(def.family) ?? []), def.pattern]);
      }
      for (const patterns of byFamily.values()) {
        expect(new Set(patterns).size).toBe(patterns.length);
      }
    });

    it('ayni ailedeki tile lar farkli renk yuvasi kullanir', () => {
      const byFamily = new Map<string, string[]>();
      for (const id of ALL_TILE_IDS) {
        const def = getTileDefinition(id);
        byFamily.set(def.family, [...(byFamily.get(def.family) ?? []), def.colorToken]);
      }
      for (const tokens of byFamily.values()) {
        expect(new Set(tokens).size).toBe(tokens.length);
      }
    });

    /**
     * ASIL GARANTI: gercek oyun havuzunda form cakismasi OLMAMALI.
     * Bu test, mutasyon denetiminde hayatta kalan M33'u de oldurur
     * (round-robin yerine duz shuffle+slice konursa burada patlar).
     */
    it('uretilen her havuzda tum formlar farklidir', () => {
      for (let size = 1; size <= LEVEL.MAX_TILE_TYPES; size++) {
        for (let seed = 1; seed <= 200; seed++) {
          const pool = pickTilePool(size, createRng(seed));
          const shapes = pool.map((id) => getTileDefinition(id).shape);
          expect(new Set(shapes).size).toBe(size);
        }
      }
    });

    it('uretilen her havuzda tum aileler farklidir', () => {
      for (const size of [5, 7, 9]) {
        for (let seed = 1; seed <= 200; seed++) {
          const families = pickTilePool(size, createRng(seed)).map(
            (id) => getTileDefinition(id).family,
          );
          expect(new Set(families).size).toBe(size);
        }
      }
    });
  });
});

describe('getTileDefinition', () => {
  it('bilinen bir id icin tanimi dondurur', () => {
    expect(getTileDefinition('cay-ince-belli').family).toBe('cay');
  });

  it('bilinmeyen id icin hata firlatir (sessizce undefined donmez)', () => {
    expect(() => getTileDefinition('yok-boyle-bir-tile' as TileId)).toThrow(RangeError);
  });
});

describe('createTile', () => {
  it('verilen id ile tile uretir', () => {
    expect(createTile('nazar-mavi').id).toBe('nazar-mavi');
  });

  it('her cagride benzersiz key uretir (Reanimated layout gecisleri icin)', () => {
    const keys = Array.from({ length: 500 }, () => createTile('lokum-sade').key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('key tile id sini icerir (hata ayiklamada okunabilir olsun)', () => {
    expect(createTile('deniz-vapur').key).toContain('vapur');
  });

  it('bilinmeyen id reddedilir', () => {
    expect(() => createTile('sahte' as TileId)).toThrow(RangeError);
  });
});

describe('pickTilePool', () => {
  it('istenen sayida tile tipi dondurur', () => {
    expect(pickTilePool(5, createRng(1))).toHaveLength(5);
    expect(pickTilePool(9, createRng(1))).toHaveLength(9);
  });

  it('ayni tohum ayni havuzu verir (Daily modu icin)', () => {
    expect(pickTilePool(7, createRng(42))).toEqual(pickTilePool(7, createRng(42)));
  });

  it('farkli tohum farkli havuz verir', () => {
    expect(pickTilePool(7, createRng(1))).not.toEqual(pickTilePool(7, createRng(2)));
  });

  it('havuzda tekrar eden tip yoktur', () => {
    const pool = pickTilePool(9, createRng(7));
    expect(new Set(pool).size).toBe(pool.length);
  });

  it('havuzdaki her id gecerli bir tanima sahiptir', () => {
    for (const id of pickTilePool(9, createRng(3))) {
      expect(() => getTileDefinition(id)).not.toThrow();
    }
  });

  it('sifir veya negatif boyut reddedilir', () => {
    expect(() => pickTilePool(0, createRng(1))).toThrow(RangeError);
    expect(() => pickTilePool(-2, createRng(1))).toThrow(RangeError);
  });

  it('mevcut tip sayisindan fazlasi istenirse reddedilir', () => {
    expect(() => pickTilePool(ALL_TILE_IDS.length + 1, createRng(1))).toThrow(RangeError);
  });

  it('tum tipler istenirse hepsini dondurur (sinir durumu)', () => {
    const pool = pickTilePool(ALL_TILE_IDS.length, createRng(1));
    expect([...pool].sort()).toEqual([...ALL_TILE_IDS].sort());
  });
});
