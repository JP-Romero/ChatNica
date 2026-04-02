/**
 * ═══════════════════════════════════════════════════════════════
 * FIREBASE → POCKETBASE MIGRATION SCRIPT
 * ═══════════════════════════════════════════════════════════════
 * 
 * Este script:
 * 1. Lee datos de Firebase (Firestore + Storage)
 * 2. Crea colecciones en PocketBase
 * 3. Migra todos los datos
 * 4. Descarga y re-sube archivos de Firebase Storage
 * 
 * Uso:
 *   npm install
 *   node firebase-to-pb.mjs
 * ═══════════════════════════════════════════════════════════════
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import PocketBase from 'pocketbase';
import { createReadStream } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import fetch from 'node-fetch';

// ═══════════════════════════════════════════════════════════════
//  CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════

// Opción A: Variables de entorno
// Opción B: Editar este archivo directamente

const FIREBASE_CONFIG = {
  credentialPath: process.env.FIREBASE_CREDENTIAL || './serviceAccountKey.json',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'chatnica-8648d.firebasestorage.app',
};

const POCKETBASE = {
  url: process.env.PB_URL || 'http://127.0.0.1:8090',
  email: process.env.PB_EMAIL || 'admin@chatnica.com',
  password: process.env.PB_PASSWORD || 'admin123456',
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
//  UTILIDADES
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════
//  INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════

async function initFirebase() {
  log.step('Inicializando Firebase Admin SDK...');
  
  const credPath = FIREBASE_CONFIG.credentialPath;
  if (!existsSync(credPath)) {
    log.error(`No se encontró el archivo de credencial: ${credPath}`);
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
  const storage = getStorage(app);
  log.success('Firebase conectado');
  return { db, storage, bucket: storage.bucket(FIREBASE_CONFIG.storageBucket) };
}

async function initPocketBase() {
  log.step(`Conectando a PocketBase (${POCKETBASE.url})...`);
  
  const pb = new PocketBase(POCKETBASE.url);
  
  try {
    await pb.admins.authWithPassword(POCKETBASE.email, POCKETBASE.password);
    log.success('PocketBase conectado como admin');
  } catch (e) {
    log.error(`No se pudo conectar a PocketBase: ${e.message}`);
    log.info('Verifica que PocketBase esté corriendo y las credenciales sean correctas');
    process.exit(1);
  }
  
  return pb;
}

// ═══════════════════════════════════════════════════════════════
//  CREAR COLECCIONES
// ═══════════════════════════════════════════════════════════════

async function createCollections(pb) {
  log.step('Creando colecciones en PocketBase...');
  
  const collections = [
    {
      name: 'contacts',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != "" && requester = @request.auth.id',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'requester', type: 'relation', required: true, options: { collectionId: '', cascadeDelete: true } },
        { name: 'target', type: 'relation', required: true, options: { collectionId: '', cascadeDelete: true } },
        { name: 'status', type: 'select', required: true, options: { values: ['pending', 'accepted'], maxSelect: 1 } },
      ]
    },
    {
      name: 'conversations',
      type: 'base',
      listRule: '@request.auth.id != "" && participants.id ?= @request.auth.id',
      viewRule: '@request.auth.id != "" && participants.id ?= @request.auth.id',
      createRule: '@request.auth.id != "" && participants.id ?= @request.auth.id',
      updateRule: '@request.auth.id != "" && participants.id ?= @request.auth.id',
      deleteRule: '@request.auth.id != "" && createdBy = @request.auth.id',
      fields: [
        { name: 'type', type: 'select', required: true, options: { values: ['direct', 'group'], maxSelect: 1 } },
        { name: 'participants', type: 'relation', required: true, options: { collectionId: '', maxSelect: 100, cascadeDelete: false } },
        { name: 'name', type: 'text', required: false },
        { name: 'createdBy', type: 'relation', required: true, options: { collectionId: '', cascadeDelete: false } },
        { name: 'lastMessage', type: 'text', required: false },
        { name: 'lastMessageTime', type: 'date', required: false },
      ]
    },
    {
      name: 'messages',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != "" && user = @request.auth.id',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != "" && user = @request.auth.id',
      fields: [
        { name: 'conversation', type: 'relation', required: true, options: { collectionId: '', cascadeDelete: true } },
        { name: 'text', type: 'text', required: false },
        { name: 'image', type: 'file', required: false, options: { maxSelect: 1, maxSize: 10485760, mimeTypes: ['image/jpeg','image/png','image/gif','image/webp'] } },
        { name: 'video', type: 'file', required: false, options: { maxSelect: 1, maxSize: 10485760, mimeTypes: ['video/mp4','video/webm','video/quicktime'] } },
        { name: 'audio', type: 'file', required: false, options: { maxSelect: 1, maxSize: 10485760, mimeTypes: ['audio/*'] } },
        { name: 'user', type: 'relation', required: true, options: { collectionId: '', cascadeDelete: false } },
        { name: 'replyTo', type: 'relation', required: false, options: { collectionId: '', cascadeDelete: false } },
        { name: 'replyToUserName', type: 'text', required: false },
        { name: 'reactions', type: 'json', required: false },
        { name: 'status', type: 'select', required: false, options: { values: ['sent', 'delivered', 'read'], maxSelect: 1 } },
      ]
    },
    {
      name: 'posts',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != "" && uid = @request.auth.id',
      updateRule: '@request.auth.id != "" && uid = @request.auth.id',
      deleteRule: '@request.auth.id != "" && uid = @request.auth.id',
      fields: [
        { name: 'uid', type: 'relation', required: true, options: { collectionId: '', cascadeDelete: true } },
        { name: 'text', type: 'text', required: false },
        { name: 'images', type: 'file', required: false, options: { maxSelect: 10, maxSize: 5242880, mimeTypes: ['image/jpeg','image/png','image/gif','image/webp'] } },
        { name: 'likes', type: 'json', required: false },
        { name: 'comments', type: 'json', required: false },
      ]
    },
    {
      name: 'stories',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != "" && uid = @request.auth.id',
      updateRule: '@request.auth.id != "" && uid = @request.auth.id',
      deleteRule: '@request.auth.id != "" && uid = @request.auth.id',
      fields: [
        { name: 'uid', type: 'relation', required: true, options: { collectionId: '', cascadeDelete: true } },
        { name: 'type', type: 'select', required: true, options: { values: ['image', 'text'], maxSelect: 1 } },
        { name: 'image', type: 'file', required: false, options: { maxSelect: 1, maxSize: 5242880, mimeTypes: ['image/jpeg','image/png','image/gif','image/webp'] } },
        { name: 'text', type: 'text', required: false },
        { name: 'expiresAt', type: 'date', required: true },
        { name: 'views', type: 'json', required: false },
      ]
    },
    {
      name: 'presence',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != "" && user = @request.auth.id',
      updateRule: '@request.auth.id != "" && user = @request.auth.id',
      deleteRule: '@request.auth.id != "" && user = @request.auth.id',
      fields: [
        { name: 'user', type: 'relation', required: true, options: { collectionId: '', cascadeDelete: true, maxSelect: 1, minSelect: 1 } },
        { name: 'online', type: 'bool', required: false },
        { name: 'lastSeen', type: 'date', required: false },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_presence_user ON presence (user)']
    },
    {
      name: 'typing',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'conversation', type: 'relation', required: true, options: { collectionId: '', cascadeDelete: true, maxSelect: 1, minSelect: 1 } },
        { name: 'typers', type: 'json', required: false },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_typing_conv ON typing (conversation)']
    }
  ];

  const usersCollection = await pb.collections.getOne('users').catch(() => null);
  if (!usersCollection) {
    log.error('Colección "users" no encontrada. Debe ser una auth collection creada manualmente.');
    log.info('Crea la colección "users" como auth collection en el admin de PocketBase');
    process.exit(1);
  }

  let created = 0;
  let updated = 0;

  for (const c of collections) {
    const existing = await pb.collections.getOne(c.name).catch(() => null);
    
    const fields = c.fields.map(f => {
      const field = { ...f };
      if (field.options.collectionId === '') {
        field.options.collectionId = usersCollection.id;
      }
      return field;
    });

    if (existing) {
      await pb.collections.update(existing.id, {
        name: c.name,
        type: c.type,
        listRule: c.listRule,
        viewRule: c.viewRule,
        createRule: c.createRule,
        updateRule: c.updateRule,
        deleteRule: c.deleteRule,
        fields,
        indexes: c.indexes || [],
      });
      log.success(`Colección "${c.name}" actualizada`);
      updated++;
    } else {
      await pb.collections.create({
        name: c.name,
        type: c.type,
        listRule: c.listRule,
        viewRule: c.viewRule,
        createRule: c.createRule,
        updateRule: c.updateRule,
        deleteRule: c.deleteRule,
        fields,
        indexes: c.indexes || [],
      });
      log.success(`Colección "${c.name}" creada`);
      created++;
    }
  }

  log.success(`Colecciones: ${created} nuevas, ${updated} actualizadas`);
  return usersCollection;
}

// ═══════════════════════════════════════════════════════════════
//  MIGRAR USUARIOS
// ═══════════════════════════════════════════════════════════════

async function migrateUsers(db, pb) {
  log.step('Migrando usuarios...');
  
  const snapshot = await db.collection('users').get();
  const userMap = {};
  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const fbUid = doc.id;

    try {
      const existing = await pb.collection('users').getOne(fbUid).catch(() => null);
      
      const userData = cleanNulls({
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
        await pb.collection('users').update(fbUid, userData);
      } else {
        userData.id = fbUid;
        if (!data.email) {
          userData.email = `${fbUid}@anonymous.local`;
        }
        if (!data.passwordHash) {
          userData.password = 'temp_password_change_me';
          userData.passwordConfirm = 'temp_password_change_me';
        }
        await pb.collection('users').create(userData);
      }

      userMap[fbUid] = fbUid;
      migrated++;
    } catch (e) {
      log.warn(`Usuario ${fbUid}: ${e.message}`);
      skipped++;
    }
  }

  log.success(`Usuarios: ${migrated} migrados, ${skipped} omitidos`);
  return userMap;
}

// ═══════════════════════════════════════════════════════════════
//  MIGRAR CONTACTOS
// ═══════════════════════════════════════════════════════════════

async function migrateContacts(db, pb) {
  log.step('Migrando contactos...');
  
  const snapshot = await db.collection('contacts').get();
  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const contactId = doc.id;

    try {
      const contactData = cleanNulls({
        id: contactId,
        requester: data.requesterUid || data.requester,
        target: data.targetUid || data.target,
        status: data.status || 'pending',
      });

      const existing = await pb.collection('contacts').getOne(contactId).catch(() => null);
      if (existing) {
        await pb.collection('contacts').update(contactId, contactData);
      } else {
        await pb.collection('contacts').create(contactData);
      }
      migrated++;
    } catch (e) {
      log.warn(`Contacto ${contactId}: ${e.message}`);
      skipped++;
    }
  }

  log.success(`Contactos: ${migrated} migrados, ${skipped} omitidos`);
}

// ═══════════════════════════════════════════════════════════════
//  MIGRAR CONVERSACIONES
// ═══════════════════════════════════════════════════════════════

async function migrateConversations(db, pb) {
  log.step('Migrando conversaciones...');
  
  const snapshot = await db.collection('conversations').get();
  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const convId = doc.id;

    try {
      const convData = cleanNulls({
        id: convId,
        type: data.type || 'direct',
        participants: data.participants || [],
        name: data.name || '',
        createdBy: data.createdBy || data.createdByUid,
        lastMessage: data.lastMessage || null,
        lastMessageTime: data.lastMessageTime ? timestampToISO(data.lastMessageTime) : null,
      });

      const existing = await pb.collection('conversations').getOne(convId).catch(() => null);
      if (existing) {
        await pb.collection('conversations').update(convId, convData);
      } else {
        await pb.collection('conversations').create(convData);
      }
      migrated++;
    } catch (e) {
      log.warn(`Conversación ${convId}: ${e.message}`);
      skipped++;
    }
  }

  log.success(`Conversaciones: ${migrated} migradas, ${skipped} omitidas`);
}

// ═══════════════════════════════════════════════════════════════
//  DESCARGAR ARCHIVO DE FIREBASE STORAGE
// ═══════════════════════════════════════════════════════════════

async function downloadFirebaseFile(bucket, gsUrl, filename) {
  if (!gsUrl) return null;
  
  const gsMatch = gsUrl.match(/gs:\/\/[^/]+\/(.+)/) || gsUrl.match(/firebasestorage\.app\/[^\?]+\?[^/]+\/(.+)/);
  let filePath;
  
  if (gsMatch) {
    filePath = gsMatch[1];
  } else {
    const url = new URL(gsUrl);
    const pathParts = url.pathname.split('/');
    const oIndex = pathParts.indexOf('o');
    if (oIndex >= 0) {
      filePath = decodeURIComponent(pathParts.slice(oIndex + 1).join('/'));
    } else {
      filePath = decodeURIComponent(url.pathname.substring(1));
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

    const destFile = createReadStream(localPath);
    await file.download({ destination: localPath });
    return localPath;
  } catch (e) {
    log.warn(`No se pudo descargar: ${filePath} - ${e.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
//  MIGRAR MENSAJES
// ═══════════════════════════════════════════════════════════════

async function migrateMessages(db, pb, bucket) {
  log.step('Migrando mensajes...');
  
  const snapshot = await db.collection('messages').get();
  const total = snapshot.size;
  let migrated = 0;
  let skipped = 0;
  let filesDownloaded = 0;

  log.info(`Total mensajes: ${total}`);

  for (let i = 0; i < snapshot.docs.length; i++) {
    const doc = snapshot.docs[i];
    const data = doc.data();
    const msgId = doc.id;

    try {
      const msgData = {
        id: msgId,
        conversation: data.conversationId || data.conversation,
        text: data.text || '',
        user: data.uid || data.user,
        status: data.status || 'sent',
        reactions: data.reactions || {},
        replyTo: data.replyTo?.id || data.replyTo || null,
        replyToUserName: data.replyTo?.user || '',
      };

      const existing = await pb.collection('messages').getOne(msgId).catch(() => null);

      if (existing) {
        await pb.collection('messages').update(msgId, cleanNulls(msgData));
      } else {
        await pb.collection('messages').create(cleanNulls(msgData));
      }

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

// ═══════════════════════════════════════════════════════════════
//  MIGRAR POSTS
// ═══════════════════════════════════════════════════════════════

async function migratePosts(db, pb) {
  log.step('Migrando publicaciones...');
  
  const snapshot = await db.collection('posts').get();
  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const postId = doc.id;

    try {
      const postData = cleanNulls({
        id: postId,
        uid: data.uid,
        text: data.text || '',
        likes: data.likes || [],
        comments: data.comments || [],
      });

      const existing = await pb.collection('posts').getOne(postId).catch(() => null);
      if (existing) {
        await pb.collection('posts').update(postId, postData);
      } else {
        await pb.collection('posts').create(postData);
      }
      migrated++;
    } catch (e) {
      log.warn(`Post ${postId}: ${e.message}`);
      skipped++;
    }
  }

  log.success(`Posts: ${migrated} migrados, ${skipped} omitidos`);
}

// ═══════════════════════════════════════════════════════════════
//  MIGRAR STORIES
// ═══════════════════════════════════════════════════════════════

async function migrateStories(db, pb) {
  log.step('Migrando estados (stories)...');
  
  const snapshot = await db.collection('stories').get();
  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const storyId = doc.id;

    try {
      const storyData = cleanNulls({
        id: storyId,
        uid: data.uid,
        type: data.type || 'image',
        text: data.text || '',
        expiresAt: data.expiresAt ? timestampToISO(data.expiresAt) : null,
        views: data.views || [],
      });

      const existing = await pb.collection('stories').getOne(storyId).catch(() => null);
      if (existing) {
        await pb.collection('stories').update(storyId, storyData);
      } else {
        await pb.collection('stories').create(storyData);
      }
      migrated++;
    } catch (e) {
      log.warn(`Story ${storyId}: ${e.message}`);
      skipped++;
    }
  }

  log.success(`Stories: ${migrated} migrados, ${skipped} omitidos`);
}

// ═══════════════════════════════════════════════════════════════
//  MIGRAR PRESENCE
// ═══════════════════════════════════════════════════════════════

async function migratePresence(db, pb) {
  log.step('Migrando presencia...');
  
  const snapshot = await db.collection('presence').get();
  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const presenceId = doc.id;

    try {
      const presenceData = cleanNulls({
        user: data.uid || presenceId,
        online: data.online || false,
        lastSeen: data.lastSeen ? timestampToISO(data.lastSeen) : null,
      });

      const existing = await pb.collection('presence').getFirstListItem(`user = "${presenceData.user}"`).catch(() => null);
      if (existing) {
        await pb.collection('presence').update(existing.id, presenceData);
      } else {
        await pb.collection('presence').create(presenceData);
      }
      migrated++;
    } catch (e) {
      log.warn(`Presence ${presenceId}: ${e.message}`);
      skipped++;
    }
  }

  log.success(`Presence: ${migrated} migrados, ${skipped} omitidos`);
}

// ═══════════════════════════════════════════════════════════════
//  MIGRAR TYPING
// ═══════════════════════════════════════════════════════════════

async function migrateTyping(db, pb) {
  log.step('Migrando typing indicators...');
  
  const snapshot = await db.collection('typing').get();
  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const typingId = doc.id;

    try {
      const typingData = cleanNulls({
        conversation: typingId,
        typers: data,
      });

      const existing = await pb.collection('typing').getFirstListItem(`conversation = "${typingId}"`).catch(() => null);
      if (existing) {
        await pb.collection('typing').update(existing.id, typingData);
      } else {
        await pb.collection('typing').create(typingData);
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

  // Init
  const { db, storage, bucket } = await initFirebase();
  const pb = await initPocketBase();

  // Create collections
  const usersCollection = await createCollections(pb);

  // Migrate data
  const userMap = await migrateUsers(db, pb);
  await migrateContacts(db, pb);
  await migrateConversations(db, pb);
  await migrateMessages(db, pb, bucket);
  await migratePosts(db, pb);
  await migrateStories(db, pb);
  await migratePresence(db, pb);
  await migrateTyping(db, pb);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  log.success(`MIGRACIÓN COMPLETADA en ${elapsed}s`);
  console.log('='.repeat(60));
  
  log.info('');
  log.info('NOTAS IMPORTANTES:');
  log.info('1. Los usuarios tienen contraseña temporal: temp_password_change_me');
  log.info('   (Los que usaban Google auth deben re-autenticarse)');
  log.info('2. Los archivos de Storage NO se migraron automáticamente.');
  log.info('   Las URLs de Firebase Storage seguirán funcionando mientras');
  log.info('   el proyecto Firebase esté activo.');
  log.info('3. Revisa las reglas API en el admin de PocketBase.');
  log.info('4. Configura Google OAuth2 en Settings > OAuth2.');
}

main().catch(e => {
  log.error(`Error fatal: ${e.message}`);
  console.error(e);
  process.exit(1);
});
