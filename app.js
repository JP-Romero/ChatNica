// ═══════════════════════════════════════════════════════════════
//  app.js — ChatNica v2
//  Mensajería + Red Social para Nicaragua
// ═══════════════════════════════════════════════════════════════

import {
  db, auth, storage, googleProvider,
  collection, addDoc, deleteDoc, query, orderBy, where, limit,
  onSnapshot, serverTimestamp, doc, setDoc, getDoc, updateDoc,
  deleteField, getDocs, arrayUnion, arrayRemove, Timestamp,
  ref, uploadBytes, getDownloadURL,
  signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInAnonymously, signOut, onAuthStateChanged, updateProfile
} from './firebase-config.js';

// ─────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────
const MSG_LIMIT = 50;
const TYPING_CLEAR_MS = 3500;
const PRESENCE_INTERVAL_MS = 55_000;
const PRESENCE_STALE_MS = 6 * 60_000;
const MAX_FILE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg','image/png','image/gif','image/webp'];
const AVATAR_COLORS = ['#60A5FA','#F87171','#34D399','#FBBF24','#A78BFA','#F472B6','#2DD4BF','#FB923C'];

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
const S = {
  user: null, profile: null,
  activeTab: 'chats',
  currentConv: null,
  unsubConvs: null, unsubMsgs: null, unsubContacts: null,
  unsubFeed: null, unsubStories: null, unsubPresence: null,
  replyTo: null, pendingFile: null,
  msgEls: new Map(),
  presTimer: null, typingTimer: null,
  mediaRecorder: null, audioChunks: [], recInterval: null, recSeconds: 0,
  onlineUsers: new Map(),
  pickerTarget: null,
};

// ─────────────────────────────────────────────
//  DOM REFS
// ─────────────────────────────────────────────
const $ = id => document.getElementById(id);
const D = {
  loadingScreen: $('loading-screen'), authScreen: $('auth-screen'), mainScreen: $('main-screen'),
  loginView: $('login-view'), registerView: $('register-view'),
  loginEmail: $('login-email'), loginPassword: $('login-password'), loginBtn: $('login-btn'), loginError: $('login-error'),
  btnGoogle: $('btn-google'), btnGuest: $('btn-guest'),
  showRegister: $('show-register'), showLogin: $('show-login'),
  regName: $('reg-name'), regEmail: $('reg-email'), regPassword: $('reg-password'),
  regBtn: $('reg-btn'), regError: $('reg-error'),
  headerAvatar: $('header-avatar'), headerTitle: $('header-title'), headerSubtitle: $('header-subtitle'),
  btnNew: $('btn-new'), btnLogout: $('btn-logout'),
  tabChats: $('tab-chats'), tabContacts: $('tab-contacts'), tabFeed: $('tab-feed'), tabProfile: $('tab-profile'),
  convsList: $('conversations-list'), emptyChats: $('empty-chats'),
  contactsSearchInput: $('contacts-search-input'),
  contactsPendingSection: $('contacts-pending-section'), contactsPendingList: $('contacts-pending-list'),
  contactsAcceptedList: $('contacts-accepted-list'), emptyContacts: $('empty-contacts'),
  feedList: $('feed-list'), emptyFeed: $('empty-feed'),
  profileAvatarLarge: $('profile-avatar-large'), profileName: $('profile-name'),
  profileEmail: $('profile-email'), profileBio: $('profile-bio'), profileCity: $('profile-city'),
  btnEditProfile: $('btn-edit-profile'), btnMyStories: $('btn-my-stories'),
  chatView: $('chat-view'), chatBackBtn: $('chat-back-btn'),
  chatHeaderAvatar: $('chat-header-avatar'), chatHeaderName: $('chat-header-name'), chatHeaderStatus: $('chat-header-status'),
  chatInfoBtn: $('chat-info-btn'), chatMessages: $('chat-messages'), emptyChat: $('empty-chat'),
  messageForm: $('message-form'), messageInput: $('message-input'),
  imageInput: $('image-input'), btnSend: $('btn-send'), sendIcon: $('send-icon'), sendLoading: $('send-loading'),
  filePreview: $('file-preview'), filePreviewName: $('file-preview-name'), fileClearBtn: $('file-clear-btn'),
  micBtn: $('mic-btn'), recordingBar: $('recording-bar'), recordingTimer: $('recording-timer'), stopRecBtn: $('stop-rec-btn'),
  replyPreview: $('reply-preview'), replyUser: $('reply-user'), replyText: $('reply-text'), cancelReply: $('cancel-reply'),
  typingIndicator: $('typing-indicator'), typingText: $('typing-text'),
  chatInfoPanel: $('chat-info-panel'), chatInfoBack: $('chat-info-back'), chatInfoContent: $('chat-info-content'),
  modalNewConv: $('modal-new-conv'), modalCreateGroup: $('modal-create-group'),
  modalNewPost: $('modal-new-post'), modalStory: $('modal-story'),
  modalViewStory: $('modal-view-story'), modalEditProfile: $('modal-edit-profile'),
  modalSelectContact: $('modal-select-contact'),
  groupName: $('group-name'), groupMembersSelect: $('group-members-select'), btnCreateGroup: $('btn-create-group'),
  btnNewDirect: $('btn-new-direct'), btnNewGroup: $('btn-new-group'),
  postText: $('post-text'), postImages: $('post-images'), postImagesPreview: $('post-images-preview'), btnPublish: $('btn-publish'),
  storyTypeImage: $('story-type-image'), storyTypeText: $('story-type-text'),
  storyImageSection: $('story-image-section'), storyTextSection: $('story-text-section'),
  storyImageInput: $('story-image-input'), storyImagePreview: $('story-image-preview'),
  storyTextInput: $('story-text-input'), btnPublishStory: $('btn-publish-story'),
  viewStoryBack: $('view-story-back'), viewStoryAvatar: $('view-story-avatar'),
  viewStoryName: $('view-story-name'), viewStoryTime: $('view-story-time'),
  viewStoryContent: $('view-story-content'), viewStoryDelete: $('view-story-delete'),
  editProfileAvatar: $('edit-profile-avatar'), profilePhotoInput: $('profile-photo-input'),
  editName: $('edit-name'), editBio: $('edit-bio'), editCity: $('edit-city'), editDepartment: $('edit-department'),
  btnSaveProfile: $('btn-save-profile'),
  selectContactList: $('select-contact-list'),
  reactionPopover: $('reaction-popover'),
  toast: $('toast'), toastMessage: $('toast-message'),
};

// ─────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────
const esc = str => {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[m]));
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
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const fmtDate = ts => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) return fmtTime(ts);
  if (diff < 172800000) return 'Ayer';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

const fmtTimeAgo = ts => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return fmtDate(ts);
};

const isNearBottom = () => {
  const c = D.chatMessages;
  return (c.scrollHeight - c.scrollTop - c.clientHeight) < 150;
};

const scrollBottom = () => { D.chatMessages.scrollTop = D.chatMessages.scrollHeight; };

const avatarHTML = (photoURL, color, name, sizeClass = '') => {
  if (photoURL) return `<img src="${esc(photoURL)}" alt="" class="w-full h-full object-cover">`;
  return getInitials(name);
};

const convIdForDirect = (uid1, uid2) => {
  return uid1 < uid2 ? `direct_${uid1}_${uid2}` : `direct_${uid2}_${uid1}`;
};

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
//  TOAST
// ─────────────────────────────────────────────
let toastTimer;
const showToast = msg => {
  D.toastMessage.textContent = msg;
  D.toast.className = 'toast show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { D.toast.className = 'toast'; }, 3000);
};

// ─────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────
const friendlyError = e => ({
  'auth/user-not-found': 'No existe una cuenta con ese correo.',
  'auth/wrong-password': 'Contraseña incorrecta.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/email-already-in-use': 'Ese correo ya está registrado.',
  'auth/invalid-email': 'Correo inválido.',
  'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
  'auth/popup-closed-by-user': 'Ventana cerrada. Intenta de nuevo.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu red.',
  'auth/api-key-not-valid': '⚠️ Configura tus credenciales de Firebase.',
  'auth/operation-not-allowed': '⚠️ Habilita este método en la Consola de Firebase.',
}[e.code] || e.message || 'Error desconocido.');

const setAuthBusy = (busy, which) => {
  const map = {
    google: [D.btnGoogle, busy ? 'Conectando…' : 'Continuar con Google'],
    login: [D.loginBtn, busy ? 'Entrando…' : 'Iniciar sesión'],
    reg: [D.regBtn, busy ? 'Creando…' : 'Crear cuenta'],
    guest: [D.btnGuest, null],
  };
  const [el, label] = map[which] || [];
  if (!el) return;
  el.disabled = busy;
  if (label) el.textContent = label;
};

const showAuthError = (view, msg) => {
  const el = view === 'login' ? D.loginError : D.regError;
  el.textContent = msg;
  el.classList.remove('hidden');
};

const clearAuthErrors = () => {
  [D.loginError, D.regError].forEach(el => { el.textContent = ''; el.classList.add('hidden'); });
};

async function ensureProfile(user) {
  const pRef = doc(db, 'users', user.uid);
  const snap = await getDoc(pRef);
  const name = user.displayName || user.email?.split('@')[0] || `Usuario_${user.uid.slice(0,5)}`;
  if (!snap.exists()) {
    const p = {
      displayName: name, email: user.email || null, photoURL: user.photoURL || null,
      color: getUserColor(user.uid), bio: '', city: '', department: '',
      isAnonymous: user.isAnonymous, createdAt: serverTimestamp(), lastSeen: serverTimestamp()
    };
    await setDoc(pRef, p);
    return { ...p, displayName: name };
  }
  const data = snap.data();
  const patch = {};
  if (user.displayName && user.displayName !== data.displayName) patch.displayName = user.displayName;
  if (user.photoURL && user.photoURL !== data.photoURL) patch.photoURL = user.photoURL;
  if (Object.keys(patch).length) await updateDoc(pRef, patch);
  return { ...data, ...patch };
}

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
  const name = D.regName.value.trim(), em = D.regEmail.value.trim(), pw = D.regPassword.value;
  if (!name || !em || !pw) return showAuthError('reg', 'Completa todos los campos.');
  if (pw.length < 6) return showAuthError('reg', 'Mínimo 6 caracteres.');
  setAuthBusy(true, 'reg');
  try {
    const { user } = await createUserWithEmailAndPassword(auth, em, pw);
    await updateProfile(user, { displayName: name });
  } catch (e) { showAuthError('reg', friendlyError(e)); setAuthBusy(false, 'reg'); }
};

const loginAsGuest = async () => {
  setAuthBusy(true, 'guest');
  try { await signInAnonymously(auth); }
  catch (e) { showAuthError('login', friendlyError(e)); setAuthBusy(false, 'guest'); }
};

const logout = async () => {
  stopAllSubscriptions();
  await setPresenceOffline();
  await signOut(auth);
};

// ─────────────────────────────────────────────
//  UI
// ─────────────────────────────────────────────
function showScreen(name) {
  D.loadingScreen.classList.toggle('hidden', name !== 'loading');
  D.authScreen.classList.toggle('hidden', name !== 'auth');
  D.mainScreen.classList.toggle('hidden', name !== 'main');
  if (name === 'auth') showAuthView('login');
}

function showAuthView(v) {
  D.loginView.classList.toggle('hidden', v !== 'login');
  D.registerView.classList.toggle('hidden', v !== 'register');
  clearAuthErrors();
}

function updateHeader() {
  const p = S.profile;
  if (!p) return;
  if (p.photoURL) {
    D.headerAvatar.innerHTML = `<img src="${esc(p.photoURL)}" alt="" class="w-full h-full object-cover">`;
    D.headerAvatar.style.background = 'transparent';
  } else {
    D.headerAvatar.textContent = getInitials(p.displayName);
    D.headerAvatar.style.background = p.color || getUserColor(S.user.uid);
  }
}

function updateProfileTab() {
  const p = S.profile;
  if (!p) return;
  if (p.photoURL) {
    D.profileAvatarLarge.innerHTML = `<img src="${esc(p.photoURL)}" alt="" class="w-full h-full object-cover">`;
    D.profileAvatarLarge.style.background = 'transparent';
  } else {
    D.profileAvatarLarge.textContent = getInitials(p.displayName);
    D.profileAvatarLarge.style.background = p.color || getUserColor(S.user.uid);
  }
  D.profileName.textContent = p.displayName;
  D.profileEmail.textContent = p.email || 'Invitado';
  D.profileBio.textContent = p.bio || '';
  D.profileBio.classList.toggle('hidden', !p.bio);
  D.profileCity.textContent = [p.city, p.department].filter(Boolean).join(', ');
  D.profileCity.classList.toggle('hidden', !p.city && !p.department);
}

// ─────────────────────────────────────────────
//  NAVIGATION
// ─────────────────────────────────────────────
function switchTab(tab) {
  S.activeTab = tab;
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  ['chats','contacts','feed','profile'].forEach(t => {
    const el = $(`tab-${t}`);
    if (t === tab) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });

  const titles = { chats: 'Chats', contacts: 'Contactos', feed: 'Feed', profile: 'Mi Perfil' };
  D.headerTitle.textContent = titles[tab] || 'ChatNica';
  D.headerSubtitle.textContent = '';

  stopAllSubscriptions();
  if (tab === 'chats') subscribeConversations();
  else if (tab === 'contacts') subscribeContacts();
  else if (tab === 'feed') subscribeFeed();
  else if (tab === 'profile') updateProfileTab();
}

// ─────────────────────────────────────────────
//  PRESENCE
// ─────────────────────────────────────────────
async function updatePresence() {
  if (!S.user) return;
  await setDoc(doc(db, 'presence', S.user.uid), {
    displayName: S.profile?.displayName || 'Usuario',
    photoURL: S.profile?.photoURL || null,
    color: S.profile?.color || getUserColor(S.user.uid),
    online: true, lastSeen: serverTimestamp()
  }, { merge: true }).catch(() => {});
}

async function setPresenceOffline() {
  if (!S.user) return;
  await updateDoc(doc(db, 'presence', S.user.uid), {
    online: false, lastSeen: serverTimestamp()
  }).catch(() => {});
}

function subscribePresence() {
  S.unsubPresence?.();
  const threshold = Timestamp.fromMillis(Date.now() - PRESENCE_STALE_MS);
  const q = query(collection(db, 'presence'), where('lastSeen', '>', threshold));
  S.unsubPresence = onSnapshot(q, snap => {
    S.onlineUsers.clear();
    snap.forEach(d => {
      const data = d.data();
      if (data.online) S.onlineUsers.set(d.id, data);
    });
    refreshOnlineIndicators();
  }, () => {});
}

function isOnline(uid) { return S.onlineUsers.has(uid); }

function refreshOnlineIndicators() {
  document.querySelectorAll('.online-dot').forEach(dot => {
    const uid = dot.dataset.uid;
    dot.classList.toggle('hidden', !uid || !isOnline(uid));
  });
  const statusEl = D.chatHeaderStatus;
  if (statusEl && S.currentConv) {
    updateChatHeaderStatus();
  }
}

// ─────────────────────────────────────────────
//  CONTACTS
// ─────────────────────────────────────────────
function subscribeContacts() {
  S.unsubContacts?.();
  const q = query(
    collection(db, 'contacts'),
    where('targetUid', '==', S.user.uid)
  );
  S.unsubContacts = onSnapshot(q, snap => {
    const incoming = [];
    snap.forEach(d => incoming.push({ id: d.id, ...d.data() }));

    const q2 = query(
      collection(db, 'contacts'),
      where('requesterUid', '==', S.user.uid)
    );
    getDocs(q2).then(snap2 => {
      const outgoing = [];
      snap2.forEach(d => outgoing.push({ id: d.id, ...d.data() }));
      renderContacts(incoming, outgoing);
    });
  });
}

function renderContacts(incoming, outgoing) {
  const pending = incoming.filter(c => c.status === 'pending');
  const accepted = incoming.filter(c => c.status === 'accepted');

  D.contactsPendingSection.classList.toggle('hidden', !pending.length);
  if (pending.length) {
    D.contactsPendingList.innerHTML = pending.map(c => contactItemHTML(c, 'incoming-pending')).join('');
  }

  if (accepted.length) {
    D.contactsAcceptedList.innerHTML = accepted.map(c => contactItemHTML(c, 'accepted')).join('');
  }

  D.emptyContacts.classList.toggle('hidden', accepted.length > 0 || pending.length > 0);

  refreshOnlineIndicators();
}

function contactItemHTML(c, type) {
  const otherUid = c.requesterUid === S.user.uid ? c.targetUid : c.requesterUid;
  const color = c.otherColor || getUserColor(otherUid);
  const name = esc(c.otherName || 'Usuario');
  const city = c.otherCity ? esc(c.otherCity) : '';

  const avatarInner = c.otherPhotoURL
    ? `<img src="${esc(c.otherPhotoURL)}" alt="">`
    : getInitials(c.otherName || 'U');

  const online = isOnline(otherUid);
  const onlineDot = `<div class="online-dot${online ? '' : ' hidden'}" data-uid="${otherUid}"></div>`;

  let actions = '';
  if (type === 'incoming-pending') {
    actions = `
      <div class="contact-actions">
        <button class="contact-btn contact-btn-accept" data-action="accept" data-contact-id="${c.id}">Aceptar</button>
        <button class="contact-btn contact-btn-reject" data-action="reject" data-contact-id="${c.id}">Rechazar</button>
      </div>`;
  } else if (type === 'accepted') {
    actions = `
      <div class="contact-actions">
        <button class="contact-btn contact-btn-chat" data-action="chat" data-uid="${otherUid}">💬</button>
      </div>`;
  }

  return `
    <div class="contact-item" data-uid="${otherUid}">
      <div class="contact-avatar" style="background:${color}">
        ${avatarInner}
        ${onlineDot}
      </div>
      <div class="contact-info">
        <div class="contact-name">${name}</div>
        ${city ? `<div class="contact-city">${city}</div>` : ''}
      </div>
      ${actions}
    </div>`;
}

async function sendContactRequest(targetUid) {
  try {
    const contactId = convIdForDirect(S.user.uid, targetUid);
    await setDoc(doc(db, 'contacts', contactId), {
      requesterUid: S.user.uid,
      targetUid,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    showToast('Solicitud enviada');
  } catch (e) { showToast('Error: ' + e.message); }
}

async function acceptContact(contactId) {
  try {
    await updateDoc(doc(db, 'contacts', contactId), { status: 'accepted' });
    showToast('Contacto aceptado');
  } catch (e) { showToast('Error: ' + e.message); }
}

async function rejectContact(contactId) {
  try {
    await deleteDoc(doc(db, 'contacts', contactId));
    showToast('Solicitud rechazada');
  } catch (e) { showToast('Error: ' + e.message); }
}

async function searchUsers(queryStr) {
  if (!queryStr || queryStr.length < 2) return [];
  const q = query(collection(db, 'users'), orderBy('displayName'));
  const snap = await getDocs(q);
  const results = [];
  const lower = queryStr.toLowerCase();
  snap.forEach(d => {
    const data = d.data();
    if (d.id === S.user.uid) return;
    if (data.displayName?.toLowerCase().includes(lower) || data.email?.toLowerCase().includes(lower)) {
      results.push({ uid: d.id, ...data });
    }
  });
  return results.slice(0, 20);
}

async function getAcceptedContacts() {
  const q1 = query(collection(db, 'contacts'), where('requesterUid', '==', S.user.uid), where('status', '==', 'accepted'));
  const q2 = query(collection(db, 'contacts'), where('targetUid', '==', S.user.uid), where('status', '==', 'accepted'));
  const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const contacts = [];
  s1.forEach(d => { const data = d.data(); contacts.push({ uid: data.targetUid, ...data }); });
  s2.forEach(d => { const data = d.data(); contacts.push({ uid: data.requesterUid, ...data }); });
  return contacts;
}

// ─────────────────────────────────────────────
//  CONVERSATIONS
// ─────────────────────────────────────────────
function subscribeConversations() {
  S.unsubConvs?.();
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', S.user.uid),
    orderBy('lastMessageTime', 'desc')
  );
  S.unsubConvs = onSnapshot(q, snap => {
    const convs = [];
    snap.forEach(d => convs.push({ id: d.id, ...d.data() }));
    renderConversations(convs);
  }, err => {
    console.error('[ChatNica] convs error:', err);
  });
}

function renderConversations(convs) {
  D.emptyChats.classList.toggle('hidden', convs.length > 0);
  if (!convs.length) {
    D.convsList.innerHTML = '';
    D.convsList.appendChild(D.emptyChats);
    D.emptyChats.classList.remove('hidden');
    return;
  }
  D.convsList.innerHTML = convs.map(c => convItemHTML(c)).join('');
  refreshOnlineIndicators();
}

function convItemHTML(c) {
  const isGroup = c.type === 'group';
  const otherUid = isGroup ? null : c.participants?.find(p => p !== S.user.uid);
  const otherInfo = isGroup ? null : (S.onlineUsers.get(otherUid) || {});
  const online = isGroup ? false : isOnline(otherUid);

  const name = isGroup ? esc(c.name || 'Grupo') : esc(otherInfo?.displayName || c.name || 'Usuario');
  const lastMsg = c.lastMessage ? esc(c.lastMessage) : 'Sin mensajes';
  const time = c.lastMessageTime ? fmtDate(c.lastMessageTime) : '';

  let avatarInner;
  if (isGroup) {
    avatarInner = c.photoURL
      ? `<img src="${esc(c.photoURL)}" alt="">`
      : getInitials(c.name || 'G');
  } else {
    avatarInner = otherInfo?.photoURL
      ? `<img src="${esc(otherInfo.photoURL)}" alt="">`
      : getInitials(otherInfo?.displayName || 'U');
  }

  const avatarBg = isGroup ? '#004A99' : (otherInfo?.color || getUserColor(otherUid || ''));

  return `
    <div class="conv-item" data-conv-id="${c.id}" data-conv-type="${c.type}">
      <div class="conv-avatar" style="background:${avatarBg}">
        ${avatarInner}
        ${!isGroup ? `<div class="online-dot${online ? '' : ' hidden'}" data-uid="${otherUid}"></div>` : ''}
      </div>
      <div class="conv-info">
        <div class="conv-name">${name}</div>
        <div class="conv-last-msg">${lastMsg}</div>
      </div>
      <div class="conv-meta">
        <span class="conv-time">${time}</span>
      </div>
    </div>`;
}

async function getOrCreateDirectConv(targetUid) {
  const convId = convIdForDirect(S.user.uid, targetUid);
  const convRef = doc(db, 'conversations', convId);
  const snap = await getDoc(convRef);
  if (snap.exists()) return convId;

  const targetSnap = await getDoc(doc(db, 'users', targetUid));
  const targetData = targetSnap.data() || {};

  await setDoc(convRef, {
    type: 'direct',
    participants: [S.user.uid, targetUid],
    name: targetData.displayName || 'Usuario',
    createdBy: S.user.uid,
    createdAt: serverTimestamp(),
    lastMessage: null,
    lastMessageTime: null
  });
  return convId;
}

async function createGroup(name, memberUids) {
  const convRef = doc(collection(db, 'conversations'));
  const participants = [S.user.uid, ...memberUids];
  await setDoc(convRef, {
    type: 'group',
    participants,
    name,
    createdBy: S.user.uid,
    createdAt: serverTimestamp(),
    lastMessage: null,
    lastMessageTime: null
  });
  return convRef.id;
}

// ─────────────────────────────────────────────
//  CHAT VIEW
// ─────────────────────────────────────────────
async function openChat(convId, convData) {
  S.currentConv = { id: convId, ...convData };
  S.msgEls.clear();
  S.replyTo = null;
  D.replyPreview.classList.add('hidden');
  D.messageInput.value = '';
  clearFilePreview();

  const isGroup = convData.type === 'group';
  D.chatHeaderName.textContent = isGroup ? (convData.name || 'Grupo') : (convData.name || 'Usuario');
  updateChatHeaderStatus();

  const avatarBg = isGroup ? '#004A99' : (convData.otherColor || getUserColor(convData.participants?.find(p => p !== S.user.uid) || ''));
  const avatarInner = isGroup
    ? (convData.photoURL ? `<img src="${esc(convData.photoURL)}" alt="">` : getInitials(convData.name || 'G'))
    : (convData.otherPhotoURL ? `<img src="${esc(convData.otherPhotoURL)}" alt="">` : getInitials(convData.name || 'U'));
  D.chatHeaderAvatar.innerHTML = avatarInner;
  D.chatHeaderAvatar.style.background = avatarBg;

  D.chatView.classList.remove('hidden');
  D.bottomNav.classList.add('hidden');

  D.chatMessages.innerHTML = '';
  D.chatMessages.appendChild(D.emptyChat);
  D.emptyChat.classList.remove('hidden');

  loadMessages();
  subscribeTyping();
  updatePresence();
}

function updateChatHeaderStatus() {
  if (!S.currentConv) return;
  const isGroup = S.currentConv.type === 'group';
  if (isGroup) {
    const count = S.currentConv.participants?.length || 0;
    D.chatHeaderStatus.textContent = `${count} participantes`;
  } else {
    const otherUid = S.currentConv.participants?.find(p => p !== S.user.uid);
    D.chatHeaderStatus.textContent = isOnline(otherUid) ? 'En línea' : 'Desconectado';
  }
}

function closeChat() {
  S.unsubMsgs?.();
  S.unsubTyping?.();
  S.currentConv = null;
  S.msgEls.clear();
  S.unsubMsgs = null;
  S.unsubTyping = null;
  D.chatView.classList.add('hidden');
  D.bottomNav.classList.remove('hidden');
}

// ─────────────────────────────────────────────
//  MESSAGES
// ─────────────────────────────────────────────
function loadMessages() {
  if (!S.currentConv) return;
  const q = query(
    collection(db, 'messages'),
    where('conversationId', '==', S.currentConv.id),
    orderBy('timestamp', 'asc'),
    limit(MSG_LIMIT)
  );
  S.unsubMsgs = onSnapshot(q, snap => {
    if (S.msgEls.size === 0 && !snap.empty) {
      D.chatMessages.innerHTML = '';
      D.emptyChat.classList.add('hidden');
      snap.forEach(d => {
        const el = buildMsgEl(d);
        D.chatMessages.appendChild(el);
        S.msgEls.set(d.id, el);
      });
      scrollBottom();
      return;
    }
    snap.docChanges().forEach(change => {
      if (change.type === 'added') {
        if (S.msgEls.has(change.doc.id)) return;
        D.emptyChat?.classList.add('hidden');
        const el = buildMsgEl(change.doc);
        D.chatMessages.appendChild(el);
        S.msgEls.set(change.doc.id, el);
        if (change.doc.data().uid === S.user.uid || isNearBottom()) scrollBottom();
      } else if (change.type === 'modified') {
        const old = S.msgEls.get(change.doc.id);
        if (old) {
          const fresh = buildMsgEl(change.doc);
          old.replaceWith(fresh);
          S.msgEls.set(change.doc.id, fresh);
        }
      }
    });
  });
}

function buildMsgEl(msgDoc) {
  const d = msgDoc.data();
  const id = msgDoc.id;
  const isOwn = d.uid === S.user.uid;
  const color = d.color || getUserColor(d.uid);
  const isGroup = S.currentConv?.type === 'group';

  const wrap = document.createElement('div');
  wrap.className = `msg-wrapper ${isOwn ? 'own' : 'other'}`;
  wrap.dataset.msgId = id;

  const avatarHTML = (!isOwn && isGroup) ? `
    <div class="msg-avatar" style="background:${color}">
      ${d.photoURL ? `<img src="${esc(d.photoURL)}" alt="">` : getInitials(d.user)}
    </div>` : '';

  const replyHTML = d.replyTo ? `
    <div class="reply-ctx">
      <div class="reply-ctx-name">${esc(d.replyTo.user)}</div>
      <div class="reply-ctx-text">${esc(d.replyTo.text || '📷 Imagen')}</div>
    </div>` : '';

  const imgHTML = d.image ? `<img src="${esc(d.image)}" class="msg-img" alt="imagen" data-fullurl="${esc(d.image)}">` : '';
  const audioHTML = d.audio ? `<audio src="${esc(d.audio)}" controls class="msg-audio"></audio>` : '';

  const reactHTML = buildReactHTML(d.reactions || {}, id);

  const tickHTML = isOwn ? `<span class="msg-tick">✓</span>` : '';

  const actBtns = `
    <div class="msg-actions">
      <button class="msg-act-btn react-trigger" data-msg-id="${id}" title="Reaccionar">😊</button>
      <button class="msg-act-btn reply-trigger" data-msg-id="${id}" data-msg-text="${esc(d.text || '')}" data-msg-user="${esc(d.user)}" title="Responder">↩</button>
      ${isOwn ? `<button class="msg-act-btn delete-trigger" data-msg-id="${id}" title="Borrar">🗑</button>` : ''}
    </div>`;

  const senderHTML = (!isOwn && isGroup) ? `<div class="msg-sender" style="color:${color}">${esc(d.user || 'Usuario')}</div>` : '';

  wrap.innerHTML = `
    ${avatarHTML}
    <div class="msg-bubble">
      ${replyHTML}
      ${senderHTML}
      ${imgHTML}
      ${audioHTML}
      ${d.text ? `<div class="msg-text">${esc(d.text)}</div>` : ''}
      <div class="msg-foot">
        <span class="msg-time">${fmtTime(d.timestamp)}</span>
        ${tickHTML}
      </div>
      ${reactHTML}
    </div>
    ${actBtns}`;

  wrap.querySelectorAll('img[data-fullurl]').forEach(img => {
    img.addEventListener('click', () => window.open(img.dataset.fullurl, '_blank', 'noopener,noreferrer'));
  });

  let pt;
  wrap.addEventListener('touchstart', () => { pt = setTimeout(() => showPickerFor(id, wrap), 500); }, { passive: true });
  wrap.addEventListener('touchend', () => clearTimeout(pt), { passive: true });

  return wrap;
}

function buildReactHTML(reactions, msgId) {
  const entries = Object.entries(reactions).filter(([, uids]) => uids.length);
  if (!entries.length) return '';
  return `<div class="react-bar">${
    entries.map(([emoji, uids]) => {
      const mine = uids.includes(S.user.uid);
      return `<button class="react-chip${mine ? ' mine' : ''}" data-emoji="${emoji}" data-msg-id="${msgId}">${emoji} ${uids.length}</button>`;
    }).join('')
  }</div>`;
}

async function sendMessage() {
  const text = D.messageInput.value.trim();
  const file = D.imageInput.files[0];
  if ((!text && !file && !S.pendingFile) || !S.user) return;

  const fileToSend = file || S.pendingFile;
  if (fileToSend) {
    if (!ALLOWED_TYPES.includes(fileToSend.type)) return showToast('Solo imágenes (JPG, PNG, GIF, WebP).');
    if (fileToSend.size > MAX_FILE_MB * 1024 * 1024) return showToast(`Máximo ${MAX_FILE_MB} MB.`);
  }

  D.btnSend.disabled = true;
  D.sendIcon.classList.add('hidden');
  D.sendLoading.classList.remove('hidden');

  try {
    let imageUrl = null;
    if (fileToSend) {
      const blob = await compressImage(fileToSend);
      const sRef = ref(storage, `chats/${S.currentConv.id}/${Date.now()}_${fileToSend.name}`);
      const result = await uploadBytes(sRef, blob);
      imageUrl = await getDownloadURL(result.ref);
    }

    const msg = {
      conversationId: S.currentConv.id,
      text: text || null,
      image: imageUrl || null,
      audio: null,
      user: S.profile?.displayName || 'Anónimo',
      photoURL: S.profile?.photoURL || null,
      uid: S.user.uid,
      color: S.profile?.color || getUserColor(S.user.uid),
      timestamp: serverTimestamp(),
      reactions: {},
      replyTo: S.replyTo || null
    };

    await addDoc(collection(db, 'messages'), msg);

    await updateDoc(doc(db, 'conversations', S.currentConv.id), {
      lastMessage: text || '📷 Imagen',
      lastMessageTime: serverTimestamp()
    });

    D.messageInput.value = '';
    clearFilePreview();
    clearReply();
    setTyping(false);
  } catch (e) {
    console.error('[ChatNica] send:', e);
    showToast('Error al enviar: ' + e.message);
  } finally {
    D.btnSend.disabled = false;
    D.sendIcon.classList.remove('hidden');
    D.sendLoading.classList.add('hidden');
  }
}

async function deleteMessage(id) {
  if (!confirm('¿Borrar este mensaje?')) return;
  try {
    await deleteDoc(doc(db, 'messages', id));
    showToast('Mensaje eliminado');
  } catch (e) { showToast('Error: ' + e.message); }
}

// ─────────────────────────────────────────────
//  REPLY
// ─────────────────────────────────────────────
function setReplyTo(id, text, user) {
  S.replyTo = { id, text, user };
  D.replyUser.textContent = user;
  D.replyText.textContent = text?.slice(0, 100) || '📷 Imagen';
  D.replyPreview.classList.remove('hidden');
  D.messageInput.focus();
}

function clearReply() {
  S.replyTo = null;
  D.replyPreview.classList.add('hidden');
}

// ─────────────────────────────────────────────
//  REACTIONS
// ─────────────────────────────────────────────
function showPickerFor(msgId, anchor) {
  S.pickerTarget = msgId;
  const pop = D.reactionPopover;
  pop.classList.remove('hidden');
  const rect = anchor.getBoundingClientRect();
  const pw = 224;
  let left = rect.left + rect.width / 2 - pw / 2;
  left = Math.max(6, Math.min(left, window.innerWidth - pw - 6));
  pop.style.left = left + 'px';
  pop.style.top = (rect.top + window.scrollY - 58) + 'px';
}

const hidePicker = () => { D.reactionPopover.classList.add('hidden'); S.pickerTarget = null; };

async function toggleReaction(msgId, emoji) {
  hidePicker();
  const msgRef = doc(db, 'messages', msgId);
  try {
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    const curr = snap.data().reactions?.[emoji] || [];
    const op = curr.includes(S.user.uid) ? arrayRemove(S.user.uid) : arrayUnion(S.user.uid);
    await updateDoc(msgRef, { [`reactions.${emoji}`]: op });
  } catch (e) { console.error('[ChatNica] reaction:', e); }
}

// ─────────────────────────────────────────────
//  TYPING
// ─────────────────────────────────────────────
function onType() {
  setTyping(true);
  clearTimeout(S.typingTimer);
  S.typingTimer = setTimeout(() => setTyping(false), TYPING_CLEAR_MS);
}

async function setTyping(active) {
  if (!S.user || !S.currentConv) return;
  const tRef = doc(db, 'typing', S.currentConv.id);
  try {
    if (active) {
      await setDoc(tRef, { [S.user.uid]: { name: S.profile.displayName, ts: serverTimestamp() } }, { merge: true });
    } else {
      const snap = await getDoc(tRef);
      if (snap.exists()) await updateDoc(tRef, { [S.user.uid]: deleteField() }).catch(() => {});
    }
  } catch (e) {}
}

function subscribeTyping() {
  S.unsubTyping?.();
  if (!S.currentConv) return;
  S.unsubTyping = onSnapshot(doc(db, 'typing', S.currentConv.id), snap => {
    if (!snap.exists()) { D.typingIndicator.classList.add('hidden'); return; }
    const stale = Date.now() - 5500;
    const typers = Object.entries(snap.data())
      .filter(([uid, v]) => uid !== S.user.uid && (v.ts?.toMillis?.() || 0) > stale)
      .map(([, v]) => v.name);
    D.typingIndicator.classList.toggle('hidden', typers.length === 0);
    if (typers.length) {
      D.typingText.textContent = typers.length === 1
        ? `${typers[0]} está escribiendo...`
        : typers.length === 2
          ? `${typers[0]} y ${typers[1]} están escribiendo...`
          : 'Varios están escribiendo...';
    }
  });
}

// ─────────────────────────────────────────────
//  VOICE RECORDING
// ─────────────────────────────────────────────
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    S.mediaRecorder = new MediaRecorder(stream);
    S.audioChunks = [];
    S.mediaRecorder.ondataavailable = e => S.audioChunks.push(e.data);
    S.mediaRecorder.onstop = async () => {
      const blob = new Blob(S.audioChunks, { type: 'audio/webm' });
      const file = new File([blob], "voice_note.webm", { type: 'audio/webm' });
      await uploadVoiceNote(file);
      stream.getTracks().forEach(t => t.stop());
    };
    S.mediaRecorder.start();
    S.recSeconds = 0;
    D.recordingBar.classList.remove('hidden');
    S.recInterval = setInterval(() => {
      S.recSeconds++;
      const m = Math.floor(S.recSeconds / 60).toString().padStart(2, '0');
      const s = (S.recSeconds % 60).toString().padStart(2, '0');
      D.recordingTimer.textContent = `${m}:${s}`;
    }, 1000);
  } catch (e) { showToast('Error al acceder al micrófono'); }
}

async function uploadVoiceNote(file) {
  D.sendLoading.classList.remove('hidden');
  try {
    const sRef = ref(storage, `voice/${S.currentConv.id}/${Date.now()}.webm`);
    const res = await uploadBytes(sRef, file);
    const url = await getDownloadURL(res.ref);
    await addDoc(collection(db, 'messages'), {
      conversationId: S.currentConv.id,
      audio: url, text: null, image: null,
      user: S.profile?.displayName || 'Anónimo',
      uid: S.user.uid,
      color: S.profile?.color || getUserColor(S.user.uid),
      timestamp: serverTimestamp(), reactions: {}, replyTo: null
    });
    await updateDoc(doc(db, 'conversations', S.currentConv.id), {
      lastMessage: '🎤 Nota de voz',
      lastMessageTime: serverTimestamp()
    });
  } catch (e) { console.error(e); }
  finally { D.sendLoading.classList.add('hidden'); }
}

function stopRecording() {
  S.mediaRecorder?.stop();
  clearInterval(S.recInterval);
  D.recordingBar.classList.add('hidden');
}

// ─────────────────────────────────────────────
//  FILE HANDLING
// ─────────────────────────────────────────────
function onFileChange() {
  const file = D.imageInput.files[0];
  if (!file) return clearFilePreview();
  if (!ALLOWED_TYPES.includes(file.type)) { showToast('Solo imágenes (JPG, PNG, GIF, WebP).'); return clearFilePreview(); }
  if (file.size > MAX_FILE_MB * 1024 * 1024) { showToast(`Máximo ${MAX_FILE_MB} MB.`); return clearFilePreview(); }
  S.pendingFile = file;
  D.filePreviewName.textContent = file.name;
  D.filePreview.classList.remove('hidden');
}

function clearFilePreview() {
  D.imageInput.value = '';
  S.pendingFile = null;
  D.filePreview.classList.add('hidden');
  D.filePreviewName.textContent = '';
}

// ─────────────────────────────────────────────
//  CHAT INFO
// ─────────────────────────────────────────────
async function openChatInfo() {
  if (!S.currentConv) return;
  const isGroup = S.currentConv.type === 'group';
  let html = '';

  if (isGroup) {
    html += `<div class="text-center mb-6">
      <div class="profile-avatar-large mx-auto mb-3" style="background:#004A99">
        ${S.currentConv.photoURL ? `<img src="${esc(S.currentConv.photoURL)}" alt="">` : getInitials(S.currentConv.name || 'G')}
      </div>
      <h3 class="text-lg font-bold">${esc(S.currentConv.name || 'Grupo')}</h3>
      <p class="text-sm text-nica-muted">${S.currentConv.participants?.length || 0} participantes</p>
    </div>`;
  }

  html += '<h4 class="text-sm font-bold text-nica-muted uppercase tracking-wider mb-3">Participantes</h4>';

  for (const uid of (S.currentConv.participants || [])) {
    const snap = await getDoc(doc(db, 'users', uid));
    const data = snap.data() || {};
    const online = isOnline(uid);
    html += `
      <div class="chat-info-member">
        <div class="chat-info-avatar" style="background:${data.color || getUserColor(uid)}">
          ${data.photoURL ? `<img src="${esc(data.photoURL)}" alt="">` : getInitials(data.displayName || 'U')}
        </div>
        <div class="flex-1">
          <div class="text-sm font-bold">${esc(data.displayName || 'Usuario')}${uid === S.user.uid ? ' (Tú)' : ''}</div>
          <div class="text-xs text-nica-muted">${online ? 'En línea' : 'Desconectado'}</div>
        </div>
      </div>`;
  }

  if (isGroup && S.currentConv.createdBy === S.user.uid) {
    html += `
      <button id="btn-invite-to-group" class="auth-btn-primary mt-4">Invitar más personas</button>
      <button id="btn-leave-group" class="auth-btn-primary mt-2" style="background:linear-gradient(135deg,#EF4444,#DC2626)">Salir del grupo</button>`;
  }

  D.chatInfoContent.innerHTML = html;
  D.chatInfoPanel.classList.remove('hidden');

  D.chatInfoContent.querySelector('#btn-leave-group')?.addEventListener('click', async () => {
    if (!confirm('¿Seguro que quieres salir del grupo?')) return;
    try {
      const newParticipants = S.currentConv.participants.filter(p => p !== S.user.uid);
      if (newParticipants.length === 0) {
        await deleteDoc(doc(db, 'conversations', S.currentConv.id));
      } else {
        await updateDoc(doc(db, 'conversations', S.currentConv.id), { participants: newParticipants });
      }
      closeChat();
      D.chatInfoPanel.classList.add('hidden');
      showToast('Saliste del grupo');
    } catch (e) { showToast('Error: ' + e.message); }
  });
}

function closeChatInfo() {
  D.chatInfoPanel.classList.add('hidden');
}

// ─────────────────────────────────────────────
//  FEED
// ─────────────────────────────────────────────
function subscribeFeed() {
  S.unsubFeed?.();
  getAcceptedContacts().then(async contacts => {
    const contactUids = contacts.map(c => c.uid);
    if (!contactUids.length) {
      D.feedList.innerHTML = '';
      D.feedList.appendChild(D.emptyFeed);
      D.emptyFeed.classList.remove('hidden');
      return;
    }

    const q = query(
      collection(db, 'posts'),
      where('uid', 'in', contactUids.length <= 10 ? contactUids : contactUids.slice(0, 10)),
      orderBy('timestamp', 'desc'),
      limit(30)
    );

    S.unsubFeed = onSnapshot(q, snap => {
      const posts = [];
      snap.forEach(d => posts.push({ id: d.id, ...d.data() }));
      renderFeed(posts);
    }, err => {
      console.error('[ChatNica] feed error:', err);
    });
  });
}

function renderFeed(posts) {
  D.emptyFeed.classList.toggle('hidden', posts.length > 0);
  if (!posts.length) {
    D.feedList.innerHTML = '';
    D.feedList.appendChild(D.emptyFeed);
    D.emptyFeed.classList.remove('hidden');
    return;
  }
  D.feedList.innerHTML = posts.map(p => postCardHTML(p)).join('');
}

function postCardHTML(p) {
  const color = p.color || getUserColor(p.uid);
  const name = esc(p.userName || 'Usuario');
  const time = p.timestamp ? fmtTimeAgo(p.timestamp) : '';
  const liked = p.likes?.includes(S.user.uid);
  const likeCount = p.likes?.length || 0;
  const commentCount = p.comments?.length || 0;

  const avatarInner = p.userPhotoURL
    ? `<img src="${esc(p.userPhotoURL)}" alt="">`
    : getInitials(p.userName || 'U');

  const imagesHTML = p.images?.length
    ? `<div class="post-images">${p.images.map(img => `<img src="${esc(img)}" alt="" onclick="window.open('${esc(img)}','_blank','noopener,noreferrer')">`).join('')}</div>`
    : '';

  const commentsHTML = p.comments?.length
    ? `<div class="post-comments">${p.comments.slice(-3).map(c => `
        <div class="post-comment">
          <div class="post-comment-avatar" style="background:${c.color || getUserColor(c.uid)}">
            ${c.userPhotoURL ? `<img src="${esc(c.userPhotoURL)}" alt="">` : getInitials(c.userName || 'U')}
          </div>
          <div class="post-comment-bubble">
            <div class="post-comment-name">${esc(c.userName || 'Usuario')}</div>
            <div class="post-comment-text">${esc(c.text)}</div>
          </div>
        </div>`).join('')}</div>`
    : '';

  return `
    <div class="post-card" data-post-id="${p.id}">
      <div class="post-header">
        <div class="post-avatar" style="background:${color}">${avatarInner}</div>
        <div>
          <div class="post-name">${name}</div>
          <div class="post-time-label">${time}</div>
        </div>
      </div>
      ${p.text ? `<div class="post-text">${esc(p.text)}</div>` : ''}
      ${imagesHTML}
      <div class="post-actions">
        <button class="post-action-btn like-btn${liked ? ' liked' : ''}" data-post-id="${p.id}">
          ${liked ? '❤️' : '🤍'} <span>${likeCount || ''}</span>
        </button>
        <button class="post-action-btn comment-toggle-btn" data-post-id="${p.id}">
          💬 <span>${commentCount || ''}</span>
        </button>
      </div>
      ${commentsHTML}
      <div class="post-comment-input hidden" data-post-id="${p.id}">
        <input type="text" placeholder="Escribe un comentario..." class="comment-input" data-post-id="${p.id}">
        <button class="comment-send-btn" data-post-id="${p.id}">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
        </button>
      </div>
    </div>`;
}

async function createPost(text, images) {
  if (!text && !images.length) return showToast('Escribe algo o agrega una imagen.');
  D.btnPublish.disabled = true;
  D.btnPublish.textContent = 'Publicando...';
  try {
    const imageUrls = [];
    for (const file of images) {
      const blob = await compressImage(file);
      const sRef = ref(storage, `posts/${S.user.uid}/${Date.now()}_${file.name}`);
      const result = await uploadBytes(sRef, blob);
      imageUrls.push(await getDownloadURL(result.ref));
    }
    await addDoc(collection(db, 'posts'), {
      uid: S.user.uid,
      userName: S.profile.displayName,
      userPhotoURL: S.profile.photoURL || null,
      color: S.profile.color || getUserColor(S.user.uid),
      text: text || null,
      images: imageUrls,
      likes: [],
      comments: [],
      timestamp: serverTimestamp()
    });
    showToast('Publicación creada');
    closeModal(D.modalNewPost);
    D.postText.value = '';
    D.postImages.value = '';
    D.postImagesPreview.innerHTML = '';
    D.postImagesPreview.classList.add('hidden');
  } catch (e) { showToast('Error: ' + e.message); }
  finally { D.btnPublish.disabled = false; D.btnPublish.textContent = 'Publicar'; }
}

async function toggleLike(postId) {
  const postRef = doc(db, 'posts', postId);
  try {
    const snap = await getDoc(postRef);
    if (!snap.exists()) return;
    const likes = snap.data().likes || [];
    const op = likes.includes(S.user.uid) ? arrayRemove(S.user.uid) : arrayUnion(S.user.uid);
    await updateDoc(postRef, { likes: op });
  } catch (e) { console.error(e); }
}

async function addComment(postId, text) {
  if (!text.trim()) return;
  const postRef = doc(db, 'posts', postId);
  try {
    await updateDoc(postRef, {
      comments: arrayUnion({
        uid: S.user.uid,
        userName: S.profile.displayName,
        userPhotoURL: S.profile.photoURL || null,
        color: S.profile.color || getUserColor(S.user.uid),
        text: text.trim(),
        timestamp: new Date().toISOString()
      })
    });
  } catch (e) { showToast('Error: ' + e.message); }
}

// ─────────────────────────────────────────────
//  STORIES
// ─────────────────────────────────────────────
function subscribeStories() {
  S.unsubStories?.();
  const expiresAt = Timestamp.fromMillis(Date.now());
  const q = query(collection(db, 'stories'), where('expiresAt', '>', expiresAt));
  S.unsubStories = onSnapshot(q, snap => {
    const stories = [];
    snap.forEach(d => stories.push({ id: d.id, ...d.data() }));
    const grouped = {};
    stories.forEach(s => {
      if (!grouped[s.uid]) grouped[s.uid] = [];
      grouped[s.uid].push(s);
    });
    renderStoriesBar(grouped);
  });
}

function renderStoriesBar(grouped) {
  let html = '';

  html += `
    <div class="story-item" id="my-story-item">
      <div class="story-ring add">
        <div class="story-ring-inner" style="background:#004A99">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        </div>
      </div>
      <span class="story-name">Tu estado</span>
    </div>`;

  const contactUids = new Set();
  getAcceptedContacts().then(contacts => {
    contacts.forEach(c => contactUids.add(c.uid));

    for (const [uid, userStories] of Object.entries(grouped)) {
      if (uid === S.user.uid || !contactUids.has(uid)) continue;
      const first = userStories[0];
      const seen = first.views?.includes(S.user.uid);
      const color = first.color || getUserColor(uid);
      const name = first.userName || 'Usuario';

      const avatarInner = first.userPhotoURL
        ? `<img src="${esc(first.userPhotoURL)}" alt="">`
        : getInitials(name);

      html += `
        <div class="story-item" data-story-uid="${uid}">
          <div class="story-ring${seen ? ' seen' : ''}">
            <div class="story-ring-inner" style="background:${color}">
              ${avatarInner}
            </div>
          </div>
          <span class="story-name">${esc(name)}</span>
        </div>`;
    }

    const existingBar = document.querySelector('.stories-row');
    if (existingBar) existingBar.remove();
    const bar = document.createElement('div');
    bar.className = 'stories-row';
    bar.innerHTML = html;
    const feedList = D.feedList;
    feedList.insertBefore(bar, feedList.firstChild);

    bar.querySelectorAll('.story-item').forEach(item => {
      item.addEventListener('click', () => {
        if (item.id === 'my-story-item') openModal(D.modalStory);
        else viewStoriesForUser(item.dataset.storyUid);
      });
    });
  });
}

async function createStory(type, content) {
  D.btnPublishStory.disabled = true;
  D.btnPublishStory.textContent = 'Publicando...';
  try {
    const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);
    const data = {
      uid: S.user.uid,
      type,
      userName: S.profile.displayName,
      userPhotoURL: S.profile.photoURL || null,
      color: S.profile.color || getUserColor(S.user.uid),
      timestamp: serverTimestamp(),
      expiresAt,
      views: []
    };

    if (type === 'image') {
      const blob = await compressImage(content);
      const sRef = ref(storage, `stories/${S.user.uid}/${Date.now()}`);
      const result = await uploadBytes(sRef, blob);
      data.image = await getDownloadURL(result.ref);
    } else {
      data.text = content;
    }

    await addDoc(collection(db, 'stories'), data);
    showToast('Estado publicado');
    closeModal(D.modalStory);
    D.storyImageInput.value = '';
    D.storyTextInput.value = '';
    D.storyImagePreview.innerHTML = '';
    D.storyImagePreview.classList.add('hidden');
  } catch (e) { showToast('Error: ' + e.message); }
  finally { D.btnPublishStory.disabled = false; D.btnPublishStory.textContent = 'Publicar estado'; }
}

async function viewStoriesForUser(uid) {
  const expiresAt = Timestamp.fromMillis(Date.now());
  const q = query(collection(db, 'stories'), where('uid', '==', uid), where('expiresAt', '>', expiresAt));
  const snap = await getDocs(q);
  const stories = [];
  snap.forEach(d => stories.push({ id: d.id, ...d.data() }));
  if (!stories.length) return;

  const story = stories[0];
  D.viewStoryName.textContent = story.userName || 'Usuario';
  D.viewStoryTime.textContent = fmtTimeAgo(story.timestamp);

  const avatarInner = story.userPhotoURL
    ? `<img src="${esc(story.userPhotoURL)}" alt="">`
    : getInitials(story.userName || 'U');
  D.viewStoryAvatar.innerHTML = `<div class="w-full h-full rounded-full" style="background:${story.color || getUserColor(uid)}">${avatarInner}</div>`;

  if (story.type === 'image') {
    D.viewStoryContent.innerHTML = `<img src="${esc(story.image)}" alt="estado">`;
  } else {
    D.viewStoryContent.innerHTML = `<div class="story-text-content">${esc(story.text)}</div>`;
  }

  if (story.uid === S.user.uid) {
    D.viewStoryDelete.classList.remove('hidden');
    D.viewStoryDelete.onclick = async () => {
      if (!confirm('¿Borrar este estado?')) return;
      await deleteDoc(doc(db, 'stories', story.id));
      D.modalViewStory.classList.add('hidden');
      showToast('Estado eliminado');
    };
  } else {
    D.viewStoryDelete.classList.add('hidden');
    if (!story.views?.includes(S.user.uid)) {
      updateDoc(doc(db, 'stories', story.id), { views: arrayUnion(S.user.uid) }).catch(() => {});
    }
  }

  D.modalViewStory.classList.remove('hidden');
}

// ─────────────────────────────────────────────
//  PROFILE
// ─────────────────────────────────────────────
function openEditProfile() {
  D.editName.value = S.profile.displayName || '';
  D.editBio.value = S.profile.bio || '';
  D.editCity.value = S.profile.city || '';
  D.editDepartment.value = S.profile.department || '';

  if (S.profile.photoURL) {
    D.editProfileAvatar.innerHTML = `<img src="${esc(S.profile.photoURL)}" alt="" class="w-full h-full object-cover">`;
    D.editProfileAvatar.style.background = 'transparent';
  } else {
    D.editProfileAvatar.textContent = getInitials(S.profile.displayName);
    D.editProfileAvatar.style.background = S.profile.color || getUserColor(S.user.uid);
  }

  openModal(D.modalEditProfile);
}

async function saveProfile() {
  const name = D.editName.value.trim();
  if (!name) return showToast('El nombre es obligatorio.');

  D.btnSaveProfile.disabled = true;
  D.btnSaveProfile.textContent = 'Guardando...';

  try {
    const updates = {
      displayName: name,
      bio: D.editBio.value.trim(),
      city: D.editCity.value.trim(),
      department: D.editDepartment.value
    };

    await updateDoc(doc(db, 'users', S.user.uid), updates);
    S.profile = { ...S.profile, ...updates };
    updateHeader();
    updateProfileTab();
    closeModal(D.modalEditProfile);
    showToast('Perfil actualizado');
  } catch (e) { showToast('Error: ' + e.message); }
  finally { D.btnSaveProfile.disabled = false; D.btnSaveProfile.textContent = 'Guardar cambios'; }
}

async function updateProfilePhoto(file) {
  if (!file || !ALLOWED_TYPES.includes(file.type)) return showToast('Solo imágenes.');
  try {
    const blob = await compressImage(file, 400, 0.85);
    const sRef = ref(storage, `profiles/${S.user.uid}/photo`);
    const result = await uploadBytes(sRef, blob);
    const url = await getDownloadURL(result.ref);
    await updateDoc(doc(db, 'users', S.user.uid), { photoURL: url });
    S.profile = { ...S.profile, photoURL: url };
    updateHeader();
    updateProfileTab();

    if (S.profile.photoURL) {
      D.editProfileAvatar.innerHTML = `<img src="${esc(url)}" alt="" class="w-full h-full object-cover">`;
      D.editProfileAvatar.style.background = 'transparent';
    }
    showToast('Foto actualizada');
  } catch (e) { showToast('Error: ' + e.message); }
}

// ─────────────────────────────────────────────
//  MODALS
// ─────────────────────────────────────────────
function openModal(el) { el.classList.remove('hidden'); }
function closeModal(el) { el.classList.add('hidden'); }

function openNewConvModal() {
  openModal(D.modalNewConv);
}

async function openSelectContactModal() {
  closeModal(D.modalNewConv);
  const contacts = await getAcceptedContacts();
  if (!contacts.length) {
    D.selectContactList.innerHTML = '<p class="text-center text-nica-muted py-8 text-sm">No tienes contactos aún. Ve a la pestaña Contactos para agregar personas.</p>';
  } else {
    D.selectContactList.innerHTML = contacts.map(c => {
      const color = c.otherColor || getUserColor(c.uid);
      const name = esc(c.otherName || 'Usuario');
      const avatarInner = c.otherPhotoURL
        ? `<img src="${esc(c.otherPhotoURL)}" alt="" class="w-full h-full object-cover">`
        : getInitials(c.otherName || 'U');
      return `
        <div class="group-member-select" data-uid="${c.uid}">
          <div class="contact-avatar" style="background:${color};width:36px;height:36px">
            ${avatarInner}
          </div>
          <span class="text-sm font-medium">${name}</span>
        </div>`;
    }).join('');
  }
  openModal(D.modalSelectContact);
}

async function openCreateGroupModal() {
  closeModal(D.modalNewConv);
  const contacts = await getAcceptedContacts();
  if (!contacts.length) {
    D.groupMembersSelect.innerHTML = '<p class="text-center text-nica-muted py-4 text-sm">Necesitas contactos para crear un grupo.</p>';
  } else {
    D.groupMembersSelect.innerHTML = contacts.map(c => {
      const color = c.otherColor || getUserColor(c.uid);
      const name = esc(c.otherName || 'Usuario');
      const avatarInner = c.otherPhotoURL
        ? `<img src="${esc(c.otherPhotoURL)}" alt="" class="w-full h-full object-cover">`
        : getInitials(c.otherName || 'U');
      return `
        <label class="group-member-select">
          <input type="checkbox" value="${c.uid}" class="group-member-checkbox">
          <div class="contact-avatar" style="background:${color};width:32px;height:32px">
            ${avatarInner}
          </div>
          <span class="text-sm">${name}</span>
        </label>`;
    }).join('');
  }
  D.groupName.value = '';
  openModal(D.modalCreateGroup);
}

async function openNewPostModal() {
  D.postText.value = '';
  D.postImages.value = '';
  D.postImagesPreview.innerHTML = '';
  D.postImagesPreview.classList.add('hidden');
  openModal(D.modalNewPost);
}

function openStoryModal() {
  D.storyImageInput.value = '';
  D.storyTextInput.value = '';
  D.storyImagePreview.innerHTML = '';
  D.storyImagePreview.classList.add('hidden');
  D.storyImageSection.classList.remove('hidden');
  D.storyTextSection.classList.add('hidden');
  D.storyTypeImage.classList.add('active');
  D.storyTypeText.classList.remove('active');
  openModal(D.modalStory);
}

// ─────────────────────────────────────────────
//  CONTACT SEARCH
// ─────────────────────────────────────────────
let searchTimeout;
D.contactsSearchInput?.addEventListener('input', e => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    const q = e.target.value.trim();
    if (q.length < 2) {
      subscribeContacts();
      return;
    }
    const results = await searchUsers(q);
    if (!results.length) {
      D.contactsAcceptedList.innerHTML = '<p class="text-center text-nica-muted py-4 text-sm">No se encontraron resultados</p>';
      D.emptyContacts.classList.add('hidden');
      return;
    }
    D.contactsPendingSection.classList.add('hidden');
    D.emptyContacts.classList.add('hidden');
    D.contactsAcceptedList.innerHTML = results.map(u => {
      const color = u.color || getUserColor(u.uid);
      const name = esc(u.displayName || 'Usuario');
      const city = u.city ? esc(u.city) : '';
      const avatarInner = u.photoURL
        ? `<img src="${esc(u.photoURL)}" alt="" class="w-full h-full object-cover">`
        : getInitials(u.displayName || 'U');
      return `
        <div class="contact-item">
          <div class="contact-avatar" style="background:${color}">${avatarInner}</div>
          <div class="contact-info">
            <div class="contact-name">${name}</div>
            ${city ? `<div class="contact-city">${city}</div>` : ''}
          </div>
          <div class="contact-actions">
            <button class="contact-btn contact-btn-chat" data-action="add-contact" data-uid="${u.uid}">Agregar</button>
          </div>
        </div>`;
    }).join('');
  }, 400);
});

// ─────────────────────────────────────────────
//  SESSION
// ─────────────────────────────────────────────
function startSession() {
  updateHeader();
  updateProfileTab();
  subscribePresence();
  updatePresence();
  S.presTimer = setInterval(updatePresence, PRESENCE_INTERVAL_MS);
  switchTab('chats');
}

function stopAllSubscriptions() {
  S.unsubConvs?.(); S.unsubMsgs?.(); S.unsubContacts?.();
  S.unsubFeed?.(); S.unsubStories?.(); S.unsubTyping?.();
  S.unsubConvs = S.unsubMsgs = S.unsubContacts = null;
  S.unsubFeed = S.unsubStories = S.unsubTyping = null;
  S.msgEls.clear();
  clearTimeout(S.typingTimer);
}

// ─────────────────────────────────────────────
//  AUTH STATE LISTENER
// ─────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  try {
    if (user) {
      S.user = user;
      S.profile = await ensureProfile(user);
      showScreen('main');
      startSession();
    } else {
      S.user = S.profile = null;
      stopAllSubscriptions();
      clearInterval(S.presTimer);
      showScreen('auth');
    }
  } catch (e) {
    console.error("[ChatNica] Auth error:", e);
    showAuthError('login', friendlyError(e));
    setAuthBusy(false, 'google');
    showScreen('auth');
  }
});

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
  D.showLogin.addEventListener('click', () => showAuthView('login'));
  [D.loginEmail, D.loginPassword].forEach(el =>
    el.addEventListener('keydown', e => { if (e.key === 'Enter') loginWithEmail(); })
  );

  // Navigation
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Header actions
  D.btnNew.addEventListener('click', openNewConvModal);
  D.headerAvatar.addEventListener('click', () => switchTab('profile'));

  // New conversation
  D.btnNewDirect.addEventListener('click', openSelectContactModal);
  D.btnNewGroup.addEventListener('click', openCreateGroupModal);

  // Create group
  D.btnCreateGroup.addEventListener('click', async () => {
    const name = D.groupName.value.trim();
    if (!name) return showToast('Ponle nombre al grupo.');
    const members = [...D.groupMembersSelect.querySelectorAll('.group-member-checkbox:checked')].map(cb => cb.value);
    if (!members.length) return showToast('Selecciona al menos un contacto.');
    try {
      const convId = await createGroup(name, members);
      closeModal(D.modalCreateGroup);
      const snap = await getDoc(doc(db, 'conversations', convId));
      if (snap.exists()) {
        openChat(convId, { id: convId, ...snap.data() });
      }
    } catch (e) { showToast('Error: ' + e.message); }
  });

  // Conversations list
  D.convsList.addEventListener('click', async e => {
    const item = e.target.closest('.conv-item');
    if (!item) return;
    const convId = item.dataset.convId;
    const convType = item.dataset.convType;
    const snap = await getDoc(doc(db, 'conversations', convId));
    if (snap.exists()) {
      openChat(convId, { id: convId, ...snap.data() });
    }
  });

  // Contacts list
  D.contactsAcceptedList.addEventListener('click', async e => {
    const addBtn = e.target.closest('[data-action="add-contact"]');
    if (addBtn) {
      await sendContactRequest(addBtn.dataset.uid);
      addBtn.textContent = 'Enviada';
      addBtn.classList.add('contact-btn-pending');
      addBtn.classList.remove('contact-btn-chat');
      addBtn.disabled = true;
      return;
    }
    const acceptBtn = e.target.closest('[data-action="accept"]');
    if (acceptBtn) { await acceptContact(acceptBtn.dataset.contactId); return; }
    const rejectBtn = e.target.closest('[data-action="reject"]');
    if (rejectBtn) { await rejectContact(rejectBtn.dataset.contactId); return; }
    const chatBtn = e.target.closest('[data-action="chat"]');
    if (chatBtn) {
      const convId = await getOrCreateDirectConv(chatBtn.dataset.uid);
      const snap = await getDoc(doc(db, 'conversations', convId));
      if (snap.exists()) openChat(convId, { id: convId, ...snap.data() });
      return;
    }
  });

  // Select contact for direct chat
  D.selectContactList.addEventListener('click', async e => {
    const item = e.target.closest('.group-member-select');
    if (!item) return;
    closeModal(D.modalSelectContact);
    const convId = await getOrCreateDirectConv(item.dataset.uid);
    const snap = await getDoc(doc(db, 'conversations', convId));
    if (snap.exists()) openChat(convId, { id: convId, ...snap.data() });
  });

  // Chat view
  D.chatBackBtn.addEventListener('click', closeChat);
  D.chatInfoBtn.addEventListener('click', openChatInfo);
  D.chatInfoBack.addEventListener('click', closeChatInfo);

  // Send message
  D.messageForm.addEventListener('submit', e => { e.preventDefault(); sendMessage(); });
  D.messageInput.addEventListener('input', onType);
  D.messageInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // Voice
  D.micBtn.addEventListener('click', startRecording);
  D.stopRecBtn.addEventListener('click', stopRecording);

  // File
  D.imageInput.addEventListener('change', onFileChange);
  D.fileClearBtn.addEventListener('click', clearFilePreview);

  // Reply
  D.cancelReply.addEventListener('click', clearReply);

  // Delegated clicks in chat messages
  D.chatMessages.addEventListener('click', e => {
    const replyBtn = e.target.closest('.reply-trigger');
    if (replyBtn) { setReplyTo(replyBtn.dataset.msgId, replyBtn.dataset.msgText, replyBtn.dataset.msgUser); return; }
    const deleteBtn = e.target.closest('.delete-trigger');
    if (deleteBtn) { deleteMessage(deleteBtn.dataset.msgId); return; }
    const reactBtn = e.target.closest('.react-trigger');
    if (reactBtn) { showPickerFor(reactBtn.dataset.msgId, reactBtn.closest('.msg-wrapper')); return; }
    const chip = e.target.closest('.react-chip');
    if (chip) { toggleReaction(chip.dataset.msgId, chip.dataset.emoji); return; }
  });

  // Reaction popover
  D.reactionPopover.addEventListener('click', e => {
    const btn = e.target.closest('[data-emoji]');
    if (btn && S.pickerTarget) toggleReaction(S.pickerTarget, btn.dataset.emoji);
  });
  document.addEventListener('click', e => {
    if (!D.reactionPopover.classList.contains('hidden') &&
        !D.reactionPopover.contains(e.target) &&
        !e.target.closest('.react-trigger')) hidePicker();
  });

  // Feed actions
  D.feedList.addEventListener('click', e => {
    const likeBtn = e.target.closest('.like-btn');
    if (likeBtn) { toggleLike(likeBtn.dataset.postId); return; }
    const commentToggle = e.target.closest('.comment-toggle-btn');
    if (commentToggle) {
      const inputRow = D.feedList.querySelector(`.post-comment-input[data-post-id="${commentToggle.dataset.postId}"]`);
      inputRow?.classList.toggle('hidden');
      return;
    }
    const commentSend = e.target.closest('.comment-send-btn');
    if (commentSend) {
      const input = D.feedList.querySelector(`.comment-input[data-post-id="${commentSend.dataset.postId}"]`);
      if (input && input.value.trim()) {
        addComment(commentSend.dataset.postId, input.value);
        input.value = '';
      }
      return;
    }
  });

  // Post images preview
  D.postImages.addEventListener('change', () => {
    const files = D.postImages.files;
    if (!files.length) { D.postImagesPreview.classList.add('hidden'); return; }
    D.postImagesPreview.innerHTML = '';
    D.postImagesPreview.classList.remove('hidden');
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.className = 'w-16 h-16 object-cover rounded-lg';
        D.postImagesPreview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });

  // Publish post
  D.btnPublish.addEventListener('click', () => {
    const text = D.postText.value.trim();
    const files = D.postImages.files ? Array.from(D.postImages.files) : [];
    createPost(text, files);
  });

  // Stories
  D.storyTypeImage.addEventListener('click', () => {
    D.storyTypeImage.classList.add('active');
    D.storyTypeText.classList.remove('active');
    D.storyImageSection.classList.remove('hidden');
    D.storyTextSection.classList.add('hidden');
  });
  D.storyTypeText.addEventListener('click', () => {
    D.storyTypeText.classList.add('active');
    D.storyTypeImage.classList.remove('active');
    D.storyTextSection.classList.remove('hidden');
    D.storyImageSection.classList.add('hidden');
  });

  D.storyImageInput.addEventListener('change', () => {
    const file = D.storyImageInput.files[0];
    if (!file) { D.storyImagePreview.classList.add('hidden'); return; }
    D.storyImagePreview.classList.remove('hidden');
    const reader = new FileReader();
    reader.onload = e => {
      D.storyImagePreview.innerHTML = `<img src="${e.target.result}" class="w-full rounded-lg" alt="preview">`;
    };
    reader.readAsDataURL(file);
  });

  D.btnPublishStory.addEventListener('click', () => {
    if (D.storyTypeImage.classList.contains('active')) {
      const file = D.storyImageInput.files[0];
      if (!file) return showToast('Selecciona una imagen.');
      createStory('image', file);
    } else {
      const text = D.storyTextInput.value.trim();
      if (!text) return showToast('Escribe algo.');
      createStory('text', text);
    }
  });

  D.viewStoryBack.addEventListener('click', () => D.modalViewStory.classList.add('hidden'));

  // Profile
  D.btnEditProfile.addEventListener('click', openEditProfile);
  D.btnSaveProfile.addEventListener('click', saveProfile);
  D.profilePhotoInput.addEventListener('change', () => {
    const file = D.profilePhotoInput.files[0];
    if (file) updateProfilePhoto(file);
  });
  D.btnMyStories.addEventListener('click', () => {
    viewStoriesForUser(S.user.uid);
  });

  // Modals close
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.fixed').classList.add('hidden');
    });
  });

  // Close modals on backdrop click
  [D.modalNewConv, D.modalCreateGroup, D.modalNewPost, D.modalStory, D.modalEditProfile, D.modalSelectContact].forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  });

  // Cleanup
  window.addEventListener('beforeunload', () => {
    setTyping(false);
    setPresenceOffline();
  });
})();
