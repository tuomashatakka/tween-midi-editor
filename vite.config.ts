/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import type { PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// The Electron wrapper is optional and only wired up when ELECTRON=1 is set,
// so the default `vite` dev/build path stays a pure browser web app.
const withElectron = process.env.ELECTRON === '1'

export default defineConfig(async () => {
  const plugins: PluginOption[] = [ react() ]

  if (withElectron) {
    const { default: electron } = await import('vite-plugin-electron')
    const { default: renderer } = await import('vite-plugin-electron-renderer')
    plugins.push(
      electron([
        {
          entry: 'electron/main.ts',
          vite:  { build: { outDir: 'dist-electron' }},
        },
        {
          entry: 'electron/preload.ts',
          onstart (args) {
            args.reload()
          },
          vite: { build: { outDir: 'dist-electron' }},
        },
      ]),
      renderer(),
    )
  }

  return {
    base:    './',
    plugins,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      globals:               true,
      environment:           'node',
      environmentMatchGlobs: [[ '**/*.dom.test.{ts,tsx}', 'jsdom' ]],
      include:               [ 'src/**/*.{test,spec}.{ts,tsx}' ],
    },
  }
})
