// js/database.js
const STORAGE_PRODUCTS_KEY = 'smartstock_products';
const STORAGE_CATEGORIES_KEY = 'smartstock_categories';
const STORAGE_COUNTS_KEY = 'smartstock_counts';
const STORAGE_PATTERNS_KEY = 'smartstock_patterns';

function loadJson(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getProducts() {
  return loadJson(STORAGE_PRODUCTS_KEY, []).filter(p => p.active !== false);
}

export function getProductById(id) {
  return getProducts().find(p => p.id === id) || null;
}

export function createProduct(productData) {
  const products = loadJson(STORAGE_PRODUCTS_KEY, []);
  const product = {
    id: `prod-${Date.now()}`,
    name: productData.name,
    sku: productData.sku || '',
    categoryId: productData.categoryId || null,
    categoryName: productData.categoryName || '',
    quantity: Number(productData.quantity) || 0,
    address: productData.address || '',
    active: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  products.unshift(product);
  saveJson(STORAGE_PRODUCTS_KEY, products);
  return product.id;
}

export function updateProduct(id, updatedData) {
  const products = loadJson(STORAGE_PRODUCTS_KEY, []);
  const index = products.findIndex(p => p.id === id);
  if (index === -1) throw new Error('Produto não encontrado.');
  products[index] = {
    ...products[index],
    ...updatedData,
    categoryName: updatedData.categoryName ?? products[index].categoryName ?? '',
    quantity: Number(updatedData.quantity !== undefined ? updatedData.quantity : products[index].quantity || 0),
    updatedAt: Date.now()
  };
  saveJson(STORAGE_PRODUCTS_KEY, products);
}

export function deleteProduct(id) {
  const products = loadJson(STORAGE_PRODUCTS_KEY, []);
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return;
  products[index].active = false;
  products[index].updatedAt = Date.now();
  saveJson(STORAGE_PRODUCTS_KEY, products);
}

export function searchProducts(term) {
  const lower = (term || '').trim().toLowerCase();
  if (!lower) return getProducts();
  return getProducts().filter(p =>
    p.name.toLowerCase().includes(lower) ||
    (p.sku || '').toLowerCase().includes(lower) ||
    (p.address || '').toLowerCase().includes(lower) ||
    (p.categoryName || '').toLowerCase().includes(lower)
  );
}

export function getCategories() {
  const defaults = [{ id: 'cat-0', name: 'Sem categoria' }];
  const categories = loadJson(STORAGE_CATEGORIES_KEY, defaults);
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    saveJson(STORAGE_CATEGORIES_KEY, defaults);
    return defaults;
  }
  return categories;
}

export function createCategory(name) {
  const categories = getCategories();
  const category = { id: `cat-${Date.now()}`, name };
  categories.push(category);
  saveJson(STORAGE_CATEGORIES_KEY, categories);
  return category.id;
}

export function updateCategory(id, name) {
  const categories = getCategories();
  const index = categories.findIndex(c => c.id === id);
  if (index === -1) throw new Error('Categoria não encontrada.');
  categories[index].name = name;
  saveJson(STORAGE_CATEGORIES_KEY, categories);
}

export function deleteCategory(id) {
  const categories = getCategories();
  const filtered = categories.filter(c => c.id !== id);
  saveJson(STORAGE_CATEGORIES_KEY, filtered.length ? filtered : [{ id: 'cat-0', name: 'Sem categoria' }]);
}

export function getAddressPatterns() {
  const patterns = loadJson(STORAGE_PATTERNS_KEY, []);
  return Array.isArray(patterns) ? patterns : [];
}

export function createAddressPattern(data) {
  const patterns = getAddressPatterns();
  const pattern = {
    id: `pattern-${Date.now()}`,
    name: data.name,
    format: data.format || 'A-{corredor}-{prateleira}-{nivel}',
    nextNumber: Number(data.nextNumber) || 1,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  patterns.unshift(pattern);
  saveJson(STORAGE_PATTERNS_KEY, patterns);
  return pattern.id;
}

export function updateAddressPattern(id, data) {
  const patterns = getAddressPatterns();
  const index = patterns.findIndex(p => p.id === id);
  if (index === -1) throw new Error('Padrão não encontrado.');
  patterns[index] = {
    ...patterns[index],
    name: data.name,
    format: data.format,
    nextNumber: Number(data.nextNumber) || patterns[index].nextNumber,
    updatedAt: Date.now()
  };
  saveJson(STORAGE_PATTERNS_KEY, patterns);
}

export function deleteAddressPattern(id) {
  const patterns = getAddressPatterns();
  const filtered = patterns.filter(p => p.id !== id);
  saveJson(STORAGE_PATTERNS_KEY, filtered);
}

export function saveCount(productId, quantity) {
  const counts = loadJson(STORAGE_COUNTS_KEY, []);
  counts.unshift({
    id: `count-${Date.now()}`,
    productId,
    quantity: Number(quantity) || 0,
    createdAt: Date.now()
  });
  saveJson(STORAGE_COUNTS_KEY, counts);
}

export function getReportData() {
  return getProducts().map(product => ({
    SKU: product.sku,
    Nome: product.name,
    Categoria: product.categoryName || 'Sem categoria',
    Quantidade: product.quantity,
    Endereço: product.address || ''
  }));
}

