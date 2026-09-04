import { useClientOnlyValue } from '../useClientOnlyValue';

/**
 * Native tarafta hidrasyon diye bir sey yok, bu yuzden hook her zaman
 * "client" degerini dondurur. Web varyanti (.web.ts) sadece web bundle'inda
 * calisir ve bu native Jest ortaminda hic yuklenmez.
 */
describe('useClientOnlyValue (native)', () => {
  it('her zaman client degerini dondurur', () => {
    expect(useClientOnlyValue('server', 'client')).toBe('client');
  });

  it('farkli tiplerde de client degerini korur', () => {
    expect(useClientOnlyValue(false, true)).toBe(true);
    expect(useClientOnlyValue(0, 42)).toBe(42);
  });
});
