// js/firebase.js

const firebaseConfig = {
  apiKey: "AIzaSyCxxheOUlHDmkd7ABrmDzM62oiQgh-P93c",
  authDomain: "estoque-smart-23fde.firebaseapp.com",
  projectId: "estoque-smart-23fde",
  storageBucket: "estoque-smart-23fde.appspot.com", // Corrigi o domínio
  messagingSenderId: "688473593383",
  appId: "1:688473593383:web:23183352e9b33f60e6e002"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Atalhos (compat)
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Habilita persistência offline (Firestore)
db.enablePersistence()
  .then(() => console.log('Offline habilitado'))
  .catch(err => console.log('Erro offline:', err));