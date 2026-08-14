/**
 * @file e2e/auto-sizing-classic.spec.ts
 *
 * The auto-sizing suite with classic scrollbars: the body scroller reserves ~15 px for its
 * vertical scrollbar, and the header has to reserve the same, or the header columns end up
 * wider than the body columns they are supposed to label.
 *
 * Chromium only. Playwright launches it with `--hide-scrollbars`, and dropping that flag
 * brings the platform scrollbars back; headless Firefox has no such switch — it reports a
 * zero-width scrollbar no matter which pref is set, which is what auto-sizing.spec.ts
 * already covers.
 */

import { expect, test } from '@playwright/test';

import { autoSizingSuite } from './auto-sizing-suite';

test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

test.describe('auto-sizing — classic scrollbars', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'headless Firefox cannot show classic scrollbars');

  autoSizingSuite('classic', (width) => {
    expect(width, 'the body scroller should reserve a classic scrollbar').toBeGreaterThan(0);
  });
});
