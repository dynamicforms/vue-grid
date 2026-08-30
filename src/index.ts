import { App } from 'vue';

import * as Components from './dynamicforms-components';
import { longpress } from './table/helpers';

export * from './table';

export interface DynamicFormsVueGridOptions {
  /** Globally registers every component in `dynamicforms-components` (`<DfGrid>` included). Default: `false`. */
  registerComponents: boolean;
  /** Globally registers the `v-longpress` directive. Default: `true`. */
  registerDirectives: boolean;
  registerVuetifyComponents: boolean;
}

export const DynamicFormsVueGrid = {
  install: (app: App, options?: Partial<DynamicFormsVueGridOptions>) => {
    if (options?.registerDirectives ?? true) {
      app.directive('longpress', longpress);
    }
    if (options?.registerComponents ?? false) {
      Object.entries(Components).map(([name, component]) => app.component(name, component));
    }
  },
};
