// js/auth.js
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";

// Verifica estado do usuário (redireciona se necessário)
onAuthStateChanged(auth, async (user) => {
  if (user) {
    localStorage.setItem('user', JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    }));

    if (window.location.pathname.includes('index.html') || 
        window.location.pathname === '/' || 
        window.location.pathname === '/index.html') {
      window.location.href = 'dashboard.html';
    }
  } else {
    localStorage.removeItem('user');
    if (!window.location.pathname.includes('index.html') && 
        window.location.pathname !== '/' && 
        window.location.pathname !== '/index.html') {
      window.location.href = 'index.html';
    }
  }
});

// Login
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
}

// Cadastro
export async function registerUser(email, password, name) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });

    try {
      await setDoc(doc(db, 'profiles', userCredential.user.uid), {
        fullName: name,
        email: email,
        role: 'user',
        createdAt: serverTimestamp()
      });
    } catch (profileError) {
      console.warn('Perfil nao foi criado no Firestore:', profileError);
    }

    return userCredential.user;
  } catch (error) {
    throw error;
  }
}

// Logout
export async function logoutUser() {
  await signOut(auth);
  window.location.href = 'index.html';
}

// Verificar se é master
export async function isMaster() {
  const user = auth.currentUser;
  if (!user) return false;

  const docSnap = await getDoc(doc(db, 'profiles', user.uid));
  return docSnap.exists() && docSnap.data().role === 'master';
}
