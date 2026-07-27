// super-tools.js — Myticals Web Pro Super Tools
(function() {
  'use strict';

  // ============================================================
  // 1. UPLOAD TO URL (menggunakan IndexedDB)
  // ============================================================
  document.getElementById('uploadToUrlBtn')?.addEventListener('click', async function() {
    const file = document.getElementById('uploadFile').files[0];
    if (!file) { alert('Pilih file dulu!'); return; }
    try {
      // Simpan ke IndexedDB
      await db.ready;
      const tx = db.db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const id = await new Promise((resolve, reject) => {
        const req = store.add({ name: file.name, type: file.type, data: await file.arrayBuffer() });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const url = `${window.location.origin}?file=${id}`;
      document.getElementById('uploadResult').innerHTML = `
        <i class="fas fa-check-circle" style="color:#10b981;"></i> File tersimpan!<br>
        <strong>Link:</strong> <a href="${url}" target="_blank">${url}</a>
      `;
    } catch (e) {
      document.getElementById('uploadResult').innerHTML = `<span style="color:#ff6b9d;">Error: ${e.message}</span>`;
    }
  });

  // ============================================================
  // 2. DOWNLOAD FROM URL
  // ============================================================
  document.getElementById('downloadFromUrlBtn')?.addEventListener('click', async function() {
    const url = document.getElementById('downloadUrlInput').value.trim();
    if (!url) { alert('Masukkan URL!'); return; }
    const resultDiv = document.getElementById('downloadResult');
    resultDiv.innerHTML = '⏳ Mengunduh...';
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Gagal fetch: ' + response.status);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = url.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      resultDiv.innerHTML = `<i class="fas fa-check-circle" style="color:#10b981;"></i> Download dimulai!`;
    } catch (e) {
      resultDiv.innerHTML = `<span style="color:#ff6b9d;">Error: ${e.message}</span>`;
    }
  });

  // ============================================================
  // 3. ENCRYPT FILE (AES-256-GCM)
  // ============================================================
  async function encryptData(data, password) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
    );
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    const result = new Uint8Array(1 + salt.length + iv.length + encrypted.byteLength);
    result.set([0x01], 0);
    result.set(salt, 1);
    result.set(iv, 17);
    result.set(new Uint8Array(encrypted), 29);
    return result.buffer;
  }

  async function decryptData(encryptedData, password) {
    const data = new Uint8Array(encryptedData);
    const version = data[0];
    if (version !== 1) throw new Error('Format tidak dikenal');
    const salt = data.slice(1, 17);
    const iv = data.slice(17, 29);
    const ciphertext = data.slice(29);
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    );
    return await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  }

  document.getElementById('encryptFileBtn')?.addEventListener('click', async function() {
    const file = document.getElementById('encryptFileInput').files[0];
    const password = document.getElementById('encryptPassword').value;
    if (!file || !password) { alert('Pilih file dan masukkan password!'); return; }
    const resultDiv = document.getElementById('encryptResult');
    resultDiv.innerHTML = '⏳ Mengenkripsi...';
    try {
      const data = await file.arrayBuffer();
      const encrypted = await encryptData(data, password);
      const blob = new Blob([encrypted], { type: 'application/octet-stream' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.name + '.encrypted';
      a.click();
      a.remove();
      resultDiv.innerHTML = `<i class="fas fa-check-circle" style="color:#10b981;"></i> File terenkripsi! (${(encrypted.byteLength / 1024).toFixed(1)} KB)`;
    } catch (e) {
      resultDiv.innerHTML = `<span style="color:#ff6b9d;">Error: ${e.message}</span>`;
    }
  });

  // ============================================================
  // 4. DECRYPT FILE
  // ============================================================
  document.getElementById('decryptFileBtn')?.addEventListener('click', async function() {
    const file = document.getElementById('decryptFileInput').files[0];
    const password = document.getElementById('decryptPassword').value;
    if (!file || !password) { alert('Pilih file dan masukkan password!'); return; }
    const resultDiv = document.getElementById('decryptResult');
    resultDiv.innerHTML = '⏳ Mendekripsi...';
    try {
      const data = await file.arrayBuffer();
      const decrypted = await decryptData(data, password);
      const originalName = file.name.replace(/\.encrypted$/, '');
      const blob = new Blob([decrypted]);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = originalName || 'decrypted.bin';
      a.click();
      a.remove();
      resultDiv.innerHTML = `<i class="fas fa-check-circle" style="color:#10b981;"></i> File didekripsi!`;
    } catch (e) {
      resultDiv.innerHTML = `<span style="color:#ff6b9d;">Error: ${e.message}</span>`;
    }
  });

  // ============================================================
  // 5. BUILD TO APK (via API pwa2apk.com)
  // ============================================================
  document.getElementById('buildApkBtn')?.addEventListener('click', async function() {
    const name = document.getElementById('apkName').value.trim() || 'MyticalsApp';
    const resultDiv = document.getElementById('apkResult');
    resultDiv.innerHTML = '⏳ Membangun APK... (mungkin butuh 30-60 detik)';
    try {
      const formData = new FormData();
      formData.append('url', window.location.href);
      formData.append('name', name);
      formData.append('icon', 'https://i.imgur.com/default-icon.png'); // bisa diganti

      const response = await fetch('https://pwa2apk.com/api/generate', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Gagal generate APK');
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${name}.apk`;
      a.click();
      a.remove();
      resultDiv.innerHTML = `<i class="fas fa-check-circle" style="color:#10b981;"></i> APK siap di-download!`;
    } catch (e) {
      resultDiv.innerHTML = `<span style="color:#ff6b9d;">Error: ${e.message}. Coba metode lain di bawah.</span>`;
    }
  });

  // ============================================================
  // 6. BUILD TO EXE (menggunakan HTML2EXE via API)
  // ============================================================
  document.getElementById('buildExeBtn')?.addEventListener('click', function() {
    const resultDiv = document.getElementById('exeResult');
    resultDiv.innerHTML = `
      ⏳ Untuk build EXE, download tool ini:<br>
      <a href="https://github.com/AdRohal/HTML2EXE" target="_blank" style="color:var(--accent);">HTML2EXE GitHub</a><br>
      Atau gunakan Nativefier: <code>npm install -g nativefier && nativefier "${window.location.href}"</code>
    `;
  });

  // ============================================================
  // 7. QR CODE GENERATOR
  // ============================================================
  document.getElementById('generateQrBtn')?.addEventListener('click', function() {
    const url = document.getElementById('qrInput').value.trim() || window.location.href;
    const resultDiv = document.getElementById('qrResult');
    // Gunakan API qr code gratis
    resultDiv.innerHTML = `
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" 
           style="border-radius:20px; border:2px solid var(--border-color); max-width:200px;">
      <br><span style="font-size:12px; color:var(--text-secondary);">Scan QR untuk membuka link</span>
    `;
  });

  // ============================================================
  // 8. SCREEN CAPTURE
  // ============================================================
  document.getElementById('screenCaptureBtn')?.addEventListener('click', async function() {
    const resultDiv = document.getElementById('screenResult');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      stream.getTracks().forEach(t => t.stop());
      const link = document.createElement('a');
      link.download = 'screenshot.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      resultDiv.innerHTML = `<i class="fas fa-check-circle" style="color:#10b981;"></i> Screenshot terdownload!`;
    } catch (e) {
      resultDiv.innerHTML = `<span style="color:#ff6b9d;">Error: ${e.message}</span>`;
    }
  });

  // ============================================================
  // 9. TEXT TO SPEECH
  // ============================================================
  document.getElementById('ttsBtn')?.addEventListener('click', function() {
    const text = document.getElementById('ttsInput').value.trim();
    if (!text) { alert('Masukkan teks!'); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
  });

  // ============================================================
  // 10. CLIPBOARD MANAGER
  // ============================================================
  let clipboardHistory = JSON.parse(localStorage.getItem('clipboardHistory') || '[]');

  function renderClipboard() {
    const div = document.getElementById('clipboardHistory');
    if (clipboardHistory.length === 0) {
      div.innerHTML = '<span style="color:var(--text-secondary);">Belum ada history.</span>';
      return;
    }
    div.innerHTML = clipboardHistory.map((text, i) => `
      <div style="padding:4px 8px; background:var(--input-bg); border-radius:12px; margin-bottom:4px; display:flex; justify-content:space-between;">
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px;">${text}</span>
        <button onclick="navigator.clipboard.writeText('${text.replace(/'/g, "\\'")}')" style="background:none; border:none; color:var(--accent); cursor:pointer;"><i class="fas fa-copy"></i></button>
      </div>
    `).join('');
  }

  document.getElementById('copyBtn')?.addEventListener('click', function() {
    const text = document.getElementById('clipboardInput').value.trim();
    if (!text) { alert('Tulis teks dulu!'); return; }
    navigator.clipboard.writeText(text).then(() => {
      clipboardHistory.unshift(text);
      if (clipboardHistory.length > 20) clipboardHistory.pop();
      localStorage.setItem('clipboardHistory', JSON.stringify(clipboardHistory));
      renderClipboard();
      document.getElementById('clipboardInput').value = '';
    }).catch(() => alert('Gagal copy!'));
  });

  renderClipboard();

  // ============================================================
  // 11. FILE CONVERTER (Image)
  // ============================================================
  document.getElementById('convertFileBtn')?.addEventListener('click', function() {
    const file = document.getElementById('convertFileInput').files[0];
    const format = document.getElementById('convertFormat').value;
    if (!file) { alert('Pilih gambar!'); return; }
    const resultDiv = document.getElementById('convertResult');
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        const link = document.createElement('a');
        link.download = `converted.${format.split('/')[1]}`;
        link.href = canvas.toDataURL(format, 0.92);
        link.click();
        resultDiv.innerHTML = `<i class="fas fa-check-circle" style="color:#10b981;"></i> Konversi selesai!`;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

})();