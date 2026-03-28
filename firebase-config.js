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

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";
import { 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection, 
  addDoc, 
  query, 
  orderBy, 
  where,
  limitToLast,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// 🔹 PEGA AQUÍ TU CONFIGURACIÓN DE FIREBASE
// Obtén estos datos en: https://console.firebase.google.com > Tu Proyecto > Icono Web (</>)
const firebaseConfig = {
  apiKey: "AIzaSyAgQzLJU_bx5iUtiKOkkb7POeXIK3VpGu0",
  authDomain: "chatnica-8648d.firebaseapp.com",
  projectId: "chatnica-8648d",
  storageBucket: "chatnica-8648d.firebasestorage.app",
  messagingSenderId: "9515659791",
  appId: "1:9515659791:web:60cd2400fdff67b53a297a",
  measurementId: "G-WENPBJD47J"
};

// 🔹 INICIALIZAR FIREBASE
const app = initializeApp(firebaseConfig);

// Inicializar Firestore con soporte multi-pestaña y persistencia moderna
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const auth = getAuth(app);
const storage = getStorage(app);

// 🔹 EXPORTAR PARA USAR EN app.js
export { db, auth, storage, ref, uploadBytes, getDownloadURL, collection, addDoc, query, orderBy, where, limitToLast, onSnapshot, serverTimestamp, signInAnonymously, onAuthStateChanged };
