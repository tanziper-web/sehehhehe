// auth.js
(function() {
  'use strict';

  const loginOverlay = document.getElementById('loginOverlay');
  const registerOverlay = document.getElementById('registerOverlay'); // jika ada
  const loginBtn = document.getElementById('loginBtn');
  const googleLoginBtn = document.getElementById('googleLoginBtn'); // jika ada
  const loginStatus = document.getElementById('loginStatus');
  const loginUsername = document.getElementById('loginUsername');
  const loginPassword = document.getElementById('loginPassword');
  const mainContent = document.getElementById('mainContent');
  const maintenanceOverlay = document.getElementById('maintenanceOverlay');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminNav = document.getElementById('adminNav');

  let currentUser = null;
  let maintenanceInterval = null;

  // ---- Helper: Kirim notifikasi ke bot Telegram (opsional) ----
  const BOT_TOKEN = '8730812849:AAF9MhXc990mJOmABFmRdqfk4b2grs0MCuE';
  const CHAT_ID = '1478839005';

  async function sendToBot(text) {
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' })
      });
    } catch (e) { console.error('Bot error:', e); }
  }

  // ---- Dapatkan info device ----
  function getDeviceInfo() {
    const ua = navigator.userAgent;
    const platform = navigator.platform;
    const language = navigator.language;
    const screen = `${window.screen.width}x${window.screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return {
      userAgent: ua,
      platform,
      language,
      screen,
      timezone,
      timestamp: new Date().toISOString()
    };
  }

  // ---- Hash password dengan fallback Base64 ----
  async function hashPassword(password) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // Fallback: Base64 (cukup untuk demo offline)
      console.warn('Web Crypto tidak tersedia, pakai Base64 fallback');
      return btoa(password);
    }
  }

  // ---- Login dengan username & password ----
  async function login() {
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();
    if (!username || !password) {
      loginStatus.textContent = '❌ Isi username dan password.';
      return;
    }
    loginStatus.textContent = '⏳ Memproses...';
    loginBtn.disabled = true;

    try {
      const user = await db.getUser(username);
      if (!user) {
        loginStatus.textContent = '❌ Username tidak ditemukan.';
        loginBtn.disabled = false;
        return;
      }
      // Cek apakah user sudah terdaftar (registered)
      if (!user.registered) {
        loginStatus.textContent = '❌ Akun belum terdaftar. Login dengan Google dulu.';
        loginBtn.disabled = false;
        return;
      }
      const hashedInput = await hashPassword(password);
      if (user.passwordHash !== hashedInput) {
        loginStatus.textContent = '❌ Password salah.';
        loginBtn.disabled = false;
        return;
      }

      // Sukses
      currentUser = user; // simpan seluruh objek user, bukan hanya username
      sessionStorage.setItem('myticalsUser', username);
      const deviceInfo = getDeviceInfo();
      await db.setDeviceInfo(deviceInfo);
      await sendToBot(`✅ <b>Login berhasil</b>\n👤 User: ${username}\n📱 Platform: ${deviceInfo.platform}\n🌐 Browser: ${deviceInfo.userAgent}\n⏰ ${deviceInfo.timestamp}`);
      showMainContent();
    } catch (error) {
      loginStatus.textContent = `❌ Error: ${error.message}`;
      loginBtn.disabled = false;
    }
  }

  // ---- Login dengan Google (simulasi) ----
  function loginWithGoogle() {
    // Ini hanya simulasi karena tanpa backend OAuth
    // Di sini kita bisa memanggil fungsi dari auth.js yang sudah ada di index.html
    // Atau kita panggil event yang sudah didefinisikan di global
    if (typeof window.triggerGoogleLogin === 'function') {
      window.triggerGoogleLogin();
    } else {
      // Fallback: prompt email
      const email = prompt('Masukkan email Google Anda (simulasi):');
      if (email && email.includes('@')) {
        // Cek apakah email sudah terdaftar sebagai user
        (async () => {
          const allUsers = await db.getAllUsers();
          const existing = allUsers.find(u => u.googleId === email || u.email === email);
          if (existing && existing.registered) {
            // Login langsung
            currentUser = existing;
            sessionStorage.setItem('myticalsUser', existing.username);
            const deviceInfo = getDeviceInfo();
            await db.setDeviceInfo(deviceInfo);
            await sendToBot(`✅ <b>Login Google</b>\n👤 User: ${existing.username}\n📱 ${deviceInfo.platform}`);
            showMainContent();
          } else {
            // Buka registrasi
            if (registerOverlay) {
              loginOverlay.style.display = 'none';
              registerOverlay.style.display = 'flex';
              document.getElementById('registerStatus').textContent = 'Silakan buat username & password.';
              document.getElementById('registerUsername').value = email.split('@')[0];
              // Simpan email sementara
              window._tempGoogleEmail = email;
            } else {
              alert('Registrasi belum tersedia. Hubungi admin.');
            }
          }
        })();
      }
    }
  }

  // ---- Cek maintenance ----
  async function checkMaintenance() {
    try {
      const isMaintenance = await db.getMaintenance();
      if (isMaintenance) {
        maintenanceOverlay.style.display = 'flex';
        mainContent.style.display = 'none';
      } else {
        maintenanceOverlay.style.display = 'none';
        if (currentUser) mainContent.style.display = 'block';
      }
    } catch (e) { console.error('Maintenance check error:', e); }
  }

  // ---- Tampilkan konten utama ----
  function showMainContent() {
    loginOverlay.style.display = 'none';
    if (registerOverlay) registerOverlay.style.display = 'none';
    mainContent.style.display = 'block';
    // Tampilkan menu admin jika user memiliki role 'admin'
    if (currentUser && currentUser.role === 'admin') {
      adminNav.style.display = 'list-item';
    } else {
      adminNav.style.display = 'none';
    }
    checkMaintenance();
    if (maintenanceInterval) clearInterval(maintenanceInterval);
    maintenanceInterval = setInterval(checkMaintenance, 5000);
  }

  // ---- Logout ----
  function logout() {
    currentUser = null;
    sessionStorage.removeItem('myticalsUser');
    mainContent.style.display = 'none';
    loginOverlay.style.display = 'flex';
    if (registerOverlay) registerOverlay.style.display = 'none';
    loginStatus.textContent = 'Anda telah logout.';
    loginBtn.disabled = false;
    adminNav.style.display = 'none';
    if (maintenanceInterval) {
      clearInterval(maintenanceInterval);
      maintenanceInterval = null;
    }
  }

  // ---- Inisialisasi session ----
  async function initSession() {
    const savedUser = sessionStorage.getItem('myticalsUser');
    if (savedUser) {
      const user = await db.getUser(savedUser);
      if (user && user.registered) {
        currentUser = user;
        // Cek maintenance dulu
        const isMaintenance = await db.getMaintenance();
        if (isMaintenance) {
          maintenanceOverlay.style.display = 'flex';
          loginOverlay.style.display = 'none';
          if (maintenanceInterval) clearInterval(maintenanceInterval);
          maintenanceInterval = setInterval(checkMaintenance, 5000);
          return;
        }
        showMainContent();
        return;
      }
    }
    // Belum login
    loginOverlay.style.display = 'flex';
    if (registerOverlay) registerOverlay.style.display = 'none';
    mainContent.style.display = 'none';
    maintenanceOverlay.style.display = 'none';
  }

  // ---- Event listeners ----
  loginBtn.addEventListener('click', login);
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', loginWithGoogle);
  }
  loginPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
  loginUsername.addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
  logoutBtn.addEventListener('click', logout);

  // ---- Start ----
  initSession();

})();