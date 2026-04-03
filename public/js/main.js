/* Scrave — Aurora Prism interactions */

(function () {
  'use strict';

  /* ── Scroll Reveal ── */
  function initReveal() {
    const els = document.querySelectorAll('[data-reveal]');

    // Immediately reveal elements already in viewport
    function revealIfVisible(el) {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 100) {
        const delay = parseInt(el.dataset.delay || '0', 10);
        setTimeout(() => el.classList.add('visible'), delay);
        return true;
      }
      return false;
    }

    const remaining = [];
    els.forEach((el) => {
      if (!revealIfVisible(el)) remaining.push(el);
    });

    // Observe remaining off-screen elements
    if (remaining.length) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const delay = parseInt(entry.target.dataset.delay || '0', 10);
            setTimeout(() => entry.target.classList.add('visible'), delay);
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.05, rootMargin: '0px 0px 80px 0px' }
      );
      remaining.forEach((el) => observer.observe(el));
    }
  }

  /* ── Fetch live stats then animate counters ── */
  function initCounters() {
    function formatUptime(seconds) {
      if (seconds < 60) return { value: seconds, unit: 's' };
      if (seconds < 3600) return { value: Math.floor(seconds / 60), unit: 'm' };
      if (seconds < 86400) return { value: Math.round(seconds / 3600 * 10) / 10, unit: 'h' };
      return { value: Math.round(seconds / 86400 * 10) / 10, unit: 'd' };
    }

    function animateNum(el, target) {
      const isDecimal = target % 1 !== 0;
      const duration = 1600;
      const start = performance.now();
      function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = isDecimal
          ? (eased * target).toFixed(1)
          : Math.floor(eased * target);
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    // Fetch real stats from API
    fetch('/api/v1/stats')
      .then((r) => r.json())
      .then((data) => {
        // Set real targets
        const avgEl = document.getElementById('stat-avg-ms');
        const uptimeEl = document.getElementById('stat-uptime');
        const capturesEl = document.getElementById('stat-captures');
        const usersEl = document.getElementById('stat-users');

        if (avgEl) avgEl.dataset.target = data.avgResponseMs || 0;
        if (capturesEl) capturesEl.dataset.target = data.totalCaptures || 0;
        if (usersEl) usersEl.dataset.target = data.totalUsers || 0;

        // Format uptime with correct unit
        if (uptimeEl) {
          const up = formatUptime(data.uptimeSeconds || 0);
          uptimeEl.dataset.target = up.value;
          const unitEl = uptimeEl.nextElementSibling;
          if (unitEl) unitEl.textContent = up.unit;
        }

        // Now observe and animate
        startCounterObserver();
      })
      .catch(() => {
        // If fetch fails, animate with 0s
        startCounterObserver();
      });

    function startCounterObserver() {
      const nums = document.querySelectorAll('.stat-num');
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const target = parseFloat(el.dataset.target) || 0;
            animateNum(el, target);
            observer.unobserve(el);
          });
        },
        { threshold: 0.5 }
      );
      nums.forEach((n) => observer.observe(n));
    }
  }

  /* ── Navbar solidify on scroll ── */
  function initNavbar() {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    const check = () => nav.classList.toggle('scrolled', window.scrollY > 60);
    window.addEventListener('scroll', check, { passive: true });
    check();
  }

  /* ── Smooth anchor scroll ── */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const target = document.querySelector(a.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /* ── Parallax aurora layers on mouse (subtle, desktop only) ── */
  function initAuroraParallax() {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const layers = document.querySelectorAll('.aurora-layer');
    const factors = [0.015, -0.01, 0.008, -0.006];
    let mx = 0, my = 0, cx = 0, cy = 0;

    document.addEventListener('mousemove', (e) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    function frame() {
      cx += (mx - cx) * 0.04;
      cy += (my - cy) * 0.04;
      layers.forEach((layer, i) => {
        const f = factors[i] || 0.005;
        const tx = cx * f * 100;
        const ty = cy * f * 100;
        layer.style.translate = `${tx}px ${ty}px`;
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ── Terminal Demo Animation ── */
  function initTerminalDemo() {
    const body = document.getElementById('terminal-body');
    const steps = document.querySelectorAll('.demo-step');
    const replayBtn = document.getElementById('demo-replay');
    if (!body || !steps.length) return;

    const scenes = [
      {
        step: 0,
        lines: [
          { type: 'cmd', text: 'curl -X POST http://localhost:3000/auth/register \\', speed: 30 },
          { type: 'cmd-cont', text: '  -H "Content-Type: application/json" \\', speed: 25 },
          { type: 'cmd-cont', text: '  -d \'{"email": "dev@example.com", "password": "s3cureP@ss"}\'', speed: 25 },
          { type: 'pause', ms: 800 },
          { type: 'output', text: '', cls: 'dim' },
          { type: 'output', text: '  Sending request...', cls: 'dim' },
          { type: 'pause', ms: 600 },
        ]
      },
      {
        step: 1,
        lines: [
          { type: 'output', text: '' },
          { type: 'output', text: '  {', cls: 'dim' },
          { type: 'output', text: '    "message": "Account created successfully."', cls: 'success' },
          { type: 'output', text: '    "apiKey": "sf_live_7a3f9c2d8e1b4f6a..."', cls: 'key' },
          { type: 'output', text: '    "email": "dev@example.com"', cls: 'dim' },
          { type: 'output', text: '  }', cls: 'dim' },
          { type: 'pause', ms: 500 },
          { type: 'output', text: '' },
          { type: 'output', text: '  Save your API key — it won\'t be shown again.', cls: 'success' },
          { type: 'pause', ms: 800 },
        ]
      },
      {
        step: 2,
        lines: [
          { type: 'output', text: '' },
          { type: 'cmd', text: 'curl -X POST http://localhost:3000/api/v1/screenshot \\', speed: 30 },
          { type: 'cmd-cont', text: '  -H "x-api-key: sf_live_7a3f9c2d8e1b4f6a..." \\', speed: 25 },
          { type: 'cmd-cont', text: '  -H "Content-Type: application/json" \\', speed: 25 },
          { type: 'cmd-cont', text: '  -d \'{"url": "https://github.com", "fullPage": true}\' \\', speed: 25 },
          { type: 'cmd-cont', text: '  --output screenshot.png', speed: 25 },
          { type: 'pause', ms: 1000 },
          { type: 'output', text: '' },
          { type: 'output', text: '  screenshot.png saved (248 KB)', cls: 'success' },
          { type: 'output', text: '  Status: 200 OK | Time: 1.2s', cls: 'success' },
          { type: 'pause', ms: 400 },
        ]
      }
    ];

    let running = false;

    function setActiveStep(idx) {
      steps.forEach((s, i) => {
        s.classList.remove('active');
        if (i < idx) s.classList.add('done');
        else s.classList.remove('done');
      });
      if (steps[idx]) steps[idx].classList.add('active');
    }

    function typeText(container, text, speed) {
      return new Promise((resolve) => {
        let i = 0;
        function tick() {
          if (i < text.length) {
            container.textContent += text[i];
            i++;
            setTimeout(tick, speed);
          } else {
            resolve();
          }
        }
        tick();
      });
    }

    function addOutputLine(text, cls) {
      const div = document.createElement('div');
      div.className = 'term-line term-output' + (cls ? ' ' + cls : '');
      div.textContent = text;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
    }

    function pause(ms) {
      return new Promise((r) => setTimeout(r, ms));
    }

    async function runDemo() {
      if (running) return;
      running = true;

      // Reset
      body.innerHTML = '';
      steps.forEach((s) => { s.classList.remove('active', 'done'); });

      for (const scene of scenes) {
        setActiveStep(scene.step);

        for (const line of scene.lines) {
          if (line.type === 'pause') {
            await pause(line.ms);
          } else if (line.type === 'cmd') {
            const cmdLine = document.createElement('div');
            cmdLine.className = 'term-line';
            const prompt = document.createElement('span');
            prompt.className = 'term-prompt';
            prompt.textContent = '$ ';
            const typed = document.createElement('span');
            typed.className = 'term-typed';
            const cursor = document.createElement('span');
            cursor.className = 'cursor';
            cursor.textContent = '|';
            cmdLine.appendChild(prompt);
            cmdLine.appendChild(typed);
            cmdLine.appendChild(cursor);
            body.appendChild(cmdLine);
            body.scrollTop = body.scrollHeight;
            await typeText(typed, line.text, line.speed);
            cursor.remove();
          } else if (line.type === 'cmd-cont') {
            const contLine = document.createElement('div');
            contLine.className = 'term-line';
            const typed = document.createElement('span');
            typed.className = 'term-typed';
            const cursor = document.createElement('span');
            cursor.className = 'cursor';
            cursor.textContent = '|';
            contLine.appendChild(document.createTextNode('  '));
            contLine.appendChild(typed);
            contLine.appendChild(cursor);
            body.appendChild(contLine);
            body.scrollTop = body.scrollHeight;
            await typeText(typed, line.text.trimStart(), line.speed);
            cursor.remove();
          } else if (line.type === 'output') {
            addOutputLine(line.text, line.cls);
          }
        }
      }

      // Mark all steps done, pause, then loop
      setActiveStep(3);
      steps.forEach((s) => s.classList.add('done'));
      await pause(2500);
      running = false;
      runDemo();
    }

    // Auto-play when visible
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        runDemo();
        observer.unobserve(entries[0].target);
      }
    }, { threshold: 0.3 });
    observer.observe(body.closest('.demo-layout'));
  }

  /* ── Docs Tabs ── */
  function initDocsTabs() {
    document.querySelectorAll('.tab[data-tab]').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = document.getElementById('tab-' + tab.dataset.tab);
        if (panel) panel.classList.add('active');
      });
    });
  }

  /* ── Modal System ── */
  window.openModal = function (type) {
    closeModals();
    const modal = document.getElementById('modal-' + type);
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  };
  window.closeModals = function () {
    document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.remove('open'));
    document.body.style.overflow = '';
  };

  function initModals() {
    // Close on overlay click (not modal body)
    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModals();
      });
    });
    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModals();
    });
    // If already logged in, swap nav buttons
    if (localStorage.getItem('sf_token')) {
      const loginBtn = document.getElementById('nav-login-btn');
      if (loginBtn) {
        loginBtn.textContent = 'Dashboard';
        loginBtn.onclick = () => { window.location.href = '/dashboard.html'; };
      }
    }
  }

  /* ── Registration Form ── */
  function initRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) return;

    // Enable/disable register button based on form completeness
    const submitBtn = document.getElementById('reg-submit-btn');
    const nameInput = document.getElementById('reg-name');
    const emailInput = document.getElementById('reg-email');
    const passInput = document.getElementById('reg-password');
    const agreeBox = document.getElementById('reg-agree');

    function checkFormValid() {
      const valid = nameInput.value.trim().length > 0
        && emailInput.value.trim().length > 0
        && emailInput.validity.valid
        && passInput.value.length >= 8
        && agreeBox.checked;
      submitBtn.disabled = !valid;
    }

    [nameInput, emailInput, passInput].forEach((el) => {
      el.addEventListener('input', checkFormValid);
    });
    agreeBox.addEventListener('change', checkFormValid);
    const errEl = document.getElementById('reg-error');
    const btnText = document.getElementById('reg-btn-text');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errEl.hidden = true;

      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;

      btnText.textContent = 'Creating...';
      form.querySelector('.btn-submit').disabled = true;

      try {
        const res = await fetch('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.details?.[0]?.message || data.error?.message || 'Registration failed');
        }

        // Auto-login to get JWT
        const loginRes = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const loginData = await loginRes.json();
        if (loginRes.ok && loginData.token) {
          localStorage.setItem('sf_token', loginData.token);
        }

        window.location.href = '/dashboard.html';
      } catch (err) {
        errEl.textContent = err.message;
        errEl.hidden = false;
        btnText.textContent = 'Register';
        form.querySelector('.btn-submit').disabled = false;
      }
    });
  }

  /* ── Login Form ── */
  function initLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;
    const errEl = document.getElementById('login-error');
    const btnText = document.getElementById('login-btn-text');

    // Enable/disable login button
    const loginBtn = document.getElementById('login-submit-btn');
    const loginEmail = document.getElementById('login-email');
    const loginPass = document.getElementById('login-password');

    function checkLoginValid() {
      const valid = loginEmail.value.trim().length > 0
        && loginEmail.validity.valid
        && loginPass.value.length > 0;
      loginBtn.disabled = !valid;
    }

    loginEmail.addEventListener('input', checkLoginValid);
    loginPass.addEventListener('input', checkLoginValid);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errEl.hidden = true;

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      btnText.textContent = 'Logging in...';
      form.querySelector('.btn-submit').disabled = true;

      try {
        const res = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.details?.[0]?.message || data.error?.message || 'Login failed');
        }

        localStorage.setItem('sf_token', data.token);
        window.location.href = '/dashboard.html';
      } catch (err) {
        errEl.textContent = err.message;
        errEl.hidden = false;
        btnText.textContent = 'Login';
        form.querySelector('.btn-submit').disabled = false;
      }
    });
  }

  /* ── Forgot Password Form ── */
  function initForgotForm() {
    const form = document.getElementById('forgot-form');
    if (!form) return;
    const emailInput = document.getElementById('forgot-email');
    const btn = document.getElementById('forgot-submit-btn');
    const btnText = document.getElementById('forgot-btn-text');
    const errEl = document.getElementById('forgot-error');
    const successEl = document.getElementById('forgot-success');

    emailInput.addEventListener('input', () => {
      btn.disabled = !(emailInput.value.trim().length > 0 && emailInput.validity.valid);
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errEl.hidden = true;
      successEl.hidden = true;

      btnText.textContent = 'Sending...';
      btn.disabled = true;

      try {
        const res = await fetch('/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput.value.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Failed');

        successEl.textContent = data.message;
        successEl.hidden = false;
        btnText.textContent = 'Send Reset Link';
      } catch (err) {
        errEl.textContent = err.message;
        errEl.hidden = false;
        btnText.textContent = 'Send Reset Link';
        btn.disabled = false;
      }
    });
  }

  /* ── Check for verified=true in URL ── */
  function checkVerifiedParam() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      // Show a brief notification
      const note = document.createElement('div');
      note.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:var(--hue-teal);color:#fff;padding:12px 24px;border-radius:10px;font-size:0.9rem;font-weight:600;z-index:999;';
      note.textContent = 'Email verified successfully! You can now login.';
      document.body.appendChild(note);
      setTimeout(() => note.remove(), 5000);
      // Clean URL
      window.history.replaceState({}, '', '/');
    }
  }

  /* ── Boot ── */
  document.addEventListener('DOMContentLoaded', () => {
    initReveal();
    initCounters();
    initNavbar();
    initSmoothScroll();
    initAuroraParallax();
    initTerminalDemo();
    initDocsTabs();
    initModals();
    initRegisterForm();
    initLoginForm();
    initForgotForm();
    checkVerifiedParam();
  });
})();
