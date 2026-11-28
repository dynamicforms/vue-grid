import { test as base } from '@playwright/test';

export * from '@playwright/test';

// the icon SVG every icon provider of vue-cached-icon answers with: icons load at once and need no network
const ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24"/></svg>';
const ICON_URLS = /^https:\/\/cdn\.jsdelivr\.net\/npm\/(@mdi\/svg|ionicons|@fortawesome\/fontawesome-free)@[^/]+\/.*\.svg$/;

/** Playwright's `test`, with the icon requests of every page answered locally. */
export const test = base.extend<{ stubIcons: void }>({
  stubIcons: [
    async ({ context }, use) => {
      await context.route(ICON_URLS, (route) =>
        route.fulfill({
          contentType: 'image/svg+xml',
          headers: { 'access-control-allow-origin': '*' },
          body: ICON_SVG,
        }),
      );
      await use();
    },
    { auto: true },
  ],
});
