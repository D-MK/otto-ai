/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEBUG_MODE?: string;
  readonly VITE_MCP_BASE_URL?: string;
  readonly VITE_MCP_AUTH_TYPE?: string;
  readonly VITE_MCP_AUTH_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
