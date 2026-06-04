// src/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCxxheOUlHDmkd7ABrmDzM62oiQgh-P93c",
  authDomain: "estoque-smart-23fde.firebaseapp.com",
  projectId: "estoque-smart-23fde",
  storageBucket: "estoque-smart-23fde.appspot.com",
  messagingSenderId: "688473593383",
  appId: "1:688473593383:web:16351aacdfef0892e6e002"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default { auth, db, storage };
