// Created by VaibhavCD
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MUSE_API_KEY?: string;
  readonly VITE_MUSE_API_URL?: string;
  readonly VITE_MUSE_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*?url' {
  const content: string;
  export default content;
}
