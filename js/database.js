// js/database.js
import { 
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { db, auth } from "./firebase.js";

// Coleções
const productsRef = collection(db, 'products');
const categoriesRef = collection(db, 'categories');
const movementsRef = collection(db, 'movements');

// ========== PRODUTOS ==========

// Criar produto com endereço automático
export async function createProduct(productData) {
  // Se não tiver endereço, gera automaticamente
  if (!productData.address) {
    productData.address = await generateAddress();
  }
  
  // Se não tiver SKU, gera
  if (!productData.sku) {
    productData.sku = 'SKU-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  // Garantir que o campo nameLower exista para buscas
  const dataToSave = {
    ...productData,
    nameLower: (productData.name || '').toLowerCase(),
    quantity: productData.quantity || 0,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: auth.currentUser.uid
  };

  const docRef = await addDoc(productsRef, dataToSave);

  // Registrar movimento de entrada
  await addDoc(movementsRef, {
    productId: docRef.id,
    type: 'in',
    quantityChange: dataToSave.quantity,
    newQuantity: dataToSave.quantity,
    performedBy: auth.currentUser.uid,
    createdAt: serverTimestamp()
  });

  return docRef.id;
}

// Atualizar produto (com registro de movimento)
export async function updateProduct(id, data) {
  const productDocRef = doc(db, 'products', id);

  // Se o nome foi alterado, atualiza também o nameLower
  const updateData = { ...data };
  if (updateData.name) {
    updateData.nameLower = updateData.name.toLowerCase();
  }
  updateData.updatedAt = serverTimestamp();

  await runTransaction(db, async (transaction) => {
    const productSnap = await transaction.get(productDocRef);
    if (!productSnap.exists()) throw "Produto não existe";
    
    const oldQuantity = productSnap.data().quantity;
    const newQuantity = updateData.quantity !== undefined ? updateData.quantity : oldQuantity;
    
    transaction.update(productDocRef, updateData);
    
    // Registrar movimento se quantidade mudou
    if (updateData.quantity !== undefined && updateData.quantity !== oldQuantity) {
      transaction.set(doc(movementsRef), {
        productId: id,
        type: newQuantity > oldQuantity ? 'in' : 'out',
        quantityChange: newQuantity - oldQuantity,
        previousQuantity: oldQuantity,
        newQuantity: newQuantity,
        performedBy: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
    }
  });
}

// Deletar produto (soft delete)
export async function deleteProduct(id) {
  await updateDoc(doc(db, 'products', id), { active: false });
}

// Escutar produtos em tempo real
export function listenProducts(callback) {
  const q = query(productsRef, where('active', '==', true), orderBy('name'));
  return onSnapshot(q, (snapshot) => {
    const products = [];
    snapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
    callback(products);
  });
}

// Buscar produtos (prefixo)
export async function searchProducts(term) {
  const termLower = term.toLowerCase();
  const results = [];
  
  // Busca por nome (usando nameLower)
  const nameQ = query(productsRef, 
    where('nameLower', '>=', termLower),
    where('nameLower', '<=', termLower + '\uf8ff'),
    limit(10)
  );
  const nameSnap = await getDocs(nameQ);
  nameSnap.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
  
  // Busca por SKU
  const skuQ = query(productsRef,
    where('sku', '>=', term.toUpperCase()),
    where('sku', '<=', term.toUpperCase() + '\uf8ff'),
    limit(10)
  );
  const skuSnap = await getDocs(skuQ);
  skuSnap.forEach(doc => {
    if (!results.find(p => p.id === doc.id)) results.push({ id: doc.id, ...doc.data() });
  });
  
  return results;
}

// ========== CATEGORIAS ==========
export async function getCategories() {
  const q = query(categoriesRef, orderBy('name'));
  const snapshot = await getDocs(q);
  const cats = [];
  snapshot.forEach(doc => cats.push({ id: doc.id, ...doc.data() }));
  return cats;
}

export async function createCategory(name) {
  await addDoc(categoriesRef, { name, createdAt: serverTimestamp() });
}

// ========== ENDEREÇAMENTO AUTOMÁTICO ==========
async function generateAddress() {
  const q = query(productsRef, orderBy('address', 'desc'), limit(1));
  const snap = await getDocs(q);
  
  if (snap.empty) return '01-01-01-01';
  
  const lastAddress = snap.docs[0].data().address;
  const parts = lastAddress.split('-').map(Number);
  parts[3] = (parts[3] || 0) + 1;
  if (parts[3] > 99) { parts[3] = 1; parts[2]++; }
  if (parts[2] > 99) { parts[2] = 1; parts[1]++; }
  if (parts[1] > 99) { parts[1] = 1; parts[0]++; }
  
  return parts.map(p => String(p).padStart(2, '0')).join('-');
}

// ========== CONTAGEM ==========
export async function updateProductCount(productId, newQuantity, photoFile = null) {
  const productDocRef = doc(db, 'products', productId);
  
  await runTransaction(db, async (transaction) => {
    const productSnap = await transaction.get(productDocRef);
    if (!productSnap.exists()) throw "Produto não encontrado";
    
    const oldQuantity = productSnap.data().quantity;
    transaction.update(productDocRef, {
      quantity: newQuantity,
      updatedAt: serverTimestamp()
    });
    
    transaction.set(doc(movementsRef), {
      productId,
      type: 'count',
      quantityChange: newQuantity - oldQuantity,
      previousQuantity: oldQuantity,
      newQuantity,
      performedBy: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });
  });
  
  // Upload da foto se existir
  if (photoFile) {
    const { uploadProductPhoto } = await import("./storage.js");
    await uploadProductPhoto(productId, photoFile);
  }
}

// ========== RELATÓRIOS ==========
export async function getReportData() {
  const q = query(productsRef, where('active', '==', true));
  const snapshot = await getDocs(q);
  const data = [];
  snapshot.forEach(doc => {
    const product = doc.data();
    data.push({
      SKU: product.sku,
      Nome: product.name,
      Categoria: product.categoryId || '',
      Quantidade: product.quantity,
      Endereco: product.address || ''
    });
  });
  return data;
}