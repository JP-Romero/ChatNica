// ═══════════════════════════════════════════════════════════════
//  app.js — ChatNica
//  Auth: Google / Email-Password / Invitado
//  Features: Perfiles persistentes · Typing indicators · Presencia
//  · Reacciones · Responder · Compresión de imágenes · Paginación
//  · FCM · Actualizaciones incrementales del DOM
// ═══════════════════════════════════════════════════════════════

import {
  db, auth, storage, messaging, googleProvider, VAPID_KEY,
  collection, addDoc, query, orderBy, where, limitToLast,
  onSnapshot, serverTimestamp, doc, setDoc, getDoc, updateDoc,
  deleteField, getDocs, endBefore, arrayUnion, arrayRemove, Timestamp,
  ref, uploadBytes, getDownloadURL,
  signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInAnonymously, signOut, onAuthStateChanged, updateProfile,
  getToken, onMessage
} from './firebase-config.js';

// ─────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────
const MESSAGES_LIMIT       = 40;
const TYPING_CLEAR_MS      = 3500;
const PRESENCE_INTERVAL_MS = 55_000;
const PRESENCE_STALE_MS    = 6 * 60_000;
const MAX_FILE_MB          = 5;
const ALLOWED_TYPES        = ['image/jpeg','image/png','image/gif','image/webp'];
const AVATAR_COLORS = [
  '#60A5FA','#F87171','#34D399','#FBBF24',
  '#A78BFA','#F472B6','#2DD4BF','#FB923C'
];

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
const S = {
  user:        null,
  profile:     null,
  channel:     'general',
  unsubMsgs:   null,
  unsubTyping: null,
  unsubPres:   null,
  replyTo:     null,
  isTabActive: true,
  unread:      {},
  firstSnap:   true,
  oldestDoc:   null,
  hasMore:     false,
  presTimer:   null,
  typingTimer: null,
  msgEls:      new Map(),
};

// ─────────────────────────────────────────────
//  DOM REFS
// ─────────────────────────────────────────────
const $ = id => document.getElementById(id);
const D = {
  loadingScreen:  $('loading-screen'),
  authScreen:     $('auth-screen'),
  chatScreen:     $('chat-screen'),
  loginView:      $('login-view'),
  registerView:   $('register-view'),
  loginEmail:     $('login-email'),
  loginPassword:  $('login-password'),
  loginBtn:       $('login-btn'),
  loginError:     $('login-error'),
  btnGoogle:      $('btn-google'),
  btnGuest:       $('btn-guest'),
  showRegister:   $('show-register'),
  regName:        $('reg-name'),
  regEmail:       $('reg-email'),
  regPassword:    $('reg-password'),
  regBtn:         $('reg-btn'),
  regError:       $('reg-error'),
  showLogin:      $('show-login'),
  headerAvatar:   $('header-avatar'),
  headerName:     $('header-name'),
  onlineCount:    $('online-count'),
  connStatus:     $('connection-status'),
  btnLogout:      $('btn-logout'),
  channelsBar:    $('channels-bar'),
  messages:       $('messages-container'),
  emptyState:     $('empty-state'),
  typingRow:      $('typing-indicator'),
  typingText:     $('typing-text'),
  loadMoreBtn:    $('load-more-btn'),
  replyPreview:   $('reply-preview'),
  replyUser:      $('reply-user'),
  replyText:      $('reply-text'),
  cancelReply:    $('cancel-reply'),
  msgForm:        $('message-form'),
  msgInput:       $('message-input'),
  imageInput:     $('image-input'),
  btnSend:        $('btn-send'),
  sendIcon:       $('send-icon'),
  sendLoading:    $('send-loading'),
  filePreview:    $('file-preview'),
  filePreviewName:$('file-preview-name'),
  fileClear:      $('file-clear-btn'),
  pendingRow:     $('pending-indicator'),
  pendingCount:   $('pending-count'),
  reactionPopover:$('reaction-popover'),
  toast:          $('toast'),
  toastMsg:       $('toast-message'),
};

// ─────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────
const esc = str => {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[m])
  );
};

const getUserColor = uid => {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = uid.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

const getInitials = name => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
};

const fmtTime = ts => {
  if (!ts?.toDate) return '...';
  return new Date(ts.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const isNearBottom = () => {
  const c = D.messages;
  return (c.scrollHeight - c.scrollTop - c.clientHeight) < 130;
};

const scrollBottom = () => { D.messages.scrollTop = D.messages.scrollHeight; };

async function compressImage(file, maxW = 1280, quality = 0.82) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(b => resolve(b || file), file.type, quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  if (user) {
    S.user    = user;
    S.profile = await ensureProfile(user);
    showScreen('chat');
    startSession();
  } else {
    S.user = S.profile = null;
    stopSession();
    showScreen('auth');
  }
});

const loginWithGoogle = async () => {
  setAuthBusy(true, 'google');
  try { await signInWithPopup(auth, googleProvider); }
  catch (e) { showAuthError('login', friendlyError(e)); setAuthBusy(false, 'google'); }
};

const loginWithEmail = async () => {
  const em = D.loginEmail.value.trim(), pw = D.loginPassword.value;
  if (!em || !pw) return showAuthError('login', 'Completa todos los campos.');
  setAuthBusy(true, 'login');
  try { await signInWithEmailAndPassword(auth, em, pw); }
  catch (e) { showAuthError('login', friendlyError(e)); setAuthBusy(false, 'login'); }
};

const registerWithEmail = async () => {
  const name = D.regName.value.trim(),
        em   = D.regEmail.value.trim(),
        pw   = D.regPassword.value;
  if (!name || !em || !pw) return showAuthError('reg', 'Completa todos los campos.');
  if (pw.length < 6) return showAuthError('reg', 'La contraseña necesita mínimo 6 caracteres.');
  setAuthBusy(true, 'reg');
  try {
    const { user } = await createUserWithEmailAndPassword(auth, em, pw);
    await updateProfile(user, { displayName: name });
    S.user = auth.currentUser;
  } catch (e) { showAuthError('reg', friendlyError(e)); setAuthBusy(false, 'reg'); }
};

const loginAsGuest = async () => {
  setAuthBusy(true, 'guest');
  try { await signInAnonymously(auth); }
  catch (e) { showAuthError('login', friendlyError(e)); setAuthBusy(false, 'guest'); }
};

const logout = async () => {
  stopSession();
  await setPresenceOffline();
  await signOut(auth);
};

const friendlyError = e => ({
  'auth/user-not-found':        'No existe una cuenta con ese correo.',
  'auth/wrong-password':        'Contraseña incorrecta.',
  'auth/invalid-credential':    'Correo o contraseña incorrectos.',
  'auth/email-already-in-use':  'Ese correo ya está registrado.',
  'auth/invalid-email':         'Correo inválido.',
  'auth/too-many-requests':     'Demasiados intentos. Espera un momento.',
  'auth/popup-closed-by-user':  'Ventana cerrada. Intenta de nuevo.',
  'auth/network-request-failed':'Sin conexión. Revisa tu red.',
  'auth/api-key-not-valid':     '⚠️ Configura tus credenciales de Firebase en firebase-config.js',
}[e.code] || e.message || 'Error desconocido.');

// ─────────────────────────────────────────────
//  PROFILES
// ─────────────────────────────────────────────
async function ensureProfile(user) {
  const pRef = doc(db, 'users', user.uid);
  const snap = await getDoc(pRef);
  const name = user.displayName
    || user.email?.split('@')[0]
    || `Invitado_${user.uid.slice(0,5)}`;

  if (!snap.exists()) {
    const p = {
      displayName: name,
      email:       user.email || null,
      photoURL:    user.photoURL || null,
      color:       getUserColor(user.uid),
      isAnonymous: user.isAnonymous,
      createdAt:   serverTimestamp(),
      lastSeen:    serverTimestamp()
    };
    await setDoc(pRef, p);
    return { ...p, displayName: name };
  }

  const data  = snap.data();
  const patch = {};
  if (user.displayName && user.displayName !== data.displayName) patch.displayName = user.displayName;
  if (user.photoURL    && user.photoURL    !== data.photoURL)    patch.photoURL    = user.photoURL;
  if (Object.keys(patch).length) await updateDoc(pRef, patch);
  return { ...data, ...patch };
}

// ─────────────────────────────────────────────
//  SESSION LIFECYCLE
// ─────────────────────────────────────────────
function startSession() {
  updateHeader();
  updateConnStatus();
  loadMessages();
  subscribePresence();
  updatePresence();
  S.presTimer = setInterval(updatePresence, PRESENCE_INTERVAL_MS);
  setupFCM();
}

function stopSession() {
  S.unsubMsgs?.();
  S.unsubTyping?.();
  S.unsubPres?.();
  S.unsubMsgs = S.unsubTyping = S.unsubPres = null;
  clearInterval(S.presTimer);
  clearTimeout(S.typingTimer);
  S.msgEls.clear();
  S.firstSnap = true;
  S.oldestDoc = null;
  S.hasMore   = false;
}

// ─────────────────────────────────────────────
//  UI
// ─────────────────────────────────────────────
function showScreen(name) {
  D.loadingScreen.classList.toggle('hidden', name !== 'loading');
  D.authScreen.classList.toggle('hidden',    name !== 'auth');
  D.chatScreen.classList.toggle('hidden',    name !== 'chat');
  D.btnLogout.classList.toggle('hidden',     name !== 'chat');
  if (name === 'auth') showAuthView('login');
}

function showAuthView(v) {
  D.loginView.classList.toggle('hidden',    v !== 'login');
  D.registerView.classList.toggle('hidden', v !== 'register');
  clearAuthErrors();
}

function updateHeader() {
  const p = S.profile;
  if (!p) return;
  D.headerName.textContent = p.displayName;
  if (p.photoURL) {
    D.headerAvatar.innerHTML = `<img src="${esc(p.photoURL)}" alt="" class="w-full h-full object-cover rounded-full">`;
    D.headerAvatar.style.background = 'transparent';
  } else {
    D.headerAvatar.textContent   = getInitials(p.displayName);
    D.headerAvatar.style.background = p.color;
  }
}

const showAuthError = (f, msg) => {
  const el = f === 'login' ? D.loginError : D.regError;
  el.textContent = msg;
  el.classList.remove('hidden');
};

const clearAuthErrors = () => {
  [D.loginError, D.regError].forEach(el => {
    el.textContent = '';
    el.classList.add('hidden');
  });
};

function setAuthBusy(busy, which) {
  const map = {
    google: [D.btnGoogle,  busy ? 'Conectando…'  : 'Continuar con Google'],
    login:  [D.loginBtn,   busy ? 'Entrando…'    : 'Iniciar sesión'],
    reg:    [D.regBtn,     busy ? 'Creando…'      : 'Crear cuenta'],
    guest:  [D.btnGuest,   null],
  };
  const [el, label] = map[which] || [];
  if (!el) return;
  el.disabled = busy;
  if (label) el.textContent = label;
}

// ─────────────────────────────────────────────
//  CHANNELS
// ─────────────────────────────────────────────
function switchChannel(id) {
  if (id === S.channel) return;
  setTyping(false);
  S.unsubMsgs?.();
  S.unsubTyping?.();
  S.channel   = id;
  S.firstSnap = true;
  S.oldestDoc = null;
  S.msgEls.clear();
  clearReply();
  clearFilePreview();
  D.msgInput.value = '';

  document.querySelectorAll('.channel-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.channel === id);
    if (b.dataset.channel === id) b.querySelector('.ch-badge')?.remove();
  });
  S.unread[id] = 0;
  loadMessages();
}

function markUnread(chId) {
  if (chId === S.channel && S.isTabActive) return;
  S.unread[chId] = (S.unread[chId] || 0) + 1;
  const btn = document.querySelector(`.channel-btn[data-channel="${chId}"]`);
  if (!btn) return;
  let badge = btn.querySelector('.ch-badge');
  if (!badge) { badge = document.createElement('span'); badge.className = 'ch-badge'; btn.appendChild(badge); }
  badge.textContent = S.unread[chId] > 9 ? '9+' : S.unread[chId];
}

// ─────────────────────────────────────────────
//  MESSAGES
// ─────────────────────────────────────────────
function loadMessages() {
  D.messages.innerHTML = '';
  D.messages.appendChild(D.emptyState);
  D.emptyState.classList.remove('hidden');
  D.loadMoreBtn.classList.add('hidden');
  subscribeTyping();

  const q = query(
    collection(db, 'messages'),
    where('channel', '==', S.channel),
    orderBy('timestamp', 'asc'),
    limitToLast(MESSAGES_LIMIT)
  );

  S.unsubMsgs = onSnapshot(q, snap => {
    const hasPending = snap.metadata.hasPendingWrites;
    const pendingN   = snap.docs.filter(d => d.metadata.hasPendingWrites).length;
    D.pendingRow.classList.toggle('hidden', !hasPending);
    if (hasPending) D.pendingCount.textContent = pendingN || '...';

    if (S.firstSnap) {
      S.firstSnap = false;
      S.msgEls.clear();
      D.messages.innerHTML = '';

      if (snap.empty) {
        D.messages.appendChild(D.emptyState);
        D.emptyState.classList.remove('hidden');
        return;
      }
      D.emptyState.classList.add('hidden');

      snap.forEach(d => {
        const el = buildMsgEl(d);
        D.messages.appendChild(el);
        S.msgEls.set(d.id, el);
      });

      S.oldestDoc = snap.docs[0];
      S.hasMore   = snap.docs.length >= MESSAGES_LIMIT;
      D.loadMoreBtn.classList.toggle('hidden', !S.hasMore);
      scrollBottom();
      return;
    }

    // Incremental updates
    snap.docChanges().forEach(change => {
      if (change.type === 'added') {
        if (S.msgEls.has(change.doc.id)) return;
        D.emptyState.classList.add('hidden');
        const el = buildMsgEl(change.doc);
        D.messages.appendChild(el);
        S.msgEls.set(change.doc.id, el);
        const isOwn = change.doc.data().uid === S.user.uid;
        if (!isOwn) markUnread(S.channel);
        if (!isOwn && !S.isTabActive) {
          const total = Object.values(S.unread).reduce((a,b)=>a+b,0);
          if (total) document.title = `(${total}) 💬 ChatNica`;
        }
        if (isOwn || isNearBottom()) scrollBottom();

      } else if (change.type === 'modified') {
        const old = S.msgEls.get(change.doc.id);
        if (old) {
          const fresh = buildMsgEl(change.doc);
          old.replaceWith(fresh);
          S.msgEls.set(change.doc.id, fresh);
        }
      }
    });
  }, err => {
    console.error('[ChatNica] snapshot error:', err);
    if (err.code === 'permission-denied') showToast('Error de permisos. Revisa las Firestore Rules.');
  });
}

async function loadOlderMessages() {
  if (!S.oldestDoc || !S.hasMore) return;
  D.loadMoreBtn.disabled = true;
  D.loadMoreBtn.textContent = 'Cargando…';
  try {
    const q = query(
      collection(db, 'messages'),
      where('channel', '==', S.channel),
      orderBy('timestamp', 'asc'),
      endBefore(S.oldestDoc),
      limitToLast(MESSAGES_LIMIT)
    );
    const snap = await getDocs(q);
    if (snap.empty) { S.hasMore = false; D.loadMoreBtn.classList.add('hidden'); return; }

    const prevH = D.messages.scrollHeight;
    const frag  = document.createDocumentFragment();
    snap.forEach(d => {
      if (!S.msgEls.has(d.id)) {
        const el = buildMsgEl(d);
        frag.appendChild(el);
        S.msgEls.set(d.id, el);
      }
    });
    D.messages.insertBefore(frag, D.messages.firstChild);
    D.messages.scrollTop += D.messages.scrollHeight - prevH;

    S.oldestDoc = snap.docs[0];
    S.hasMore   = snap.docs.length >= MESSAGES_LIMIT;
    D.loadMoreBtn.classList.toggle('hidden', !S.hasMore);
  } catch (e) { console.error('[ChatNica] loadOlder:', e); }
  finally { D.loadMoreBtn.disabled = false; D.loadMoreBtn.textContent = '↑ Mensajes anteriores'; }
}

async function sendMessage() {
  const text = D.msgInput.value.trim();
  const file = D.imageInput.files[0];
  if ((!text && !file) || !S.user) return;

  if (file) {
    if (!ALLOWED_TYPES.includes(file.type)) return alert('Solo imágenes (JPG, PNG, GIF, WebP).');
    if (file.size > MAX_FILE_MB * 1024 * 1024) return alert(`Máximo ${MAX_FILE_MB} MB.`);
  }

  D.btnSend.disabled = true;
  D.sendIcon.classList.add('hidden');
  D.sendLoading.classList.remove('hidden');

  try {
    let imageUrl = null;
    if (file) {
      const blob   = await compressImage(file);
      const sRef   = ref(storage, `chats/${S.channel}/${Date.now()}_${file.name}`);
      const result = await uploadBytes(sRef, blob);
      imageUrl = await getDownloadURL(result.ref);
    }

    const msg = {
      text:      text || null,
      image:     imageUrl,
      user:      S.profile?.displayName || 'Anónimo',
      photoURL:  S.profile?.photoURL || null,
      uid:       S.user.uid,
      color:     S.profile?.color || getUserColor(S.user.uid),
      channel:   S.channel,
      timestamp: serverTimestamp(),
      reactions: {},
      replyTo:   S.replyTo || null
    };

    D.msgInput.value = '';
    clearFilePreview();
    clearReply();
    setTyping(false);
    await addDoc(collection(db, 'messages'), msg);
  } catch (e) {
    console.error('[ChatNica] send:', e);
    alert('Error al enviar: ' + e.message);
  } finally {
    D.btnSend.disabled = false;
    D.sendIcon.classList.remove('hidden');
    D.sendLoading.classList.add('hidden');
  }
}

// ─────────────────────────────────────────────
//  MESSAGE ELEMENT BUILDER
// ─────────────────────────────────────────────
function buildMsgEl(msgDoc) {
  const d     = msgDoc.data();
  const id    = msgDoc.id;
  const isOwn = d.uid === S.user.uid;
  const color = d.color || getUserColor(d.uid);
  const name  = esc(d.user);

  const wrap = document.createElement('div');
  wrap.className = `msg-wrapper flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2`;
  wrap.dataset.msgId = id;

  // Avatar
  const avatarHTML = isOwn ? '' : `
    <div class="msg-avatar flex-shrink-0" style="background:${color}">
      ${d.photoURL
        ? `<img src="${esc(d.photoURL)}" alt="" class="w-full h-full object-cover rounded-full">`
        : getInitials(d.user)}
    </div>`;

  // Reply context
  const replyHTML = d.replyTo ? `
    <div class="reply-ctx">
      <span class="reply-ctx-name">${esc(d.replyTo.user)}</span>
      <span class="reply-ctx-text">${esc((d.replyTo.text || '📷').slice(0, 80))}</span>
    </div>` : '';

  // Image
  const imgHTML = d.image
    ? `<img src="${esc(d.image)}" class="msg-img" alt="imagen" data-fullurl="${esc(d.image)}">`
    : '';

  // Reactions
  const reactHTML = buildReactHTML(d.reactions || {}, id);

  // Action buttons
  const actBtns = `
    <div class="msg-actions ${isOwn ? 'order-first mr-1' : 'order-last ml-1'}">
      <button class="msg-act-btn react-trigger" data-msg-id="${id}" title="Reaccionar">😊</button>
      <button class="msg-act-btn reply-trigger"
        data-msg-id="${id}"
        data-msg-text="${esc(d.text || '')}"
        data-msg-user="${name}"
        title="Responder">↩</button>
    </div>`;

  wrap.innerHTML = `
    ${avatarHTML}
    <div class="msg-bubble ${isOwn ? 'own' : 'other'}" style="${!isOwn ? `--c:${color}` : ''}">
      ${replyHTML}
      ${!isOwn ? `<div class="msg-name" style="color:${color}">${name}</div>` : ''}
      ${imgHTML}
      ${d.text ? `<div class="msg-text">${esc(d.text)}</div>` : ''}
      <div class="msg-foot">
        <span class="msg-time">${fmtTime(d.timestamp)}</span>
        ${isOwn ? '<span class="msg-tick">✓✓</span>' : ''}
      </div>
      ${reactHTML}
    </div>
    ${actBtns}`;

  // Image → open full
  wrap.querySelectorAll('img[data-fullurl]').forEach(img => {
    img.addEventListener('click', () => window.open(img.dataset.fullurl, '_blank', 'noopener,noreferrer'));
  });

  // Long press on mobile
  let pt;
  wrap.addEventListener('touchstart', () => { pt = setTimeout(() => showPickerFor(id, wrap), 500); }, { passive: true });
  wrap.addEventListener('touchend',   () => clearTimeout(pt), { passive: true });

  return wrap;
}

function buildReactHTML(reactions, msgId) {
  const entries = Object.entries(reactions).filter(([, uids]) => uids.length);
  if (!entries.length) return '';
  return `<div class="react-bar">${
    entries.map(([emoji, uids]) => {
      const mine = uids.includes(S.user.uid);
      return `<button class="react-chip${mine ? ' mine' : ''}" data-emoji="${emoji}" data-msg-id="${msgId}"
        title="${uids.length} ${uids.length === 1 ? 'reacción' : 'reacciones'}">${emoji} ${uids.length}</button>`;
    }).join('')
  }</div>`;
}

// ─────────────────────────────────────────────
//  REPLY
// ─────────────────────────────────────────────
function setReplyTo(id, text, user) {
  S.replyTo = { id, text, user };
  D.replyUser.textContent = user;
  D.replyText.textContent = text?.slice(0, 100) || '📷 Imagen';
  D.replyPreview.classList.remove('hidden');
  D.msgInput.focus();
}

function clearReply() {
  S.replyTo = null;
  D.replyPreview.classList.add('hidden');
}

// ─────────────────────────────────────────────
//  REACTIONS
// ─────────────────────────────────────────────
let pickerTarget = null;

function showPickerFor(msgId, anchor) {
  pickerTarget = msgId;
  const pop  = D.reactionPopover;
  pop.classList.remove('hidden');
  const rect = anchor.getBoundingClientRect();
  const pw   = 224;
  let left   = rect.left + rect.width / 2 - pw / 2;
  left = Math.max(6, Math.min(left, window.innerWidth - pw - 6));
  pop.style.left = left + 'px';
  pop.style.top  = (rect.top + window.scrollY - 58) + 'px';
}

const hidePicker = () => { D.reactionPopover.classList.add('hidden'); pickerTarget = null; };

async function toggleReaction(msgId, emoji) {
  hidePicker();
  const uid    = S.user.uid;
  const msgRef = doc(db, 'messages', msgId);
  try {
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    const curr = snap.data().reactions?.[emoji] || [];
    const op   = curr.includes(uid) ? arrayRemove(uid) : arrayUnion(uid);
    await updateDoc(msgRef, { [`reactions.${emoji}`]: op });
  } catch (e) { console.error('[ChatNica] reaction:', e); }
}

// ─────────────────────────────────────────────
//  TYPING INDICATOR
// ─────────────────────────────────────────────
function onType() {
  setTyping(true);
  clearTimeout(S.typingTimer);
  S.typingTimer = setTimeout(() => setTyping(false), TYPING_CLEAR_MS);
}

async function setTyping(active) {
  if (!S.user || !S.profile) return;
  const tRef = doc(db, 'typing', S.channel);
  try {
    if (active) {
      const data = { [S.user.uid]: { name: S.profile.displayName, ts: serverTimestamp() } };
      await updateDoc(tRef, data).catch(() => setDoc(tRef, data, { merge: true }));
    } else {
      await updateDoc(tRef, { [S.user.uid]: deleteField() }).catch(() => {});
    }
  } catch (e) { /* non-critical */ }
}

function subscribeTyping() {
  S.unsubTyping?.();
  S.unsubTyping = onSnapshot(doc(db, 'typing', S.channel), snap => {
    if (!snap.exists()) { D.typingRow.classList.add('hidden'); return; }
    const stale = Date.now() - 5500;
    const typers = Object.entries(snap.data())
      .filter(([uid, v]) => uid !== S.user.uid && (v.ts?.toMillis?.() || 0) > stale)
      .map(([, v]) => v.name);

    D.typingRow.classList.toggle('hidden', typers.length === 0);
    if (typers.length) {
      D.typingText.textContent = typers.length === 1
        ? `${typers[0]} está escribiendo`
        : typers.length === 2
          ? `${typers[0]} y ${typers[1]} están escribiendo`
          : 'Varios están escribiendo';
    }
  });
}

// ─────────────────────────────────────────────
//  PRESENCE
// ─────────────────────────────────────────────
async function updatePresence() {
  if (!S.user || !S.profile) return;
  await setDoc(doc(db, 'presence', S.user.uid), {
    displayName: S.profile.displayName,
    online: true,
    lastSeen: serverTimestamp()
  }, { merge: true }).catch(() => {});
}

async function setPresenceOffline() {
  if (!S.user) return;
  await updateDoc(doc(db, 'presence', S.user.uid), {
    online: false, lastSeen: serverTimestamp()
  }).catch(() => {});
}

function subscribePresence() {
  S.unsubPres?.();
  const threshold = Timestamp.fromMillis(Date.now() - PRESENCE_STALE_MS);
  const q = query(collection(db, 'presence'), where('lastSeen', '>', threshold));
  S.unsubPres = onSnapshot(q, snap => {
    const n = snap.size;
    D.onlineCount.textContent = n > 0 ? `● ${n} en línea` : '';
    D.onlineCount.style.display = n > 0 ? '' : 'none';
  }, () => {});
}

// ─────────────────────────────────────────────
//  FCM
// ─────────────────────────────────────────────
async function setupFCM() {
  if (!messaging || !S.user || VAPID_KEY === 'YOUR_VAPID_KEY_HERE') return;
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) await updateDoc(doc(db, 'users', S.user.uid), { fcmToken: token }).catch(() => {});
    onMessage(messaging, payload => {
      const { title, body } = payload.notification || {};
      if (title || body) showToast(`${title || ''}: ${body || ''}`);
    });
  } catch (e) { console.warn('[ChatNica] FCM:', e.message); }
}

// ─────────────────────────────────────────────
//  TOAST
// ─────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  D.toastMsg.textContent = msg;
  D.toast.className = 'toast show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { D.toast.className = 'toast'; }, 4000);
}

// ─────────────────────────────────────────────
//  FILE
// ─────────────────────────────────────────────
function onFileChange() {
  const file = D.imageInput.files[0];
  if (!file) return clearFilePreview();
  if (!ALLOWED_TYPES.includes(file.type)) { alert('Solo imágenes (JPG, PNG, GIF, WebP).'); return clearFilePreview(); }
  if (file.size > MAX_FILE_MB * 1024 * 1024) { alert(`Máximo ${MAX_FILE_MB} MB.`); return clearFilePreview(); }
  D.filePreviewName.textContent = file.name;
  D.filePreview.classList.remove('hidden');
}

function clearFilePreview() {
  D.imageInput.value = '';
  D.filePreview.classList.add('hidden');
  D.filePreviewName.textContent = '';
}

// ─────────────────────────────────────────────
//  CONNECTION STATUS
// ─────────────────────────────────────────────
function updateConnStatus() {
  if (navigator.onLine) {
    D.connStatus.textContent = '🟢 En línea';
    D.connStatus.className   = 'text-sm text-green-400 font-medium';
  } else {
    D.connStatus.textContent = '🔴 Sin conexión';
    D.connStatus.className   = 'text-sm text-red-400 font-medium';
  }
}

// ─────────────────────────────────────────────
//  INIT & EVENT LISTENERS
// ─────────────────────────────────────────────
(function init() {
  showScreen('loading');

  // Auth
  D.btnGoogle.addEventListener('click', loginWithGoogle);
  D.loginBtn.addEventListener('click', loginWithEmail);
  D.regBtn.addEventListener('click', registerWithEmail);
  D.btnGuest.addEventListener('click', loginAsGuest);
  D.btnLogout.addEventListener('click', logout);
  D.showRegister.addEventListener('click', () => showAuthView('register'));
  D.showLogin.addEventListener('click',    () => showAuthView('login'));
  [D.loginEmail, D.loginPassword].forEach(el =>
    el.addEventListener('keydown', e => { if (e.key === 'Enter') loginWithEmail(); })
  );

  // Channels
  D.channelsBar.addEventListener('click', e => {
    const btn = e.target.closest('[data-channel]');
    if (btn) switchChannel(btn.dataset.channel);
  });

  // Send
  D.msgForm.addEventListener('submit', e => { e.preventDefault(); sendMessage(); });
  D.msgInput.addEventListener('input', onType);
  D.msgInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // File
  D.imageInput.addEventListener('change', onFileChange);
  D.fileClear.addEventListener('click', clearFilePreview);

  // Load more
  D.loadMoreBtn.addEventListener('click', loadOlderMessages);

  // Reply
  D.cancelReply.addEventListener('click', clearReply);

  // Delegated clicks inside messages
  D.messages.addEventListener('click', e => {
    const replyBtn = e.target.closest('.reply-trigger');
    if (replyBtn) { setReplyTo(replyBtn.dataset.msgId, replyBtn.dataset.msgText, replyBtn.dataset.msgUser); return; }
    const reactBtn = e.target.closest('.react-trigger');
    if (reactBtn) { showPickerFor(reactBtn.dataset.msgId, reactBtn.closest('.msg-wrapper')); return; }
    const chip = e.target.closest('.react-chip');
    if (chip) toggleReaction(chip.dataset.msgId, chip.dataset.emoji);
  });

  // Reaction popover
  D.reactionPopover.addEventListener('click', e => {
    const btn = e.target.closest('[data-emoji]');
    if (btn && pickerTarget) toggleReaction(pickerTarget, btn.dataset.emoji);
  });
  document.addEventListener('click', e => {
    if (!D.reactionPopover.classList.contains('hidden') &&
        !D.reactionPopover.contains(e.target) &&
        !e.target.closest('.react-trigger')) hidePicker();
  });

  // Tab visibility
  window.addEventListener('focus', () => {
    S.isTabActive = true;
    S.unread[S.channel] = 0;
    document.title = '💬 ChatNica';
    document.querySelector(`.channel-btn[data-channel="${S.channel}"] .ch-badge`)?.remove();
  });
  window.addEventListener('blur', () => { S.isTabActive = false; });

  // Connection
  window.addEventListener('online',  updateConnStatus);
  window.addEventListener('offline', updateConnStatus);

  // Cleanup on close
  window.addEventListener('beforeunload', () => {
    setTyping(false);
    setPresenceOffline();
  });
})();
