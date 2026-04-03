(function () {
  'use strict';

  const token = localStorage.getItem('sf_token');
  if (!token) {
    window.location.href = '/#get-started';
    return;
  }

  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  const loading = document.getElementById('dash-loading');
  const content = document.getElementById('dash-content');

  async function loadDashboard() {
    try {
      const [accountRes, historyRes] = await Promise.all([
        fetch('/dashboard/account', { headers }),
        fetch('/dashboard/history', { headers }),
      ]);

      if (accountRes.status === 401) {
        localStorage.removeItem('sf_token');
        window.location.href = '/#get-started';
        return;
      }

      const account = await accountRes.json();
      const history = await historyRes.json();

      renderAccount(account);
      renderHistory(history.logs || []);

      loading.hidden = true;
      content.hidden = false;
    } catch (err) {
      loading.innerHTML = '<span style="color:var(--hue-magenta)">Failed to load dashboard. Please login again.</span>';
    }
  }

  function renderAccount(data) {
    const { user, keys, usage } = data;

    document.getElementById('nav-email').textContent = user.email;
    document.getElementById('dash-name').textContent = user.name || user.email;
    document.getElementById('dash-tier').textContent = user.tier.charAt(0).toUpperCase() + user.tier.slice(1);

    document.getElementById('dash-used').textContent = usage.used.toLocaleString();
    document.getElementById('dash-limit').textContent = usage.limit.toLocaleString();
    document.getElementById('dash-remaining').textContent = usage.remaining.toLocaleString();
    document.getElementById('dash-reset').textContent = usage.resetDate || '—';

    // Usage bar
    const pct = usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
    document.getElementById('usage-bar').style.width = pct + '%';
    document.getElementById('usage-bar-text').textContent = pct + '%';

    // API key state
    const activeKey = keys.find((k) => k.active);
    if (activeKey) {
      showKeyPrefix(activeKey.prefix);
    } else {
      showNoKey();
    }
  }

  function maskKey(key) {
    const visibleLen = Math.ceil(key.length * 0.2);
    return key.substring(0, visibleLen) + '••••••••••••';
  }

  function showNoKey() {
    document.getElementById('dash-key-value').textContent = 'No key generated yet';
    document.getElementById('dash-key-value').style.color = 'var(--text-dim)';
    document.getElementById('dash-key-value').removeAttribute('data-full-key');
    document.getElementById('dash-key-status').hidden = true;
    document.getElementById('key-copy-btn').style.visibility = 'hidden';
    document.getElementById('key-warn').hidden = true;
    document.getElementById('gen-key-btn').textContent = 'Generate Key';
    document.getElementById('key-description').textContent = 'Generate your API key to start using the Scrave API.';
  }

  function showKeyPrefix(prefix) {
    document.getElementById('dash-key-value').textContent = prefix + '••••••••••••';
    document.getElementById('dash-key-value').style.color = '';
    document.getElementById('dash-key-value').removeAttribute('data-full-key');
    document.getElementById('dash-key-status').hidden = false;
    document.getElementById('dash-key-status').textContent = 'Active';
    document.getElementById('key-copy-btn').style.visibility = 'hidden';
    document.getElementById('key-warn').hidden = true;
    document.getElementById('gen-key-btn').textContent = 'Regenerate Key';
    document.getElementById('key-description').textContent = 'Your active key prefix is shown below. If you lost your key, regenerate a new one.';
  }

  function showFullKey(apiKey) {
    document.getElementById('dash-key-value').textContent = maskKey(apiKey);
    document.getElementById('dash-key-value').setAttribute('data-full-key', apiKey);
    document.getElementById('dash-key-value').style.color = 'var(--hue-teal)';
    document.getElementById('dash-key-status').hidden = false;
    document.getElementById('dash-key-status').textContent = 'Active';
    document.getElementById('key-copy-btn').style.visibility = 'visible';
    document.getElementById('key-warn').hidden = false;
    document.getElementById('gen-key-btn').textContent = 'Regenerate Key';
    document.getElementById('key-description').textContent = 'Your key is masked below. Click copy to get the full key.';
  }

  function renderHistory(logs) {
    const tbody = document.getElementById('history-body');
    if (!logs.length) return;

    tbody.innerHTML = '';
    logs.forEach((log) => {
      const tr = document.createElement('tr');
      const isOk = log.status_code >= 200 && log.status_code < 300;
      const date = new Date(log.created_at);
      const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      tr.innerHTML =
        '<td><code>' + log.endpoint + '</code></td>' +
        '<td><span class="' + (isOk ? 'status-ok' : 'status-err') + '">' + log.status_code + '</span></td>' +
        '<td>' + (log.response_time_ms || 0) + 'ms</td>' +
        '<td>' + dateStr + '</td>';
      tbody.appendChild(tr);
    });
  }

  // Generate / Regenerate key
  document.getElementById('gen-key-btn').addEventListener('click', async () => {
    const btn = document.getElementById('gen-key-btn');
    const isRegenerate = btn.textContent === 'Regenerate Key';

    if (isRegenerate) {
      if (!confirm('This will deactivate your current key immediately. Continue?')) return;
    }

    btn.disabled = true;
    btn.textContent = 'Generating...';

    try {
      const res = await fetch('/dashboard/regenerate-key', { method: 'POST', headers });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error?.message || 'Failed');

      showFullKey(data.apiKey);
      btn.textContent = 'Regenerate Key';
      btn.disabled = false;
    } catch (err) {
      alert('Error: ' + err.message);
      btn.textContent = isRegenerate ? 'Regenerate Key' : 'Generate Key';
      btn.disabled = false;
    }
  });

  // Copy key — copies full key from data attribute, not masked text
  document.getElementById('key-copy-btn').addEventListener('click', () => {
    const el = document.getElementById('dash-key-value');
    const key = el.getAttribute('data-full-key') || el.textContent;
    navigator.clipboard.writeText(key).then(() => {
      const msg = document.getElementById('key-copy-confirm');
      msg.hidden = false;
      setTimeout(() => { msg.hidden = true; }, 2000);
    });
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('sf_token');
    window.location.href = '/';
  });

  // Boot
  loadDashboard();
})();
