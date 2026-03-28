/**
═══════════════════════════════════════════════════════════════
LÓGICA PRINCIPAL — ChatNica PWA
═══════════════════════════════════════════════════════════════
📌 FUNCIONALIDADES:
• Login con nombre de usuario (anónimo en Firebase)
• Envío y recepción de mensajes en tiempo real
• Cola de mensajes pendientes para modo offline
• Indicador visual de estado de conexión
═══════════════════════════════════════════════════════════════
*/

// 🔹 IMPORTAR FUNCIONES DE FIREBASE
import { 
  db, auth, collection, addDoc, query, orderBy, 
  onSnapshot, serverTimestamp, signInAnonymously, onAuthStateChanged 
} from './firebase-config.js';

// 🔹 REFERENCIAS AL DOM
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('login-form');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const messagesContainer = document.getElementById('messages-container');
const emptyState = document.getElementById('empty-state');
const connectionStatus = document.getElementById('connection-status');
const pendingIndicator = document.getElementById('pending-indicator');
const pendingCount = document.getElementById('pending-count');
const btnLogout = document.getElementById('btn-logout');

// 🔹 ESTADO DE LA APP
let currentUser = null;
let pendingMessages = JSON.parse(localStorage.getItem('chatnica_pending') || '[]');

// 🔹 INICIALIZAR APP
document.addEventListener('DOMContentLoaded', async () => {
  actualizarIndicadorPendientes();
  actualizarEstadoConexion();
  
  // Escuchar cambios en autenticación
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      // Usuario autenticado: mostrar chat
      loginScreen.classList.add('hidden');
      chatScreen.classList.remove('hidden');
      escucharMensajes();
    } else {
      // Sin usuario: mostrar login
      loginScreen.classList.remove('hidden');
      chatScreen.classList.add('hidden');
    }
  });
  
  // Manejar login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username-input').value.trim();
    if (username) {
      // Guardar nombre en localStorage para mostrar en UI
      localStorage.setItem('chatnica_username', username);
      // Login anónimo en Firebase
      await signInAnonymously(auth);
    }
  });
  
  // Manejar envío de mensajes
  messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = messageInput.value.trim();
    if (texto && currentUser) {
      await enviarMensaje(texto);
      messageInput.value = '';
    }
  });
  
  // Manejar logout
  btnLogout.addEventListener('click', async () => {
    await auth.signOut();
    localStorage.removeItem('chatnica_username');
  });
  
  // Escuchar cambios de conexión
  window.addEventListener('online', () => {
    actualizarEstadoConexion();
    sincronizarPendientes();
  });
  window.addEventListener('offline', actualizarEstadoConexion);
});

// 🔹 ENVIAR MENSAJE
async function enviarMensaje(texto) {
  const mensaje = {
    texto: texto,
    usuario: localStorage.getItem('chatnica_username') || 'Anónimo',
    uid: currentUser.uid,
    fecha: serverTimestamp()
  };
  
  if (navigator.onLine) {
    // Hay internet: enviar a Firebase
    try {
      await addDoc(collection(db, 'mensajes'), mensaje);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      guardarPendiente(mensaje);
    }
  } else {
    // Sin internet: guardar en localStorage
    guardarPendiente(mensaje);
  }
}

// 🔹 GUARDAR MENSAJE PENDIENTE (para enviar después)
function guardarPendiente(mensaje) {
  mensaje.pendiente = true;
  mensaje.idLocal = Date.now();
  pendingMessages.push(mensaje);
  localStorage.setItem('chatnica_pending', JSON.stringify(pendingMessages));
  actualizarIndicadorPendientes();
  // Mostrar mensaje localmente aunque esté pendiente
  agregarMensajeAlDOM(mensaje, true);
}

// 🔹 ACTUALIZAR INDICADOR DE PENDIENTES
function actualizarIndicadorPendientes() {
  const count = pendingMessages.filter(m => m.pendiente).length;
  if (count > 0) {
    pendingCount.textContent = count;
    pendingIndicator.classList.remove('hidden');
  } else {
    pendingIndicator.classList.add('hidden');
  }
}

// 🔹 ACTUALIZAR ESTADO DE CONEXIÓN
function actualizarEstadoConexion() {
  if (navigator.onLine) {
    connectionStatus.textContent = '🟢 En línea';
    connectionStatus.classList.add('online');
    connectionStatus.classList.remove('offline');
  } else {
    connectionStatus.textContent = '🔴 Sin conexión';
    connectionStatus.classList.add('offline');
    connectionStatus.classList.remove('online');
  }
}

// 🔹 ESCUCHAR MENSAJES EN TIEMPO REAL
function escucharMensajes() {
  const q = query(collection(db, 'mensajes'), orderBy('fecha', 'asc'));
  
  onSnapshot(q, (snapshot) => {
    // Limpiar contenedor (excepto empty state)
    messagesContainer.innerHTML = '';
    messagesContainer.appendChild(emptyState);
    
    let tieneMensajes = false;
    
    snapshot.forEach((doc) => {
      tieneMensajes = true;
      const data = doc.data();
      agregarMensajeAlDOM(data, false);
    });
    
    // Ocultar empty state si hay mensajes
    emptyState.style.display = tieneMensajes ? 'none' : 'block';
    
    // Scroll al fondo
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

// 🔹 AGREGAR MENSAJE AL DOM (UI)
function agregarMensajeAlDOM(mensaje, esPendiente) {
  // Ocultar empty state
  if (emptyState) emptyState.style.display = 'none';
  
  const div = document.createElement('div');
  const username = localStorage.getItem('chatnica_username') || 'Anónimo';
  const esPropio = mensaje.uid === currentUser?.uid || mensaje.usuario === username;
  
  div.className = `message-bubble ${esPropio ? 'own' : 'other'}`;
  
  // Formato de hora
  let hora = '';
  if (mensaje.fecha?.toDate) {
    hora = mensaje.fecha.toDate().toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' });
  } else if (mensaje.fecha) {
    hora = new Date(mensaje.fecha).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' });
  }
  
  div.innerHTML = `
    <p class="text-sm">${mensaje.texto}</p>
    <span class="text-xs opacity-75 block mt-1 text-right">
      ${mensaje.usuario} • ${hora} ${esPendiente ? '⏳' : ''}
    </span>
  `;
  
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 🔹 SINCRONIZAR MENSAJES PENDIENTES CUANDO VUELVE LA CONEXIÓN
async function sincronizarPendientes() {
  const pendientes = pendingMessages.filter(m => m.pendiente);
  if (pendientes.length === 0) return;
  
  console.log(`📤 Sincronizando ${pendientes.length} mensaje(s) pendiente(s)...`);
  
  for (const mensaje of pendientes) {
    try {
      // Enviar a Firebase sin el flag "pendiente"
      const { pendiente, idLocal, ...mensajeLimpio } = mensaje;
      await addDoc(collection(db, 'mensajes'), mensajeLimpio);
      // Marcar como enviado
      mensaje.pendiente = false;
    } catch (error) {
      console.error('No se pudo enviar mensaje pendiente:', error);
    }
  }
  
  // Guardar cambios y actualizar UI
  pendingMessages = pendingMessages.filter(m => m.pendiente);
  localStorage.setItem('chatnica_pending', JSON.stringify(pendingMessages));
  actualizarIndicadorPendientes();
}