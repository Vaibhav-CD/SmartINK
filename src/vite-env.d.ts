/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_META_API_KEY?: string;
  readonly VITE_MUSE_API_KEY?: string;
  readonly VITE_GROQ_API_KEY?: string;
  readonly VITE_OPENROUTER_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*?url' {
  const content: string;
  export default content;
}
