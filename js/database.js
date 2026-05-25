// =============================================
// BANCO DE DADOS (Firestore)
// =============================================

// Coleções
const productsRef = db.collection('products');
const categoriesRef = db.collection('categories');
const movementsRef = db.collection('movements');
const addressPatternsRef = db.collection('addressPatterns');

// ========== PRODUTOS ==========

// Criar produto com endereço automático
async function createProduct(productData) {
  // Se não tiver endereço, gera automaticamente
  if (!productData.address) {
    productData.address = await generateAddress(productData.addressPattern);
  }
  
  // Se não tiver SKU, gera
  if (!productData.sku) {
    productData.sku = 'SKU-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  }
  
  const docRef = await productsRef.add({
    ...productData,
    quantity: productData.quantity || 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdBy: auth.currentUser.uid
  });
  
  // Registrar movimento
  await movementsRef.add({
    productId: docRef.id,
    type: 'in',
    quantityChange: productData.quantity || 0,
    newQuantity: productData.quantity || 0,
    performedBy: auth.currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  return docRef.id;
}

// Atualizar produto
async function updateProduct(id, data) {
  const productDoc = await productsRef.doc(id).get();
  const oldQuantity = productDoc.data().quantity;
  
  await productsRef.doc(id).update({
    ...data,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  // Se quantidade mudou, registrar movimento
  if (data.quantity !== undefined && data.quantity !== oldQuantity) {
    const diff = data.quantity - oldQuantity;
    await movementsRef.add({
      productId: id,
      type: diff > 0 ? 'in' : 'out',
      quantityChange: diff,
      previousQuantity: oldQuantity,
      newQuantity: data.quantity,
      performedBy: auth.currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

// Deletar produto
async function deleteProduct(id) {
  await productsRef.doc(id).delete();
}

// Escutar produtos em tempo real
function listenProducts(callback) {
  return productsRef
    .where('active', '==', true)
    .orderBy('name')
    .onSnapshot(snapshot => {
      const products = [];
      snapshot.forEach(doc => {
        products.push({ id: doc.id, ...doc.data() });
      });
      callback(products);
    });
}

// Buscar produtos
async function searchProducts(term) {
  // Como Firestore não tem busca full-text nativa, usamos busca por prefixo
  // Para produção, considere usar Algolia ou Typesense
  const termUpper = term.toUpperCase();
  
  // Busca por nome (começando com)
  const byName = await productsRef
    .where('name', '>=', term)
    .where('name', '<=', term + '\uf8ff')
    .limit(20)
    .get();
  
  // Busca por SKU
  const bySku = await productsRef
    .where('sku', '>=', termUpper)
    .where('sku', '<=', termUpper + '\uf8ff')
    .limit(20)
    .get();
  
  // Busca por endereço
  const byAddress = await productsRef
    .where('address', '>=', term)
    .where('address', '<=', term + '\uf8ff')
    .limit(20)
    .get();
  
  // Combina resultados
  const productsMap = new Map();
  byName.forEach(doc => productsMap.set(doc.id, { id: doc.id, ...doc.data() }));
  bySku.forEach(doc => productsMap.set(doc.id, { id: doc.id, ...doc.data() }));
  byAddress.forEach(doc => productsMap.set(doc.id, { id: doc.id, ...doc.data() }));
  
  return Array.from(productsMap.values());
}

// ========== CATEGORIAS ==========

async function getCategories() {
  const snapshot = await categoriesRef.orderBy('name').get();
  const cats = [];
  snapshot.forEach(doc => cats.push({ id: doc.id, ...doc.data() }));
  return cats;
}

async function createCategory(name) {
  await categoriesRef.add({
    name,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ========== ENDEREÇAMENTO AUTOMÁTICO ==========

async function generateAddress(patternId = null) {
  // Padrão: Rua-Corredor-Prateleira-Nível (ex: 01-02-03-04)
  // Busca último endereço usado e incrementa
  const snapshot = await productsRef
    .orderBy('address', 'desc')
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    return '01-01-01-01';
  }
  
  const lastAddress = snapshot.docs[0].data().address;
  const parts = lastAddress.split('-').map(Number);
  
  // Incrementa o último segmento
  parts[3] = (parts[3] || 0) + 1;
  
  // Lógica de overflow (simplificada)
  if (parts[3] > 99) {
    parts[3] = 1;
    parts[2] = (parts[2] || 0) + 1;
  }
  if (parts[2] > 99) {
    parts[2] = 1;
    parts[1] = (parts[1] || 0) + 1;
  }
  if (parts[1] > 99) {
    parts[1] = 1;
    parts[0] = (parts[0] || 0) + 1;
  }
  
  return parts.map(p => String(p).padStart(2, '0')).join('-');
}

// ========== CONTADOR / MOVIMENTAÇÕES ==========

async function updateProductCount(productId, newQuantity, photoFile = null) {
  const productRef = productsRef.doc(productId);
  const productDoc = await productRef.get();
  const oldQuantity = productDoc.data().quantity;
  
  const batch = db.batch();
  
  // Atualiza quantidade
  batch.update(productRef, {
    quantity: newQuantity,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  // Registra movimento
  const movementRef = movementsRef.doc();
  batch.set(movementRef, {
    productId,
    type: 'count',
    quantityChange: newQuantity - oldQuantity,
    previousQuantity: oldQuantity,
    newQuantity,
    performedBy: auth.currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  await batch.commit();
  
  // Upload da foto (se existir)
  if (photoFile) {
    await uploadProductPhoto(productId, photoFile);
  }
}

// ========== RELATÓRIOS ==========

async function getReportData() {
  const snapshot = await productsRef.where('active', '==', true).get();
  const data = [];
  
  snapshot.forEach(doc => {
    const product = doc.data();
    data.push({
      SKU: product.sku,
      Nome: product.name,
      Categoria: product.category || '',
      Quantidade: product.quantity,
      Endereço: product.address || '',
      Preço: product.price || ''
    });
  });
  
  return data;
}