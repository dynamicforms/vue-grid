/**
 * @file index.spec.ts
 *
 * Tests for the `DynamicFormsVueGrid` Vue plugin (src/index.ts).
 *
 * `install()` independently controls two things via `options`:
 *  - `registerComponents` — globally registers every component in `./dynamicforms-components`
 *  - `registerDirectives` — globally registers the `v-longpress` directive
 *
 * `registerDirectives` defaults to `registerComponents` when omitted, so `{ registerComponents: true }` alone
 * registers the directive too.
 */
import type { App } from 'vue';

import { DynamicFormsVueGrid } from './index';

function mockApp(): App & { directive: ReturnType<typeof vi.fn>; component: ReturnType<typeof vi.fn> } {
  return {
    directive: vi.fn(),
    component: vi.fn(),
  } as unknown as App & { directive: ReturnType<typeof vi.fn>; component: ReturnType<typeof vi.fn> };
}

describe('DynamicFormsVueGrid.install', () => {
  it('registers nothing when no options are given', () => {
    const app = mockApp();
    DynamicFormsVueGrid.install(app);
    expect(app.directive).not.toHaveBeenCalled();
    expect(app.component).not.toHaveBeenCalled();
  });

  it('registers nothing when options is an empty object', () => {
    const app = mockApp();
    DynamicFormsVueGrid.install(app, {});
    expect(app.directive).not.toHaveBeenCalled();
    expect(app.component).not.toHaveBeenCalled();
  });

  it('registerComponents: true registers both components and the longpress directive', () => {
    const app = mockApp();
    DynamicFormsVueGrid.install(app, { registerComponents: true });
    expect(app.component).toHaveBeenCalled();
    expect(app.directive).toHaveBeenCalledWith('longpress', expect.anything());
  });

  it('registerDirectives: true registers the directive without registering any component', () => {
    const app = mockApp();
    DynamicFormsVueGrid.install(app, { registerDirectives: true });
    expect(app.directive).toHaveBeenCalledWith('longpress', expect.anything());
    expect(app.component).not.toHaveBeenCalled();
  });

  it('registerComponents: true, registerDirectives: false registers components but not the directive', () => {
    const app = mockApp();
    DynamicFormsVueGrid.install(app, { registerComponents: true, registerDirectives: false });
    expect(app.component).toHaveBeenCalled();
    expect(app.directive).not.toHaveBeenCalled();
  });

  it('registerComponents: false, registerDirectives: true registers the directive but no component', () => {
    const app = mockApp();
    DynamicFormsVueGrid.install(app, { registerComponents: false, registerDirectives: true });
    expect(app.directive).toHaveBeenCalledWith('longpress', expect.anything());
    expect(app.component).not.toHaveBeenCalled();
  });

  it('registers one component entry per export in dynamicforms-components', async () => {
    const app = mockApp();
    const components = await import('./dynamicforms-components');
    DynamicFormsVueGrid.install(app, { registerComponents: true });
    expect(app.component).toHaveBeenCalledTimes(Object.keys(components).length);
  });
});
