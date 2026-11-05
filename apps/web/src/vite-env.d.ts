/// <reference types="vite/client" />
/// <reference types="unplugin-icons/types/react" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string;
  readonly VITE_APP_URL: string;
}

interface Window {
  __electrobunWindowId?: number;
  __botsAddresses?: string[];
  __botsHost?: string;
  __electrobunSendToHost?: (message: { theme: 'light' | 'dark' } | { notify: { title: string; body: string; botId?: string } } | { connection: true } | { pair: true }) => void;
}

interface Navigator {
  readonly standalone?: boolean;
}

declare module "*.css";
