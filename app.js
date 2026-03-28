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
  onSnapshot, 
  serverTimestamp, 
  signInAnonymously, 
  onAuthStateChanged 
} from "./firebase-config.js";

// ─────────────────────────────────────────────
//  DOM ELEMENTS
// ─────────────────────────────────────────────
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const imageInput = document.getElementById('image-input');
const messagesContainer = document.getElementById('messages-container');
const emptyState = document.getElementById('empty-state');
const btnLogout = document.getElementById('btn-logout');
const connectionStatus = document.getElementById('connection-status');
const pendingIndicator = document.getElementById('pending-indicator');
const pendingCount = document.getElementById('pending-count');
const channelsBar = document.getElementById('channels-bar');

let currentUser = null;
let unsubscribeMessages = null;
let isTabActive = true;
let unreadCount = 0;
let currentChannel = 'general';

// ─────────────────────────────────────────────
//  AUTH LOGIC
// ─────────────────────────────────────────────

// Verificar estado de autenticación
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

// Manejar Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = usernameInput.value.trim();
  if (!name) return;

  try {
    localStorage.setItem('chatnica_name', name);
    if (!auth.currentUser) {
      // Si la configuración es la de ejemplo, Firebase lanzará un error
      await signInAnonymously(auth);
    } else {
        // Si ya hay usuario pero faltaba el nombre, solo mostrar chat
        showChat(name);
    }
  } catch (error) {
    console.error("Error al entrar (Firebase):", error);
    
    // Mensaje amigable para el desarrollador si no ha configurado sus credenciales
    const errorMsg = error.message || "";
    if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('api-key-not-valid')) {
        alert("¡Casi listo! Por favor, configura tus credenciales reales de Firebase en 'firebase-config.js' para que el chat funcione.");
    } else {
        alert("Hubo un error al intentar entrar. " + (error.code || error.message));
    }
  }
});

// Manejar Logout
btnLogout.addEventListener('click', async () => {
  localStorage.removeItem('chatnica_name');
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }
  await auth.signOut();
  // Al cambiar el estado de auth, onAuthStateChanged llamará a showLogin()
});

function showLogin() {
  loginScreen.classList.remove('hidden');
  chatScreen.classList.add('hidden');
  btnLogout.classList.add('hidden');
  
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }
}

function showChat(name) {
  loginScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  btnLogout.classList.remove('hidden');
  
  // Evitar duplicar el escuchador
  if (!unsubscribeMessages) {
    loadMessages();
  }
}

// ─────────────────────────────────────────────
//  MESSAGES LOGIC
// ─────────────────────────────────────────────

// Manejar cambio de canal
channelsBar.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || btn.dataset.channel === currentChannel) return;

  currentChannel = btn.dataset.channel;
  
  // UI update
  document.querySelectorAll('.channel-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Recargar mensajes
  if (unsubscribeMessages) unsubscribeMessages();
  loadMessages();
});

// Enviar Mensaje
messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  const file = imageInput.files[0];
  const name = localStorage.getItem('chatnica_name');

  if ((!text && !file) || !name || !auth.currentUser) return;

  try {
    let imageUrl = null;

    // Si hay archivo, subirlo primero
    if (file) {
      const fileRef = ref(storage, `chats/${currentChannel}/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(fileRef, file);
      imageUrl = await getDownloadURL(uploadResult.ref);
    }

    const messageContent = text;
    messageInput.value = '';
    imageInput.value = ''; // Limpiar selector de archivo
    
    await addDoc(collection(db, "messages"), {
      text: messageContent,
      image: imageUrl,
      user: name,
      uid: auth.currentUser.uid,
      channel: currentChannel,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
    alert("Error al enviar: " + error.message);
  }
});

// Cargar Mensajes en tiempo real
function loadMessages() {
  const q = query(
    collection(db, "messages"), 
    where("channel", "==", currentChannel),
    orderBy("timestamp", "asc")
  );
  
  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    // Si hay cambios locales que aún no se suben
    const pending = snapshot.metadata.hasPendingWrites;
    updatePendingIndicator(pending, snapshot.docChanges().length);

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
    console.error("Error al cargar mensajes:", error);
    if (error.code === 'permission-denied') {
        console.warn("Permiso denegado. Es posible que las reglas de Firestore deban actualizarse.");
    }
  });
}

function getUserColor(uid) {
  const colors = [
    '#60A5FA', '#F87171', '#34D399', '#FBBF24', '#A78BFA', '#F472B6', '#2DD4BF', '#FB923C'
  ];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function renderMessage(msg) {
  const isOwn = msg.uid === auth.currentUser.uid;
  const div = document.createElement('div');
  div.className = `flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 items-end gap-2`;

  const time = msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';
  const color = getUserColor(msg.uid);
  const initials = msg.user ? msg.user.charAt(0).toUpperCase() : '?';

  const avatarHTML = isOwn ? '' : `
    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg" style="background-color: ${color}">
      ${initials}
    </div>
  `;

  const imageHTML = msg.image ? `
    <img src="${msg.image}" class="rounded-lg mb-2 max-h-60 w-full object-cover cursor-pointer hover:opacity-90 transition" 
      onclick="window.open('${msg.image}', '_blank')">
  ` : '';

  div.innerHTML = `
    ${avatarHTML}
    <div class="message-bubble ${isOwn ? 'own' : 'other'}" style="${!isOwn ? `border-left: 4px solid ${color}` : ''}">
      <div class="text-[10px] opacity-60 mb-1 font-bold flex justify-between gap-4">
        <span>${isOwn ? 'Tú' : msg.user}</span>
      </div>
      ${imageHTML}
      ${msg.text ? `<div class="text-sm md:text-base break-words">${msg.text}</div>` : ''}
      <div class="text-[9px] opacity-40 text-right mt-1">${time}</div>
    </div>
  `;

  messagesContainer.appendChild(div);
  
  // Notificaciones visuales si la pestaña no está activa
  if (!isTabActive && !isOwn) {
    unreadCount++;
    document.title = `(${unreadCount}) 💬 ChatNica`;
  }
}

// ─────────────────────────────────────────────
//  NOTIFICATIONS & TAB STATE
// ─────────────────────────────────────────────

window.addEventListener('focus', () => {
  isTabActive = true;
  unreadCount = 0;
  document.title = "💬 ChatNica - Mensajería Local";
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
    connectionStatus.textContent = "🟢 En línea";
    connectionStatus.className = "text-sm text-green-400 font-medium";
  } else {
    connectionStatus.textContent = "🔴 Sin conexión";
    connectionStatus.className = "text-sm text-red-400 font-medium";
  }
}

function updatePendingIndicator(isPending, count) {
  if (isPending) {
    pendingIndicator.classList.remove('hidden');
    // Nota: El count aquí es de cambios en el snapshot, no necesariamente mensajes pendientes
    // pero sirve como feedback visual.
  } else {
    pendingIndicator.classList.add('hidden');
  }
}

window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);
updateStatus();
