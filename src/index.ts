import { App } from 'vue';

import * as Components from './dynamicforms-components';

export * from './table';

export interface DynamicFormsVueGridOptions {
  registerComponents: boolean;
  registerVuetifyComponents: boolean;
}

export const DynamicFormsVueGrid = {
  install: (app: App, options?: Partial<DynamicFormsVueGridOptions>) => {
    if (options?.registerComponents ?? false) {
      Object.entries(Components).map(([name, component]) => app.component(name, component));
    }
  },
};
