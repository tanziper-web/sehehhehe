// admin.js
(function() {
  'use strict';

  // Cek apakah user saat ini adalah arga
  async function isAdmin() {
    const user = sessionStorage.getItem('myticalsUser');
    return user === 'arga';
  }

  // ---- Render Admin Data ----
  async function renderAdmin() {
    if (!(await isAdmin())) return;

    // Maintenance toggle
    const statusEl = document.getElementById('maintenanceStatus');
    const toggleBtn = document.getElementById('toggleMaintenanceBtn');
    const current = await db.getMaintenance();
    statusEl.textContent = current ? 'Aktif' : 'Nonaktif';
    statusEl.style.color = current ? '#f59e0b' : '#10b981';

    toggleBtn.addEventListener('click', async function() {
      const now = await db.getMaintenance();
      await db.setMaintenance(!now);
      renderAdmin(); // refresh
    });

    // Daftar laporan
    const reports = await db.getAllReports();
    const reportsDiv = document.getElementById('adminReports');
    if (reports.length === 0) {
      reportsDiv.innerHTML = '<p style="color:var(--text-secondary);">Belum ada laporan.</p>';
    } else {
      reportsDiv.innerHTML = `<ul style="list-style:none; display:flex; flex-direction:column; gap:8px;">
        ${reports.map(r => `<li style="background:var(--input-bg); padding:12px 16px; border-radius:20px; border:1px solid var(--border-color);">
          <div><strong>ID:</strong> ${r.id} | <strong>Platform:</strong> ${r.platform || '-'} | <strong>User:</strong> ${r.reported || '-'}</div>
          <div style="font-size:13px; color:var(--text-secondary);">Dikirim: ${new Date(r.timestamp).toLocaleString()} | Status: ${r.status || 'sent'}</div>
        </li>`).join('')}
      </ul>`;
    }

    // Daftar sender
    const senders = await db.getSenders();
    const sendersDiv = document.getElementById('adminSenders');
    if (senders.length === 0) {
      sendersDiv.innerHTML = '<p style="color:var(--text-secondary);">Tidak ada sender.</p>';
    } else {
      sendersDiv.innerHTML = `<ul style="list-style:none; display:flex; flex-wrap:wrap; gap:8px;">
        ${senders.map(email => `<li style="background:var(--input-bg); padding:6px 16px; border-radius:40px; border:1px solid var(--border-color);">${email}</li>`).join('')}
      </ul>`;
    }

    // Device info
    const device = await db.getDeviceInfo();
    const deviceDiv = document.getElementById('adminDeviceInfo');
    if (device) {
      deviceDiv.textContent = JSON.stringify(device, null, 2);
    } else {
      deviceDiv.textContent = 'Belum ada data device.';
    }
  }

  // ---- Inisialisasi saat halaman admin ditampilkan ----
  document.addEventListener('DOMContentLoaded', function() {
    // Cek jika kita di halaman admin (page-admin)
    const adminPage = document.getElementById('page-admin');
    const observer = new MutationObserver(() => {
      if (adminPage.classList.contains('active')) {
        renderAdmin();
      }
    });
    observer.observe(adminPage, { attributes: true, attributeFilter: ['class'] });
    // Jika langsung aktif saat load
    if (adminPage.classList.contains('active')) {
      renderAdmin();
    }
  });

})();