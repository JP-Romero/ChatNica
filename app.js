import { 
  db, 
  auth, 
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  collection, 
  addDoc, 
  query, 
  orderBy, 
  where,
  limitToLast,
  onSnapshot, 
  serverTimestamp, 
  signInAnonymously, 
  onAuthStateChanged 
} from "./firebase-config.js";

// ─────────────────────────────────────────────
//  DOM ELEMENTS
// ─────────────────────────────────────────────
const loginScreen      = document.getElementById('login-screen');
const chatScreen       = document.getElementById('chat-screen');
const loginForm        = document.getElementById('login-form');
const usernameInput    = document.getElementById('username-input');
const messageForm      = document.getElementById('message-form');
const messageInput     = document.getElementById('message-input');
const imageInput       = document.getElementById('image-input');
const btnSend          = document.getElementById('btn-send');
const sendIcon         = document.getElementById('send-icon');
const sendLoading      = document.getElementById('send-loading');
const messagesContainer = document.getElementById('messages-container');
const emptyState       = document.getElementById('empty-state');
const btnLogout        = document.getElementById('btn-logout');
const connectionStatus = document.getElementById('connection-status');
const pendingIndicator = document.getElementById('pending-indicator');
const pendingCount     = document.getElementById('pending-count');
const channelsBar      = document.getElementById('channels-bar');
const filePreview      = document.getElementById('file-preview');      // nuevo elemento
const filePreviewName  = document.getElementById('file-preview-name'); // nuevo elemento
const fileClearBtn     = document.getElementById('file-clear-btn');    // nuevo elemento

let currentUser        = null;
let unsubscribeMessages = null;
let isTabActive        = true;
let unreadCount        = 0;
let currentChannel     = 'general';

// ─────────────────────────────────────────────
//  UTILIDADES
// ─────────────────────────────────────────────

/** Escapa caracteres peligrosos para prevenir XSS */
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]));
}

// ─────────────────────────────────────────────
//  AUTH LOGIC
// ─────────────────────────────────────────────

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    const savedName = localStorage.getItem('chatnica_name');
    if (savedName) {
      showChat(savedName);
    } else {
      showLogin();
    }
  } else {
    currentUser = null;
    showLogin();
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = usernameInput.value.trim();
  if (!name) return;

  try {
    localStorage.setItem('chatnica_name', name);
    if (!auth.currentUser) {
      await signInAnonymously(auth);
      // onAuthStateChanged llamará showChat cuando el login se complete
    } else {
      showChat(name);
    }
  } catch (error) {
    console.error('Error al entrar (Firebase):', error);
    const errorMsg = error.message || '';
    if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('api-key-not-valid')) {
      alert("¡Casi listo! Por favor, configura tus credenciales reales de Firebase en 'firebase-config.js'.");
    } else {
      alert('Hubo un error al intentar entrar. ' + (error.code || error.message));
    }
  }
});

btnLogout.addEventListener('click', async () => {
  localStorage.removeItem('chatnica_name');
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }
  await auth.signOut();
});

function showLogin() {
  loginScreen.classList.remove('hidden');
  chatScreen.classList.add('hidden');
  btnLogout.classList.add('hidden');
  // Limpiar estado del formulario al salir
  messageInput.value = '';
  imageInput.value = '';
  hideFilePreview();

  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }
}

function showChat(name) {
  loginScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  btnLogout.classList.remove('hidden');

  if (!unsubscribeMessages) {
    loadMessages();
  }
}

// ─────────────────────────────────────────────
//  SELECCIÓN DE IMAGEN — feedback visual
// ─────────────────────────────────────────────

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_TYPES    = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (!file) { hideFilePreview(); return; }

  // Validar tipo
  if (!ALLOWED_TYPES.includes(file.type)) {
    alert('Solo se permiten imágenes (JPEG, PNG, GIF, WebP).');
    imageInput.value = '';
    hideFilePreview();
    return;
  }

  // Validar tamaño (< 5 MB)
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    alert(`La imagen es demasiado grande. El tamaño máximo es ${MAX_FILE_SIZE_MB} MB.`);
    imageInput.value = '';
    hideFilePreview();
    return;
  }

  // Mostrar nombre del archivo seleccionado
  showFilePreview(file.name);
});

// Botón para limpiar archivo seleccionado
if (fileClearBtn) {
  fileClearBtn.addEventListener('click', () => {
    imageInput.value = '';
    hideFilePreview();
  });
}

function showFilePreview(fileName) {
  if (!filePreview || !filePreviewName) return;
  filePreviewName.textContent = fileName;
  filePreview.classList.remove('hidden');
}

function hideFilePreview() {
  if (!filePreview) return;
  filePreview.classList.add('hidden');
  if (filePreviewName) filePreviewName.textContent = '';
}

// ─────────────────────────────────────────────
//  MESSAGES LOGIC
// ─────────────────────────────────────────────

channelsBar.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || btn.dataset.channel === currentChannel) return;

  currentChannel = btn.dataset.channel;

  document.querySelectorAll('.channel-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Limpiar input al cambiar de canal
  messageInput.value = '';
  imageInput.value = '';
  hideFilePreview();

  if (unsubscribeMessages) unsubscribeMessages();
  loadMessages();
});

messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  const file = imageInput.files[0];
  const name = localStorage.getItem('chatnica_name');

  if ((!text && !file) || !name || !auth.currentUser) return;

  // Doble validación de archivo (por si acaso)
  if (file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Tipo de archivo no permitido.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`La imagen supera el límite de ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }
  }

  try {
    btnSend.disabled = true;
    sendIcon.classList.add('hidden');
    sendLoading.classList.remove('hidden');

    let imageUrl = null;

    if (file) {
      const fileRef = ref(storage, `chats/${currentChannel}/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(fileRef, file);
      imageUrl = await getDownloadURL(uploadResult.ref);
    }

    const messageContent = text;
    messageInput.value = '';
    imageInput.value = '';
    hideFilePreview();

    await addDoc(collection(db, 'messages'), {
      text: messageContent,
      image: imageUrl,
      user: name,
      uid: auth.currentUser.uid,
      channel: currentChannel,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    alert('Error al enviar: ' + error.message);
  } finally {
    btnSend.disabled = false;
    sendIcon.classList.remove('hidden');
    sendLoading.classList.add('hidden');
  }
});

function loadMessages() {
  const q = query(
    collection(db, 'messages'),
    where('channel', '==', currentChannel),
    orderBy('timestamp', 'asc'),
    limitToLast(50)
  );

  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    const pending = snapshot.metadata.hasPendingWrites;
    // FIX: actualizar el contador real de mensajes pendientes
    const pendingDocs = snapshot.docs.filter(d => d.metadata.hasPendingWrites).length;
    updatePendingIndicator(pending, pendingDocs);

    if (snapshot.empty) {
      emptyState.classList.remove('hidden');
      messagesContainer.innerHTML = '';
      messagesContainer.appendChild(emptyState);
      return;
    }

    emptyState.classList.add('hidden');
    messagesContainer.innerHTML = '';

    snapshot.forEach((doc) => {
      const msg = doc.data();
      renderMessage(msg);
    });

    scrollToBottom();
  }, (error) => {
    console.error('Error al cargar mensajes:', error);
    if (error.code === 'permission-denied') {
      console.warn('Permiso denegado. Revisa las reglas de Firestore.');
    }
  });
}

function getUserColor(uid) {
  const colors = [
    '#60A5FA', '#F87171', '#34D399', '#FBBF24',
    '#A78BFA', '#F472B6', '#2DD4BF', '#FB923C'
  ];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function renderMessage(msg) {
  const isOwn = msg.uid === auth.currentUser.uid;
  const div   = document.createElement('div');
  div.className = `flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 items-end gap-2`;

  const time     = msg.timestamp
    ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '...';
  const color    = getUserColor(msg.uid);
  const initials = msg.user ? msg.user.charAt(0).toUpperCase() : '?';
  const safeUser = escapeHTML(msg.user);
  const safeText = escapeHTML(msg.text);
  // FIX: escapar también la URL de la imagen para evitar XSS
  const safeImage = escapeHTML(msg.image);

  const avatarHTML = isOwn ? '' : `
    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg"
         style="background-color: ${color}">
      ${initials}
    </div>`;

  // FIX: usar data-src en lugar de onclick inline con URL sin escapar
  const imageHTML = safeImage ? `
    <img src="${safeImage}"
         class="rounded-lg mb-2 max-h-60 w-full object-cover cursor-pointer hover:opacity-90 transition"
         alt="Imagen compartida"
         data-fullurl="${safeImage}">` : '';

  div.innerHTML = `
    ${avatarHTML}
    <div class="message-bubble ${isOwn ? 'own' : 'other'}"
         style="${!isOwn ? `border-left: 4px solid ${color}` : ''}">
      <div class="text-[10px] opacity-60 mb-1 font-bold flex justify-between gap-4">
        <span>${isOwn ? 'Tú' : safeUser}</span>
      </div>
      ${imageHTML}
      ${safeText ? `<div class="text-sm md:text-base break-words">${safeText}</div>` : ''}
      <div class="text-[9px] opacity-40 text-right mt-1">${time}</div>
    </div>`;

  messagesContainer.appendChild(div);

  if (!isTabActive && !isOwn) {
    unreadCount++;
    document.title = `(${unreadCount}) 💬 ChatNica`;
  }
}

// FIX: delegated listener para abrir imágenes — seguro, sin onclick inline
messagesContainer.addEventListener('click', (e) => {
  const img = e.target.closest('img[data-fullurl]');
  if (img && img.dataset.fullurl) {
    window.open(img.dataset.fullurl, '_blank', 'noopener,noreferrer');
  }
});

// ─────────────────────────────────────────────
//  NOTIFICATIONS & TAB STATE
// ─────────────────────────────────────────────

window.addEventListener('focus', () => {
  isTabActive = true;
  unreadCount = 0;
  document.title = '💬 ChatNica - Mensajería Local';
});

window.addEventListener('blur', () => {
  isTabActive = false;
});

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ─────────────────────────────────────────────
//  CONNECTION LOGIC
// ─────────────────────────────────────────────

function updateStatus() {
  if (navigator.onLine) {
    connectionStatus.textContent = '🟢 En línea';
    connectionStatus.className   = 'text-sm text-green-400 font-medium';
  } else {
    connectionStatus.textContent = '🔴 Sin conexión';
    connectionStatus.className   = 'text-sm text-red-400 font-medium';
  }
}

// FIX: actualizar el texto del contador de mensajes pendientes
function updatePendingIndicator(isPending, count) {
  if (isPending) {
    pendingIndicator.classList.remove('hidden');
    pendingCount.textContent = count > 0 ? count : '...';
  } else {
    pendingIndicator.classList.add('hidden');
  }
}

window.addEventListener('online',  updateStatus);
window.addEventListener('offline', updateStatus);
updateStatus();
