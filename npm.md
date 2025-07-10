// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBng5_h6m9Kbh7dMH8elWghLqOtpasGzzs",
  authDomain: "icone-1c88a.firebaseapp.com",
  projectId: "icone-1c88a",
  storageBucket: "icone-1c88a.firebasestorage.app",
  messagingSenderId: "539251553983",
  appId: "1:539251553983:web:50db3a7e7cc3048738380a",
  measurementId: "G-V7HPWEHM9Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

# npm script

<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyBng5_h6m9Kbh7dMH8elWghLqOtpasGzzs",
    authDomain: "icone-1c88a.firebaseapp.com",
    projectId: "icone-1c88a",
    storageBucket: "icone-1c88a.firebasestorage.app",
    messagingSenderId: "539251553983",
    appId: "1:539251553983:web:50db3a7e7cc3048738380a",
    measurementId: "G-V7HPWEHM9Z"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>