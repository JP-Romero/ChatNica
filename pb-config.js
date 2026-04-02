/**
 * ═══════════════════════════════════════════════════════════════
 * CONFIGURACIÓN DE POCKETBASE — ChatNica
 * ═══════════════════════════════════════════════════════════════
 */

import PocketBase from 'https://cdn.jsdelivr.net/npm/pocketbase@0.22.3/+esm';

const PB_URL = window.location.hostname === 'localhost'
  ? 'http://127.0.0.1:8090'
  : window.location.origin;

const pb = new PocketBase(PB_URL);

pb.authStore.loadFromCookie(document.cookie);
pb.authStore.onChange(() => {
  document.cookie = pb.authStore.exportToCookie({ httpOnly: false });
});

export { pb, PB_URL };
