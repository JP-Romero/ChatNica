/**
═══════════════════════════════════════════════════════════════
CONFIGURACIÓN DE FIREBASE — ChatNica
═══════════════════════════════════════════════════════════════
PARA ACTIVAR TODAS LAS FUNCIONES en Firebase Console:
  1. Authentication → Sign-in method → habilitar: Google + Email/Password
  2. Firestore Database → crear (modo producción)
  3. Storage → crear (modo producción)
  4. Project Settings → Cloud Messaging → generar clave VAPID
     → pegar en VAPID_KEY abajo
═══════════════════════════════════════════════════════════════
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection, addDoc, deleteDoc, query, orderBy, where,
  limitToLast, onSnapshot, serverTimestamp,
  doc, setDoc, getDoc, updateDoc, deleteField,
  getDocs, limit, endBefore, arrayUnion, arrayRemove,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getMessaging, getToken, onMessage
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js";

// 🔑 Reemplaza con tu clave VAPID desde Firebase Console → Project Settings → Cloud Messaging
export const VAPID_KEY = 'BCAKhDlx2jMfTCzFgKMwwoSi9qNwZOlhNqVaC7otueRS07ZsNfsDIGfKm5d8bDR65D-ByUUv_DCWj_k48BtCnOo';

// ─── Tu configuración de Firebase ───────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAgQzLJU_bx5iUtiKOkkb7POeXIK3VpGu0",
  authDomain: "chatnica-8648d.firebaseapp.com",
  projectId: "chatnica-8648d",
  storageBucket: "chatnica-8648d.firebasestorage.app",
  messagingSenderId: "9515659791",
  appId: "1:9515659791:web:60cd2400fdff67b53a297a"
};

// ─── Inicializar ─────────────────────────────────────────────
const app = initializeApp(firebaseConfig);

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const auth = getAuth(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// FCM — opcional, puede no estar disponible en todos los navegadores
let messaging = null;
try {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    messaging = getMessaging(app);
  }
} catch (e) {
  console.warn('[ChatNica] FCM no disponible:', e.message);
}

export {
  db, auth, storage, messaging, googleProvider,
  // Firestore
  collection, addDoc, deleteDoc, query, orderBy, where,
  limitToLast, onSnapshot, serverTimestamp,
  doc, setDoc, getDoc, updateDoc, deleteField,
  getDocs, limit, endBefore, arrayUnion, arrayRemove,
  Timestamp,
  // Storage
  ref, uploadBytes, getDownloadURL,
  // Auth
  signInWithPopup, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signInAnonymously,
  signOut, onAuthStateChanged, updateProfile,
  // Messaging
  getToken, onMessage
};
