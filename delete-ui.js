/* ================================================================
   DELETE UI COMPONENTS
   Delete buttons na modals kwa kila section
   ================================================================ */

function deleteActionBtn(type, id, name, className = 'btn-sm') {
  if (!canDelete()) return '';
  return `<button class="btn btn-danger ${className}" onclick="deleteItem('${type}', '${id}', '${name.replace(/'/g, "\\'")}')"
    title="Delea item hii"><span>${I.trash}</span></button>`;
}

function deleteIconBtn(type, id, name) {
  if (!canDelete()) return '';
  return `<button class="icon-btn" style="color:var(--danger);" onclick="deleteItem('${type}', '${id}', '${name.replace(/'/g, "\\'")}')"
    title="Delea" style="padding:4px; width:32px; height:32px;">${I.trash}</button>`;
}

function productTableRow(p, searchMatch = true) {
  const selected = (window.selectedProducts || []).includes(p.id);
  const stock = p.stock;
  const outOfStock = stock <= 0;
  const lowStock = stock > 0 && stock <= lowStockThreshold();

  return `
    <tr class="${selected ? 'selected' : ''}" data-product-id="${p.id}">
      <td>
        <input type="checkbox" class="prod-select" data-id="${p.id}" value="${p.name}"
          onchange="toggleProductSelection(this)" ${selected ? 'checked' : ''}>
      </td>
      <td><span class="fw7" style="font-size:1.3rem; display:inline-block;">${p.emoji || '👗'}</span></td>
      <td>
        <div class="fw7">${p.name}</div>
        <div class="mini" style="color:var(--text-3);">SKU: ${p.barcode}</div>
      </td>
      <td>
        <div>${p.cat}</div>
      </td>
      <td>
        <div class="fw7">${fmt(p.price)}</div>
        <div class="mini" style="color:var(--text-3);">Cost: ${fmt(p.cost)}</div>
      </td>
      <td>
        <span class="pill ${outOfStock ? 'danger' : lowStock ? 'warn' : 'ok'}">
          ${outOfStock ? '🔴 Imeisha' : lowStock ? '🟡 Chache ' + stock : '🟢 ' + stock}
        </span>
      </td>
      <td>
        ${hasPromo(p) ? `<span class="pill ok" style="font-size:.7rem;">🏷️ ${fmt(p.promoPrice)}</span>` : '-'}
      </td>
      <td class="txt-r">
        <button class="icon-btn" onclick="editProduct('${p.id}')" title="Hariri">${I.edit}</button>
        ${deleteIconBtn('product', p.id, p.name)}
      </td>
    </tr>
  `;
}

function customerTableRow(c) {
  const selected = (window.selectedCustomers || []).includes(c.id);
  return `
    <tr class="${selected ? 'selected' : ''}" data-customer-id="${c.id}">
      <td>
        <input type="checkbox" class="cust-select" data-id="${c.id}" value="${c.name}"
          onchange="toggleCustomerSelection(this)" ${selected ? 'checked' : ''}>
      </td>
      <td>
        <div class="fw7">${c.name}</div>
        <div class="mini" style="color:var(--text-3);">${c.phone}</div>
      </td>
      <td>${c.email || '-'}</td>
      <td>${c.address}</td>
      <td>
        <span class="pill ${c.debt > 0 ? 'warn' : 'ok'}">
          ${c.debt > 0 ? fmt(c.debt) + ' (Deni)' : 'Hajina'}
        </span>
      </td>
      <td>${fmt(c.totalSpent)}</td>
      <td>${c.points}</td>
      <td class="txt-r">
        <button class="icon-btn" onclick="editCustomer('${c.id}')" title="Hariri">${I.edit}</button>
        ${deleteIconBtn('customer', c.id, c.name)}
      </td>
    </tr>
  `;
}

function supplierTableRow(s) {
  const selected = (window.selectedSuppliers || []).includes(s.id);
  return `
    <tr class="${selected ? 'selected' : ''}" data-supplier-id="${s.id}">
      <td>
        <input type="checkbox" class="supp-select" data-id="${s.id}" value="${s.name}"
          onchange="toggleSupplierSelection(this)" ${selected ? 'checked' : ''}>
      </td>
      <td>
        <div class="fw7">${s.name}</div>
        <div class="mini" style="color:var(--text-3);">${s.phone}</div>
      </td>
      <td>${s.email || '-'}</td>
      <td>${s.address}</td>
      <td>
        <span class="pill ${s.balance > 0 ? 'danger' : 'ok'}">
          ${s.balance > 0 ? fmt(s.balance) + ' (Owe)' : 'Hajina'}
        </span>
      </td>
      <td class="txt-r">
        <button class="icon-btn" onclick="editSupplier('${s.id}')" title="Hariri">${I.edit}</button>
        ${deleteIconBtn('supplier', s.id, s.name)}
      </td>
    </tr>
  `;
}

function expenseTableRow(e) {
  return `
    <tr data-expense-id="${e.id}">
      <td>${dateSw(e.date)}</td>
      <td>${e.cat}</td>
      <td>${e.note || '-'}</td>
      <td class="txt-r" style="font-weight:700;">${fmt(e.amount)}</td>
      <td class="txt-r">
        <button class="icon-btn" onclick="editExpense('${e.id}')" title="Hariri">${I.edit}</button>
        ${deleteIconBtn('expense', e.id, e.cat + ' - ' + fmt(e.amount))}
      </td>
    </tr>
  `;
}

/* ===== BULK DELETE SELECTION ===== */
window.selectedProducts = [];
window.selectedCustomers = [];
window.selectedSuppliers = [];

function toggleProductSelection(checkbox) {
  const id = checkbox.dataset.id;
  if (checkbox.checked) {
    if (!window.selectedProducts.includes(id)) window.selectedProducts.push(id);
  } else {
    window.selectedProducts = window.selectedProducts.filter(x => x !== id);
  }
  updateBulkDeleteUI();
}

function toggleCustomerSelection(checkbox) {
  const id = checkbox.dataset.id;
  if (checkbox.checked) {
    if (!window.selectedCustomers.includes(id)) window.selectedCustomers.push(id);
  } else {
    window.selectedCustomers = window.selectedCustomers.filter(x => x !== id);
  }
  updateBulkDeleteUI();
}

function toggleSupplierSelection(checkbox) {
  const id = checkbox.dataset.id;
  if (checkbox.checked) {
    if (!window.selectedSuppliers.includes(id)) window.selectedSuppliers.push(id);
  } else {
    window.selectedSuppliers = window.selectedSuppliers.filter(x => x !== id);
  }
  updateBulkDeleteUI();
}

function bulkDeleteProducts() {
  if (window.selectedProducts.length === 0) {
    toast('Hakuna bidhaa iliyochaguliwa', 'info');
    return;
  }
  const names = window.selectedProducts.map(id => {
    const p = DB.products.find(x => x.id === id);
    return p ? p.name : id;
  });
  deleteMultiple('product', window.selectedProducts, names);
  window.selectedProducts = [];
}

function bulkDeleteCustomers() {
  if (window.selectedCustomers.length === 0) {
    toast('Hakuna wateja waliochaguliwa', 'info');
    return;
  }
  const names = window.selectedCustomers.map(id => {
    const c = DB.customers.find(x => x.id === id);
    return c ? c.name : id;
  });
  deleteMultiple('customer', window.selectedCustomers, names);
  window.selectedCustomers = [];
}

function bulkDeleteSuppliers() {
  if (window.selectedSuppliers.length === 0) {
    toast('Hakuna wasambazaji waliochaguliwa', 'info');
    return;
  }
  const names = window.selectedSuppliers.map(id => {
    const s = DB.suppliers.find(x => x.id === id);
    return s ? s.name : id;
  });
  deleteMultiple('supplier', window.selectedSuppliers, names);
  window.selectedSuppliers = [];
}

function updateBulkDeleteUI() {
  // Update checkboxes
  const prodCount = window.selectedProducts.length;
  const custCount = window.selectedCustomers.length;
  const suppCount = window.selectedSuppliers.length;

  const prodBtn = document.getElementById('bulkDelProducts');
  const custBtn = document.getElementById('bulkDelCustomers');
  const suppBtn = document.getElementById('bulkDelSuppliers');

  if (prodBtn) {
    prodBtn.style.display = prodCount > 0 ? 'inline-flex' : 'none';
    prodBtn.textContent = `🗑️ Delea ${prodCount}`;
  }
  if (custBtn) {
    custBtn.style.display = custCount > 0 ? 'inline-flex' : 'none';
    custBtn.textContent = `🗑️ Delea ${custCount}`;
  }
  if (suppBtn) {
    suppBtn.style.display = suppCount > 0 ? 'inline-flex' : 'none';
    suppBtn.textContent = `🗑️ Delea ${suppCount}`;
  }
}

/* ===== SYNC STATUS INDICATOR ===== */
function syncStatusIndicator() {
  const status = SYNC_STATE.isOnline ? '✓ Online' : '⚠ Offline';
  const color = SYNC_STATE.isOnline ? 'var(--ok)' : 'var(--warn)';
  const lastSync = SYNC_STATE.lastSync ? `Last: ${SYNC_STATE.lastSync.toLocaleTimeString()}` : '';
  return `<div style="font-size:.75rem; color:${color}; display:flex; gap:.3rem; align-items:center;">
    <span style="width:8px; height:8px; background:${color}; border-radius:50%; display:inline-block;"></span>
    ${status}
  </div>`;
}
