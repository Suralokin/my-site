/* ===== Cloudflare Worker entry point =====
   Обслуживает статический сайт (Workers Static Assets) и эндпоинт CMS
   /api/content, переиспользуя функцию из functions/api/content.js. */

import { onRequest } from './functions/api/content.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/content') {
      return onRequest({ request, env, ctx });
    }
    return env.ASSETS.fetch(request);
  }
};
