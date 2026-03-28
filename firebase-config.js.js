/**
═══════════════════════════════════════════════════════════════
CONFIGURACIÓN DE FIREBASE — ChatNica
═══════════════════════════════════════════════════════════════
📌 INSTRUCCIONES:
1. Ve a https://console.firebase.google.com
2. Crea un nuevo proyecto "ChatNica"
3. Activa: Authentication + Firestore Database
4. Registra una "Web App" y copia tus credenciales abajo
5. En Firestore Rules, usa modo prueba para empezar:
   allow read, write: if true;
═══════════════════════════════════════════════════════════════
*/

// 🔹 IMPORTAR FIREBASE (versión modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// 🔹 PEGA AQUÍ TU CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

// 🔹 INICIALIZAR FIREBASE
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 🔹 EXPORTAR PARA USAR EN app.js
export { db, auth, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, signInAnonymously, onAuthStateChanged };