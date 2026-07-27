/**
 * main.js — Myticals Web Pro Core
 */
(function() {
  'use strict';

  // ---- NAVIGATION ----
  const navLinks = document.querySelectorAll('.nav-links a[data-page]');
  const pages = {
    home: document.getElementById('page-home'),
    about: document.getElementById('page-about'),
    services: document.getElementById('page-services'),
    todo: document.getElementById('page-todo'),
    customize: document.getElementById('page-customize'),
    report: document.getElementById('page-report'),
    deploy: document.getElementById('page-deploy'),
    contact: document.getElementById('page-contact')
  };
  const burgerBtn = document.getElementById('burgerBtn');
  const navList = document.getElementById('navLinks');

  function navigate(pageId) {
    Object.values(pages).forEach(p => p.classList.remove('active'));
    const target = pages[pageId];
    if (target) target.classList.add('active');
    navLinks.forEach(link => {
      link.classList.toggle('active', link.dataset.page === pageId);
    });
    navList.classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      navigate(this.dataset.page);
    });
  });
  burgerBtn.addEventListener('click', function() {
    navList.classList.toggle('open');
  });

  // ---- THEME ----
  const themeSelect = document.getElementById('themeSelect');
  const savedTheme = localStorage.getItem('myticalsTheme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeSelect.value = savedTheme;
  themeSelect.addEventListener('change', function() {
    const theme = this.value;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('myticalsTheme', theme);
  });

  // ---- TODO ----
  let todos = [];
  const todoInput = document.getElementById('todoInput');
  const todoAddBtn = document.getElementById('todoAddBtn');
  const todoListEl = document.getElementById('todoList');
  const totalCount = document.getElementById('totalCount');
  const doneCount = document.getElementById('doneCount');

  function loadTodos() {
    const stored = localStorage.getItem('myticalsTodos');
    if (stored) {
      try { todos = JSON.parse(stored); } catch { todos = []; }
    } else {
      todos = [
        { id: Date.now()+1, text: 'Coba ganti background', completed: false },
        { id: Date.now()+2, text: 'Tambahkan tugas baru', completed: false }
      ];
    }
    renderTodos();
  }
  function saveTodos() { localStorage.setItem('myticalsTodos', JSON.stringify(todos)); }
  function renderTodos() {
    if (todos.length === 0) {
      todoListEl.innerHTML = `<li style="justify-content:center; color:var(--text-secondary); padding:24px;"><i class="fas fa-inbox"></i> Belum ada tugas</li>`;
    } else {
      todoListEl.innerHTML = todos.map(t => `
        <li data-id="${t.id}">
          <input type="checkbox" class="todo-check" ${t.completed ? 'checked' : ''}>
          <span class="todo-text ${t.completed ? 'done' : ''}">${escapeHTML(t.text)}</span>
          <button class="delete-btn"><i class="fas fa-trash-alt"></i></button>
        </li>
      `).join('');
    }
    const total = todos.length;
    const done = todos.filter(t => t.completed).length;
    totalCount.textContent = total;
    doneCount.textContent = done;
    saveTodos();

    document.querySelectorAll('.todo-check').forEach(cb => {
      cb.addEventListener('change', function() {
        const li = this.closest('li');
        const id = parseInt(li.dataset.id);
        toggleTodo(id);
      });
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const li = this.closest('li');
        const id = parseInt(li.dataset.id);
        deleteTodo(id);
      });
    });
  }
  function escapeHTML(str) { const d=document.createElement('div'); d.textContent=str; return d.innerHTML; }
  function addTodo(text) {
    const t=text.trim(); if(!t) return false;
    todos.push({ id: Date.now()+Math.random(), text:t, completed:false });
    renderTodos(); return true;
  }
  function toggleTodo(id) {
    const todo = todos.find(t=>t.id===id);
    if(todo){ todo.completed = !todo.completed; renderTodos(); }
  }
  function deleteTodo(id) {
    todos = todos.filter(t=>t.id!==id);
    renderTodos();
  }
  todoAddBtn.addEventListener('click', ()=>{
    const val=todoInput.value; if(addTodo(val)) todoInput.value=''; todoInput.focus();
  });
  todoInput.addEventListener('keydown', (e)=>{
    if(e.key==='Enter'){ e.preventDefault(); const val=todoInput.value; if(addTodo(val)) todoInput.value=''; }
  });
  loadTodos();

  // ---- DOWNLOAD (deploy) ----
  document.getElementById('downloadBtn').addEventListener('click', function() {
    const htmlContent = document.documentElement.outerHTML;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // ---- BACKGROUND ENGINE ----
  const bgContainer = document.getElementById('bgContainer');
  const particleCanvas = document.getElementById('particleCanvas');
  const ctx = particleCanvas.getContext('2d');
  let particles = [];
  let animationId = null;

  function resizeCanvas() {
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  class Particle {
    constructor() {
      this.x = Math.random() * particleCanvas.width;
      this.y = Math.random() * particleCanvas.height;
      this.size = Math.random() * 3 + 1;
      this.speedX = (Math.random() - 0.5) * 0.8;
      this.speedY = (Math.random() - 0.5) * 0.8;
      this.opacity = Math.random() * 0.6 + 0.2;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.x < 0 || this.x > particleCanvas.width) this.speedX *= -1;
      if (this.y < 0 || this.y > particleCanvas.height) this.speedY *= -1;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(108, 99, 255, ${this.opacity})`;
      ctx.fill();
    }
  }

  function initParticles(count = 80) {
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }
  }

  function animateParticles() {
    ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(108, 99, 255, ${0.15 * (1 - dist/120)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
    animationId = requestAnimationFrame(animateParticles);
  }

  function startParticles() {
    if (animationId) cancelAnimationFrame(animationId);
    particleCanvas.style.display = 'block';
    bgContainer.innerHTML = '';
    initParticles(80);
    animateParticles();
  }

  function stopParticles() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    particleCanvas.style.display = 'none';
    ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  }

  function applyBackground(type, data) {
    localStorage.setItem('myticalsBgType', type);
    if (data) localStorage.setItem('myticalsBgData', JSON.stringify(data));
    else localStorage.removeItem('myticalsBgData');
    bgContainer.innerHTML = '';
    stopParticles();
    document.querySelectorAll('.bg-option').forEach(el => {
      el.classList.toggle('active', el.dataset.bgtype === type);
    });
    switch(type) {
      case 'default':
        bgContainer.style.background = 'transparent';
        break;
      case 'video':
        if (data && data.url) {
          let videoHtml = '';
          if (data.url.includes('youtube.com') || data.url.includes('youtu.be')) {
            let embedUrl = data.url;
            if (embedUrl.includes('watch?v=')) {
              const id = embedUrl.split('v=')[1]?.split('&')[0];
              if (id) embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0`;
            } else if (embedUrl.includes('youtu.be/')) {
              const id = embedUrl.split('youtu.be/')[1]?.split('?')[0];
              if (id) embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0`;
            }
            videoHtml = `<iframe src="${embedUrl}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
          } else {
            videoHtml = `<video autoplay muted loop playsinline><source src="${data.url}" type="video/mp4"></video>`;
          }
          bgContainer.innerHTML = videoHtml;
        }
        break;
      case 'image':
        if (data && data.src) {
          bgContainer.innerHTML = `<img src="${data.src}" alt="background image">`;
        }
        break;
      case 'particle':
        startParticles();
        break;
      default:
        bgContainer.style.background = 'transparent';
    }
  }

  function loadBackground() {
    const savedType = localStorage.getItem('myticalsBgType') || 'default';
    const savedData = JSON.parse(localStorage.getItem('myticalsBgData') || 'null');
    document.querySelectorAll('.bg-option').forEach(el => {
      el.classList.toggle('active', el.dataset.bgtype === savedType);
    });
    applyBackground(savedType, savedData);
  }

  function setupBgControls() {
    const bgOptions = document.querySelectorAll('.bg-option');
    const controlsContainer = document.getElementById('bgControls');
    const bgData = JSON.parse(localStorage.getItem('myticalsBgData') || 'null');

    bgOptions.forEach(opt => {
      opt.addEventListener('click', function() {
        const type = this.dataset.bgtype;
        let controlsHtml = '';
        if (type === 'video') {
          controlsHtml = `
            <input type="text" id="videoUrl" placeholder="URL video" value="${bgData && bgData.url ? bgData.url : ''}">
            <button id="applyVideo" class="deploy-btn"><i class="fas fa-check"></i> Terapkan</button>
          `;
        } else if (type === 'image') {
          controlsHtml = `
            <input type="file" id="imageUpload" accept="image/*">
            <label for="imageUpload"><i class="fas fa-upload"></i> Upload</label>
          `;
        } else if (type === 'particle') {
          controlsHtml = `<p style="color:var(--text-secondary);"><i class="fas fa-play"></i> Animasi partikel aktif.</p>`;
        } else {
          controlsHtml = `<p style="color:var(--text-secondary);"><i class="fas fa-check-circle"></i> Background default.</p>`;
        }
        controlsContainer.innerHTML = controlsHtml;

        if (type === 'default') {
          applyBackground('default', null);
        } else if (type === 'particle') {
          applyBackground('particle', null);
        } else if (type === 'video') {
          const applyBtn = document.getElementById('applyVideo');
          if (applyBtn) {
            applyBtn.addEventListener('click', function() {
              const url = document.getElementById('videoUrl').value.trim();
              if (url) applyBackground('video', { url });
              else alert('Masukkan URL video.');
            });
          }
        } else if (type === 'image') {
          const fileInput = document.getElementById('imageUpload');
          if (fileInput) {
            fileInput.addEventListener('change', function(e) {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                  applyBackground('image', { src: ev.target.result });
                };
                reader.readAsDataURL(file);
              }
            });
          }
        }
        bgOptions.forEach(o => o.classList.remove('active'));
        this.classList.add('active');
      });
    });
    const activeOpt = document.querySelector('.bg-option.active');
    if (activeOpt) activeOpt.click();
    else document.querySelector('.bg-option[data-bgtype="default"]')?.click();
  }

  loadBackground();
  setupBgControls();

  // ---- Default page ----
  navigate('home');

  // ---- Hash navigation ----
  window.addEventListener('hashchange', function() {
    const hash = location.hash.replace('#', '');
    if (pages[hash]) navigate(hash);
  });
  if (location.hash) {
    const hash = location.hash.replace('#', '');
    if (pages[hash]) navigate(hash);
  }

})();