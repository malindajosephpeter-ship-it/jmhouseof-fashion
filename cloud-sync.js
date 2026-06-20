/* ================================================================
   CLOUD SYNC MODULE — Netlify Database Integration
   Universal sync for all changes across all devices
   ================================================================ */

const SYNC_CONFIG = {
  endpoint: '/api/state',
  retryMax: 3,
  retryDelay: 1000,
  offlineQueue: []
};

let SYNC_STATE = {
  isOnline: true,
  isSyncing: false,
  lastSync: null,
  revision: 0,
  pendingChanges: []
};

/* ===== OFFLINE DETECTION ===== */
window.addEventListener('online', () => {
  console.log('[SYNC] Back online');
  SYNC_STATE.isOnline = true;
  toast('Umeunganishwa na mtandao', 'ok');
  syncToCloud();
});

window.addEventListener('offline', () => {
  console.log('[SYNC] Offline mode');
  SYNC_STATE.isOnline = false;
  toast('Hakuna mtandao — kazi utacontinue offline', 'info');
});

/* ===== SYNC TO CLOUD (Universal) ===== */
async function syncToCloud() {
  if (SYNC_STATE.isSyncing) return;
  if (!SYNC_STATE.isOnline) {
    console.log('[SYNC] Offline, queuing changes');
    return;
  }

  SYNC_STATE.isSyncing = true;
  
  for (let attempt = 0; attempt < SYNC_CONFIG.retryMax; attempt++) {
    try {
      const response = await fetch(SYNC_CONFIG.endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: DB })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      SYNC_STATE.revision = result.rev || SYNC_STATE.revision;
      SYNC_STATE.lastSync = new Date();
      SYNC_STATE.isSyncing = false;
      
      console.log('[SYNC] ✓ Data synchronized (revision:', result.rev, ')');
      return result;
      
    } catch (error) {
      console.warn(`[SYNC] Attempt ${attempt + 1}/${SYNC_CONFIG.retryMax} failed:`, error.message);
      if (attempt < SYNC_CONFIG.retryMax - 1) {
        await new Promise(r => setTimeout(r, SYNC_CONFIG.retryDelay * Math.pow(2, attempt)));
      }
    }
  }
  
  SYNC_STATE.isSyncing = false;
  console.error('[SYNC] Failed after all retries');
  toast('Sync na cloud ilishindikana', 'err');
}

/* ===== LOAD FROM CLOUD ===== */
async function loadFromCloud() {
  try {
    const response = await fetch(SYNC_CONFIG.endpoint, { method: 'GET' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const result = await response.json();
    if (result.data) {
      DB = result.data;
      SYNC_STATE.revision = result.rev || 0;
      save(); // Hifadhi kwenye localStorage pia
      console.log('[SYNC] ✓ Loaded from cloud (revision:', result.rev, ')');
      return true;
    }
  } catch (error) {
    console.warn('[SYNC] Could not load from cloud:', error.message);
  }
  return false;
}

/* ===== AUTO-SYNC INTERVAL ===== */
setInterval(() => {
  if (SYNC_STATE.isOnline && !SYNC_STATE.isSyncing) {
    syncToCloud();
  }
}, 30000); // Sync kila 30 sekunde

/* ===== ROLE-BASED PERMISSIONS ===== */
function canDelete() {
  const role = STATE.user?.role || 'admin';
  return ['admin', 'store'].includes(role);
}

function canEdit() {
  const role = STATE.user?.role || 'admin';
  return ['admin', 'store', 'cashier'].includes(role);
}

function canViewAudit() {
  const role = STATE.user?.role || 'admin';
  return ['admin', 'accountant'].includes(role);
}

/* ===== UNIVERSAL DELETE FUNCTION ===== */
async function deleteItem(type, id, name, forceNoConfirm = false) {
  if (!canDelete()) {
    toast('Huna ruhusa ya kudelete', 'err');
    return false;
  }

  const typeLabel = {
    'product': 'Bidhaa',
    'customer': 'Mteja',
    'supplier': 'Msambazaji',
    'expense': 'Matumizi'
  }[type] || 'Item';

  if (!forceNoConfirm) {
    return new Promise((resolve) => {
      const { close } = modal(
        `Thibitisha Delete ${typeLabel}?`,
        `<div style="text-align:center; padding:1rem;">
          <div class="fw7" style="font-size:1.2rem; margin-bottom:.5rem;">${name}</div>
          <div class="mini" style="color:var(--text-3); margin-bottom:1.5rem;">
            Je na hakika utaka kudelete item hii? Hatua hii haiwezi kubadilishwa.
          </div>
          <div style="background:rgba(248,113,113,.1); padding:.8rem; border-radius:10px; border-left:3px solid var(--danger);">
            <span class="mini" style="color:var(--danger);">⚠️ Hii ni hatua ya kudhaminiuka sana</span>
          </div>
        </div>`,
        `<button class="btn btn-ghost" data-close>Ghairi</button>
         <button class="btn btn-danger" id="confirmDel">Ndiyo, Delee</button>`
      );

      document.getElementById('confirmDel').onclick = () => {
        resolve(true);
        close();
        performDelete(type, id, name);
      };

      document.querySelector('[data-close]').addEventListener('click', () => {
        resolve(false);
      });
    });
  } else {
    return performDelete(type, id, name);
  }
}

async function performDelete(type, id, name) {
  try {
    // Delete kutoka DB
    if (type === 'product') {
      DB.products = DB.products.filter(p => p.id !== id);
    } else if (type === 'customer') {
      DB.customers = DB.customers.filter(c => c.id !== id);
    } else if (type === 'supplier') {
      DB.suppliers = DB.suppliers.filter(s => s.id !== id);
    } else if (type === 'expense') {
      DB.expenses = DB.expenses.filter(e => e.id !== id);
    }

    // Record audit trail
    const typeLabel = {
      'product': 'Bidhaa',
      'customer': 'Mteja',
      'supplier': 'Msambazaji',
      'expense': 'Matumizi'
    }[type] || 'Item';

    audit(
      `Kudelea ${typeLabel}`,
      `${typeLabel} "${name}" (ID: ${id}) ilideeted. Kwa: ${STATE.user?.name || 'Unknown'}`
    );

    // Sync kwa cloud
    await syncToCloud();

    toast(`${typeLabel} ilideeted hivyo.`, 'ok');
    
    // Refresh the page
    const pageMap = {
      'product': () => pageInventory(document.getElementById('content')),
      'customer': () => pageCustomers(document.getElementById('content')),
      'supplier': () => pageSuppliers(document.getElementById('content')),
      'expense': () => pageExpenses(document.getElementById('content'))
    };

    if (pageMap[type]) {
      pageMap[type]();
    }

    return true;
  } catch (error) {
    console.error('[DELETE] Error:', error);
    toast('Kosa katika kudelete', 'err');
    return false;
  }
}

/* ===== BATCH DELETE ===== */
async function deleteMultiple(type, ids, names) {
  if (!canDelete()) {
    toast('Huna ruhusa ya kudelete', 'err');
    return false;
  }

  return new Promise((resolve) => {
    const { close } = modal(
      `Thibitisha Kugawa Delete?`,
      `<div style="text-align:center; padding:1rem;">
        <div class="fw7" style="font-size:1.5rem; color:var(--danger); margin-bottom:.5rem;">${ids.length}</div>
        <div class="mini" style="color:var(--text-3); margin-bottom:1rem;">
          Items zinacheza kudelete:
        </div>
        <div style="background:var(--surface-2); padding:.8rem; border-radius:10px; margin-bottom:1rem; max-height:200px; overflow-y:auto; text-align:left;">
          ${names.slice(0, 10).map(n => `<div class="mini" style="padding:.25rem 0;">• ${n}</div>`).join('')}
          ${names.length > 10 ? `<div class="mini" style="padding:.25rem 0; color:var(--text-3);">...na ${names.length - 10} zaidi</div>` : ''}
        </div>
        <div style="background:rgba(248,113,113,.1); padding:.8rem; border-radius:10px; border-left:3px solid var(--danger);">
          <span class="mini" style="color:var(--danger);">⚠️ Hatua hii haiwezi kubadilishwa!</span>
        </div>
      </div>`,
      `<button class="btn btn-ghost" data-close>Ghairi</button>
       <button class="btn btn-danger" id="confirmDel">Ndiyo, Delea Zote</button>`
    );

    document.getElementById('confirmDel').onclick = async () => {
      for (const id of ids) {
        await performDelete(type, id, '');
      }
      resolve(true);
      close();
    };
  });
}
