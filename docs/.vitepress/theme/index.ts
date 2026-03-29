import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { DynamicFormsVueGrid } from '../../../src';
import { CachedIcon } from 'vue-cached-icon';
import VueMarkdown from 'vue-markdown-render';

import '@mdi/font/css/materialdesignicons.css'
import '@dynamicforms/vuetify-inputs/styles.css';
import 'vuetify/dist/vuetify.css';
import './custom.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    const vuetify = createVuetify({
      components,
      directives,
      theme: {
        defaultTheme: 'light'
      }
    })

    app.use(vuetify);
    app.use(DynamicFormsVueGrid, { registerComponents: true });
    app.component('VueMarkdown', VueMarkdown);
    app.component('CachedIcon', CachedIcon);
  },
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // lahko dodamo custom slote za layout, če bo potrebno
    })
  }
} satisfies Theme
