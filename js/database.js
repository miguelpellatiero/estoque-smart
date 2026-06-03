// js/database.js
import { 
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { db, auth } from "./firebase.js";

// Coleções
const productsRef = collection(db, 'products');
const categoriesRef = collection(db, 'categories');
const movementsRef = collection(db, 'movements');
const addressPatternsRef = collection(db, 'addressPatterns');

// ========== PRODUTOS ==========

// Criar produto com endereço automático
export async function createProduct(productData, photoFiles = []) {
  // Se não tiver endereço, gera automaticamente
  if (!productData.address) {
    productData.address = await generateAddress(productData.addressPatternId);
  }
  
  // Se não tiver SKU, gera
  if (!productData.sku) {
    productData.sku = 'SKU-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  // Garantir que o campo nameLower exista para buscas
  const dataToSave = {
    ...productData,
    categoryId: productData.categoryId || null,
    categoryName: productData.categoryName || '',
    nameLower: (productData.name || '').toLowerCase(),
    skuUpper: (productData.sku || '').toUpperCase(),
    categoryNameLower: (productData.categoryName || '').toLowerCase(),
    addressLower: (productData.address || '').toLowerCase(),
    quantity: productData.quantity || 0,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: auth.currentUser.uid
  };

  const docRef = await addDoc(productsRef, dataToSave);

  const quantity = dataToSave.quantity;
  const movementData = {
    productId: docRef.id,
    type: 'in',
    quantityChange: quantity,
    previousQuantity: 0,
    newQuantity: quantity,
    performedBy: auth.currentUser.uid,
    createdAt: serverTimestamp()
  };

  if (photoFiles && photoFiles.length) {
    const { uploadProductPhoto } = await import("./storage.js");
    const photoUrls = [];
    for (const photoFile of photoFiles) {
      const url = await uploadProductPhoto(docRef.id, photoFile, {
        address: dataToSave.address,
        source: 'product'
      });
      photoUrls.push(url);
    }
    movementData.photoUrls = photoUrls;
  }

  await addDoc(movementsRef, movementData);
  return docRef.id;
}

// Atualizar produto (com registro de movimento)
export async function updateProduct(id, data, photoFiles = []) {
  const productDocRef = doc(db, 'products', id);

  // Se o nome foi alterado, atualiza também o nameLower
  const updateData = { ...data };
  if (updateData.name) {
    updateData.nameLower = updateData.name.toLowerCase();
  }
  if (updateData.sku !== undefined) updateData.skuUpper = (updateData.sku || '').toUpperCase();
  if (updateData.categoryName !== undefined) updateData.categoryNameLower = (updateData.categoryName || '').toLowerCase();
  if (updateData.address !== undefined) updateData.addressLower = (updateData.address || '').toLowerCase();
  updateData.updatedAt = serverTimestamp();

  let quantityChangeData = null;

  await runTransaction(db, async (transaction) => {
    const productSnap = await transaction.get(productDocRef);
    if (!productSnap.exists()) throw "Produto não existe";
    
    const oldQuantity = productSnap.data().quantity;
    const newQuantity = updateData.quantity !== undefined ? updateData.quantity : oldQuantity;
    
    transaction.update(productDocRef, updateData);
    
    // Registrar movimento se quantidade mudou
    if (updateData.quantity !== undefined && updateData.quantity !== oldQuantity) {
      quantityChangeData = {
        productId: id,
        type: newQuantity > oldQuantity ? 'in' : 'out',
        quantityChange: newQuantity - oldQuantity,
        previousQuantity: oldQuantity,
        newQuantity,
        performedBy: auth.currentUser.uid,
        createdAt: serverTimestamp()
      };
    }
  });

  if (quantityChangeData) {
    await addDoc(movementsRef, quantityChangeData);
  }

  if (photoFiles && photoFiles.length) {
    const { uploadProductPhoto } = await import("./storage.js");
    for (const photoFile of photoFiles) {
      await uploadProductPhoto(id, photoFile, {
        address: updateData.address || '',
        source: 'product'
      });
    }
  }
}

// Deletar produto (soft delete)
export async function deleteProduct(id) {
  await updateDoc(doc(db, 'products', id), { active: false });
}

// Escutar produtos em tempo real
export function listenProducts(callback) {
  const q = query(productsRef, where('active', '==', true));
  return onSnapshot(q, (snapshot) => {
    const products = [];
    snapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
    products.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    callback(products);
  });
}

// Buscar produtos (prefixo)
export async function searchProducts(term) {
  const termLower = term.toLowerCase();
  const termUpper = term.toUpperCase();
  const queries = [
    query(productsRef,
      where('nameLower', '>=', termLower),
      where('nameLower', '<=', termLower + '\uf8ff'),
      limit(10)
    ),
    query(productsRef,
      where('skuUpper', '>=', termUpper),
      where('skuUpper', '<=', termUpper + '\uf8ff'),
      limit(10)
    ),
    query(productsRef,
      where('categoryNameLower', '>=', termLower),
      where('categoryNameLower', '<=', termLower + '\uf8ff'),
      limit(10)
    ),
    query(productsRef,
      where('addressLower', '>=', termLower),
      where('addressLower', '<=', termLower + '\uf8ff'),
      limit(10)
    )
  ];

  const results = [];
  for (const q of queries) {
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
      const item = { id: doc.id, ...doc.data() };
      if (!results.find(p => p.id === item.id) && item.active !== false) {
        results.push(item);
      }
    });
  }

  return results.slice(0, 20);
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
  await addDoc(categoriesRef, { name, nameLower: name.toLowerCase(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export function listenCategories(callback) {
  const q = query(categoriesRef, orderBy('name'));
  return onSnapshot(q, (snapshot) => {
    const categories = [];
    snapshot.forEach(docSnap => categories.push({ id: docSnap.id, ...docSnap.data() }));
    callback(categories);
  });
}

export async function updateCategory(id, name) {
  await updateDoc(doc(db, 'categories', id), {
    name,
    nameLower: name.toLowerCase(),
    updatedAt: serverTimestamp()
  });
}

export async function deleteCategory(id) {
  await deleteDoc(doc(db, 'categories', id));
}

// ========== PADROES DE ENDERECAMENTO ==========
export function listenAddressPatterns(callback) {
  const q = query(addressPatternsRef, orderBy('createdAt'));
  return onSnapshot(q, (snapshot) => {
    const patterns = [];
    snapshot.forEach(docSnap => patterns.push({ id: docSnap.id, ...docSnap.data() }));
    callback(patterns);
  });
}

export async function getAddressPatterns() {
  const snapshot = await getDocs(query(addressPatternsRef, orderBy('createdAt')));
  const patterns = [];
  snapshot.forEach(docSnap => patterns.push({ id: docSnap.id, ...docSnap.data() }));
  return patterns;
}

export async function createAddressPattern(data) {
  await addDoc(addressPatternsRef, {
    name: data.name,
    format: data.format || 'A-{corredor}-{prateleira}-{nivel}',
    prefix: data.prefix || 'A',
    nextNumber: Number(data.nextNumber) || 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateAddressPattern(id, data) {
  await updateDoc(doc(db, 'addressPatterns', id), {
    name: data.name,
    format: data.format,
    prefix: data.prefix || '',
    nextNumber: Number(data.nextNumber) || 1,
    updatedAt: serverTimestamp()
  });
}

export async function deleteAddressPattern(id) {
  await deleteDoc(doc(db, 'addressPatterns', id));
}

// ========== ENDEREÇAMENTO AUTOMÁTICO ==========
async function generateAddress(patternId = null) {
  if (patternId) {
    const patternRef = doc(db, 'addressPatterns', patternId);
    return await runTransaction(db, async (transaction) => {
      const patternSnap = await transaction.get(patternRef);
      if (!patternSnap.exists()) return generateSequentialAddress(1);
      const pattern = patternSnap.data();
      const number = Number(pattern.nextNumber) || 1;
      transaction.update(patternRef, {
        nextNumber: number + 1,
        updatedAt: serverTimestamp()
      });
      return formatAddress(pattern, number);
    });
  }

  const patterns = await getAddressPatterns();
  if (patterns.length > 0) {
    const first = patterns[0];
    const patternRef = doc(db, 'addressPatterns', first.id);
    return await runTransaction(db, async (transaction) => {
      const patternSnap = await transaction.get(patternRef);
      if (!patternSnap.exists()) return generateSequentialAddress(1);
      const pattern = patternSnap.data();
      const number = Number(pattern.nextNumber) || 1;
      transaction.update(patternRef, {
        nextNumber: number + 1,
        updatedAt: serverTimestamp()
      });
      return formatAddress(pattern, number);
    });
  }

  const q = query(productsRef, orderBy('address', 'desc'), limit(1));
  const snap = await getDocs(q);
  
  if (snap.empty) return 'A-01-01-01';
  
  const lastAddress = snap.docs[0].data().address;
  const numericParts = (lastAddress.match(/\d+/g) || []).map(Number);
  if (numericParts.length < 3) return 'A-01-01-01';
  numericParts[2] = (numericParts[2] || 0) + 1;
  if (numericParts[2] > 99) { numericParts[2] = 1; numericParts[1]++; }
  if (numericParts[1] > 99) { numericParts[1] = 1; numericParts[0]++; }
  
  return `A-${numericParts.map(p => String(p).padStart(2, '0')).join('-')}`;
}

function formatAddress(pattern, number) {
  const prefix = pattern.prefix || 'A';
  const corredor = Math.floor((number - 1) / 10000) + 1;
  const prateleira = Math.floor(((number - 1) % 10000) / 100) + 1;
  const nivel = ((number - 1) % 100) + 1;
  const posicao = number;
  const values = {
    rua: prefix,
    corredor: String(corredor).padStart(2, '0'),
    prateleira: String(prateleira).padStart(2, '0'),
    nivel: String(nivel).padStart(2, '0'),
    posicao: String(posicao).padStart(3, '0')
  };

  return (pattern.format || 'A-{corredor}-{prateleira}-{nivel}')
    .replace(/\{rua\}/g, values.rua)
    .replace(/\{corredor\}/g, values.corredor)
    .replace(/\{prateleira\}/g, values.prateleira)
    .replace(/\{nivel\}/g, values.nivel)
    .replace(/\{posicao\}/g, values.posicao);
}

function generateSequentialAddress(number) {
  return `A-01-01-${String(number).padStart(2, '0')}`;
}

// ========== CONTAGEM ==========
export async function updateProductCount(productId, newQuantity, photoFiles = []) {
  const productDocRef = doc(db, 'products', productId);
  let currentProduct = null;
  let previousQuantity = 0;

  await runTransaction(db, async (transaction) => {
    const productSnap = await transaction.get(productDocRef);
    if (!productSnap.exists()) throw "Produto não encontrado";
    currentProduct = { id: productId, ...productSnap.data() };
    previousQuantity = productSnap.data().quantity || 0;

    transaction.update(productDocRef, {
      quantity: newQuantity,
      updatedAt: serverTimestamp()
    });
  });

  const movementData = {
    productId,
    type: 'count',
    quantityChange: newQuantity - previousQuantity,
    previousQuantity,
    newQuantity,
    performedBy: auth.currentUser.uid,
    address: currentProduct.address || '',
    createdAt: serverTimestamp()
  };

  const photoUrls = [];
  if (photoFiles && photoFiles.length) {
    const { uploadProductPhoto } = await import("./storage.js");
    for (const photoFile of photoFiles) {
      const url = await uploadProductPhoto(productId, photoFile, {
        address: currentProduct.address || '',
        source: 'count'
      });
      photoUrls.push(url);
    }
    if (photoUrls.length) movementData.photoUrls = photoUrls;
  }

  await addDoc(movementsRef, movementData);
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

