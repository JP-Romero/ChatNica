// ═══════════════════════════════════════════════════════════════
//  app.js — ChatNica v2 (PocketBase Edition)
//  Mensajería + Red Social para Nicaragua
// ═══════════════════════════════════════════════════════════════

import { pb } from './pb-config.js';

// ─────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────
const MSG_LIMIT = 50;
const TYPING_CLEAR_MS = 3500;
const PRESENCE_INTERVAL_MS = 55_000;
const PRESENCE_STALE_MS = 6 * 60_000;
const MAX_FILE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','video/quicktime'];
const AVATAR_COLORS = ['#60A5FA','#F87171','#34D399','#FBBF24','#A78BFA','#F472B6','#2DD4BF','#FB923C'];
const DEFAULT_FONT_SIZE = 16;

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
const S = {
  user: null, profile: null,
  activeTab: 'chats',
  currentConv: null,
  unsubConvs: null, unsubMsgs: null, unsubContacts: null,
  unsubFeed: null, unsubStories: null, unsubPresence: null,
  replyTo: null, pendingFile: null, pendingVideo: null,
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
  btnGoogle: $('btn-google'),
  showRegister: $('show-register'), showLogin: $('show-login'),
  regName: $('reg-name'), regEmail: $('reg-email'), regPassword: $('reg-password'),
  regBtn: $('reg-btn'), regError: $('reg-error'),
  headerAvatar: $('header-avatar'), headerTitle: $('header-title'), headerSubtitle: $('header-subtitle'),
  btnNew: $('btn-new'), btnReload: $('btn-reload'), btnLogout: $('btn-logout'), bottomNav: $('bottom-nav'),
  tabChats: $('tab-chats'), tabContacts: $('tab-contacts'), tabFeed: $('tab-feed'), tabProfile: $('tab-profile'),
  convsList: $('conversations-list'), emptyChats: $('empty-chats'),
  contactsSearchInput: $('contacts-search-input'),
  contactsPendingSection: $('contacts-pending-section'), contactsPendingList: $('contacts-pending-list'),
  contactsAcceptedList: $('contacts-accepted-list'),
  contactsDiscoverSection: $('contacts-discover-section'), contactsDiscoverList: $('contacts-discover-list'),
  emptyContacts: $('empty-contacts'),
  feedList: $('feed-list'), emptyFeed: $('empty-feed'),
  profileAvatarLarge: $('profile-avatar-large'), profileName: $('profile-name'),
  profileEmail: $('profile-email'), profileBio: $('profile-bio'), profileCity: $('profile-city'),
  btnEditProfile: $('btn-edit-profile'), btnMyStories: $('btn-my-stories'),
  chatView: $('chat-view'), chatBackBtn: $('chat-back-btn'),
  chatHeaderAvatar: $('chat-header-avatar'), chatHeaderName: $('chat-header-name'), chatHeaderStatus: $('chat-header-status'),
  chatInfoBtn: $('chat-info-btn'), chatMessages: $('chat-messages'), emptyChat: $('empty-chat'),
  messageForm: $('message-form'), messageInput: $('message-input'),
  imageInput: $('image-input'), videoInput: $('video-input'), btnSend: $('btn-send'), sendIcon: $('send-icon'), sendLoading: $('send-loading'),
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
  btnAppSettings: $('btn-app-settings'),
  modalAppSettings: $('modal-app-settings'),
  fontSizeSlider: $('font-size-slider'),
  fontSizeValue: $('font-size-value'),
  fontSizePreview: $('font-size-preview'),
  btnResetFont: $('btn-reset-font'),
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
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const fmtDate = ts => {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) return fmtTime(ts);
  if (diff < 172800000) return 'Ayer';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

const fmtTimeAgo = ts => {
  if (!ts) return '';
  const d = new Date(ts);
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

const getTickIcon = status => {
  if (status === 'read') return '✓✓';
  if (status === 'delivered') return '✓✓';
  return '✓';
};

const scrollBottom = () => { D.chatMessages.scrollTop = D.chatMessages.scrollHeight; };

const convIdForDirect = (uid1, uid2) => {
  return uid1 < uid2 ? `direct_${uid1}_${uid2}` : `direct_${uid2}_${uid1}`;
};

const getFileURL = (record, fieldName) => {
  if (!record || !record[fieldName]) return null;
  return pb.files.getURL(record, record[fieldName]);
};

const getMultiFileURL = (record, fieldName, index = 0) => {
  if (!record || !record[fieldName] || !record[fieldName].length) return null;
  const fname = Array.isArray(record[fieldName]) ? record[fieldName][index] : record[fieldName];
  return pb.files.getURL(record, fname);
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
const friendlyError = msg => {
  const m = (msg || '').toLowerCase();
  if (m.includes('invalid login') || m.includes('credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('already exists')) return 'Ese correo ya está registrado.';
  if (m.includes('password')) return 'Contraseña incorrecta o demasiado corta.';
  if (m.includes('popup') || m.includes('cancelled')) return 'Ventana cerrada. Intenta de nuevo.';
  if (m.includes('network')) return 'Sin conexión. Revisa tu red.';
  return msg || 'Error desconocido.';
};

const setAuthBusy = (busy, which) => {
  const map = {
    google: [D.btnGoogle, busy ? 'Conectando…' : 'Continuar con Google'],
    login: [D.loginBtn, busy ? 'Entrando…' : 'Iniciar sesión'],
    reg: [D.regBtn, busy ? 'Creando…' : 'Crear cuenta'],
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
  try {
    const profile = await pb.collection('users').getOne(user.id);
    const patch = {};
    if (user.name && user.name !== profile.displayName) patch.displayName = user.name;
    if (user.avatar && user.avatar !== profile.photoURL) patch.photoURL = user.avatar;
    if (Object.keys(patch).length) {
      await pb.collection('users').update(user.id, patch);
    }
    return { ...profile, ...patch };
  } catch (e) {
    if (e.status === 404) {
      const name = user.name || user.email?.split('@')[0] || 'Usuario';
      const p = {
        displayName: name,
        photoURL: null,
        color: getUserColor(user.id),
        bio: '',
        city: '',
        department: '',
      };
      await pb.collection('users').update(user.id, p);
      return { ...p, id: user.id, email: user.email, displayName: name };
    }
    throw e;
  }
}

const loginWithGoogle = async () => {
  setAuthBusy(true, 'google');
  try {
    await pb.collection('users').authWithOAuth2({ provider: 'google' });
  } catch (e) {
    showAuthError('login', friendlyError(e.message));
    setAuthBusy(false, 'google');
  }
};

const loginWithEmail = async () => {
  const em = D.loginEmail.value.trim(), pw = D.loginPassword.value;
  if (!em || !pw) return showAuthError('login', 'Completa todos los campos.');
  setAuthBusy(true, 'login');
  try {
    await pb.collection('users').authWithPassword(em, pw);
  } catch (e) {
    showAuthError('login', friendlyError(e.message));
    setAuthBusy(false, 'login');
  }
};

const registerWithEmail = async () => {
  const name = D.regName.value.trim(), em = D.regEmail.value.trim(), pw = D.regPassword.value;
  if (!name || !em || !pw) return showAuthError('reg', 'Completa todos los campos.');
  if (pw.length < 6) return showAuthError('reg', 'Mínimo 6 caracteres.');
  setAuthBusy(true, 'reg');
  try {
    await pb.collection('users').create({
      email: em,
      password: pw,
      passwordConfirm: pw,
      displayName: name,
      emailVisibility: true,
    });
    await pb.collection('users').authWithPassword(em, pw);
  } catch (e) {
    showAuthError('reg', friendlyError(e.message));
    setAuthBusy(false, 'reg');
  }
};

const logout = async () => {
  stopAllSubscriptions();
  await setPresenceOffline();
  pb.authStore.clear();
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
  const photoURL = getFileURL(p, 'photoURL');
  if (photoURL) {
    D.headerAvatar.innerHTML = `<img src="${esc(photoURL)}" alt="" class="w-full h-full object-cover">`;
    D.headerAvatar.style.background = 'transparent';
  } else {
    D.headerAvatar.textContent = getInitials(p.displayName);
    D.headerAvatar.style.background = p.color || getUserColor(S.user.id);
  }
}

function updateProfileTab() {
  const p = S.profile;
  if (!p) return;
  const photoURL = getFileURL(p, 'photoURL');
  if (photoURL) {
    D.profileAvatarLarge.innerHTML = `<img src="${esc(photoURL)}" alt="" class="w-full h-full object-cover">`;
    D.profileAvatarLarge.style.background = 'transparent';
  } else {
    D.profileAvatarLarge.textContent = getInitials(p.displayName);
    D.profileAvatarLarge.style.background = p.color || getUserColor(S.user.id);
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

function applyFontSize(size) {
  const scale = size / 16;
  let styleEl = document.getElementById('nica-font-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'nica-font-style';
    document.head.appendChild(styleEl);
  }
  const rules = [
    ['.msg-text', 0.9],
    ['.msg-time', 0.65],
    ['.msg-tick', 0.65],
    ['.msg-sender', 0.7],
    ['.reply-ctx-name', 0.65],
    ['.reply-ctx-text', 0.72],
    ['.react-chip', 0.72],
    ['.conv-name', 0.95],
    ['.conv-last-msg', 0.8],
    ['.conv-time', 0.7],
    ['.conv-unread', 0.65],
    ['.contact-name', 0.9],
    ['.contact-city', 0.75],
    ['.contact-btn', 0.75],
    ['.post-text', 0.9],
    ['.post-name', 0.85],
    ['.post-time-label', 0.7],
    ['.post-comment-text', 0.8],
    ['.post-comment-name', 0.7],
    ['.post-action-btn', 0.8],
    ['.story-name', 0.65],
    ['.header-title', 1.125],
    ['.header-subtitle', 0.625],
    ['.profile-name', 1.25],
    ['.profile-email', 0.875],
    ['.profile-bio', 0.875],
    ['.profile-city', 0.75],
    ['.profile-menu-item', 0.9],
    ['.nav-tab span', 0.625],
    ['.auth-input', 0.9],
    ['.auth-link', 0.8],
    ['.auth-error', 0.8],
    ['.modal-option-btn', 0.9],
    ['.toast', 0.82],
    ['.typing-dots', 0.75],
  ].map(([sel, rem]) => `${sel} { font-size: ${(rem * scale)}rem !important; }`).join('\n');
  styleEl.textContent = rules;
  document.body.style.fontSize = size + 'px';
  const label = size === DEFAULT_FONT_SIZE ? `${size}px (predeterminado)` : `${size}px`;
  if (D.fontSizeValue) D.fontSizeValue.textContent = label;
  if (D.fontSizePreview) D.fontSizePreview.style.fontSize = size + 'px';
}

function applyFontSizeToChat() {
  const size = parseInt(localStorage.getItem('chatnica-font-size')) || DEFAULT_FONT_SIZE;
  applyFontSize(size);
}

// ─────────────────────────────────────────────
//  PRESENCE
// ─────────────────────────────────────────────
async function updatePresence() {
  if (!S.user) return;
  try {
    const existing = await pb.collection('presence').getFirstListItem(`user = "${S.user.id}"`).catch(() => null);
    const data = {
      user: S.user.id,
      online: true,
      lastSeen: new Date().toISOString(),
    };
    if (existing) {
      await pb.collection('presence').update(existing.id, data);
    } else {
      await pb.collection('presence').create(data);
    }
  } catch (e) {}
}

async function setPresenceOffline() {
  if (!S.user) return;
  try {
    const existing = await pb.collection('presence').getFirstListItem(`user = "${S.user.id}"`).catch(() => null);
    if (existing) {
      await pb.collection('presence').update(existing.id, { online: false, lastSeen: new Date().toISOString() });
    }
  } catch (e) {}
}

function subscribePresence() {
  S.unsubPresence?.();
  const threshold = new Date(Date.now() - PRESENCE_STALE_MS).toISOString();

  pb.collection('presence').subscribe('presence', e => {
    if (e.action === 'delete') {
      S.onlineUsers.delete(e.record.user);
    } else {
      const data = e.record;
      if (data.online && new Date(data.lastSeen) > new Date(threshold)) {
        S.onlineUsers.set(data.user, data);
      } else {
        S.onlineUsers.delete(data.user);
      }
    }
    refreshOnlineIndicators();
  });

  pb.collection('presence').getFullList({ filter: `lastSeen > "${threshold}"` }).then(records => {
    S.onlineUsers.clear();
    records.forEach(r => {
      if (r.online) S.onlineUsers.set(r.user, r);
    });
    refreshOnlineIndicators();
  }).catch(() => {});
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
  console.log('[ChatNica] Suscribiendo a contactos...');

  pb.collection('contacts').subscribe('contacts', () => {
    loadContactsAndRender();
  });

  loadContactsAndRender();
}

async function loadContactsAndRender() {
  try {
    const allContacts = await pb.collection('contacts').getFullList();
    const incoming = allContacts.filter(c => c.target === S.user.id);
    const outgoing = allContacts.filter(c => c.requester === S.user.id);
    console.log('[ChatNica] Contactos entrantes:', incoming.length, 'salientes:', outgoing.length);

    const users = await loadAllUsers();
    renderContacts(incoming, outgoing, users);
  } catch (e) {
    console.error('[ChatNica] Error en contactos:', e);
  }
}

async function loadAllUsers() {
  try {
    const users = await pb.collection('users').getFullList();
    return users.filter(u => u.id !== S.user.id);
  } catch (e) {
    console.error('[ChatNica] Error cargando usuarios:', e);
    return [];
  }
}

function getContactStatus(uid, incoming, outgoing) {
  const incomingContact = incoming.find(c => c.requester === uid);
  if (incomingContact) return { status: incomingContact.status, id: incomingContact.id, direction: 'incoming' };
  const outgoingContact = outgoing.find(c => c.target === uid);
  if (outgoingContact) return { status: outgoingContact.status, id: outgoingContact.id, direction: 'outgoing' };
  return { status: 'none', id: null, direction: 'none' };
}

function renderContacts(incoming, outgoing, allUsers) {
  const userMap = {};
  allUsers.forEach(u => { userMap[u.id] = u; });

  const enrichedIncoming = incoming.map(c => ({
    ...c,
    otherUid: c.requester === S.user.id ? c.target : c.requester,
    ...(userMap[c.requester === S.user.id ? c.target : c.requester] || {})
  }));

  const enrichedOutgoing = outgoing.map(c => ({
    ...c,
    otherUid: c.requester === S.user.id ? c.target : c.requester,
    ...(userMap[c.requester === S.user.id ? c.target : c.requester] || {})
  }));

  const pending = enrichedIncoming.filter(c => c.status === 'pending');
  const accepted = enrichedIncoming.filter(c => c.status === 'accepted');
  const acceptedUids = new Set(accepted.map(c => c.otherUid));

  D.contactsPendingSection.classList.toggle('hidden', !pending.length);
  if (pending.length) {
    D.contactsPendingList.innerHTML = pending.map(c => contactItemHTML(c, 'incoming-pending')).join('');
  }

  if (accepted.length) {
    D.contactsAcceptedList.innerHTML = accepted.map(c => contactItemHTML(c, 'accepted')).join('');
  }

  const discoverUsers = allUsers.filter(u => !acceptedUids.has(u.id));
  if (discoverUsers.length) {
    D.contactsDiscoverSection.classList.remove('hidden');
    D.contactsDiscoverList.innerHTML = discoverUsers.map(u => {
      const contactInfo = getContactStatus(u.id, incoming, outgoing);
      return discoverUserHTML(u, contactInfo);
    }).join('');
  } else {
    D.contactsDiscoverSection.classList.add('hidden');
  }

  D.emptyContacts.classList.toggle('hidden', accepted.length > 0 || pending.length > 0 || discoverUsers.length > 0);

  refreshOnlineIndicators();
  applyFontSizeToChat();
}

function contactItemHTML(c, type) {
  const otherUid = c.otherUid || (c.requester === S.user.id ? c.target : c.requester);
  const color = c.color || getUserColor(otherUid);
  const name = esc(c.displayName || 'Usuario');
  const city = c.city ? esc(c.city) : '';

  const photoURL = getFileURL(c, 'photoURL');
  const avatarInner = photoURL
    ? `<img src="${esc(photoURL)}" alt="">`
    : getInitials(c.displayName || 'U');

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

function discoverUserHTML(u, contactInfo) {
  const color = u.color || getUserColor(u.id);
  const name = esc(u.displayName || 'Usuario');
  const city = u.city ? esc(u.city) : '';
  const online = isOnline(u.id);
  const onlineDot = `<div class="online-dot${online ? '' : ' hidden'}" data-uid="${u.id}"></div>`;

  const photoURL = getFileURL(u, 'photoURL');
  const avatarInner = photoURL
    ? `<img src="${esc(photoURL)}" alt="">`
    : getInitials(u.displayName || 'U');

  let actions = '';
  if (contactInfo.status === 'none') {
    actions = `
      <div class="contact-actions">
        <button class="contact-btn contact-btn-chat" data-action="add-contact" data-uid="${u.id}">Agregar</button>
      </div>`;
  } else if (contactInfo.status === 'pending') {
    if (contactInfo.direction === 'outgoing') {
      actions = `<div class="contact-actions"><button class="contact-btn contact-btn-pending" disabled>Solicitud enviada</button></div>`;
    } else {
      actions = `
        <div class="contact-actions">
          <button class="contact-btn contact-btn-accept" data-action="accept" data-contact-id="${contactInfo.id}">Aceptar</button>
          <button class="contact-btn contact-btn-reject" data-action="reject" data-contact-id="${contactInfo.id}">Rechazar</button>
        </div>`;
    }
  } else if (contactInfo.status === 'accepted') {
    actions = `
      <div class="contact-actions">
        <button class="contact-btn contact-btn-chat" data-action="chat" data-uid="${u.id}">💬</button>
      </div>`;
  }

  return `
    <div class="contact-item" data-uid="${u.id}">
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
    const contactId = convIdForDirect(S.user.id, targetUid);
    await pb.collection('contacts').create({
      id: contactId,
      requester: S.user.id,
      target: targetUid,
      status: 'pending',
    });
    showToast('Solicitud enviada');
  } catch (e) { showToast('Error: ' + (e.message || e)); }
}

async function acceptContact(contactId) {
  try {
    await pb.collection('contacts').update(contactId, { status: 'accepted' });
    showToast('Contacto aceptado');
  } catch (e) { showToast('Error: ' + (e.message || e)); }
}

async function rejectContact(contactId) {
  try {
    await pb.collection('contacts').delete(contactId);
    showToast('Solicitud rechazada');
  } catch (e) { showToast('Error: ' + (e.message || e)); }
}

async function searchUsers(queryStr) {
  if (!queryStr || queryStr.length < 2) return [];
  try {
    const results = await pb.collection('users').getFullList({
      filter: `displayName ~ "${queryStr}" || email ~ "${queryStr}"`
    });
    return results.filter(u => u.id !== S.user.id).slice(0, 20);
  } catch (e) {
    return [];
  }
}

async function getAcceptedContacts() {
  try {
    const contacts = await pb.collection('contacts').getFullList({
      filter: `status = "accepted" && (requester = "${S.user.id}" || target = "${S.user.id}")`
    });

    const result = [];
    for (const c of contacts) {
      const otherUid = c.requester === S.user.id ? c.target : c.requester;
      try {
        const user = await pb.collection('users').getOne(otherUid);
        result.push({ uid: otherUid, contactId: c.id, ...user });
      } catch (e) {}
    }
    return result;
  } catch (e) {
    return [];
  }
}

// ─────────────────────────────────────────────
//  CONVERSATIONS
// ─────────────────────────────────────────────
function subscribeConversations() {
  S.unsubConvs?.();

  pb.collection('conversations').subscribe('convs', () => {
    loadConversations();
  });

  loadConversations();
}

async function loadConversations() {
  try {
    const convs = await pb.collection('conversations').getFullList({
      filter: `participants.id ?= "${S.user.id}"`,
      expand: 'participants',
      sort: '-lastMessageTime',
    });

    convs.sort((a, b) => {
      const ta = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const tb = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      if (ta === 0 && tb === 0) return 0;
      if (ta === 0) return 1;
      if (tb === 0) return -1;
      return tb - ta;
    });

    renderConversations(convs);
  } catch (e) {
    console.error('[ChatNica] convs error:', e);
  }
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
  applyFontSizeToChat();
}

function convItemHTML(c) {
  const isGroup = c.type === 'group';
  const participants = c.expand?.participants || [];
  const otherUser = isGroup ? null : participants.find(p => p.id !== S.user.id);
  const otherUid = otherUser?.id;
  const online = isGroup ? false : isOnline(otherUid);

  const name = isGroup ? esc(c.name || 'Grupo') : esc(otherUser?.displayName || c.name || 'Usuario');
  const lastMsg = c.lastMessage ? esc(c.lastMessage) : 'Sin mensajes';
  const time = c.lastMessageTime ? fmtDate(c.lastMessageTime) : '';

  let avatarInner;
  if (isGroup) {
    avatarInner = getInitials(c.name || 'G');
  } else {
    const photoURL = getFileURL(otherUser, 'photoURL');
    avatarInner = photoURL
      ? `<img src="${esc(photoURL)}" alt="">`
      : getInitials(otherUser?.displayName || 'U');
  }

  const avatarBg = isGroup ? '#004A99' : (otherUser?.color || getUserColor(otherUid || ''));

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
  const convId = convIdForDirect(S.user.id, targetUid);

  try {
    const existing = await pb.collection('conversations').getOne(convId);
    return convId;
  } catch (e) {}

  try {
    const targetData = await pb.collection('users').getOne(targetUid).catch(() => ({}));

    await pb.collection('conversations').create({
      id: convId,
      type: 'direct',
      participants: [S.user.id, targetUid],
      name: targetData.displayName || 'Usuario',
      createdBy: S.user.id,
    });
    return convId;
  } catch (e) {
    throw e;
  }
}

async function createGroup(name, memberUids) {
  const participants = [S.user.id, ...memberUids];
  const record = await pb.collection('conversations').create({
    type: 'group',
    participants,
    name,
    createdBy: S.user.id,
  });
  return record.id;
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

  const participants = convData.expand?.participants || [];
  const otherUser = isGroup ? null : participants.find(p => p.id !== S.user.id);
  const avatarBg = isGroup ? '#004A99' : (otherUser?.color || getUserColor(otherUser?.id || ''));
  const otherPhotoURL = otherUser ? getFileURL(otherUser, 'photoURL') : null;
  const avatarInner = isGroup
    ? getInitials(convData.name || 'G')
    : (otherPhotoURL ? `<img src="${esc(otherPhotoURL)}" alt="">` : getInitials(convData.name || 'U'));
  D.chatHeaderAvatar.innerHTML = avatarInner;
  D.chatHeaderAvatar.style.background = avatarBg;

  D.chatView.classList.remove('hidden');
  if (D.bottomNav) D.bottomNav.classList.add('hidden');

  D.chatMessages.innerHTML = '';
  D.chatMessages.appendChild(D.emptyChat);
  D.emptyChat.classList.remove('hidden');

  loadMessages();
  subscribeTyping();
  updatePresence();

  D.chatMessages.onclick = (e) => {
    if (!e.target.closest('.msg-wrapper')) {
      document.querySelectorAll('.msg-wrapper.show-actions').forEach(w => w.classList.remove('show-actions'));
    }
  };
}

function updateChatHeaderStatus() {
  if (!S.currentConv) return;
  const isGroup = S.currentConv.type === 'group';
  if (isGroup) {
    const participants = S.currentConv.expand?.participants || S.currentConv.participants || [];
    D.chatHeaderStatus.textContent = `${participants.length} participantes`;
  } else {
    const participants = S.currentConv.expand?.participants || [];
    const otherUser = participants.find(p => p.id !== S.user.id);
    const otherUid = otherUser?.id || S.currentConv.participants?.find(p => p !== S.user.id);
    D.chatHeaderStatus.textContent = isOnline(otherUid) ? 'En línea' : 'Desconectado';
  }
}

function closeChat() {
  pb.collection('messages').unsubscribe('msgs');
  pb.collection('typing').unsubscribe('typing');
  S.currentConv = null;
  S.msgEls.clear();
  D.chatView.classList.add('hidden');
  D.bottomNav.classList.remove('hidden');
  D.chatInfoPanel.classList.add('hidden');
}

// ─────────────────────────────────────────────
//  MESSAGES
// ─────────────────────────────────────────────
function loadMessages() {
  if (!S.currentConv) return;
  console.log('[ChatNica] Cargando mensajes para conv:', S.currentConv.id, 'type:', S.currentConv.type);
  S.msgEls.clear();
  D.chatMessages.innerHTML = '';
  D.chatMessages.appendChild(D.emptyChat);
  D.emptyChat.classList.remove('hidden');

  pb.collection('messages').unsubscribe('msgs');
  pb.collection('messages').subscribe('msgs', e => {
    if (e.record.conversation !== S.currentConv?.id) return;
    loadMessagesRealtime();
  });

  loadMessagesRealtime();
}

async function loadMessagesRealtime() {
  try {
    const messages = await pb.collection('messages').getFullList({
      filter: `conversation = "${S.currentConv.id}"`,
      sort: 'created',
      perPage: MSG_LIMIT,
      expand: 'user,replyTo',
    });

    const hasMessages = messages.length > 0;
    D.emptyChat.classList.toggle('hidden', hasMessages);

    if (!hasMessages) {
      D.chatMessages.innerHTML = '';
      D.chatMessages.appendChild(D.emptyChat);
      D.emptyChat.classList.remove('hidden');
      applyFontSizeToChat();
      return;
    }

    D.chatMessages.innerHTML = '';
    S.msgEls.clear();
    messages.forEach(d => {
      const el = buildMsgEl(d);
      D.chatMessages.appendChild(el);
      S.msgEls.set(d.id, el);
    });
    scrollBottom();

    markMessagesDelivered(messages);
    applyFontSizeToChat();
  } catch (e) {
    console.error('[ChatNica] Error cargando mensajes:', e);
  }
}

function buildMsgEl(msg) {
  const isOwn = msg.user === S.user.id;
  const userExpand = msg.expand?.user;
  const color = userExpand?.color || getUserColor(msg.user);
  const displayName = userExpand?.displayName || 'Usuario';
  const photoURL = userExpand ? getFileURL(userExpand, 'photoURL') : null;
  const isGroup = S.currentConv?.type === 'group';

  const replyExpand = msg.expand?.replyTo;
  const replyUser = replyExpand?.expand?.user?.displayName || replyExpand?.replyToUserName || 'Usuario';
  const replyText = replyExpand?.text || '';

  const wrap = document.createElement('div');
  wrap.className = `msg-wrapper ${isOwn ? 'own' : 'other'}`;
  wrap.dataset.msgId = msg.id;

  const avatarHTML = (!isOwn && isGroup) ? `
    <div class="msg-avatar" style="background:${color}">
      ${photoURL ? `<img src="${esc(photoURL)}" alt="">` : getInitials(displayName)}
    </div>` : '';

  const replyHTML = msg.replyTo ? `
    <div class="reply-ctx">
      <div class="reply-ctx-name">${esc(replyUser)}</div>
      <div class="reply-ctx-text">${esc(replyText || '📷 Imagen')}</div>
    </div>` : '';

  const imageSrc = getFileURL(msg, 'image');
  const videoSrc = getFileURL(msg, 'video');
  const audioSrc = getFileURL(msg, 'audio');

  const imgHTML = imageSrc ? `<img src="${esc(imageSrc)}" class="msg-img" alt="imagen" data-fullurl="${esc(imageSrc)}">` : '';
  const videoHTML = videoSrc ? `<video src="${esc(videoSrc)}" controls class="msg-video" preload="metadata"></video>` : '';
  const audioHTML = audioSrc ? `<audio src="${esc(audioSrc)}" controls class="msg-audio"></audio>` : '';

  const reactHTML = buildReactHTML(msg.reactions || {}, msg.id);

  const tickHTML = isOwn ? `<span class="msg-tick" data-msg-id="${msg.id}" data-status="${esc(msg.status || 'sent')}">${getTickIcon(msg.status || 'sent')}</span>` : '';

  const actBtns = `
    <div class="msg-actions">
      <button class="msg-act-btn react-trigger" data-msg-id="${msg.id}" title="Reaccionar">😊</button>
      <button class="msg-act-btn reply-trigger" data-msg-id="${msg.id}" data-msg-text="${esc(msg.text || '')}" data-msg-user="${esc(displayName)}" title="Responder">↩</button>
      ${isOwn ? `<button class="msg-act-btn delete-trigger" data-msg-id="${msg.id}" title="Borrar">🗑</button>` : ''}
    </div>`;

  const senderHTML = (!isOwn && isGroup) ? `<div class="msg-sender" style="color:${color}">${esc(displayName)}</div>` : '';

  wrap.innerHTML = `
    ${avatarHTML}
    <div class="msg-bubble">
      ${actBtns}
      ${replyHTML}
      ${senderHTML}
      ${imgHTML}
      ${videoHTML}
      ${audioHTML}
      ${msg.text ? `<div class="msg-text">${esc(msg.text)}</div>` : ''}
      <div class="msg-foot">
        <span class="msg-time">${fmtTime(msg.created)}</span>
        ${tickHTML}
      </div>
      ${reactHTML}
    </div>`;

  wrap.querySelectorAll('img[data-fullurl]').forEach(img => {
    img.addEventListener('click', () => window.open(img.dataset.fullurl, '_blank', 'noopener,noreferrer'));
  });

  let pt;
  wrap.addEventListener('touchstart', (e) => {
    const target = e.target.closest('.msg-wrapper');
    document.querySelectorAll('.msg-wrapper.show-actions').forEach(w => w.classList.remove('show-actions'));
    if (target) target.classList.add('show-actions');
    pt = setTimeout(() => showPickerFor(msg.id, wrap), 500);
  }, { passive: true });
  wrap.addEventListener('touchend', () => clearTimeout(pt), { passive: true });

  return wrap;
}

function buildReactHTML(reactions, msgId) {
  const entries = Object.entries(reactions).filter(([, uids]) => Array.isArray(uids) && uids.length);
  if (!entries.length) return '';
  return `<div class="react-bar">${
    entries.map(([emoji, uids]) => {
      const mine = uids.includes(S.user.id);
      return `<button class="react-chip${mine ? ' mine' : ''}" data-emoji="${emoji}" data-msg-id="${msgId}">${emoji} ${uids.length}</button>`;
    }).join('')
  }</div>`;
}

async function sendMessage() {
  const text = D.messageInput.value.trim();
  const imageFile = D.imageInput.files[0];
  const videoFile = D.videoInput.files[0];
  if ((!text && !imageFile && !videoFile && !S.pendingFile && !S.pendingVideo) || !S.user) return;

  const fileToSend = imageFile || S.pendingFile;
  const videoToSend = videoFile || S.pendingVideo;
  const isImage = !!fileToSend;
  const isVideo = !!videoToSend;

  if (fileToSend) {
    if (!fileToSend.type.startsWith('image/')) return showToast('Solo imágenes (JPG, PNG, GIF, WebP).');
    if (fileToSend.size > MAX_FILE_MB * 1024 * 1024) return showToast(`Máximo ${MAX_FILE_MB} MB.`);
  }
  if (videoToSend) {
    if (!videoToSend.type.startsWith('video/')) return showToast('Solo videos (MP4, WebM, MOV).');
    if (videoToSend.size > MAX_FILE_MB * 1024 * 1024) return showToast(`Máximo ${MAX_FILE_MB} MB.`);
  }

  D.btnSend.disabled = true;
  D.sendIcon.classList.add('hidden');
  D.sendLoading.classList.remove('hidden');

  try {
    const formData = new FormData();
    formData.append('conversation', S.currentConv.id);
    formData.append('text', text || '');
    formData.append('user', S.user.id);
    formData.append('reactions', JSON.stringify({}));
    formData.append('status', 'sent');

    if (S.replyTo) {
      formData.append('replyTo', S.replyTo.id);
      formData.append('replyToUserName', S.replyTo.user || '');
    }

    if (fileToSend) {
      const blob = await compressImage(fileToSend);
      formData.append('image', blob, fileToSend.name);
    }
    if (videoToSend) {
      formData.append('video', videoToSend);
    }

    await pb.collection('messages').create(formData);

    let lastMsgText = text;
    if (isVideo) lastMsgText = '🎬 Video';
    else if (isImage) lastMsgText = '📷 Imagen';

    await pb.collection('conversations').update(S.currentConv.id, {
      lastMessage: lastMsgText || (isVideo ? '🎬 Video' : '📷 Imagen'),
      lastMessageTime: new Date().toISOString(),
    });

    D.messageInput.value = '';
    clearFilePreview();
    clearReply();
    setTyping(false);
  } catch (e) {
    console.error('[ChatNica] send:', e);
    showToast('Error al enviar: ' + (e.message || e));
  } finally {
    D.btnSend.disabled = false;
    D.sendIcon.classList.remove('hidden');
    D.sendLoading.classList.add('hidden');
  }
}

async function deleteMessage(id) {
  if (!confirm('¿Borrar este mensaje?')) return;
  try {
    await pb.collection('messages').delete(id);
    showToast('Mensaje eliminado');
  } catch (e) { showToast('Error: ' + (e.message || e)); }
}

async function markMessagesDelivered(allMsgs) {
  if (!S.currentConv) return;
  const notOwnNotDelivered = allMsgs.filter(d => {
    return d.user !== S.user.id && (!d.status || d.status === 'sent');
  });
  for (const d of notOwnNotDelivered) {
    try {
      await pb.collection('messages').update(d.id, { status: 'read' });
    } catch (e) {}
  }
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
  try {
    const msg = await pb.collection('messages').getOne(msgId);
    const curr = msg.reactions?.[emoji] || [];
    const op = curr.includes(S.user.id) ? curr.filter(u => u !== S.user.id) : [...curr, S.user.id];
    const newReactions = { ...(msg.reactions || {}), [emoji]: op };
    await pb.collection('messages').update(msgId, { reactions: newReactions });
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
  try {
    let typingRecord = await pb.collection('typing').getFirstListItem(`conversation = "${S.currentConv.id}"`).catch(() => null);

    const typers = typingRecord?.typers || {};
    if (active) {
      typers[S.user.id] = { name: S.profile?.displayName || 'Usuario', ts: new Date().toISOString() };
    } else {
      delete typers[S.user.id];
    }

    if (typingRecord) {
      await pb.collection('typing').update(typingRecord.id, { typers });
    } else if (active) {
      await pb.collection('typing').create({
        conversation: S.currentConv.id,
        typers: { [S.user.id]: { name: S.profile?.displayName || 'Usuario', ts: new Date().toISOString() } },
      });
    }
  } catch (e) {}
}

function subscribeTyping() {
  pb.collection('typing').unsubscribe('typing');
  if (!S.currentConv) return;

  pb.collection('typing').subscribe('typing', e => {
    if (e.record.conversation !== S.currentConv?.id) return;
    const typersData = e.record.typers || {};
    const stale = Date.now() - 5500;
    const typers = Object.entries(typersData)
      .filter(([uid, v]) => uid !== S.user.id && new Date(v.ts).getTime() > stale)
      .map(([, v]) => v.name);
    D.typingIndicator.classList.toggle('hidden', typers.length === 0);
    if (typers.length) {
      D.typingText.textContent = typers.length === 1
        ? `${typers[0]} está escribiendo...`
        : typers.length === 2
          ? `${typers[0]} y ${typers[1]} están escribiendo...`
          : 'Varios están escribiendo...';
    } else {
      D.typingIndicator.classList.add('hidden');
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
  D.btnSend.disabled = true;
  D.sendLoading.classList.remove('hidden');
  try {
    const formData = new FormData();
    formData.append('conversation', S.currentConv.id);
    formData.append('audio', file);
    formData.append('user', S.user.id);
    formData.append('reactions', JSON.stringify({}));
    formData.append('status', 'sent');

    await pb.collection('messages').create(formData);
    await pb.collection('conversations').update(S.currentConv.id, {
      lastMessage: '🎤 Nota de voz',
      lastMessageTime: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[ChatNica] uploadVoiceNote:', e);
    showToast('Error al enviar nota de voz: ' + (e.message || e));
  } finally {
    D.btnSend.disabled = false;
    D.sendLoading.classList.add('hidden');
  }
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
  if (!ALLOWED_TYPES.includes(file.type) || !file.type.startsWith('image/')) { showToast('Solo imágenes (JPG, PNG, GIF, WebP).'); return clearFilePreview(); }
  if (file.size > MAX_FILE_MB * 1024 * 1024) { showToast(`Máximo ${MAX_FILE_MB} MB.`); return clearFilePreview(); }
  S.pendingFile = file;
  S.pendingVideo = null;
  D.filePreviewName.textContent = file.name;
  D.filePreview.classList.remove('hidden');
}

function onVideoChange() {
  const file = D.videoInput.files[0];
  if (!file) return clearFilePreview();
  if (!file.type.startsWith('video/')) { showToast('Solo videos (MP4, WebM, MOV).'); return clearFilePreview(); }
  if (file.size > MAX_FILE_MB * 1024 * 1024) { showToast(`Máximo ${MAX_FILE_MB} MB.`); return clearFilePreview(); }
  S.pendingVideo = file;
  S.pendingFile = null;
  D.filePreviewName.textContent = file.name;
  D.filePreview.classList.remove('hidden');
}

function clearFilePreview() {
  D.imageInput.value = '';
  D.videoInput.value = '';
  S.pendingFile = null;
  S.pendingVideo = null;
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
    const participants = S.currentConv.expand?.participants || [];
    html += `<div class="text-center mb-6">
      <div class="profile-avatar-large mx-auto mb-3" style="background:#004A99">
        ${getInitials(S.currentConv.name || 'G')}
      </div>
      <h3 class="text-lg font-bold">${esc(S.currentConv.name || 'Grupo')}</h3>
      <p class="text-sm text-nica-muted">${participants.length} participantes</p>
    </div>`;
  }

  html += '<h4 class="text-sm font-bold text-nica-muted uppercase tracking-wider mb-3">Participantes</h4>';

  const participants = S.currentConv.expand?.participants || [];
  for (const user of participants) {
    const online = isOnline(user.id);
    const photoURL = getFileURL(user, 'photoURL');
    html += `
      <div class="chat-info-member">
        <div class="chat-info-avatar" style="background:${user.color || getUserColor(user.id)}">
          ${photoURL ? `<img src="${esc(photoURL)}" alt="">` : getInitials(user.displayName || 'U')}
        </div>
        <div class="flex-1">
          <div class="text-sm font-bold">${esc(user.displayName || 'Usuario')}${user.id === S.user.id ? ' (Tú)' : ''}</div>
          <div class="text-xs text-nica-muted">${online ? 'En línea' : 'Desconectado'}</div>
        </div>
      </div>`;
  }

  if (isGroup && S.currentConv.createdBy === S.user.id) {
    html += `
      <button id="btn-invite-to-group" class="auth-btn-primary mt-4">Invitar más personas</button>
      <button id="btn-leave-group" class="auth-btn-primary mt-2" style="background:linear-gradient(135deg,#EF4444,#DC2626)">Salir del grupo</button>`;
  }

  D.chatInfoContent.innerHTML = html;
  D.chatInfoPanel.classList.remove('hidden');

  D.chatInfoContent.querySelector('#btn-leave-group')?.addEventListener('click', async () => {
    if (!confirm('¿Seguro que quieres salir del grupo?')) return;
    try {
      const participants = S.currentConv.expand?.participants || [];
      const newParticipants = participants
        .filter(p => p.id !== S.user.id)
        .map(p => p.id);
      if (newParticipants.length === 0) {
        await pb.collection('conversations').delete(S.currentConv.id);
      } else {
        await pb.collection('conversations').update(S.currentConv.id, { participants: newParticipants });
      }
      closeChat();
      D.chatInfoPanel.classList.add('hidden');
      showToast('Saliste del grupo');
    } catch (e) { showToast('Error: ' + (e.message || e)); }
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

    pb.collection('posts').subscribe('feed', () => {
      loadFeed(contactUids);
    });

    loadFeed(contactUids);
  });
}

async function loadFeed(contactUids) {
  try {
    const filterParts = contactUids.slice(0, 10).map(uid => `uid = "${uid}"`).join(' || ');
    const posts = await pb.collection('posts').getFullList({
      filter: filterParts,
      sort: '-created',
      expand: 'uid',
    });
    renderFeed(posts);
  } catch (e) {
    console.error('[ChatNica] feed error:', e);
  }
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
  applyFontSizeToChat();
}

function postCardHTML(p) {
  const userExpand = p.expand?.uid;
  const color = userExpand?.color || getUserColor(p.uid);
  const name = esc(userExpand?.displayName || 'Usuario');
  const time = p.created ? fmtTimeAgo(p.created) : '';
  const liked = p.likes?.includes(S.user.id);
  const likeCount = p.likes?.length || 0;
  const commentCount = p.comments?.length || 0;

  const photoURL = userExpand ? getFileURL(userExpand, 'photoURL') : null;
  const avatarInner = photoURL
    ? `<img src="${esc(photoURL)}" alt="">`
    : getInitials(userExpand?.displayName || 'U');

  const imagesHTML = p.images?.length
    ? `<div class="post-images">${p.images.map((img, i) => {
        const url = getMultiFileURL(p, 'images', i);
        return `<img src="${esc(url)}" alt="" onclick="window.open('${esc(url)}','_blank','noopener,noreferrer')">`;
      }).join('')}</div>`
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
    const formData = new FormData();
    formData.append('uid', S.user.id);
    formData.append('text', text || '');
    formData.append('likes', JSON.stringify([]));
    formData.append('comments', JSON.stringify([]));

    for (const file of images) {
      const blob = await compressImage(file);
      formData.append('images', blob, file.name);
    }

    await pb.collection('posts').create(formData);
    showToast('Publicación creada');
    closeModal(D.modalNewPost);
    D.postText.value = '';
    D.postImages.value = '';
    D.postImagesPreview.innerHTML = '';
    D.postImagesPreview.classList.add('hidden');
  } catch (e) { showToast('Error: ' + (e.message || e)); }
  finally { D.btnPublish.disabled = false; D.btnPublish.textContent = 'Publicar'; }
}

async function toggleLike(postId) {
  try {
    const post = await pb.collection('posts').getOne(postId);
    const likes = post.likes || [];
    const op = likes.includes(S.user.id) ? likes.filter(u => u !== S.user.id) : [...likes, S.user.id];
    await pb.collection('posts').update(postId, { likes: op });
  } catch (e) { console.error(e); }
}

async function addComment(postId, text) {
  if (!text.trim()) return;
  try {
    const post = await pb.collection('posts').getOne(postId);
    const comments = post.comments || [];
    comments.push({
      uid: S.user.id,
      userName: S.profile.displayName,
      userPhotoURL: getFileURL(S.profile, 'photoURL'),
      color: S.profile.color || getUserColor(S.user.id),
      text: text.trim(),
      timestamp: new Date().toISOString(),
    });
    await pb.collection('posts').update(postId, { comments });
  } catch (e) { showToast('Error: ' + (e.message || e)); }
}

// ─────────────────────────────────────────────
//  STORIES
// ─────────────────────────────────────────────
function subscribeStories() {
  S.unsubStories?.();

  pb.collection('stories').subscribe('stories', () => {
    loadStories();
  });

  loadStories();
}

async function loadStories() {
  try {
    const expiresAt = new Date().toISOString();
    const stories = await pb.collection('stories').getFullList({
      filter: `expiresAt > "${expiresAt}"`,
    });
    const grouped = {};
    stories.forEach(s => {
      if (!grouped[s.uid]) grouped[s.uid] = [];
      grouped[s.uid].push(s);
    });
    renderStoriesBar(grouped);
  } catch (e) {}
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
      if (uid === S.user.id || !contactUids.has(uid)) continue;
      const first = userStories[0];
      const seen = first.views?.includes(S.user.id);
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
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const formData = new FormData();
    formData.append('uid', S.user.id);
    formData.append('type', type);
    formData.append('expiresAt', expiresAt);
    formData.append('views', JSON.stringify([]));

    if (type === 'image') {
      const blob = await compressImage(content);
      formData.append('image', blob);
    } else {
      formData.append('text', content);
    }

    await pb.collection('stories').create(formData);
    showToast('Estado publicado');
    closeModal(D.modalStory);
    D.storyImageInput.value = '';
    D.storyTextInput.value = '';
    D.storyImagePreview.innerHTML = '';
    D.storyImagePreview.classList.add('hidden');
  } catch (e) { showToast('Error: ' + (e.message || e)); }
  finally { D.btnPublishStory.disabled = false; D.btnPublishStory.textContent = 'Publicar estado'; }
}

async function viewStoriesForUser(uid) {
  const expiresAt = new Date().toISOString();
  try {
    const stories = await pb.collection('stories').getFullList({
      filter: `uid = "${uid}" && expiresAt > "${expiresAt}"`,
    });
    if (!stories.length) return;

    let currentIndex = 0;

    function renderStory(idx) {
      const story = stories[idx];
      D.viewStoryName.textContent = story.userName || 'Usuario';
      D.viewStoryTime.textContent = fmtTimeAgo(story.created);

      const avatarInner = story.userPhotoURL
        ? `<img src="${esc(story.userPhotoURL)}" alt="">`
        : getInitials(story.userName || 'U');
      D.viewStoryAvatar.innerHTML = `<div class="w-full h-full rounded-full" style="background:${story.color || getUserColor(uid)}">${avatarInner}</div>`;

      if (story.type === 'image') {
        const imageSrc = getFileURL(story, 'image');
        D.viewStoryContent.innerHTML = `<img src="${esc(imageSrc)}" alt="estado">`;
      } else {
        D.viewStoryContent.innerHTML = `<div class="story-text-content">${esc(story.text)}</div>`;
      }

      if (story.uid === S.user.id) {
        D.viewStoryDelete.classList.remove('hidden');
        D.viewStoryDelete.onclick = async () => {
          if (!confirm('¿Borrar este estado?')) return;
          await pb.collection('stories').delete(story.id);
          stories.splice(idx, 1);
          if (stories.length === 0) {
            D.modalViewStory.classList.add('hidden');
            showToast('Estado eliminado');
          } else {
            if (currentIndex >= stories.length) currentIndex = stories.length - 1;
            renderStory(currentIndex);
          }
        };
      } else {
        D.viewStoryDelete.classList.add('hidden');
        if (!story.views?.includes(S.user.id)) {
          const views = [...(story.views || []), S.user.id];
          pb.collection('stories').update(story.id, { views }).catch(() => {});
        }
      }

      D.modalViewStory.classList.remove('hidden');
    }

    renderStory(0);

    D.viewStoryContent.onclick = (e) => {
      const rect = D.viewStoryContent.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const mid = rect.width / 2;
      if (x < mid && currentIndex > 0) {
        currentIndex--;
        renderStory(currentIndex);
      } else if (x >= mid && currentIndex < stories.length - 1) {
        currentIndex++;
        renderStory(currentIndex);
      } else if (x >= mid) {
        D.modalViewStory.classList.add('hidden');
      }
    };
  } catch (e) {
    console.error('[ChatNica] viewStoriesForUser:', e);
  }
}

// ─────────────────────────────────────────────
//  PROFILE
// ─────────────────────────────────────────────
function openEditProfile() {
  D.editName.value = S.profile.displayName || '';
  D.editBio.value = S.profile.bio || '';
  D.editCity.value = S.profile.city || '';
  D.editDepartment.value = S.profile.department || '';

  const photoURL = getFileURL(S.profile, 'photoURL');
  if (photoURL) {
    D.editProfileAvatar.innerHTML = `<img src="${esc(photoURL)}" alt="" class="w-full h-full object-cover">`;
    D.editProfileAvatar.style.background = 'transparent';
  } else {
    D.editProfileAvatar.textContent = getInitials(S.profile.displayName);
    D.editProfileAvatar.style.background = S.profile.color || getUserColor(S.user.id);
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
      department: D.editDepartment.value,
    };

    await pb.collection('users').update(S.user.id, updates);
    S.profile = { ...S.profile, ...updates };
    updateHeader();
    updateProfileTab();
    closeModal(D.modalEditProfile);
    showToast('Perfil actualizado');
  } catch (e) { showToast('Error: ' + (e.message || e)); }
  finally { D.btnSaveProfile.disabled = false; D.btnSaveProfile.textContent = 'Guardar cambios'; }
}

async function updateProfilePhoto(file) {
  if (!file || !ALLOWED_TYPES.includes(file.type)) return showToast('Solo imágenes.');
  try {
    const blob = await compressImage(file, 400, 0.85);
    await pb.collection('users').update(S.user.id, { photoURL: blob });
    const updated = await pb.collection('users').getOne(S.user.id);
    S.profile = { ...S.profile, ...updated };
    updateHeader();
    updateProfileTab();

    const photoURL = getFileURL(S.profile, 'photoURL');
    if (photoURL) {
      D.editProfileAvatar.innerHTML = `<img src="${esc(photoURL)}" alt="" class="w-full h-full object-cover">`;
      D.editProfileAvatar.style.background = 'transparent';
    }
    showToast('Foto actualizada');
  } catch (e) { showToast('Error: ' + (e.message || e)); }
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
      const color = c.color || getUserColor(c.uid);
      const name = esc(c.displayName || 'Usuario');
      const photoURL = getFileURL(c, 'photoURL');
      const avatarInner = photoURL
        ? `<img src="${esc(photoURL)}" alt="" class="w-full h-full object-cover">`
        : getInitials(c.displayName || 'U');
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
      const color = c.color || getUserColor(c.uid);
      const name = esc(c.displayName || 'Usuario');
      const photoURL = getFileURL(c, 'photoURL');
      const avatarInner = photoURL
        ? `<img src="${esc(photoURL)}" alt="" class="w-full h-full object-cover">`
        : getInitials(c.displayName || 'U');
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
      D.contactsDiscoverList.innerHTML = '<p class="text-center text-nica-muted py-4 text-sm">No se encontraron resultados</p>';
      D.contactsDiscoverSection.classList.remove('hidden');
      return;
    }
    D.contactsPendingSection.classList.add('hidden');
    D.emptyContacts.classList.add('hidden');
    D.contactsDiscoverList.innerHTML = results.map(u => {
      const color = u.color || getUserColor(u.id);
      const name = esc(u.displayName || 'Usuario');
      const city = u.city ? esc(u.city) : '';
      const photoURL = getFileURL(u, 'photoURL');
      const avatarInner = photoURL
        ? `<img src="${esc(photoURL)}" alt="" class="w-full h-full object-cover">`
        : getInitials(u.displayName || 'U');
      return `
        <div class="contact-item">
          <div class="contact-avatar" style="background:${color}">${avatarInner}</div>
          <div class="contact-info">
            <div class="contact-name">${name}</div>
            ${city ? `<div class="contact-city">${city}</div>` : ''}
          </div>
          <div class="contact-actions">
            <button class="contact-btn contact-btn-chat" data-action="add-contact" data-uid="${u.id}">Agregar</button>
          </div>
        </div>`;
    }).join('');
    D.contactsDiscoverSection.classList.remove('hidden');
  }, 400);
});

// ─────────────────────────────────────────────
//  SESSION
// ─────────────────────────────────────────────
function startSession() {
  updateHeader();
  updateProfileTab();
  subscribePresence();
  subscribeStories();
  updatePresence();
  S.presTimer = setInterval(updatePresence, PRESENCE_INTERVAL_MS);
  switchTab('chats');
}

function stopAllSubscriptions() {
  pb.collection('conversations').unsubscribe('convs');
  pb.collection('contacts').unsubscribe('contacts');
  pb.collection('posts').unsubscribe('feed');
  pb.collection('stories').unsubscribe('stories');
  pb.collection('presence').unsubscribe('presence');
  pb.collection('typing').unsubscribe('typing');
  pb.collection('messages').unsubscribe('msgs');

  S.unsubConvs = S.unsubMsgs = S.unsubContacts = null;
  S.unsubFeed = S.unsubStories = S.unsubTyping = null;
  S.msgEls.clear();
  clearTimeout(S.typingTimer);
}

// ─────────────────────────────────────────────
//  AUTH STATE LISTENER
// ─────────────────────────────────────────────
pb.authStore.onChange(async () => {
  try {
    if (pb.authStore.isValid && pb.authStore.model) {
      S.user = pb.authStore.model;
      S.profile = await ensureProfile(S.user);
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
    showAuthError('login', friendlyError(e.message));
    showScreen('auth');
  }
});

// ─────────────────────────────────────────────
//  INIT & EVENT LISTENERS
// ─────────────────────────────────────────────
(function init() {
  showScreen('loading');

  D.btnGoogle.addEventListener('click', loginWithGoogle);
  D.loginBtn.addEventListener('click', loginWithEmail);
  D.regBtn.addEventListener('click', registerWithEmail);
  D.btnLogout.addEventListener('click', logout);
  D.showRegister.addEventListener('click', () => showAuthView('register'));
  D.showLogin.addEventListener('click', () => showAuthView('login'));
  [D.loginEmail, D.loginPassword].forEach(el =>
    el.addEventListener('keydown', e => { if (e.key === 'Enter') loginWithEmail(); })
  );

  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  D.btnNew.addEventListener('click', openNewConvModal);
  D.btnReload.addEventListener('click', () => window.location.reload());
  D.headerAvatar.addEventListener('click', () => switchTab('profile'));

  D.btnNewDirect.addEventListener('click', openSelectContactModal);
  D.btnNewGroup.addEventListener('click', openCreateGroupModal);

  D.btnCreateGroup.addEventListener('click', async () => {
    const name = D.groupName.value.trim();
    if (!name) return showToast('Ponle nombre al grupo.');
    const members = [...D.groupMembersSelect.querySelectorAll('.group-member-checkbox:checked')].map(cb => cb.value);
    if (!members.length) return showToast('Selecciona al menos un contacto.');
    try {
      const convId = await createGroup(name, members);
      closeModal(D.modalCreateGroup);
      const conv = await pb.collection('conversations').getOne(convId);
      if (conv) openChat(convId, conv);
    } catch (e) { showToast('Error: ' + (e.message || e)); }
  });

  D.convsList.addEventListener('click', async e => {
    const item = e.target.closest('.conv-item');
    if (!item) return;
    const convId = item.dataset.convId;
    try {
      const conv = await pb.collection('conversations').getOne(convId, { expand: 'participants' });
      if (conv) openChat(convId, conv);
    } catch (e) {}
  });

  document.getElementById('contacts-list').addEventListener('click', async e => {
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
      const conv = await pb.collection('conversations').getOne(convId, { expand: 'participants' });
      if (conv) openChat(convId, conv);
      return;
    }
  });

  D.selectContactList.addEventListener('click', async e => {
    const item = e.target.closest('.group-member-select');
    if (!item) return;
    closeModal(D.modalSelectContact);
    const convId = await getOrCreateDirectConv(item.dataset.uid);
    const conv = await pb.collection('conversations').getOne(convId, { expand: 'participants' });
    if (conv) openChat(convId, conv);
  });

  D.chatBackBtn.addEventListener('click', closeChat);
  D.chatInfoBtn.addEventListener('click', openChatInfo);
  D.chatInfoBack.addEventListener('click', closeChatInfo);

  D.messageForm.addEventListener('submit', e => { e.preventDefault(); sendMessage(); });
  D.messageInput.addEventListener('input', onType);
  D.messageInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  D.micBtn.addEventListener('click', startRecording);
  D.stopRecBtn.addEventListener('click', stopRecording);

  D.imageInput.addEventListener('change', onFileChange);
  D.videoInput.addEventListener('change', onVideoChange);
  D.fileClearBtn.addEventListener('click', clearFilePreview);

  D.cancelReply.addEventListener('click', clearReply);

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

  D.reactionPopover.addEventListener('click', e => {
    const btn = e.target.closest('[data-emoji]');
    if (btn && S.pickerTarget) toggleReaction(S.pickerTarget, btn.dataset.emoji);
  });
  document.addEventListener('click', e => {
    if (!D.reactionPopover.classList.contains('hidden') &&
        !D.reactionPopover.contains(e.target) &&
        !e.target.closest('.react-trigger')) hidePicker();
  });

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

  D.btnPublish.addEventListener('click', () => {
    const text = D.postText.value.trim();
    const files = D.postImages.files ? Array.from(D.postImages.files) : [];
    createPost(text, files);
  });

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

  D.btnEditProfile.addEventListener('click', openEditProfile);
  D.btnSaveProfile.addEventListener('click', saveProfile);
  D.profilePhotoInput.addEventListener('change', () => {
    const file = D.profilePhotoInput.files[0];
    if (file) updateProfilePhoto(file);
  });
  D.btnMyStories.addEventListener('click', () => {
    viewStoriesForUser(S.user.id);
  });

  D.btnAppSettings.addEventListener('click', () => {
    const saved = localStorage.getItem('chatnica-font-size');
    const size = saved ? parseInt(saved) : DEFAULT_FONT_SIZE;
    D.fontSizeSlider.value = size;
    applyFontSize(size);
    D.modalAppSettings.classList.remove('hidden');
  });

  D.modalAppSettings.querySelector('.modal-close').addEventListener('click', () => {
    D.modalAppSettings.classList.add('hidden');
  });

  D.fontSizeSlider.addEventListener('input', () => {
    const size = parseInt(D.fontSizeSlider.value);
    applyFontSize(size);
    localStorage.setItem('chatnica-font-size', size);
  });

  D.btnResetFont.addEventListener('click', () => {
    applyFontSize(DEFAULT_FONT_SIZE);
    D.fontSizeSlider.value = DEFAULT_FONT_SIZE;
    localStorage.setItem('chatnica-font-size', DEFAULT_FONT_SIZE);
    showToast('Tamaño de texto restablecido');
  });

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.fixed').classList.add('hidden');
    });
  });

  [D.modalNewConv, D.modalCreateGroup, D.modalNewPost, D.modalStory, D.modalEditProfile, D.modalSelectContact, D.modalAppSettings].forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  });

  window.addEventListener('beforeunload', () => {
    setTyping(false);
    setPresenceOffline();
  });
})();
