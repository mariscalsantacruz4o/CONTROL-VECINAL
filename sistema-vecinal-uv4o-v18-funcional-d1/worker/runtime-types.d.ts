interface Fetcher {
  fetch(input: Request | URL | string, init?: RequestInit): Promise<Response>;
}

interface D1Database {}

declare module "cloudflare:workers" {
  export const env: Record<string, any>;
}
