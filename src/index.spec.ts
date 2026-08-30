/**
 * @file index.spec.ts
 *
 * Tests for the `DynamicFormsVueGrid` Vue plugin (src/index.ts).
 *
 * `install()` controls two independent things via `options`:
 *  - `registerComponents` — globally registers every component in `./dynamicforms-components`. Default: `false`.
 *  - `registerDirectives` — globally registers the `v-longpress` directive. Default: `true`, regardless of
 *    `registerComponents`.
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
  it('registers the directive but no component when no options are given', () => {
    const app = mockApp();
    DynamicFormsVueGrid.install(app);
    expect(app.directive).toHaveBeenCalledWith('longpress', expect.anything());
    expect(app.component).not.toHaveBeenCalled();
  });

  it('registers the directive but no component when options is an empty object', () => {
    const app = mockApp();
    DynamicFormsVueGrid.install(app, {});
    expect(app.directive).toHaveBeenCalledWith('longpress', expect.anything());
    expect(app.component).not.toHaveBeenCalled();
  });

  it('registerComponents: true registers components; the directive is registered independently', () => {
    const app = mockApp();
    DynamicFormsVueGrid.install(app, { registerComponents: true });
    expect(app.component).toHaveBeenCalled();
    expect(app.directive).toHaveBeenCalledWith('longpress', expect.anything());
  });

  it('registerDirectives: false suppresses the directive even with registerComponents: true', () => {
    const app = mockApp();
    DynamicFormsVueGrid.install(app, { registerComponents: true, registerDirectives: false });
    expect(app.component).toHaveBeenCalled();
    expect(app.directive).not.toHaveBeenCalled();
  });

  it('registerComponents: false leaves components unregistered while the directive still registers', () => {
    const app = mockApp();
    DynamicFormsVueGrid.install(app, { registerComponents: false });
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
