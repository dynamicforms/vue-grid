/**
 * @file e2e/auto-sizing.spec.ts
 *
 * Auto-sizing geometry with overlay scrollbars — the body scroller reserves no width for its
 * vertical scrollbar, so neither the header nor the shadow grid may reserve any either.
 * Headless browsers hide scrollbars by default, which is exactly that regime.
 *
 * See auto-sizing-suite.ts for what is asserted, and auto-sizing-classic.spec.ts for the
 * same suite with classic (space-reserving) scrollbars.
 */

import { expect, test } from '@playwright/test';

import { autoSizingSuite } from './auto-sizing-suite';

test.describe('auto-sizing — overlay scrollbars', () => {
  autoSizingSuite('overlay', (width) => {
    expect(width, 'headless browsers hide scrollbars, so the body reserves nothing').toBe(0);
  });
});
