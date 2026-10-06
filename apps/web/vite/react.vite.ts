import babel from '@rolldown/plugin-babel';
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react';
import type { PluginOption } from 'vite';

export function createReactPlugins(): PluginOption[] {
  return [
    viteReact(),
    babel({
      presets: [reactCompilerPreset()],
      exclude: /node_modules|paraglide\//,
    }),
  ];
}
