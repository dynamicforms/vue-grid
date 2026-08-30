import { App } from 'vue';

import * as Components from './dynamicforms-components';
import { longpress } from './table/helpers';

export * from './table';

export interface DynamicFormsVueGridOptions {
  registerComponents: boolean;
  registerDirectives: boolean;
  registerVuetifyComponents: boolean;
}

export const DynamicFormsVueGrid = {
  install: (app: App, options?: Partial<DynamicFormsVueGridOptions>) => {
    if (options?.registerDirectives ?? options?.registerComponents ?? false) {
      app.directive('longpress', longpress);
    }
    if (options?.registerComponents ?? false) {
      Object.entries(Components).map(([name, component]) => app.component(name, component));
    }
  },
};
