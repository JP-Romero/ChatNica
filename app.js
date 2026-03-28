import { 
  db,
  auth,
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
const messagesContainer = document.getElementById('messages-container');
const emptyState = document.getElementById('empty-state');
const btnLogout = document.getElementById('btn-logout');
const connectionStatus = document.getElementById('connection-status');
const pendingIndicator = document.getElementById('pending-indicator');
const pendingCount = document.getElementById('pending-count');

let currentUser = null;
let unsubscribeMessages = null;

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
      await signInAnonymously(auth);
    } else {
        // Si ya hay usuario pero faltaba el nombre, solo mostrar chat
        showChat(name);
    }
  } catch (error) {
    console.error("Error al entrar:", error);
    alert("Hubo un error al intentar entrar. Revisa tu conexión.");
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

// Enviar Mensaje
messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  const name = localStorage.getItem('chatnica_name');

  if (!text || !name || !auth.currentUser) return;

  try {
    const messageContent = text;
    messageInput.value = '';
    await addDoc(collection(db, "messages"), {
      text: messageContent,
      user: name,
      uid: auth.currentUser.uid,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
  }
});

// Cargar Mensajes en tiempo real
function loadMessages() {
  const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));

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

function renderMessage(msg) {
  const isOwn = msg.uid === auth.currentUser.uid;
  const div = document.createElement('div');
  div.className = `flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`;

  const time = msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';

  div.innerHTML = `
    <div class="message-bubble ${isOwn ? 'own' : 'other'}">
      <div class="text-xs opacity-50 mb-1 font-bold">${isOwn ? 'Tú' : msg.user}</div>
      <div class="text-sm md:text-base break-words">${msg.text}</div>
      <div class="text-[10px] opacity-40 text-right mt-1">${time}</div>
    </div>
  `;

  messagesContainer.appendChild(div);
}

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
