import { interpolate } from '@dynamicforms/translatable';
import { computed, ref } from 'vue';

import { translate, translateStrings } from './translations';

const untranslated = (key: string) => key;

function dictionaryFunction(dictionary: Record<string, string>) {
  return (key: string, named: Record<string, unknown>) =>
    key in dictionary ? interpolate(dictionary[key], named) : key;
}

describe('translations', () => {
  afterEach(() => {
    translateStrings(untranslated);
  });

  it('should return the English defaults while the translation function has no translation', () => {
    expect(translate('NoData')).toBe('No data');
    expect(translate('Loading')).toBe('Loading…');
  });

  it('should substitute params into the English default', () => {
    expect(translate('ActiveFilters', { count: 3 })).toBe('Active filters: 3');
  });

  it('should return what the translation function returns for a key, with params substituted', () => {
    translateStrings(dictionaryFunction({ NoData: 'Ni podatkov', ActiveFilters: 'Aktivni filtri: {count}' }));

    expect(translate('NoData')).toBe('Ni podatkov');
    expect(translate('ActiveFilters', { count: 2 })).toBe('Aktivni filtri: 2');
    expect(translate('Loading')).toBe('Loading…');
  });

  it('should look up a key under the namespace', () => {
    translateStrings(dictionaryFunction({ 'grid.NoData': 'Ni podatkov' }), 'grid');

    expect(translate('NoData')).toBe('Ni podatkov');
  });

  it('should update a computed when translateStrings is called again', () => {
    const noData = computed(() => translate('NoData'));
    expect(noData.value).toBe('No data');

    translateStrings(dictionaryFunction({ NoData: 'Ni podatkov' }));

    expect(noData.value).toBe('Ni podatkov');
  });

  it('should update a computed when reactive state the translation function reads changes', () => {
    const locale = ref('en');
    const dictionaries: Record<string, Record<string, string>> = { en: {}, sl: { NoData: 'Ni podatkov' } };
    translateStrings((key, named) => dictionaryFunction(dictionaries[locale.value])(key, named));
    const noData = computed(() => translate('NoData'));
    expect(noData.value).toBe('No data');

    locale.value = 'sl';

    expect(noData.value).toBe('Ni podatkov');
  });
});
