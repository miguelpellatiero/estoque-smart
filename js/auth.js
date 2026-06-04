// js/auth.js
const STORAGE_USERS_KEY = 'smartstock_users';
const STORAGE_SESSION_KEY = 'smartstock_session';

const DEFAULT_USERS = [
  { id: 'user-admin', name: 'Admin', email: 'admin@smartstock.com', password: '123456', role: 'master' }
];

function loadUsers() {
  const raw = localStorage.getItem(STORAGE_USERS_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(DEFAULT_USERS));
    return [...DEFAULT_USERS];
  }
  try {
    return JSON.parse(raw) || [...DEFAULT_USERS];
  } catch {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(DEFAULT_USERS));
    return [...DEFAULT_USERS];
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
}

function saveSession(user) {
  localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
}

export function getCurrentUser() {
  const raw = localStorage.getItem(STORAGE_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    return null;
  }
}

export function loginUser(email, password) {
  return new Promise((resolve, reject) => {
    if (!email || !password) {
      reject(new Error('Informe e-mail e senha.'));
      return;
    }

    const users = loadUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.password !== password) {
      reject(new Error('E-mail ou senha inválidos.'));
      return;
    }

    saveSession({ id: user.id, name: user.name, email: user.email, role: user.role });
    resolve(getCurrentUser());
  });
}

export function registerUser(email, password, name) {
  return new Promise((resolve, reject) => {
    if (!email || !password || !name) {
      reject(new Error('Preencha todos os campos.'));
      return;
    }

    const users = loadUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      reject(new Error('E-mail já cadastrado.'));
      return;
    }

    const newUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      password,
      role: 'user'
    };
    users.push(newUser);
    saveUsers(users);
    saveSession({ id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role });
    resolve(getCurrentUser());
  });
}

export function logoutUser() {
  localStorage.removeItem(STORAGE_SESSION_KEY);
  window.location.href = 'index.html';
}

export function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

export function isMaster() {
  const user = getCurrentUser();
  return user?.role === 'master';
}
