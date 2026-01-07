/// <reference types="vitest" />
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import eslint from 'vite-plugin-eslint';
import dts from 'vite-plugin-dts';
import { visualizer } from 'rollup-plugin-visualizer';

/** @type {import('vite').UserConfig} */
export default defineConfig({
  plugins: [
    vue(),
    {
      ...eslint({
        failOnWarning: false,
        failOnError: false,
      }),
      apply: 'serve',
      enforce: 'post',
    },
    dts({
      tsconfigPath: './tsconfig.build.json',
      rollupTypes: true
    }),
    visualizer({
      open: false,
      filename: 'coverage/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '~': resolve(__dirname, '../../node_modules'),
    },
    extensions: [
      '.js',
      '.mjs',
      '.ts',
    ],
  },
  build: {
    target: 'es2015',
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['umd', 'es'],
      fileName: 'dynamicforms-vue-grid',
      name: 'dynamicforms-vue-grid.[name]',
    },
    rollupOptions: {
      external: [
        '@dynamicforms/vue-forms',
        '@dynamicforms/vuetify-inputs',
        'lodash-es',
        'natural-orderby',
        'vue',
        'vue-markdown-render',
        /^vuetify\/.*/,
      ],
      output: {
        globals: (id: string) => id, // all external modules are currently not aliased to anything but their own names
      }
    }
  },
  test: {
    coverage: {
      provider: 'istanbul',  // for some reason v8 was giving Serialized Error: { code: 'ERR_INSPECTOR_NOT_CONNECTED' }
      include: [
        'src/**/*'
      ],
      exclude: [
        '**/index.ts',
      ],
    },
    server: {
      deps: {
        inline: [/vuetify/]
      },
    },
    globals: true,
    environment: 'jsdom',
  },
});
