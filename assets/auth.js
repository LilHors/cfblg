// assets/auth.js
(function () {
  const SUPABASE_URL = window.https://sgswdxdpgursjfpvwnpj.supabase.co;
  const SUPABASE_ANON_KEY = window.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnc3dkeGRwZ3Vyc2pmcHZ3bnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MzUzNDksImV4cCI6MjA3NTExMTM0OX0.f4NWkoEkMqFLG0Ms2gmEVGAAebaSmBwJ9NpmHfM0RYs;

  if (!window.supabase) { console.warn("[auth] Supabase SDK не найден"); return; }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { console.error("[auth] Нет SUPABASE_URL/ANON_KEY"); return; }

  const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  // Немного стилей (модалка + виджет)
  const css = `
    .auth-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;z-index:2147483647}
    .auth-modal{background:#111827;color:#e5e7eb;border:1px solid #2f3640;border-radius:16px;max-width:420px;width:94%;padding:18px;box-shadow:0 12px 30px rgba(0,0,0,.35)}
    .auth-modal h3{margin:0 0 8px;font-size:18px}
    .auth-modal label{display:flex;flex-direction:column;gap:6px;margin:8px 0}
    .auth-modal input{padding:10px 12px;border-radius:12px;border:1px solid #2f3640;background:#0f172a;color:inherit}
    .auth-modal .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
    .auth-modal button{cursor:pointer;border:1px solid #2f3640;background:#0f172a;color:inherit;border-radius:10px;padding:8px 12px}
    .auth-error{color:#ef4444;font-size:13px;margin-top:6px;white-space:pre-wrap}
    .userwidget{position:relative;display:inline-flex;align-items:center;gap:8px;margin-left:8px}
    .userwidget .avatar{width:28px;height:28px;border-radius:999px;object-fit:cover;border:1px solid #2f3640;background:#1f2937}
    .userwidget .name{cursor:pointer;user-select:none}
    .userwidget .menu{position:absolute;right:0;top:120%;background:#0f172a;border:1px solid #2f3640;border-radius:10px;min-width:180px;display:none;z-index:2147483647}
    .userwidget .menu a,.userwidget .menu button{display:block;width:100%;text-align:left;padding:8px 10px;border:0;background:transparent;color:#e5e7eb;cursor:pointer}
    .userwidget .menu a:hover,.userwidget .menu button:hover{background:#111827}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  // --- Модалка ---
  let backdrop;
  function buildModal() {
    if (backdrop) return;
    backdrop = document.createElement('div');
    backdrop.className = 'auth-modal-backdrop';
    backdrop.innerHTML = `
      <div class="auth-modal" role="dialog" aria-modal="true">
        <h3>Вход / Регистрация</h3>
        <div class="muted">Введи email и пароль (мин. 8 символов). Если аккаунта нет — сначала зарегистрируйся.</div>
        <label>Email <input id="authEmail" type="email" placeholder="you@example.com" required></label>
        <label>Пароль <input id="authPass" type="password" placeholder="••••••••" required minlength="8"></label>
        <div id="authError" class="auth-error" style="display:none"></div>
        <div class="row">
          <button id="doSignIn">Войти</button>
          <button id="doSignUp">Зарегистрироваться</button>
          <button id="closeAuth" style="margin-left:auto">Закрыть</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
    backdrop.querySelector('#closeAuth').onclick = closeModal;

    const emailEl = () => backdrop.querySelector('#authEmail');
    const passEl  = () => backdrop.querySelector('#authPass');
    const errBox  = () => document.getElementById('authError');

    const showError = (msg) => { const b = errBox(); if (b) { b.textContent = msg; b.style.display = 'block'; } };
    const clearError = () => { const b = errBox(); if (b) { b.textContent = ''; b.style.display = 'none'; } };
    const checkCreds = (email, pw) => {
      if (!email || !pw) { showError('Укажи email и пароль.'); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('Некорректный email.'); return false; }
      if (pw.length < 8) { showError('Пароль минимум 8 символов.'); return false; }
      return true;
    };
    const normalize = (msg) => {
      if (msg === 'Failed to fetch') return 'Failed to fetch\n\nПроверь: 1) ключи, 2) https/не file://, 3) VPN/AdBlock, 4) URL Configuration.';
      if (/not confirmed/i.test(msg)) return 'Email не подтверждён. Подтверди в письме или попроси админа подтвердить в панели.';
      if (/invalid login/i.test(msg)) return 'Неверный email или пароль.';
      if (/rate|429/i.test(msg)) return 'Слишком много попыток. Подожди минуту.';
      if (/disabled/i.test(msg)) return 'Вход/регистрация по email отключены администратором.';
      return msg;
    };

    // --- Войти (с резервом setSession) ---
    backdrop.querySelector('#doSignIn').onclick = async () => {
      clearError();
      const email = emailEl().value.trim();
      const password = passEl().value.trim();
      if (!checkCreds(email, password)) return;

      try {
        // 1) Обычный путь
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (!error && data?.session) { closeModal(); await refreshUI(); return; }
        if (error) throw error;
        // если data без session — пойдём резервом
      } catch (e1) {
        try {
          // 2) Резерв: прямой POST + setSession
          const u = SUPABASE_URL.replace(/\/$/, '') + '/auth/v1/token?grant_type=password';
          const r = await fetch(u, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ email, password })
          });
          const b = await r.json();
          if (!r.ok) throw new Error(b.error_description || b.message || JSON.stringify(b));

          const { error: setErr } = await client.auth.setSession({
            access_token: b.access_token,
            refresh_token: b.refresh_token
          });
          if (setErr) throw setErr;

          closeModal();
          await refreshUI();
        } catch (e2) {
          showError(normalize(e2?.message || String(e2)));
        }
      }
    };

    // --- Регистрация ---
    backdrop.querySelector('#doSignUp').onclick = async () => {
      clearError();
      const email = emailEl().value.trim();
      const password = passEl().value.trim();
      if (!checkCreds(email, password)) return;
      try {
        const { error } = await client.auth.signUp({ email, password });
        if (error) throw error;
        closeModal();
        alert('Если включено подтверждение — проверь почту.');
      } catch (e) {
        showError(normalize(e?.message || String(e)));
      }
    };
  }

  function openModal() { buildModal(); backdrop.style.display = 'flex'; }
  function closeModal() { if (backdrop) backdrop.style.display = 'none'; }

  // --- Кнопка в шапке + делегирование кликов ---
  function ensureHeaderButtons() {
    const header = document.querySelector('header .wrap.nav') || document.querySelector('header') || document.querySelector('.wrap') || document.body;
    if (!header) return;
    if (!document.getElementById('authOpen')) {
      const b = document.createElement('button'); b.id = 'authOpen'; b.className = 'btn'; b.type = 'button'; b.textContent = '🔐 Войти';
      header.appendChild(b);
    }
    if (!document.getElementById('userWidget')) {
      const d = document.createElement('div'); d.id = 'userWidget'; d.className = 'userwidget'; header.appendChild(d);
    }
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('#authOpen,[data-auth-open],a[href="#login"],a[href*="login"],button[name="login"],.btn-login');
    if (t) { e.preventDefault(); openModal(); }
  });

  // --- Профиль + UI ---
  async function getProfile(user) {
    if (!user) return null;
    await client.from('profiles').upsert({ user_id: user.id, email: user.email }).select().single().catch(() => {});
    const { data } = await client.from('profiles').select('full_name, avatar_url, email').eq('user_id', user.id).single();
    return data || { full_name: null, avatar_url: null, email: user.email };
  }

  function renderUserWidget(state) {
    const container = document.getElementById('userWidget');
    const loginBtn = document.getElementById('authOpen');
    if (!container) return;

    if (!state || !state.user) {
      if (loginBtn) { loginBtn.style.display = ''; loginBtn.textContent = '🔐 Войти'; }
      container.innerHTML = '';
      return;
    }
    if (loginBtn) loginBtn.style.display = 'none';

    const name = state.profile?.full_name || state.user.user_metadata?.full_name || state.user.email;
    const avatar = state.profile?.avatar_url || state.user.user_metadata?.avatar_url || '';
    container.innerHTML = `
      <img class="avatar" src="${avatar || 'assets/avatar-placeholder.png'}" alt="avatar" onerror="this.src='assets/avatar-placeholder.png'"/>
      <span class="name" id="userName" title="Нажми, чтобы открыть меню">${name}</span>
      <div class="menu" id="userMenu">
        <a href="profile.html">Профиль</a>
        <button id="logoutBtn">Выйти</button>
      </div>`;
    const nameEl = container.querySelector('#userName');
    const menu = container.querySelector('#userMenu');
    nameEl.onclick = () => { menu.style.display = (menu.style.display === 'block' ? 'none' : 'block'); };
    container.addEventListener('mouseleave', () => { menu.style.display = 'none'; });
    container.querySelector('#logoutBtn').onclick = async () => { await client.auth.signOut(); };
  }

  async function refreshUI() {
    ensureHeaderButtons();
    const { data: { session } } = await client.auth.getSession();
    if (!session || !session.user) { renderUserWidget(null); return; }
    const profile = await getProfile(session.user);
    renderUserWidget({ user: session.user, profile });
  }

  client.auth.onAuthStateChange(async () => { await refreshUI(); });
  window.addEventListener('DOMContentLoaded', refreshUI);

  // Экспорт
  window.Auth = { client, open: openModal, close: closeModal, refreshUI };
})();
