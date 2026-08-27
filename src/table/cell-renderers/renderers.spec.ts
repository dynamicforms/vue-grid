/**
 * @file renderers.spec.ts
 *
 * Tests for the cell renderer registry (renderers.ts).
 *
 * renderers.ts is the single source of truth for all built-in cell renderers.  Each
 * renderer is a function `(value, rowValue, options) => RenderableValue`.
 *
 * What this file tests
 * --------------------
 * 1. **Registry completeness** — `DefaultRenderers` contains an entry for every renderer
 *    type declared in `RendererOptionsMap`.
 *
 * 2. **Basic renderer output** — each renderer returns a `RenderableValue` instance
 *    (spot-checks the most common types: plain, checkbox, link, email, color, ip4, ip6).
 *
 * 3. **getCellRenderers** — returns a *shallow copy* of the registry so that mutating the
 *    returned object does not affect `DefaultRenderers`.
 *
 * 4. **setCellRenderer** — permanently replaces a renderer in the shared registry.
 *    The replacement is visible to subsequent `getCellRenderers()` calls.
 *
 * 5. **gridColumnCreate** — initialises per-column measurement state for numeric renderers
 *    (`'int'`, `'float'`, `'decimal'`) by delegating to `floatGridColumnCreate`.
 *    For all other renderer types the call is a no-op (no state is created).
 *
 * 6. **gridDestroy** — tears down all measurement state created for a given `gridId`.
 *    After destruction, calling a numeric renderer for that column throws (state gone).
 *
 * 7. **preRender / postRender wrapping** — when `CellOptions.preRender` or `postRender`
 *    are set, the output is a compound `RenderableValue` (PreContentPost) and the
 *    top-level `classes` array contains `'has-pre-post'`.
 */
import { RenderableValue } from '@dynamicforms/vue-forms';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CellOptionsInternal } from './interfaces';
import { columnIdOption, columnNameOption, gridIdOption } from './internal-exports';
import {
  DefaultRenderers,
  getCellRenderers,
  gridColumnCreate,
  gridDestroy,
  type RendererOptionsMap,
  setCellRenderer,
} from './renderers';

// ---------------------------------------------------------------------------
// Shared mock options factory
// ---------------------------------------------------------------------------

/** Creates a minimal `CellOptionsInternal` suitable for all non-numeric renderers. */
function makeMockOptions(gridId: symbol = Symbol('grid'), columnId: symbol = Symbol('col')): CellOptionsInternal {
  return {
    [gridIdOption]: gridId,
    [columnIdOption]: columnId,
    [columnNameOption]: 'test-col',
    redrawColumn: vi.fn(),
  };
}

/** Creates options ready for float/int renderers (measurement state must be set up first). */
function makeNumericOptions(gridId: symbol, columnId: symbol): CellOptionsInternal {
  return {
    [gridIdOption]: gridId,
    [columnIdOption]: columnId,
    [columnNameOption]: 'num-col',
    redrawColumn: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// 1. Registry completeness
// ---------------------------------------------------------------------------

describe('DefaultRenderers', () => {
  const expectedTypes: (keyof RendererOptionsMap)[] = [
    'null-empty',
    'null-null',
    'plain',
    'header',
    'md',
    'color',
    'checkbox',
    'link',
    'email',
    'file',
    'ip4',
    'ip6',
    'ip',
    'date',
    'time',
    'datetime',
    'int',
    'float',
    'decimal',
  ];

  it('contains an entry for every renderer type in RendererOptionsMap', () => {
    for (const type of expectedTypes) {
      expect(DefaultRenderers).toHaveProperty(type);
      expect(typeof DefaultRenderers[type]).toBe('function');
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Basic renderer output
// ---------------------------------------------------------------------------

describe('individual renderer return values', () => {
  let opts: CellOptionsInternal;

  beforeEach(() => {
    opts = makeMockOptions();
  });

  it('"plain" returns a RenderableValue for a string value', () => {
    const result = DefaultRenderers.plain('hello', {}, opts);
    expect(result).toBeInstanceOf(RenderableValue);
  });

  it('"plain" returns a RenderableValue for null', () => {
    const result = DefaultRenderers.plain(null, {}, opts);
    expect(result).toBeInstanceOf(RenderableValue);
  });

  it('"null-empty" returns a RenderableValue', () => {
    const result = DefaultRenderers['null-empty'](null, {}, opts);
    expect(result).toBeInstanceOf(RenderableValue);
  });

  it('"null-null" returns a RenderableValue', () => {
    const result = DefaultRenderers['null-null'](null, {}, opts);
    expect(result).toBeInstanceOf(RenderableValue);
  });

  it('"checkbox" returns a RenderableValue for true', () => {
    const result = DefaultRenderers.checkbox(true, {}, opts);
    expect(result).toBeInstanceOf(RenderableValue);
  });

  it('"checkbox" returns a RenderableValue for false', () => {
    const result = DefaultRenderers.checkbox(false, {}, opts);
    expect(result).toBeInstanceOf(RenderableValue);
  });

  it('"checkbox" returns a RenderableValue for null', () => {
    const result = DefaultRenderers.checkbox(null, {}, opts);
    expect(result).toBeInstanceOf(RenderableValue);
  });

  it('"link" returns a RenderableValue', () => {
    const result = DefaultRenderers.link('https://example.com', {}, opts);
    expect(result).toBeInstanceOf(RenderableValue);
  });

  it('"email" returns a RenderableValue', () => {
    const result = DefaultRenderers.email('user@example.com', {}, opts);
    expect(result).toBeInstanceOf(RenderableValue);
  });

  it('"color" returns a RenderableValue', () => {
    const result = DefaultRenderers.color('#ff0000', {}, opts);
    expect(result).toBeInstanceOf(RenderableValue);
  });

  it('"ip4" returns a RenderableValue', () => {
    const result = DefaultRenderers.ip4('192.168.1.1', {}, opts);
    expect(result).toBeInstanceOf(RenderableValue);
  });

  it('"ip6" returns a RenderableValue', () => {
    const result = DefaultRenderers.ip6('::1', {}, opts);
    expect(result).toBeInstanceOf(RenderableValue);
  });

  it('"ip" returns a RenderableValue for IPv4', () => {
    const result = DefaultRenderers.ip('10.0.0.1', {}, opts);
    expect(result).toBeInstanceOf(RenderableValue);
  });

  it('"ip" returns a RenderableValue for IPv6', () => {
    const result = DefaultRenderers.ip('2001:db8::1', {}, opts);
    expect(result).toBeInstanceOf(RenderableValue);
  });

  it('"md" returns a RenderableValue', () => {
    const result = DefaultRenderers.md('**bold**', {}, opts);
    expect(result).toBeInstanceOf(RenderableValue);
  });

  it('"file" returns a RenderableValue for a URL string', () => {
    const result = DefaultRenderers.file('/path/to/file.pdf', {}, opts);
    expect(result).toBeInstanceOf(RenderableValue);
  });

  it('"file" returns a RenderableValue for an empty value', () => {
    const result = DefaultRenderers.file('', {}, opts);
    expect(result).toBeInstanceOf(RenderableValue);
  });
});

// ---------------------------------------------------------------------------
// 3. getCellRenderers
// ---------------------------------------------------------------------------

describe('getCellRenderers', () => {
  it('returns an object with all renderer entries', () => {
    const copy = getCellRenderers();
    expect(copy).toHaveProperty('plain');
    expect(copy).toHaveProperty('int');
  });

  it('returns a copy — mutating it does not affect DefaultRenderers', () => {
    const original = DefaultRenderers.plain;
    const copy = getCellRenderers();

    (copy as any).plain = vi.fn();

    expect(DefaultRenderers.plain).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// 4. setCellRenderer
// ---------------------------------------------------------------------------

describe('setCellRenderer', () => {
  let originalPlain: typeof DefaultRenderers.plain;

  beforeEach(() => {
    originalPlain = DefaultRenderers.plain;
  });

  afterEach(() => {
    // Restore so we don't pollute other tests
    DefaultRenderers.plain = originalPlain;
  });

  it('replaces the renderer in DefaultRenderers', () => {
    const custom = vi.fn(() => new RenderableValue('custom'));
    setCellRenderer('plain', custom as any);

    expect(DefaultRenderers.plain).toBe(custom);
  });

  it('the replacement is visible via getCellRenderers()', () => {
    const custom = vi.fn(() => new RenderableValue('custom'));
    setCellRenderer('plain', custom as any);

    const copy = getCellRenderers();
    expect(copy.plain).toBe(custom);
  });

  it('the replaced renderer is called when DefaultRenderers.plain is invoked', () => {
    const custom = vi.fn(() => new RenderableValue('replaced'));
    setCellRenderer('plain', custom as any);

    DefaultRenderers.plain('value', {}, makeMockOptions());

    expect(custom).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 5. gridColumnCreate
// ---------------------------------------------------------------------------

describe('gridColumnCreate', () => {
  it('does not throw for non-numeric renderers (plain, checkbox, link …)', () => {
    const gridId = Symbol('g');
    const opts = makeMockOptions(gridId, Symbol('col'));

    for (const type of ['plain', 'checkbox', 'link', 'email', 'color', 'ip4'] as const) {
      expect(() => gridColumnCreate(gridId, type, opts)).not.toThrow();
    }
  });

  it('initialises measurement state for "int" so the renderer can format numbers', () => {
    const gridId = Symbol('g-int');
    const colId = Symbol('col-int');
    const opts = makeNumericOptions(gridId, colId);

    // gridColumnCreate must be called before int/float can be used
    expect(() => gridColumnCreate(gridId, 'int', opts)).not.toThrow();
    // After setup the int renderer should work
    expect(() => DefaultRenderers.int(42, {}, opts as any)).not.toThrow();
  });

  it('initialises measurement state for "float"', () => {
    const gridId = Symbol('g-float');
    const colId = Symbol('col-float');
    const opts = makeNumericOptions(gridId, colId);

    gridColumnCreate(gridId, 'float', opts);

    expect(() => DefaultRenderers.float(3.14, {}, opts as any)).not.toThrow();
  });

  it('initialises measurement state for "decimal"', () => {
    const gridId = Symbol('g-dec');
    const colId = Symbol('col-dec');
    const opts = makeNumericOptions(gridId, colId);

    gridColumnCreate(gridId, 'decimal', opts);

    expect(() => DefaultRenderers.decimal(9.99, {}, opts as any)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 6. gridDestroy
// ---------------------------------------------------------------------------

describe('gridDestroy', () => {
  it('does not throw when destroying a grid that had no numeric columns', () => {
    const gridId = Symbol('no-numeric');
    expect(() => gridDestroy(gridId)).not.toThrow();
  });

  it('does not throw when called for a completely unknown gridId', () => {
    const unknownId = Symbol('unknown');
    expect(() => gridDestroy(unknownId)).not.toThrow();
  });

  it('cleans up column state so a subsequent renderer call throws', () => {
    const gridId = Symbol('cleanup-test');
    const colId = Symbol('cleanup-col');
    const opts = makeNumericOptions(gridId, colId);

    gridColumnCreate(gridId, 'int', opts);
    // Works before destroy
    expect(() => DefaultRenderers.int(1, {}, opts as any)).not.toThrow();

    gridDestroy(gridId);

    // State is gone — renderer should throw (measurement lookup fails)
    expect(() => DefaultRenderers.int(1, {}, opts as any)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 7. preRender / postRender wrapping
// ---------------------------------------------------------------------------

describe('preRender / postRender wrapping', () => {
  it('returns a RenderableValue with "has-pre-post" class when preRender is set', () => {
    const opts = makeMockOptions();
    const optsWithPre: CellOptionsInternal = {
      ...opts,
      preRender: () => new RenderableValue('pre'),
    };

    const result = DefaultRenderers.plain('value', {}, optsWithPre);

    expect(result.classes).toContain('has-pre-post');
  });

  it('returns a RenderableValue with "has-pre-post" class when postRender is set', () => {
    const opts = makeMockOptions();
    const optsWithPost: CellOptionsInternal = {
      ...opts,
      postRender: () => 'post text',
    };

    const result = DefaultRenderers.plain('value', {}, optsWithPost);

    expect(result.classes).toContain('has-pre-post');
  });

  it('does NOT add "has-pre-post" class when neither preRender nor postRender is set', () => {
    const opts = makeMockOptions();

    const result = DefaultRenderers.plain('value', {}, opts);

    const classes = Array.isArray(result.classes) ? result.classes : [result.classes];
    expect(classes).not.toContain('has-pre-post');
  });

  it('preRender returning null is handled gracefully', () => {
    const opts = makeMockOptions();
    const optsWithNullPre: CellOptionsInternal = {
      ...opts,
      preRender: () => null,
    };

    expect(() => DefaultRenderers.plain('value', {}, optsWithNullPre)).not.toThrow();
  });
});
