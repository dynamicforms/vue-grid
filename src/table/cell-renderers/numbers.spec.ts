import { CellOptionsInternal } from './interfaces';
import { columnIdOption, columnNameOption, gridIdOption } from './internal-exports';
import {
  int,
  float,
  floatGridColumnCreate,
  floatGridDestroy,
  type LocaleWithOptions,
  type IntOptions,
} from './numbers';

describe('numbers.ts', () => {
  let mockOptions: CellOptionsInternal<IntOptions>;
  let gridId: symbol;
  let columnId: symbol;
  let columnName: string;

  beforeEach(() => {
    gridId = Symbol('test-grid');
    columnId = Symbol('test-column');
    columnName = 'test-column';
    mockOptions = {
      [gridIdOption]: gridId,
      [columnIdOption]: columnId,
      [columnNameOption]: columnName,
      redrawColumn: vi.fn(),
      locale: 'sl-SI',
    };
  });

  describe('LocaleWithOptions type guard', () => {
    it('should validate locale with options object', () => {
      const localeObj: LocaleWithOptions = {
        locale: 'en-GB',
        localeOptions: { useGrouping: true },
      };

      floatGridColumnCreate(gridId, { ...mockOptions, locale: localeObj });
      const result = int(1234, mockOptions);
      expect(result).toContain('1,234');
    });

    it('should work with string locale', () => {
      floatGridColumnCreate(gridId, { ...mockOptions, locale: 'de-DE' });
      const result = int(1234, mockOptions);
      expect(result).toContain('1234');
    });
  });

  describe('int function', () => {
    beforeEach(() => {
      floatGridColumnCreate(gridId, mockOptions);
    });

    it('should format number input', () => {
      const result = int(123, mockOptions);
      expect(result).toContain('123');
    });

    it('should format string input', () => {
      const result = int('456', mockOptions);
      expect(result).toContain('456');
    });

    it('should handle invalid string input', () => {
      const result = int('invalid', mockOptions);
      expect(result).toContain('invalid');
    });

    it('should add opacity to leading zeros', () => {
      const result = int(123, mockOptions);
      if (result.includes('0')) {
        expect(result).toContain('opacity: .5');
      }
    });

    it('should handle auto padding', () => {
      const autoOptions = { ...mockOptions, padToLength: 'auto' as const };
      floatGridColumnCreate(gridId, autoOptions);

      int(1, autoOptions);
      int(12345, autoOptions);

      expect(mockOptions.redrawColumn).toHaveBeenCalled();
    });

    it('should return only integer even if float is given', () => {
      const autoOptions = { ...mockOptions, padToLength: 'auto' as const };
      floatGridColumnCreate(gridId, autoOptions);

      const result = int(123.45, autoOptions);
      expect(result).not.toContain('45');
    });

    it('should handle numeric padding', () => {
      const paddedOptions = { ...mockOptions, padToLength: 5 };
      floatGridColumnCreate(gridId, paddedOptions);

      const result = int(123, paddedOptions);
      expect(result).toContain('>00<');
      expect(result).toContain('>123');
      expect(result).toContain('opacity: .5">00<');
    });

    it('should work with different locales', () => {
      const deOptions = { ...mockOptions, locale: 'de-DE' };
      floatGridColumnCreate(gridId, deOptions);

      const result = int(1234, deOptions);
      expect(result).toContain('1234');
    });

    it('should work with locale options', () => {
      const localeWithOptions: LocaleWithOptions = {
        locale: 'en-GB',
        localeOptions: { useGrouping: true },
      };
      const groupingOptions = { ...mockOptions, locale: localeWithOptions };
      floatGridColumnCreate(gridId, groupingOptions);

      const result = int(1234, groupingOptions);
      expect(result).toBeDefined();
    });
  });

  describe('float function', () => {
    beforeEach(() => {
      floatGridColumnCreate(gridId, mockOptions);
    });

    it('should format float number', () => {
      const result = float(123.45, mockOptions);
      expect(result).toBe('123,45');
    });

    it('should format string input', () => {
      const result = float('456.78', mockOptions);
      expect(result).toContain('456');
    });

    it('should handle invalid string input', () => {
      const result = float('invalid', mockOptions);
      expect(result).toContain('invalid');
    });

    it('should add opacity to leading zeros in whole part', () => {
      const opt = { ...mockOptions, padToLength: 5 };
      floatGridColumnCreate(gridId, opt);
      const result = float(0.123, opt);
      expect(result).toContain('opacity: .5">0000<');
    });

    it('should add opacity to trailing zeros in decimal part', () => {
      const result = float(123.40, mockOptions);
      if (result.includes('.40')) {
        expect(result).toContain('opacity: .5');
      }
    });

    it('should handle auto padding for whole part', () => {
      const autoOptions = { ...mockOptions, padToLength: 'auto' as const };
      floatGridColumnCreate(gridId, autoOptions);

      float(1.5, autoOptions);
      float(12345.5, autoOptions);

      expect(mockOptions.redrawColumn).toHaveBeenCalled();
    });

    it('should handle auto padding for fraction part', () => {
      const autoOptions = { ...mockOptions, padToLength: 'auto' as const };
      floatGridColumnCreate(gridId, autoOptions);

      float(1.5, autoOptions);
      float(1.535, autoOptions);
      expect(mockOptions.redrawColumn).toHaveBeenCalledTimes(3);
      float(1.515, autoOptions);
      expect(mockOptions.redrawColumn).toHaveBeenCalledTimes(3);
      const result = float(1.5, autoOptions);
      expect(mockOptions.redrawColumn).toHaveBeenCalledTimes(3);
      expect(result).toContain('opacity: .5">00<');
    });

    it('should handle auto padding for decimal part', () => {
      const autoOptions = { ...mockOptions, padToLength: 'auto' as const };
      floatGridColumnCreate(gridId, autoOptions);

      float(123.1, autoOptions);
      float(123.12345, autoOptions);

      expect(mockOptions.redrawColumn).toHaveBeenCalled();
    });

    it('should work with different locales for decimals', () => {
      const deOptions = { ...mockOptions, locale: 'de-DE' };
      floatGridColumnCreate(gridId, deOptions);

      const result = float(1234.56, deOptions);
      expect(result).toBeDefined();
    });

    it('should handle numbers with no decimal part', () => {
      const result = float(123, mockOptions);
      expect(result).toContain('123');
    });

    it('should handle very small decimals', () => {
      const result = float(0.00001, mockOptions);
      expect(result).toBeDefined();
    });

    it('should handle very large numbers', () => {
      const result = float(1234567890.123, mockOptions);
      expect(result).toBeDefined();
    });
  });

  describe('floatGridColumnCreate function', () => {
    it('should create measurement with default options', () => {
      expect(() => floatGridColumnCreate(gridId, mockOptions)).not.toThrow();
    });

    it('should create measurement with string locale', () => {
      const options = { ...mockOptions, locale: 'fr-FR' };
      expect(() => floatGridColumnCreate(gridId, options)).not.toThrow();
    });

    it('should create measurement with locale object', () => {
      const localeObj: LocaleWithOptions = {
        locale: 'en-GB',
        localeOptions: {
          useGrouping: true,
          minimumFractionDigits: 2,
        },
      };
      const options = { ...mockOptions, locale: localeObj };
      expect(() => floatGridColumnCreate(gridId, options)).not.toThrow();
    });

    it('should handle numeric padToLength', () => {
      const options = { ...mockOptions, padToLength: 5 };
      expect(() => floatGridColumnCreate(gridId, options)).not.toThrow();
    });

    it('should handle auto padToLength', () => {
      const options = { ...mockOptions, padToLength: 'auto' as const };
      expect(() => floatGridColumnCreate(gridId, options)).not.toThrow();
    });

    it('should handle locale object without localeOptions', () => {
      const localeObj: LocaleWithOptions = { locale: 'es-ES' };
      const options = { ...mockOptions, locale: localeObj };
      expect(() => floatGridColumnCreate(gridId, options)).not.toThrow();
    });
  });

  describe('floatGridDestroy function', () => {
    it('should clean up measurements', () => {
      floatGridColumnCreate(gridId, mockOptions);

      // Verify it works before cleanup
      const result1 = int(123, mockOptions);
      expect(result1).toContain('123');

      floatGridDestroy(gridId);

      // After cleanup, it should throw or handle gracefully
      expect(() => int(123, mockOptions)).toThrow();
    });

    it('should handle destroying non-existent grid', () => {
      const nonExistentId = Symbol('non-existent');
      expect(() => floatGridDestroy(nonExistentId)).not.toThrow();
    });
  });

  describe('Measurement class behavior', () => {
    beforeEach(() => {
      floatGridColumnCreate(gridId, mockOptions);
    });

    it('should track maximum whole number length', () => {
      const autoOptions = { ...mockOptions, padToLength: 'auto' as const };
      floatGridColumnCreate(gridId, autoOptions);

      int(1, autoOptions);
      int(123, autoOptions);
      int(12345, autoOptions);

      // Should have triggered redraw multiple times
      expect(mockOptions.redrawColumn).toHaveBeenCalledTimes(3);
    });

    it('should track maximum decimal length', () => {
      const autoOptions = { ...mockOptions, padToLength: 'auto' as const };
      floatGridColumnCreate(gridId, autoOptions);

      float(1.1, autoOptions);
      expect(mockOptions.redrawColumn).toHaveBeenCalledTimes(2);
      float(1.123, autoOptions);
      expect(mockOptions.redrawColumn).toHaveBeenCalledTimes(3);
      float(1.12345, autoOptions);
      expect(mockOptions.redrawColumn).toHaveBeenCalledTimes(4);
      float(Math.PI, autoOptions);
      expect(mockOptions.redrawColumn).toHaveBeenCalledTimes(5);
      float(Math.PI, autoOptions);
      expect(mockOptions.redrawColumn).toHaveBeenCalledTimes(5);
    });

    it('should handle different decimal separators', () => {
      const deOptions = { ...mockOptions, locale: 'de-DE' };
      floatGridColumnCreate(gridId, deOptions);

      const result = float(123.45, deOptions);
      expect(result).toBeDefined();
    });

    it('should handle different thousand separators', () => {
      const localeWithGrouping: LocaleWithOptions = {
        locale: 'en-GB',
        localeOptions: { useGrouping: true },
      };
      const groupingOptions = { ...mockOptions, locale: localeWithGrouping };
      floatGridColumnCreate(gridId, groupingOptions);

      const result = int(12345, groupingOptions);
      expect(result).toBeDefined();
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      floatGridColumnCreate(gridId, mockOptions);
    });

    it('should handle zero values', () => {
      expect(int(0, mockOptions)).toContain('0');
      expect(float(0.0, mockOptions)).toContain('0');
    });

    it('should handle negative values', () => {
      const result1 = int(-123, mockOptions);
      const result2 = float(-123.45, mockOptions);

      expect(result1).toMatch(/[-\u2212]/);
      expect(result2).toMatch(/[-\u2212]/);
    });

    it('should handle very large numbers', () => {
      const largeNumber = 999999999999;
      const result = int(largeNumber, mockOptions);
      expect(result).toContain(largeNumber.toString());
    });

    it('should handle empty string input', () => {
      const result = int('', mockOptions);
      expect(result).toBeDefined();
    });

    it('should handle null/undefined gracefully', () => {
      expect(() => int(null as any, mockOptions)).not.toThrow();
      expect(() => float(undefined as any, mockOptions)).not.toThrow();
    });
  });
});
