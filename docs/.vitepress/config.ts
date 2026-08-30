import vuetify from 'vite-plugin-vuetify';
import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'DynamicForms Vue Grid',
  description: 'A (not so) simple, (but hopefully) fast vue grid component.',
  themeConfig: {
    logo: '/logo.png',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Reference', link: '/reference/index' },
      { text: 'Examples', link: '/examples/index' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Installation', link: '/guide/getting-started#installation' },
            { text: 'Basic Usage', link: '/guide/getting-started#basic-usage' },
          ]
        },
        {
          text: 'Cookbook',
          items: [
            { text: 'Cookbook', link: '/guide/cookbook' },
          ]
        },
        {
          text: 'Changelog',
          items: [
            { text: 'Changelog', link: '/guide/changelog' },
            { text: 'Migration guide', link: '/guide/migration' },
          ]
        }
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Overview', link: '/reference/index' },
            { text: '<DfGrid> Component', link: '/reference/df-grid' },
            { text: 'Column Definitions', link: '/reference/columns' },
            { text: 'Sorting', link: '/reference/sorting' },
            { text: 'Filtering', link: '/reference/filtering' },
            { text: 'Selection', link: '/reference/selection' },
            { text: 'Cell Renderers', link: '/reference/renderers' },
          ]
        }
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Full-featured Demo',              link: '/examples/table' },
            { text: 'Server-side Sorting & Filtering', link: '/examples/server-side' },
            { text: 'Cell Renderers',                  link: '/examples/renderers' },
            { text: 'Incoming Records Indicator',      link: '/examples/incoming' },
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/dynamicforms/vue-grid' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 Jure Erznožnik'
    }
  },
  vite: {
    plugins: [vuetify()],
    optimizeDeps: {
      include: ['vuetify'],
    },
    ssr: {
      noExternal: [
        /vuetify/,
      ],
    }
  },
});

