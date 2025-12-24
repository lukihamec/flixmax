import * as firebaseApp from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ------------------------------------------------------------------
// CONFIGURAÇÃO DO FIREBASE
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCMCT1J2FOAjWPgmu8ZyOMVQdKjR-5xeuE",
  authDomain: "app-definitivo.firebaseapp.com",
  projectId: "app-definitivo",
  storageBucket: "app-definitivo.firebasestorage.app",
  messagingSenderId: "894657255252",
  appId: "1:894657255252:web:c98f541f234e4a8af25ac1"
};

// Initialize Firebase
// Using namespace import to resolve potential issues with named exports in some environments
const app = firebaseApp.initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };