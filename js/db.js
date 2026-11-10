/* db.js — database del browser (IndexedDB) per i dati di QClab.
   Prima tutto stava in localStorage: circa 5 MB, condivisi con Temp-frigo e con i PDF archiviati. Con il generatore
   (un anno di CQ per tutti gli strumenti sono ~36.000 valori) la memoria si riempiva e i dati NON venivano salvati.
   IndexedDB e' un vero database del browser (centinaia di MB): ci finiscono strumenti, valori CQ (manuali e generati)
   e calibrazioni. Se IndexedDB non e' disponibile (es. alcune finestre anonime) si torna a localStorage. */
const QC_DB_NAME = 'qclab', QC_DB_STORE = 'dati';
let _qcDbOpen = null;

function qcDbOpen() {
  if (_qcDbOpen) return _qcDbOpen;
  _qcDbOpen = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB non disponibile in questo browser')); return; }
    let req;
    try { req = indexedDB.open(QC_DB_NAME, 1); } catch (e) { reject(e); return; }
    req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(QC_DB_STORE)) db.createObjectStore(QC_DB_STORE); };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); _qcDbOpen = null; };
      resolve(db);
    };
    req.onerror = () => reject(req.error || new Error('Apertura del database non riuscita'));
    req.onblocked = () => reject(new Error('Database bloccato da un\'altra scheda di QClab: chiudila e ricarica'));
  });
  _qcDbOpen.catch(() => { _qcDbOpen = null; });
  return _qcDbOpen;
}

function qcDbGet(key) {
  return qcDbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(QC_DB_STORE, 'readonly');
    const r = tx.objectStore(QC_DB_STORE).get(key);
    r.onsuccess = () => resolve(r.result === undefined ? null : r.result);
    r.onerror = () => reject(r.error);
  }));
}

/* il valore viene copiato al momento della chiamata: le modifiche successive allo stato non lo toccano */
function qcDbPut(key, value) {
  return qcDbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(QC_DB_STORE, 'readwrite');
    tx.objectStore(QC_DB_STORE).put(value, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error('Scrittura non riuscita'));
    tx.onabort = () => reject(tx.error || new Error('Scrittura annullata (spazio esaurito?)'));
  }));
}

/* chiede al browser di non cancellare il database quando serve spazio sul disco */
function qcDbPersisti() {
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { }
}

/* spazio occupato (per Impostazioni) */
async function qcDbSpazio() {
  try { if (navigator.storage && navigator.storage.estimate) { const s = await navigator.storage.estimate(); return { usato: s.usage || 0, quota: s.quota || 0 }; } } catch (e) { }
  return null;
}
