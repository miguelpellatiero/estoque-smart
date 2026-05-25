// =============================================
// AUTENTICAÇÃO
// =============================================

// Verifica estado do usuário
auth.onAuthStateChanged(user => {
  if (user) {
    // Salva dados do usuário no localStorage
    localStorage.setItem('user', JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    }));
    
    // Redireciona se estiver na página de login
    if (window.location.pathname.includes('index.html') || 
        window.location.pathname === '/') {
      window.location.href = 'dashboard.html';
    }
  } else {
    localStorage.removeItem('user');
    // Se não estiver autenticado e não estiver no login, redireciona
    if (!window.location.pathname.includes('index.html') && 
        window.location.pathname !== '/') {
      window.location.href = 'index.html';
    }
  }
});

// Login
async function loginUser(email, password) {
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    return result.user;
  } catch (error) {
    throw error;
  }
}

// Cadastro
async function registerUser(email, password, name) {
  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    await result.user.updateProfile({ displayName: name });
    
    // Criar perfil no Firestore
    await db.collection('profiles').doc(result.user.uid).set({
      fullName: name,
      email: email,
      role: 'user', // primeiro usuário vira 'master' manualmente
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return result.user;
  } catch (error) {
    throw error;
  }
}

// Logout
async function logoutUser() {
  await auth.signOut();
  window.location.href = 'index.html';
}

// Verificar se é master
async function isMaster() {
  const user = auth.currentUser;
  if (!user) return false;
  
  const doc = await db.collection('profiles').doc(user.uid).get();
  return doc.exists && doc.data().role === 'master';
}