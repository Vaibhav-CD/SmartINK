/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_META_API_KEY?: string;
  readonly VITE_LLAMA_API_KEY?: string;
  readonly VITE_MUSE_API_KEY?: string;
  readonly VITE_GROQ_API_KEY?: string;
  readonly VITE_OPENROUTER_API_KEY?: string;
  readonly VITE_META_API_URL?: string;
  readonly VITE_META_MODEL?: string;
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
