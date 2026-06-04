// js/utils.js
export function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

export function exportToCsv(data, filename = 'estoque') {
  if (!Array.isArray(data)) return;
  const headers = Object.keys(data[0] || {});
  const csvRows = [];
  csvRows.push(headers.join(';'));
  data.forEach(row => {
    const values = headers.map(header => `"${String(row[header] ?? '').replace(/"/g, '""')}"`);
    csvRows.push(values.join(';'));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
}

export function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR');
}

export function safeText(value) {
  return String(value ?? '');
}
