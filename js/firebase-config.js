// js/firebase-config.js

// Importa as funções necessárias dos SDKs modulares
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";
// Se for usar Firestore, descomente e importe:
// import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
// Se for usar Analytics, descomente e importe:
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js";

// Suas configurações do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBng5_h6m9Kbh7dMH8elWghLqOtpasGzzs", // Mantenha sua chave real aqui
  authDomain: "icone-1c88a.firebaseapp.com",
  projectId: "icone-1c88a",
  storageBucket: "icone-1c88a.firebasestorage.app",
  messagingSenderId: "539251553983",
  appId: "1:539251553983:web:50db3a7e7cc18105d15a99",
  measurementId: "G-G91W4M7K42" // Se estiver usando Analytics
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa os serviços que você vai usar e os exporta
export const auth = getAuth(app);
export const storage = getStorage(app);
// Se for usar Firestore, exporte:
// export const db = getFirestore(app);
// Se for usar Analytics, exporte:
// export const analytics = getAnalytics(app);