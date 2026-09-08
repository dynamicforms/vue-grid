/**
 * @file shadow-metrics.spec.ts
 *
 * Unit tests for the pure median/log-scaled target-width math in shadow-metrics.ts. No DOM
 * measurement here — that lives in shadow-grid.vue, which reads real geometry into these
 * functions' inputs.
 */
import {
  computeLayoutTargetWidth,
  computeLineHeightPx,
  fieldTargetWidth,
  lineCountFromHeights,
  median,
} from './shadow-metrics';

describe('median', () => {
  it('returns 1 for an empty sample', () => {
    expect(median([])).toBe(1);
  });

  it('returns the middle value of an odd-length sample', () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it('averages the two middle values of an even-length sample', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('does not mutate the input array', () => {
    const values = [3, 1, 2];
    median(values);
    expect(values).toEqual([3, 1, 2]);
  });
});

describe('computeLineHeightPx', () => {
  const mockStyle = (values: Record<string, string>) =>
    ({ getPropertyValue: (prop: string) => values[prop] ?? '' }) as CSSStyleDeclaration;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the computed line-height when it's a resolved pixel value", () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue(mockStyle({ 'line-height': '24px', 'font-size': '16px' }));
    expect(computeLineHeightPx(document.createElement('div'))).toBe(24);
  });

  it("falls back to 1.2x font-size when line-height is 'normal'", () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue(mockStyle({ 'line-height': 'normal', 'font-size': '16px' }));
    expect(computeLineHeightPx(document.createElement('div'))).toBe(19.2);
  });

  it('falls back to a 16px-based default when font-size is also unavailable', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue(mockStyle({ 'line-height': 'normal', 'font-size': '' }));
    expect(computeLineHeightPx(document.createElement('div'))).toBe(19.2);
  });
});

describe('lineCountFromHeights', () => {
  it('rounds to the nearest whole line', () => {
    expect(lineCountFromHeights(58, 20)).toBe(3);
  });

  it('floors at one line even for a shorter-than-line-height box', () => {
    expect(lineCountFromHeights(5, 20)).toBe(1);
  });

  it('treats a non-positive line height as one line, avoiding a division by zero', () => {
    expect(lineCountFromHeights(100, 0)).toBe(1);
  });
});

describe('fieldTargetWidth', () => {
  it('stays at min-content width when the typical sample fits on one line', () => {
    // log2(1) === 0, so the formula collapses to exactly minContentWidth.
    expect(fieldTargetWidth(50, 400, 1)).toBe(50);
  });

  it('grows toward max-content width as the typical line count increases', () => {
    const at2Lines = fieldTargetWidth(50, 400, 2);
    const at4Lines = fieldTargetWidth(50, 400, 4);
    expect(at2Lines).toBeGreaterThan(50);
    expect(at4Lines).toBeGreaterThan(at2Lines);
  });

  it('grows with diminishing returns (log-scaled), not linearly', () => {
    const at4Lines = fieldTargetWidth(50, 1000, 4) - 50;
    const at8Lines = fieldTargetWidth(50, 1000, 8) - 50;
    // Doubling the typical line count must not double the extra width demanded.
    expect(at8Lines).toBeLessThan(at4Lines * 2);
  });

  it('clamps to max-content width when the formula would exceed it', () => {
    expect(fieldTargetWidth(50, 120, 50)).toBe(120);
  });

  it('never goes below min-content width', () => {
    expect(fieldTargetWidth(50, 400, 0)).toBe(50);
  });

  it('returns max-content width unchanged when the field never wraps at all', () => {
    expect(fieldTargetWidth(200, 200, 1)).toBe(200);
  });
});

describe('computeLayoutTargetWidth', () => {
  it("subtracts each field's computed saving from the max-content total", () => {
    const maxTotal = 1000;
    const compactTotal = 400;
    const fieldMaxWidths = { genres: 500, title: 300 };
    const fieldCompactMetrics = {
      genres: { minContentWidth: 60, medianLines: 1 }, // saving: 500 - 60 = 440
      title: { minContentWidth: 80, medianLines: 1 }, // saving: 300 - 80 = 220
    };
    const result = computeLayoutTargetWidth(maxTotal, compactTotal, fieldMaxWidths, fieldCompactMetrics);
    // 1000 - (440 + 220) = 340, but the compact-pass floor (400) wins.
    expect(result).toBe(400);
  });

  it('leaves a field at its max-content width when no compact metrics arrived for it', () => {
    const result = computeLayoutTargetWidth(500, 100, { year: 60 }, {});
    expect(result).toBe(500);
  });

  it('never drops below the fully-wrapped (compact) pass total', () => {
    const fieldMaxWidths = { genres: 900 };
    const fieldCompactMetrics = { genres: { minContentWidth: 40, medianLines: 1 } };
    const result = computeLayoutTargetWidth(1000, 250, fieldMaxWidths, fieldCompactMetrics);
    expect(result).toBeGreaterThanOrEqual(250);
  });
});
