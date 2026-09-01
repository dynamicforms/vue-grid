import { computed } from 'vue';

import { translatableStrings, translateStrings } from './translations';

describe('translations', () => {
  afterEach(() => {
    translateStrings(() => undefined);
  });

  it('should start out equal to the English defaults', () => {
    expect(translatableStrings.NoData).toBe('No data');
    expect(translatableStrings.Loading).toBe('Loading…');
  });

  it('should replace an entry with what the callback returns for it', () => {
    const translations: Partial<Record<keyof typeof translatableStrings, string>> = { NoData: 'Ni podatkov' };
    translateStrings((key) => translations[key]);

    expect(translatableStrings.NoData).toBe('Ni podatkov');
  });

  it('should update a computed built over the table when translateStrings replaces an entry', () => {
    const noData = computed(() => translatableStrings.NoData);
    const translations: Partial<Record<keyof typeof translatableStrings, string>> = { NoData: 'Ni podatkov' };

    translateStrings((key) => translations[key]);

    expect(noData.value).toBe('Ni podatkov');
  });

  it('should reset a key to its English default on a later call that no longer covers it', () => {
    const translations: Partial<Record<keyof typeof translatableStrings, string>> = { NoData: 'Ni podatkov' };
    translateStrings((key) => translations[key]);
    expect(translatableStrings.NoData).toBe('Ni podatkov');

    translateStrings(() => undefined);
    expect(translatableStrings.NoData).toBe('No data');
  });
});
