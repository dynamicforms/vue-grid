import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'DynamicForms Vue Grid',
  description: 'A (not so) simple, (but hopefully) fast vue grid component.',
  themeConfig: {
    logo: '/logo.png',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/examples/index' }
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
      '/examples/': [
        {
          text: 'API with Examples',
          items: [
            { text: 'table', link: '/examples/table' },
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/velis74/dynamicforms-vue-grid' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 Jure Erznožnik'
    }
  }
});

