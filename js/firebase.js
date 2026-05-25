// Configuração do Firebase (substitua pelos seus dados)
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Atalhos
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Configuração offline (funciona com internet lenta)
db.enablePersistence()
  .then(() => console.log('Offline habilitado'))
  .catch(err => console.log('Erro offline:', err));