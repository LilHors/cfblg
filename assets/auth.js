// assets/auth.js
(function () {
  var SUPABASE_URL = window.SUPABASE_URL;
  var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

  if (!window.supabase) { console.warn("[auth] Supabase SDK not found"); return; }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { console.error("[auth] Missing SUPABASE_URL / SUPABASE_ANON_KEY"); return; }

  var client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  // ---------- styles ----------
  var css =
    ".auth-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;z-index:2147483647}" +
    ".auth-modal{background:#111827;color:#e5e7eb;border:1px solid #2f3640;border-radius:16px;max-width:420px;width:94%;padding:18px;box-shadow:0 12px 30px rgba(0,0,0,.35)}" +
    ".auth-modal h3{margin:0 0 8px;font-size:18px}" +
    ".auth-modal label{display:flex;flex-direction:column;gap:6px;margin:8px 0}" +
    ".auth-modal input{padding:10px 12px;border-radius:12px;border:1px solid #2f3640;background:#0f172a;color:inherit}" +
    ".auth-modal .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}" +
    ".auth-modal button{cursor:pointer;border:1px solid #2f3640;background:#0f172a;color:inherit;border-radius:10px;padding:8px 12px}" +
    ".auth-error{color:#ef4444;font-size:13px;margin-top:6px;white-space:pre-wrap}" +
    ".userwidget{position:relative;display:inline-flex;align-items:center;gap:8px;margin-left:8px}" +
    ".userwidget .avatar{width:28px;height:28px;border-radius:999px;object-fit:cover;border:1px solid #2f3640;background:#1f2937}" +
    ".userwidget .profile-chip{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;border:1px solid #2f3640;background:#0f172a;color:#e5e7eb;font-size:14px;line-height:1;text-decoration:none}" +
    ".userwidget .profile-chip:hover{background:#111827}" +
    ".userwidget .menu-btn{border:1px solid #2f3640;background:#0f172a;color:#e5e7eb;border-radius:12px;padding:6px 8px;cursor:pointer}" +
    ".userwidget .menu-btn:hover{background:#111827}" +
    ".userwidget .menu{position:absolute;right:0;top:120%;background:#0f172a;border:1px solid #2f3640;border-radius:10px;min-width:160px;display:none;z-index:2147483647}" +
    ".userwidget .menu a,.userwidget .menu button{display:block;width:100%;text-align:left;padding:8px 10px;border:0;background:transparent;color:#e5e7eb;cursor:pointer}" +
    ".userwidget .menu a:hover,.userwidget .menu button:hover{background:#111827}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  // ---------- modal ----------
  var backdrop = null;
  function buildModal() {
    if (backdrop) return;
    backdrop = document.createElement("div");
    backdrop.className = "auth-modal-backdrop";
    backdrop.innerHTML =
      '<div class="auth-modal" role="dialog" aria-modal="true">' +
      '  <h3>Вход / Регистрация</h3>' +
      '  <div class="muted">Введи email и пароль (мин. 8 символов). Если аккаунта нет — зарегистрируйся.</div>' +
      '  <label>Email <input id="authEmail" type="email" placeholder="you@example.com" required></label>' +
      '  <label>Пароль <input id="authPass" type="password" placeholder="••••••••" required minlength="8"></label>' +
      '  <div id="authError" class="auth-error" style="display:none"></div>' +
      '  <div class="row">' +
      '    <button id="doSignIn">Войти</button>' +
      '    <button id="doSignUp">Зарегистрироваться</button>' +
      '    <button id="closeAuth" style="margin-left:auto">Закрыть</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) closeModal(); });
    document.getElementById("closeAuth").onclick = closeModal;

    function showError(msg) {
      var b = document.getElementById("authError");
      if (b) { b.textContent = msg; b.style.display = "block"; }
    }
    function clearError() {
      var b = document.getElementById("authError");
      if (b) { b.textContent = ""; b.style.display = "none"; }
    }
    function checkCreds(email, pw) {
      if (!email || !pw) { showError("Укажи email и пароль."); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError("Некорректный email."); return false; }
      if (pw.length < 8) { showError("Пароль минимум 8 символов."); return false; }
      return true;
    }
    function normalize(msg) {
      if (msg === "Failed to fetch") return "Failed to fetch\n\nПроверь: 1) ключи, 2) https/не file://, 3) VPN/AdBlock, 4) URL Configuration.";
      if (/not confirmed/i.test(msg)) return "Email не подтверждён.";
      if (/invalid login/i.test(msg)) return "Неверный email или пароль.";
      if (/rate|429/i.test(msg)) return "Слишком много попыток. Подожди минуту.";
      if (/disabled/i.test(msg)) return "Вход/регистрация по email отключены.";
      return msg;
    }

    function goToProfile() {
      try {
        window.location.href = "profile.html";
      } catch (_) {
        // ignore
      }
    }

    // ---- sign in (устойчивый, без 422) ----
    document.getElementById("doSignIn").onclick = async function () {
      clearError();
      var email = document.getElementById("authEmail").value.trim();
      var password = document.getElementById("authPass").value.trim();
      if (!checkCreds(email, password)) return;

      try {
        // 1) штатный вход
        var r1 = await client.auth.signInWithPassword({ email: email, password: password });
        if (!r1.error && r1.data && r1.data.session) {
          closeModal(); await refreshUI(); goToProfile(); return;
        }

        // 2) резерв: прямой POST
        var url = SUPABASE_URL.replace(/\/$/, "") + "/auth/v1/token?grant_type=password";
        var resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": "Bearer " + SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ email: email, password: password })
        });
        var body = await resp.json();
        if (!resp.ok) throw new Error(body.error_description || body.message || JSON.stringify(body));

        // 2a) если есть refresh_token — ставим сессию вручную
        if (body.refresh_token) {
          var setRes = await client.auth.setSession({
            access_token: body.access_token,
            refresh_token: body.refresh_token
          });
          if (setRes.error) throw setRes.error;
        } else {
          // 2b) иначе повторяем штатный вход, чтобы SDK положил сессию
          var r2 = await client.auth.signInWithPassword({ email: email, password: password });
          if (r2.error || !(r2.data && r2.data.session)) {
            throw new Error((r2.error && r2.error.message) || "Не удалось создать сессию.");
          }
        }

        closeModal(); await refreshUI(); goToProfile();
      } catch (e) {
        showError(normalize(e && e.message ? e.message : String(e)));
      }
    };

    // ---- sign up ----
    document.getElementById("doSignUp").onclick = async function () {
      clearError();
      var email = document.getElementById("authEmail").value.trim();
      var password = document.getElementById("authPass").value.trim();
      if (!checkCreds(email, password)) return;
      try {
        var res = await client.auth.signUp({ email: email, password: password });
        if (res.error) throw res.error;
        closeModal();
        alert("Если включено подтверждение — проверь почту.");
      } catch (e) {
        showError(normalize(e && e.message ? e.message : String(e)));
      }
    };
  }

  function openModal() { buildModal(); backdrop.style.display = "flex"; }
  function closeModal() { if (backdrop) backdrop.style.display = "none"; }

  // ---------- header + delegation ----------
  function ensureHeaderButtons() {
  // Try to mount controls strictly inside header nav area.
  var header = document.querySelector("header .wrap.nav");
  if (!header) header = document.querySelector("header");
  if (!header) header = document.querySelector(".wrap");
  if (!header) header = document.body;

  // Find position next to theme/lang buttons if present
  var afterEl = document.getElementById("langBtn") || document.getElementById("modeBtn");

  // Create/ensure login button
  var loginBtn = document.getElementById("authOpen");
  if (!loginBtn) {
    loginBtn = document.createElement("button");
    loginBtn.id = "authOpen";
    loginBtn.className = "btn";
    loginBtn.type = "button";
    loginBtn.textContent = "🔐 Войти";
    loginBtn.setAttribute("data-auth-open","1");
    // Inline styles to avoid accidental hidden state
    loginBtn.style.display = "inline-flex";
    loginBtn.style.alignItems = "center";
    loginBtn.style.gap = "6px";
    if (afterEl && afterEl.parentElement === header) {
      header.insertBefore(loginBtn, afterEl.nextSibling);
    } else {
      header.appendChild(loginBtn);
    }
  }

  // Ensure user widget container exists right after the login button (so place doesn't jump)
  var widget = document.getElementById("userWidget");
  if (!widget) {
    widget = document.createElement("div");
    widget.id = "userWidget";
    widget.className = "userwidget";
    if (loginBtn.parentElement) {
      loginBtn.parentElement.insertBefore(widget, loginBtn.nextSibling);
    } else {
      header.appendChild(widget);
    }
  }

  // Fallback: if header wasn't found initially, add a floating login button
  // (only if login button is not visible in layout)
  setTimeout(function(){
    var rect = loginBtn.getBoundingClientRect();
    var notVisible = (rect.width === 0 || rect.height === 0);
    var hasFloating = document.getElementById("authOpenFloating");
    if (notVisible && !hasFloating) {
      var fab = loginBtn.cloneNode(true);
      fab.id = "authOpenFloating";
      fab.style.position = "fixed";
      fab.style.right = "16px";
      fab.style.bottom = "16px";
      fab.style.zIndex = "2147483646";
      document.body.appendChild(fab);
    }
  }, 500);

    }
    if (!document.getElementById("userWidget")) {
      var d = document.createElement("div"); d.id = "userWidget"; d.className = "userwidget"; header.appendChild(d);
    }
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest &&
      e.target.closest('#authOpen,[data-auth-open],a[href="#login"],a[href*="login"],button[name="login"],.btn-login');
    if (t) { e.preventDefault(); openModal(); }
  });

  // ---------- profile + UI ----------
  async function getProfile(user) {
    if (!user) return null;
    try { await client.from("profiles").upsert({ user_id: user.id, email: user.email }).select().single(); } catch (_) {}
    var sel = await client.from("profiles").select("full_name, avatar_url, email").eq("user_id", user.id).single();
    return sel.data || { full_name: null, avatar_url: null, email: user.email };
  }

  function renderUserWidget(state) {
    var container = document.getElementById("userWidget");
    var loginBtn = document.getElementById("authOpen");
    if (!container) return;

    if (!state || !state.user) {
      if (loginBtn) { loginBtn.style.display = "inline-flex"; loginBtn.textContent = "🔐 Войти"; }
      container.innerHTML = "";
      return;
    }
    if (loginBtn) loginBtn.style.display = "none";

    var name = (state.profile && state.profile.full_name) ||
               (state.user.user_metadata && state.user.user_metadata.full_name) ||
               state.user.email;
    var avatar = (state.profile && state.profile.avatar_url) ||
                 (state.user.user_metadata && state.user.user_metadata.avatar_url) ||
                 "";

    container.innerHTML =
      '<a class="profile-chip" id="profileChip" href="profile.html" title="Открыть профиль">' +
      '  <img class="avatar" src="' + (avatar || 'assets/avatar-placeholder.png') + '" alt="avatar" onerror="this.src=\\'assets/avatar-placeholder.png\\'"/>' +
      '  <span class="name">' + name + '</span>' +
      '</a>' +
      '<button class="menu-btn" id="profileMenuBtn" type="button" aria-haspopup="true" aria-expanded="false" title="Меню профиля">⋯</button>' +
      '<div class="menu" id="userMenu">' +
      '  <button id="logoutBtn" type="button">Выйти</button>' +
      '</div>';

    var menuBtn = container.querySelector("#profileMenuBtn");
    var menu = container.querySelector("#userMenu");
    function hideMenu(){ if(menu){ menu.style.display = "none"; if(menuBtn) menuBtn.setAttribute("aria-expanded","false"); } }
    function toggleMenu(){
      if(!menu) return;
      var isOpen = menu.style.display === "block";
      if(isOpen){
        hideMenu();
      }else{
        menu.style.display = "block";
        if(menuBtn) menuBtn.setAttribute("aria-expanded", "true");
        var handler = function(ev){
          if(!container.contains(ev.target)){
            hideMenu();
            document.removeEventListener("click", handler);
          }
        };
        setTimeout(function(){ document.addEventListener("click", handler); }, 0);
      }
    }

    if(menuBtn){
      menuBtn.onclick = function (e) { e.preventDefault(); toggleMenu(); };
    }
    container.addEventListener("mouseleave", hideMenu);
    container.querySelector("#logoutBtn").onclick = async function () { await client.auth.signOut(); };
  }

  async function refreshUI() {
    ensureHeaderButtons();
    var gs = await client.auth.getSession();
    var session = gs && gs.data ? gs.data.session : null;
    if (!session || !session.user) { renderUserWidget(null); return; }
    var profile = await getProfile(session.user);
    renderUserWidget({ user: session.user, profile: profile });
  }

  client.auth.onAuthStateChange(async function (event, session) {
    if (event === "SIGNED_IN" || (session && session.user)) { closeModal(); }
    await refreshUI();
  });
  window.addEventListener("DOMContentLoaded", refreshUI);

  // export
  window.Auth = { client: client, open: openModal, close: closeModal, refreshUI: refreshUI };
})();
