import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'DynamicForms Vue Grid',
  description: 'A (not so) simple, (but hopefully) fast vue grid component.',
  themeConfig: {
    logo: '/logo.png',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/index' },
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
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/index' },
            { text: '<DfGrid> Component', link: '/api/df-grid' },
            { text: 'Column Definitions', link: '/api/columns' },
            { text: 'Sorting', link: '/api/sorting' },
            { text: 'Filtering', link: '/api/filtering' },
            { text: 'Cell Renderers', link: '/api/renderers' },
          ]
        }
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Table', link: '/examples/table' },
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
  }
});

