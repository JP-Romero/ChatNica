/**
 * FIREBASE → POCKETBASE MIGRATION SCRIPT
 * 
 * Uso: node migrate-data.cjs
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { existsSync } = require('fs');
const { createWriteStream, createReadStream } = require('fs');
const { tmpdir } = require('os');
const { join, dirname } = require('path');
const { mkdir, unlink } = require('fs/promises');
const { pipeline } = require('stream/promises');
const http = require('http');
const https = require('https');

// ═══════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════

const FIREBASE_CONFIG = {
  credentialPath: './serviceAccountKey.json',
  storageBucket: 'chatnica-8648d.firebasestorage.app',
};

const POCKETBASE = {
  url: 'http://127.0.0.1:8090',
  email: 'mcalebr04@gmail.com',
  password: 'Juan290683',
};

// ═══════════════════════════════════════════════════════════════
//  LOGGING
// ═══════════════════════════════════════════════════════════════

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[OK]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.bold}${colors.cyan}▸ ${msg}${colors.reset}`),
};

// ═══════════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════════

function timestampToISO(ts) {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (ts?.seconds) return new Date(ts.seconds * 1000).toISOString();
  if (ts instanceof Date) return ts.toISOString();
  return new Date(ts).toISOString();
}

function cleanNulls(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
//  POCKETBASE REST CLIENT
// ═══════════════════════════════════════════════════════════════

class PBClient {
  constructor(url) {
    this.url = url.replace(/\/$/, '');
    this.token = null;
  }

  async login(email, password) {
    const res = await this._fetch('/api/collections/_superusers/auth-with-password', {
      method: 'POST',
      body: { identity: email, password },
    });
    this.token = res.token;
    return res;
  }

  async getCollections() {
    const res = await this._fetch('/api/collections');
    return res.items;
  }

  async getCollection(name) {
    const res = await this._fetch(`/api/collections/${name}`);
    return res;
  }

  async listRecords(collection, options = {}) {
    const params = new URLSearchParams();
    if (options.filter) params.set('filter', options.filter);
    if (options.perPage) params.set('perPage', options.perPage);
    if (options.page) params.set('page', options.page);
    if (options.sort) params.set('sort', options.sort);
    const qs = params.toString();
    const res = await this._fetch(`/api/collections/${collection}/records${qs ? '?' + qs : ''}`);
    return res;
  }

  async getRecord(collection, id) {
    try {
      return await this._fetch(`/api/collections/${collection}/records/${id}`);
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  async getFirstListItem(collection, filter) {
    const res = await this.listRecords(collection, { filter, perPage: 1 });
    return res.items?.[0] || null;
  }

  async createRecord(collection, data) {
    return this._fetch(`/api/collections/${collection}/records`, {
      method: 'POST',
      body: data,
    });
  }

  async updateRecord(collection, id, data) {
    return this._fetch(`/api/collections/${collection}/records/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async uploadRecord(collection, data, filePaths) {
    // Use multipart for file uploads
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        value.forEach(v => formData.append(key, v));
      } else {
        formData.append(key, value);
      }
    }

    if (filePaths) {
      for (const [fieldName, filePath] of Object.entries(filePaths)) {
        if (filePath && existsSync(filePath)) {
          formData.append(fieldName, createReadStream(filePath));
        }
      }
    }

    return this._fetch(`/api/collections/${collection}/records`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });
  }

  async _fetch(path, options = {}) {
    const url = this.url + path;
    const isMultipart = options.body && typeof options.body.pipe === 'function';
    
    let bodyData = null;
    const headers = {};
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (options.body) {
      if (isMultipart) {
        headers['Content-Type'] = (options.headers || {})['content-type'] || options.body.getHeaders?.();
        bodyData = options.body;
      } else {
        headers['Content-Type'] = 'application/json';
        bodyData = JSON.stringify(options.body);
      }
    }

    const protocol = url.startsWith('https') ? https : http;
    
    const fetchOptions = {
      method: options.method || 'GET',
      headers,
    };
    
    const response = await new Promise((resolve, reject) => {
      const req = protocol.request(url, fetchOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({ status: res.statusCode, headers: res.headers, data });
        });
      });
      
      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (bodyData) {
        if (isMultipart) {
          bodyData.pipe(req);
          return;
        } else {
          req.write(bodyData);
        }
      }
      
      req.end();
    });

    let parsed;
    try {
      parsed = JSON.parse(response.data);
    } catch {
      parsed = response.data;
    }

    if (response.status >= 400) {
      const err = new Error(typeof parsed === 'object' ? JSON.stringify(parsed) : response.data);
      err.status = response.status;
      err.data = parsed;
      throw err;
    }

    return parsed;
  }
}

// ═══════════════════════════════════════════════════════════════
//  FIREBASE STORAGE DOWNLOAD
// ═══════════════════════════════════════════════════════════════

async function downloadFirebaseFile(bucket, gsUrl, filename) {
  if (!gsUrl) return null;
  
  let filePath;
  const gsMatch = gsUrl.match(/gs:\/\/[^/]+\/(.+)/);
  if (gsMatch) {
    filePath = gsMatch[1];
  } else {
    try {
      const url = new URL(gsUrl);
      const pathParts = url.pathname.split('/');
      const oIndex = pathParts.indexOf('o');
      if (oIndex >= 0) {
        filePath = decodeURIComponent(pathParts.slice(oIndex + 1).join('/'));
      } else {
        filePath = decodeURIComponent(url.pathname.substring(1));
      }
    } catch {
      return null;
    }
  }

  if (!filePath) return null;

  const tmpDir = join(tmpdir(), 'pb-migration');
  if (!existsSync(tmpDir)) await mkdir(tmpDir, { recursive: true });
  
  const localPath = join(tmpDir, filename || filePath.replace(/\//g, '_'));
  
  try {
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    if (!exists) return null;

    await file.download({ destination: localPath });
    return localPath;
  } catch (e) {
    log.warn(`No se pudo descargar: ${filePath} - ${e.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
//  MIGRATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function generateShortId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 15; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function migrateUsers(db, pb) {
  log.step('Migrando usuarios...');
  
  const snapshot = await db.collection('users').get();
  const fbToPbMap = {}; // Firebase UID -> PocketBase ID
  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const fbUid = doc.id;

    try {
      // Check if already migrated by storing fbUid in a custom field
      const existing = await pb.getFirstListItem('users', `email = "${data.email || ''}"`);
      
      const pbId = existing ? existing.id : generateShortId();
      fbToPbMap[fbUid] = pbId;

      const userData = cleanNulls({
        id: existing ? undefined : pbId,
        displayName: data.displayName || data.email?.split('@')[0] || 'Usuario',
        email: data.email || null,
        photoURL: data.photoURL || null,
        color: data.color || null,
        bio: data.bio || '',
        city: data.city || '',
        department: data.department || '',
        emailVisibility: true,
      });

      if (existing) {
        await pb.updateRecord('users', pbId, userData);
      } else {
        if (!data.email) {
          userData.email = `${pbId}@anonymous.local`;
        }
        if (!data.passwordHash) {
          userData.password = 'temp_password_change_me';
          userData.passwordConfirm = 'temp_password_change_me';
        }
        await pb.createRecord('users', userData);
      }

      migrated++;
    } catch (e) {
      log.warn(`Usuario ${fbUid}: ${e.message}`);
      skipped++;
    }
  }

  log.success(`Usuarios: ${migrated} migrados, ${skipped} omitidos`);
  return fbToPbMap;
}

async function migrateContacts(db, pb, fbToPbMap) {
  log.step('Migrando contactos...');
  
  const snapshot = await db.collection('contacts').get();
  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const contactId = doc.id;

    try {
      const requesterPb = fbToPbMap[data.requesterUid || data.requester] || data.requesterUid || data.requester;
      const targetPb = fbToPbMap[data.targetUid || data.target] || data.targetUid || data.target;

      const contactData = cleanNulls({
        id: generateShortId(),
        requester: requesterPb,
        target: targetPb,
        status: data.status || 'pending',
      });

      await pb.createRecord('contacts', contactData);
      migrated++;
    } catch (e) {
      log.warn(`Contacto ${contactId}: ${e.message}`);
      skipped++;
    }
  }

  log.success(`Contactos: ${migrated} migrados, ${skipped} omitidos`);
}

async function migrateMessages(db, pb, bucket, fbToPbMap, convIdMap) {
  log.step('Migrando mensajes...');
  
  const snapshot = await db.collection('messages').get();
  const total = snapshot.size;
  let migrated = 0;
  let skipped = 0;

  log.info(`Total mensajes: ${total}`);

  for (let i = 0; i < snapshot.docs.length; i++) {
    const doc = snapshot.docs[i];
    const data = doc.data();
    const msgId = doc.id;

    try {
      const convPb = convIdMap[data.conversationId || data.conversation] || data.conversationId || data.conversation;
      const userPb = fbToPbMap[data.uid || data.user] || data.uid || data.user;

      const msgData = cleanNulls({
        id: generateShortId(),
        conversation: convPb,
        text: data.text || '',
        user: userPb,
        status: data.status || 'sent',
        reactions: data.reactions || {},
        replyToUserName: data.replyTo?.user || '',
      });

      await pb.createRecord('messages', msgData);
      migrated++;
    } catch (e) {
      log.warn(`Mensaje ${msgId}: ${e.message}`);
      skipped++;
    }

    if ((i + 1) % 50 === 0) {
      log.info(`Progreso mensajes: ${i + 1}/${total}`);
    }
  }

  log.success(`Mensajes: ${migrated} migrados, ${skipped} omitidos`);
}

async function migratePosts(db, pb, fbToPbMap) {
  log.step('Migrando publicaciones...');
  
  const snapshot = await db.collection('posts').get();
  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const postId = doc.id;

    try {
      const uidPb = fbToPbMap[data.uid] || data.uid;

      const postData = cleanNulls({
        id: generateShortId(),
        uid: uidPb,
        text: data.text || '',
        likes: data.likes || [],
        comments: data.comments || [],
      });

      await pb.createRecord('posts', postData);
      migrated++;
    } catch (e) {
      log.warn(`Post ${postId}: ${e.message}`);
      skipped++;
    }
  }

  log.success(`Posts: ${migrated} migrados, ${skipped} omitidos`);
}

async function migrateStories(db, pb, fbToPbMap) {
  log.step('Migrando estados (stories)...');
  
  const snapshot = await db.collection('stories').get();
  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const storyId = doc.id;

    try {
      const uidPb = fbToPbMap[data.uid] || data.uid;

      const storyData = cleanNulls({
        id: generateShortId(),
        uid: uidPb,
        type: data.type || 'image',
        text: data.text || '',
        expiresAt: data.expiresAt ? timestampToISO(data.expiresAt) : null,
        views: data.views || [],
      });

      await pb.createRecord('stories', storyData);
      migrated++;
    } catch (e) {
      log.warn(`Story ${storyId}: ${e.message}`);
      skipped++;
    }
  }

  log.success(`Stories: ${migrated} migrados, ${skipped} omitidos`);
}

async function migratePresence(db, pb, fbToPbMap) {
  log.step('Migrando presencia...');
  
  const snapshot = await db.collection('presence').get();
  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const presenceId = doc.id;

    try {
      const userPb = fbToPbMap[data.uid || presenceId] || data.uid || presenceId;

      const presenceData = cleanNulls({
        user: userPb,
        online: data.online || false,
        lastSeen: data.lastSeen ? timestampToISO(data.lastSeen) : null,
      });

      const existing = await pb.getFirstListItem('presence', `user = "${userPb}"`);
      if (existing) {
        await pb.updateRecord('presence', existing.id, presenceData);
      } else {
        await pb.createRecord('presence', presenceData);
      }
      migrated++;
    } catch (e) {
      log.warn(`Presence ${presenceId}: ${e.message}`);
      skipped++;
    }
  }

  log.success(`Presence: ${migrated} migrados, ${skipped} omitidos`);
}

async function migrateTyping(db, pb, convIdMap) {
  log.step('Migrando typing indicators...');
  
  const snapshot = await db.collection('typing').get();
  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const typingId = doc.id;

    try {
      const convPb = convIdMap[typingId] || typingId;

      const typingData = cleanNulls({
        conversation: convPb,
        typers: data,
      });

      const existing = await pb.getFirstListItem('typing', `conversation = "${convPb}"`);
      if (existing) {
        await pb.updateRecord('typing', existing.id, typingData);
      } else {
        await pb.createRecord('typing', typingData);
      }
      migrated++;
    } catch (e) {
      log.warn(`Typing ${typingId}: ${e.message}`);
      skipped++;
    }
  }

  log.success(`Typing: ${migrated} migrados, ${skipped} omitidos`);
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  FIREBASE → POCKETBASE MIGRATION');
  console.log('  ChatNica v2');
  console.log('='.repeat(60) + '\n');

  const startTime = Date.now();

  // Init Firebase
  log.step('Inicializando Firebase Admin SDK...');
  
  const credPath = FIREBASE_CONFIG.credentialPath;
  if (!existsSync(credPath)) {
    log.error(`No se encontro el archivo de credencial: ${credPath}`);
    log.info('Descarga tu service account key desde:');
    log.info('Firebase Console → Project Settings → Service Accounts → Generate new private key');
    log.info(`Guarda el archivo como: ${credPath}`);
    process.exit(1);
  }

  const app = initializeApp({
    credential: cert(credPath),
    storageBucket: FIREBASE_CONFIG.storageBucket,
  });

  const db = getFirestore(app);
  const { getStorage } = require('firebase-admin/storage');
  const storage = getStorage(app);
  const bucket = storage.bucket(FIREBASE_CONFIG.storageBucket);
  log.success('Firebase conectado');

  // Init PocketBase
  log.step(`Conectando a PocketBase (${POCKETBASE.url})...`);
  const pb = new PBClient(POCKETBASE.url);
  await pb.login(POCKETBASE.email, POCKETBASE.password);
  log.success('PocketBase conectado como admin');

  // Verify collections exist
  const collections = await pb.getCollections();
  const collectionNames = collections.map(c => c.name);
  
  const requiredCollections = ['users', 'contacts', 'conversations', 'messages', 'posts', 'stories', 'presence', 'typing'];
  const missing = requiredCollections.filter(c => !collectionNames.includes(c));
  
  if (missing.length > 0) {
    log.error(`Faltan colecciones: ${missing.join(', ')}`);
    log.info('Ejecuta create-collections.html primero para crearlas');
    process.exit(1);
  }
  log.success('Todas las colecciones existen');

  // Migrate data - users first to build ID map
  const fbToPbMap = await migrateUsers(db, pb);
  
  // Migrate conversations and build conversation ID map
  const convSnapshot = await db.collection('conversations').get();
  const convIdMap = {};
  log.step('Migrando conversaciones...');
  for (const doc of convSnapshot.docs) {
    const data = doc.data();
    const fbConvId = doc.id;
    const pbConvId = generateShortId();
    convIdMap[fbConvId] = pbConvId;

    try {
      const participantsPb = (data.participants || []).map(uid => fbToPbMap[uid] || uid);
      const createdByPb = fbToPbMap[data.createdBy || data.createdByUid] || data.createdBy || data.createdByUid;

      const convData = cleanNulls({
        id: pbConvId,
        type: data.type || 'direct',
        participants: participantsPb,
        name: data.name || '',
        createdBy: createdByPb,
        lastMessage: data.lastMessage || null,
        lastMessageTime: data.lastMessageTime ? timestampToISO(data.lastMessageTime) : null,
      });

      await pb.createRecord('conversations', convData);
    } catch (e) {
      log.warn(`Conversacion ${fbConvId}: ${e.message}`);
    }
  }
  log.success(`Conversaciones: ${Object.keys(convIdMap).length} migradas`);

  await migrateContacts(db, pb, fbToPbMap);
  await migrateMessages(db, pb, bucket, fbToPbMap, convIdMap);
  await migratePosts(db, pb, fbToPbMap);
  await migrateStories(db, pb, fbToPbMap);
  await migratePresence(db, pb, fbToPbMap);
  await migrateTyping(db, pb, convIdMap);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  log.success(`MIGRACION COMPLETADA en ${elapsed}s`);
  console.log('='.repeat(60));
  
  log.info('');
  log.info('NOTAS IMPORTANTES:');
  log.info('1. Los usuarios tienen contraseña temporal: temp_password_change_me');
  log.info('   (Los que usaban Google auth deben re-autenticarse)');
  log.info('2. Los archivos de Storage NO se migraron automaticamente.');
  log.info('   Las URLs de Firebase Storage seguiran funcionando mientras');
  log.info('   el proyecto Firebase este activo.');
  log.info('3. Revisa las reglas API en el admin de PocketBase.');
  log.info('4. Configura Google OAuth2 en Settings > OAuth2.');
}

main().catch(e => {
  log.error(`Error fatal: ${e.message}`);
  console.error(e);
  process.exit(1);
});
