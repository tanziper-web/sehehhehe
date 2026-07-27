// ================================================================
//  db.js — MyticalsDB (IndexedDB wrapper) — VERSION 3
//  Fungsinya: nyimpen user, laporan, sender, config, maintenance, device, files
//  Semua data tetep ada meskipun browser di-refresh
// ================================================================

const DB_NAME = 'MyticalsDB';
const DB_VERSION = 3; // ↑ naikkan versi karena ada perubahan store

class MyticalsDB {
  constructor() {
    this.db = null;
    this.ready = this._init();
  }

  _init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // --- Users store dengan index googleId ---
        if (!db.objectStoreNames.contains('users')) {
          const store = db.createObjectStore('users', { keyPath: 'username' });
          store.createIndex('googleId', 'googleId', { unique: true });
        } else {
          // Jika store sudah ada, coba tambahkan index (untuk upgrade dari versi 2)
          const tx = e.target.transaction;
          const store = tx.objectStore('users');
          if (!store.indexNames.contains('googleId')) {
            store.createIndex('googleId', 'googleId', { unique: true });
          }
        }

        if (!db.objectStoreNames.contains('reports')) {
          const store = db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
          store.createIndex('platform', 'platform', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
        if (!db.objectStoreNames.contains('senders')) {
          db.createObjectStore('senders', { keyPath: 'email' });
        }
        if (!db.objectStoreNames.contains('config')) {
          db.createObjectStore('config', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('maintenance')) {
          db.createObjectStore('maintenance', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('device')) {
          db.createObjectStore('device', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  // ================================================================
  //  USERS — dengan data lengkap
  // ================================================================

  /**
   * Tambah / update user dengan objek lengkap
   * @param {Object} userData - { username, passwordHash, googleId?, registered?, role?, name?, email?, createdAt? }
   */
  async addUser(userData) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      const request = store.put(userData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUser(username) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const request = store.get(username);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getUserByGoogleId(googleId) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const index = store.index('googleId');
      const request = index.get(googleId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllUsers() {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateUser(username, data) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      const request = store.get(username);
      request.onsuccess = () => {
        const user = request.result;
        if (!user) { reject(new Error('User tidak ditemukan')); return; }
        Object.assign(user, data);
        const putReq = store.put(user);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ================================================================
  //  REPORTS
  // ================================================================
  async addReport(data) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('reports', 'readwrite');
      const store = tx.objectStore('reports');
      const request = store.add({ ...data, timestamp: Date.now() });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async getAllReports() {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('reports', 'readonly');
      const store = tx.objectStore('reports');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ================================================================
  //  SENDERS
  // ================================================================
  async addSender(email) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('senders', 'readwrite');
      const store = tx.objectStore('senders');
      const request = store.put({ email });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  async getSenders() {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('senders', 'readonly');
      const store = tx.objectStore('senders');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result.map(r => r.email));
      request.onerror = () => reject(request.error);
    });
  }
  async removeSender(email) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('senders', 'readwrite');
      const store = tx.objectStore('senders');
      const request = store.delete(email);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ================================================================
  //  CONFIG
  // ================================================================
  async setConfig(key, value) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('config', 'readwrite');
      const store = tx.objectStore('config');
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  async getConfig(key) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('config', 'readonly');
      const store = tx.objectStore('config');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ? request.result.value : null);
      request.onerror = () => reject(request.error);
    });
  }

  // ================================================================
  //  MAINTENANCE
  // ================================================================
  async setMaintenance(flag) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('maintenance', 'readwrite');
      const store = tx.objectStore('maintenance');
      const request = store.put({ id: 'flag', value: flag });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  async getMaintenance() {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('maintenance', 'readonly');
      const store = tx.objectStore('maintenance');
      const request = store.get('flag');
      request.onsuccess = () => resolve(request.result ? request.result.value : false);
      request.onerror = () => reject(request.error);
    });
  }

  // ================================================================
  //  DEVICE
  // ================================================================
  async setDeviceInfo(info) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('device', 'readwrite');
      const store = tx.objectStore('device');
      const request = store.put({ id: 'lastDevice', ...info, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  async getDeviceInfo() {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('device', 'readonly');
      const store = tx.objectStore('device');
      const request = store.get('lastDevice');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // ================================================================
  //  FILES (untuk upload to URL)
  // ================================================================
  async getFile(id) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// ================================================================
//  INSTANCE GLOBAL
// ================================================================
const db = new MyticalsDB();

// ================================================================
//  HELPER: HASH PASSWORD (dengan fallback Base64)
// ================================================================
async function hashPasswordFallback(password) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    console.warn('⚠️ Web Crypto tidak tersedia, pakai Base64 fallback');
    return btoa(password);
  }
}

// ================================================================
//  INISIALISASI USER ADMIN (arga) DENGAN DATA LENGKAP
// ================================================================
(async function initAdmin() {
  await db.ready;
  const existing = await db.getUser('arga');
  if (existing) {
    // Jika user arga sudah ada tapi masih pake password 'argaking', update ke 'arga123'
    // Coba hash 'arga123' dan cek apakah cocok
    const hashArgaking = await hashPasswordFallback('argaking');
    const hashArga123 = await hashPasswordFallback('arga123');
    if (existing.passwordHash === hashArgaking) {
      // Update password ke arga123 dan tambahkan role admin
      await db.updateUser('arga', {
        passwordHash: hashArga123,
        role: 'admin',
        registered: true,
        name: 'Admin Arga',
        email: 'admin@myticals.web'
      });
      console.log('✅ Admin arga diupdate: password arga123, role admin');
    } else if (!existing.role) {
      // Jika belum punya role, tambahkan
      await db.updateUser('arga', { role: 'admin', registered: true });
      console.log('✅ Admin arga diberi role admin');
    }
    return;
  }

  // Buat user arga baru dengan data lengkap
  const hash = await hashPasswordFallback('arga123');
  await db.addUser({
    username: 'arga',
    passwordHash: hash,
    googleId: null,
    registered: true,
    role: 'admin',
    name: 'Admin Arga',
    email: 'admin@myticals.web',
    createdAt: Date.now()
  });
  console.log('✅ Admin arga created (username: arga, password: arga123)');
})();