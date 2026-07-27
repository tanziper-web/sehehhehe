/**
 * report.js — Report Scam engine
 * Menggunakan: EmailJS, IndexedDB (db.js), export CSV/JSON, mailto
 */
(function() {
  'use strict';

  // DOM refs
  const configPublicKey = document.getElementById('configPublicKey');
  const configServiceID = document.getElementById('configServiceID');
  const configTemplateID = document.getElementById('configTemplateID');
  const saveConfigBtn = document.getElementById('saveConfigBtn');
  const configMsg = document.getElementById('configMsg');

  const senderList = document.getElementById('senderList');
  const senderSelect = document.getElementById('senderSelect');
  const newSenderInput = document.getElementById('newSenderInput');
  const addSenderBtn = document.getElementById('addSenderBtn');

  const platformSelect = document.getElementById('platformSelect');
  const toEmailInput = document.getElementById('toEmail');
  const subjectInput = document.getElementById('subjectInput');
  const reportedUser = document.getElementById('reportedUser');
  const messageInput = document.getElementById('messageInput');

  const sendBtn = document.getElementById('sendReportBtn');
  const mailtoBtn = document.getElementById('mailtoBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const statusDiv = document.getElementById('reportStatus');

  // ---- Load konfigurasi dari IndexedDB ----
  async function loadConfig() {
    await db.ready;
    const pk = await db.getConfig('emailjs_public');
    const sid = await db.getConfig('emailjs_service');
    const tid = await db.getConfig('emailjs_template');
    configPublicKey.value = pk || '';
    configServiceID.value = sid || '';
    configTemplateID.value = tid || '';
    updateConfigStatus();
    if (pk && sid && tid) {
      try { emailjs.init(pk); } catch(e) { console.warn('EmailJS init error:', e); }
    }
  }

  function updateConfigStatus() {
    const pk = configPublicKey.value.trim();
    const sid = configServiceID.value.trim();
    const tid = configTemplateID.value.trim();
    if (pk && sid && tid) {
      configMsg.innerHTML = '<span class="success"><i class="fas fa-check-circle"></i> Konfigurasi tersimpan. Siap kirim.</span>';
    } else {
      configMsg.innerHTML = '<span class="error"><i class="fas fa-exclamation-triangle"></i> Lengkapi konfigurasi untuk kirim via EmailJS.</span>';
    }
  }

  saveConfigBtn.addEventListener('click', async function() {
    const pk = configPublicKey.value.trim();
    const sid = configServiceID.value.trim();
    const tid = configTemplateID.value.trim();
    if (!pk || !sid || !tid) {
      alert('Semua field harus diisi.');
      return;
    }
    await db.ready;
    await db.setConfig('emailjs_public', pk);
    await db.setConfig('emailjs_service', sid);
    await db.setConfig('emailjs_template', tid);
    updateConfigStatus();
    try {
      emailjs.init(pk);
      configMsg.innerHTML = '<span class="success"><i class="fas fa-check-circle"></i> EmailJS siap digunakan.</span>';
    } catch(e) {
      configMsg.innerHTML = '<span class="error"><i class="fas fa-exclamation-triangle"></i> Gagal init EmailJS. Cek Public Key.</span>';
    }
  });

  // ---- Senders ----
  async function loadSenders() {
    await db.ready;
    const emails = await db.getSenders();
    renderSenders(emails);
  }

  function renderSenders(emails) {
    const list = senderList;
    const select = senderSelect;
    select.innerHTML = '<option value="">-- Pilih sender --</option>';
    if (!emails || emails.length === 0) {
      list.innerHTML = '<span style="color:var(--text-secondary); font-size:14px;">Belum ada sender.</span>';
    } else {
      list.innerHTML = emails.map((email, idx) => `
        <span class="sender-tag">
          <i class="fas fa-envelope"></i> ${email}
          <span class="remove-sender" data-email="${email}"><i class="fas fa-times-circle"></i></span>
        </span>
      `).join('');
      emails.forEach(email => {
        const opt = document.createElement('option');
        opt.value = email;
        opt.textContent = email;
        select.appendChild(opt);
      });
      document.querySelectorAll('.remove-sender').forEach(el => {
        el.addEventListener('click', async function() {
          const email = this.dataset.email;
          await db.ready;
          await db.removeSender(email);
          loadSenders();
        });
      });
    }
  }

  addSenderBtn.addEventListener('click', async function() {
    const email = newSenderInput.value.trim();
    if (!email || !email.includes('@')) {
      alert('Masukkan email valid.');
      return;
    }
    await db.ready;
    const existing = await db.getSenders();
    if (existing.includes(email)) {
      alert('Email sudah ada.');
      return;
    }
    await db.addSender(email);
    newSenderInput.value = '';
    loadSenders();
  });

  // ---- Platform mapping ----
  const platformMap = {
    telegram: { email: 'abuse@telegram.org', subject: 'Laporan Akun Telegram Scam' },
    binance: { email: 'abuse@binance.com', subject: 'Laporan Akun Binance Scam' },
    monzo: { email: 'report@monzo.com', subject: 'Laporan Akun Monzo Scam' },
    other: { email: '', subject: 'Laporan Akun Scam' }
  };

  platformSelect.addEventListener('change', function() {
    const plat = this.value;
    const data = platformMap[plat] || platformMap.other;
    if (plat === 'other') {
      toEmailInput.value = '';
      subjectInput.value = 'Laporan Akun Scam';
    } else {
      toEmailInput.value = data.email;
      subjectInput.value = data.subject;
    }
  });

  // ---- Kirim via EmailJS ----
  sendBtn.addEventListener('click', async function() {
    const sender = senderSelect.value;
    const toEmail = toEmailInput.value.trim();
    const subject = subjectInput.value.trim();
    const reported = reportedUser.value.trim();
    const message = messageInput.value.trim();

    if (!sender || !toEmail || !subject || !reported || !message) {
      statusDiv.className = 'status-msg error';
      statusDiv.innerHTML = 'Semua field harus diisi.';
      statusDiv.style.display = 'block';
      return;
    }

    const pk = configPublicKey.value.trim();
    const sid = configServiceID.value.trim();
    const tid = configTemplateID.value.trim();
    if (!pk || !sid || !tid) {
      statusDiv.className = 'status-msg error';
      statusDiv.innerHTML = 'Konfigurasi EmailJS belum lengkap.';
      statusDiv.style.display = 'block';
      return;
    }

    const templateParams = {
      to_email: toEmail,
      from_email: sender,
      subject: subject,
      message: message,
      reported_user: reported,
      platform: platformSelect.value,
      reply_to: sender
    };

    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
    statusDiv.style.display = 'none';

    try {
      await emailjs.send(sid, tid, templateParams);
      // Simpan ke IndexedDB
      await db.ready;
      await db.addReport({
        sender, toEmail, subject, reported, message,
        platform: platformSelect.value,
        status: 'sent'
      });
      statusDiv.className = 'status-msg success';
      statusDiv.innerHTML = `<i class="fas fa-check-circle"></i> Laporan terkirim ke ${toEmail} dan tersimpan di database.`;
    } catch (error) {
      statusDiv.className = 'status-msg error';
      statusDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> Gagal: ${error.text || error.message}`;
    } finally {
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim via EmailJS';
      statusDiv.style.display = 'block';
    }
  });

  // ---- Mailto (buka client email) ----
  mailtoBtn.addEventListener('click', function() {
    const sender = senderSelect.value;
    const to = toEmailInput.value.trim();
    const subject = subjectInput.value.trim();
    const body = `Laporan dari: ${sender}\nPlatform: ${platformSelect.value}\nUser dilaporkan: ${reportedUser.value.trim()}\n\n${messageInput.value.trim()}`;
    if (!to) {
      alert('Email tujuan tidak boleh kosong.');
      return;
    }
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  // ---- Export CSV ----
  exportCsvBtn.addEventListener('click', async function() {
    await db.ready;
    const reports = await db.getAllReports();
    if (!reports || reports.length === 0) {
      alert('Belum ada laporan untuk diexport.');
      return;
    }
    const headers = ['ID', 'Platform', 'Reported User', 'Sender', 'To Email', 'Subject', 'Message', 'Timestamp', 'Status'];
    const rows = reports.map(r => [
      r.id, r.platform || '', r.reported || '', r.sender || '', r.toEmail || '',
      r.subject || '', r.message || '', new Date(r.timestamp).toLocaleString(), r.status || ''
    ]);
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    downloadFile(csv, 'laporan_scam.csv', 'text/csv');
  });

  // ---- Export JSON ----
  exportJsonBtn.addEventListener('click', async function() {
    await db.ready;
    const reports = await db.getAllReports();
    if (!reports || reports.length === 0) {
      alert('Belum ada laporan untuk diexport.');
      return;
    }
    const json = JSON.stringify(reports, null, 2);
    downloadFile(json, 'laporan_scam.json', 'application/json');
  });

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---- Init ----
  loadConfig();
  loadSenders();

  // Set default platform email
  platformSelect.value = 'telegram';
  platformSelect.dispatchEvent(new Event('change'));

})();