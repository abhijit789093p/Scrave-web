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

    // API key prefix
    const activeKey = keys.find((k) => k.active);
    if (activeKey) {
      document.getElementById('dash-key-prefix').textContent = activeKey.prefix + '••••••••••••';
      document.getElementById('dash-key-status').textContent = 'Active';
    } else {
      document.getElementById('dash-key-prefix').textContent = 'No active key';
      document.getElementById('dash-key-status').textContent = 'None';
      document.getElementById('dash-key-status').style.background = 'rgba(236,72,153,0.12)';
      document.getElementById('dash-key-status').style.color = 'var(--hue-magenta)';
    }
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

  // Regenerate key
  document.getElementById('regen-btn').addEventListener('click', async () => {
    if (!confirm('This will deactivate your current key immediately. Continue?')) return;

    const btnText = document.getElementById('regen-btn-text');
    const spinner = document.getElementById('regen-spinner');
    const btn = document.getElementById('regen-btn');

    btnText.textContent = 'Generating...';
    spinner.hidden = false;
    btn.disabled = true;

    try {
      const res = await fetch('/dashboard/regenerate-key', { method: 'POST', headers });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error?.message || 'Failed');

      // Show new key
      document.getElementById('regen-key-display').textContent = data.apiKey;
      document.getElementById('regen-success').hidden = false;

      // Update prefix display
      document.getElementById('dash-key-prefix').textContent = data.prefix + '••••••••••••';

      btnText.textContent = 'Regenerate Key';
      spinner.hidden = true;
      btn.disabled = false;
    } catch (err) {
      alert('Error: ' + err.message);
      btnText.textContent = 'Regenerate Key';
      spinner.hidden = true;
      btn.disabled = false;
    }
  });

  // Copy regenerated key
  document.getElementById('regen-copy-btn').addEventListener('click', () => {
    const key = document.getElementById('regen-key-display').textContent;
    navigator.clipboard.writeText(key).then(() => {
      const confirm = document.getElementById('regen-copy-confirm');
      confirm.hidden = false;
      setTimeout(() => { confirm.hidden = true; }, 2000);
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
