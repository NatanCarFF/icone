// js/firebase-config.js

// Substitua ESTES VALORES pelos que você copiou do Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBng5_h6m9Kbh7dMH8elWghLqOtpasGzzs",
  authDomain: "icone-1c88a.firebaseapp.com",
  projectId: "icone-1c88a",
  storageBucket: "icone-1c88a.firebasestorage.app",
  messagingSenderId: "539251553983",
  appId: "1:539251553983:web:50db3a7e7cc3048738380a",
  measurementId: "G-V7HPWEHM9Z" // Descomente se habilitou Analytics
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Exporta os módulos que serão usados em outras partes do seu app
export const auth = firebase.auth();
export const storage = firebase.storage();
// Se for usar Firestore:
// export const db = firebase.firestore();

console.log("Firebase inicializado!");