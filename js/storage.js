// =============================================
// STORAGE (Fotos)
// =============================================

async function uploadProductPhoto(productId, file) {
  const storageRef = storage.ref(`products/${productId}/${Date.now()}_${file.name}`);
  await storageRef.put(file);
  const url = await storageRef.getDownloadURL();
  
  // Salva referência no Firestore
  await db.collection('productPhotos').add({
    productId,
    url,
    uploadedBy: auth.currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  return url;
}

async function getProductPhotos(productId) {
  const snapshot = await db.collection('productPhotos')
    .where('productId', '==', productId)
    .orderBy('createdAt', 'desc')
    .get();
  
  const photos = [];
  snapshot.forEach(doc => photos.push({ id: doc.id, ...doc.data() }));
  return photos;
}