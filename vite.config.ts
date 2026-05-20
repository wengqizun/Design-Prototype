import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'doc-custom-block',
      transform(_, id) {
        if (id.includes('type=doc')) {
          return 'export default {}'
        }
      },
    },
    {
      name: 'apis-custom-block',
      transform(_, id) {
        if (id.includes('type=apis')) {
          return 'export default {}'
        }
      },
    },
    {
      name: 'jumps-custom-block',
      transform(code, id) {
        if (id.includes('type=jumps')) {
          return `
            const jumps = ${code}
            export default function(Component) {
              Component.__jumps = jumps
            }
          `
        }
      },
    },
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'doc' || tag === 'jumps' || tag === 'apis',
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
