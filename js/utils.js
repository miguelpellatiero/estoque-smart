// =============================================
// UTILITÁRIOS
// =============================================

// Formata data
function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR');
}

// Exporta para Excel
function exportToExcel(data, filename = 'estoque') {
  // Cria CSV (simples e compatível)
  let csv = 'SKU;Nome;Categoria;Quantidade;Endereço\n';
  data.forEach(item => {
    csv += `${item.SKU};${item.Nome};${item.Categoria};${item.Quantidade};${item.Endereço}\n`;
  });
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
}

// Toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Modal simples
function openModal(modalId) {
  document.getElementById(modalId).style.display = 'flex';
}
function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// Compressão de imagem antes do upload
function compressImage(file, maxWidth = 800) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.7);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}