// js/storage.js
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { storage, auth, db } from "./firebase.js";

export async function uploadProductPhoto(productId, file, metadata = {}) {
  const safeName = (file.name || 'foto.jpg').replace(/[^\w.-]/g, '_');
  const storageRef = ref(storage, `products/${productId}/${Date.now()}_${safeName}`);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);

  await addDoc(collection(db, 'productPhotos'), {
    productId,
    url,
    address: metadata.address || '',
    source: metadata.source || 'product',
    uploadedBy: auth.currentUser.uid,
    createdAt: serverTimestamp()
  });

  return url;
}

export async function getProductPhotos(productId) {
  // Será usado nos detalhes do produto
  const { getDocs, query, where, orderBy } = await import("https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js");
  const photosRef = collection(db, 'productPhotos');
  const q = query(photosRef, where('productId', '==', productId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  const photos = [];
  snapshot.forEach(doc => photos.push({ id: doc.id, ...doc.data() }));
  return photos;
}
