/**
 * ═══════════════════════════════════════════════════════════════
 * CONFIGURACIÓN DE POCKETBASE — ChatNica
 * ═══════════════════════════════════════════════════════════════
 */

import PocketBase from 'https://cdn.jsdelivr.net/gh/pocketbase/js-sdk@master/dist/pocketbase.es.mjs';

const PB_URL = window.location.hostname === 'localhost'
  ? 'http://127.0.0.1:8090'
  : window.location.origin;

const pb = new PocketBase(PB_URL);

pb.authStore.loadFromCookie(document.cookie);
pb.authStore.onChange(() => {
  document.cookie = pb.authStore.exportToCookie({ httpOnly: false });
});

export { pb, PB_URL };
