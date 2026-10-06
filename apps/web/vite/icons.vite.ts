import { FileSystemIconLoader } from 'unplugin-icons/loaders';
import Icons from 'unplugin-icons/vite';

export function createIconsPlugin() {
  return Icons({
    autoInstall: true,
    compiler: 'jsx',
    jsx: 'react',
    customCollections: {
      brands: FileSystemIconLoader('./src/assets/brands'),
    },
  });
}
