(function(){
  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

  if (!window.supabase) { console.warn("[auth] Supabase SDK not found."); return; }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { console.error("[auth] Missing SUPABASE_URL/ANON_KEY"); return; }

  const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const css = `
    .auth-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;z-index:9998}
    .auth-modal{background:#111827;color:#e5e7eb;border:1px solid #2f3640;border-radius:16px;max-width:420px;width:94%;padding:18px;box-shadow:0 12px 30px rgba(0,0,0,.35)}
    .auth-modal h3{margin:0 0 8px;font-size:18px}
    .auth-modal label{display:flex;flex-direction:column;gap:6px;margin:8px 0}
    .auth-modal input{padding:10px 12px;border-radius:12px;border:1px solid #2f3640;background:#0f172a;color:inherit}
    .auth-modal .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
    .auth-modal button{cursor:pointer;border:1px solid #2f3640;background:#0f172a;color:inherit;border-radius:10px;padding:8px 12px}
    .auth-error{color:#ef4444;font-size:13px;margin-top:6px;white-space:pre-wrap}

    .userwidget{position:relative;display:inline-flex;align-items:center;gap:8px;margin-left:8px}
    .userwidget .avatar{width:28px;height:28px;border-radius:999px;object-fit:cover;border:1px solid #2f3640;background:#1f2937;display:inline-block}
    .userwidget .name{cursor:pointer;user-select:none}
    .userwidget .menu{position:absolute;right:0;top:120%;background:#0f172a;border:1px solid #2f3640;border-radius:10px;min-width:180px;display:none;z-index:9999}
    .userwidget .menu a, .userwidget .menu button{display:block;width:100%;text-align:left;padding:8px 10px;border:0;background:transparent;color:#e5e7eb;cursor:pointer}
    .userwidget .menu a:hover, .userwidget .menu button:hover{background:#111827}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  // Modal
  let backdrop;
  function buildModal(){
    if(backdrop) return;
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
    backdrop.addEventListener('click',(e)=>{ if(e.target===backdrop) closeModal(); });
    backdrop.querySelector('#closeAuth').onclick = closeModal;
    const emailEl = ()=> backdrop.querySelector('#authEmail');
    const passEl  = ()=> backdrop.querySelector('#authPass');

    function showError(msg){ const box=document.getElementById('authError'); if(box){ box.textContent=msg; box.style.display='block'; } }
    function clearError(){ const box=document.getElementById('authError'); if(box){ box.textContent=''; box.style.display='none'; } }
    function checkCreds(email, password){
      if(!email || !password){ showError('Укажи email и пароль.'); return false; }
      const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if(!okEmail){ showError('Некорректный email.'); return false; }
      if(password.length < 8){ showError('Пароль минимум 8 символов.'); return false; }
      return true;
    }
    function normalizeError(error){
      const msg=(error && (error.message||error.toString()))||'Unknown error';
      if(msg==='Failed to fetch'){ return 'Failed to fetch\n\nПроверь: 1) ключи, 2) https/не file://, 3) VPN/AdBlock, 4) Supabase → URL Configuration.'; }
      if(/Anonymous sign-ins/.test(msg)) return 'Введи email и пароль — анонимный вход отключён.';
      if(/Invalid API key/i.test(msg)) return 'Invalid API key — проверь anon ключ в assets/env.js';
      return msg;
    }

    backdrop.querySelector('#doSignIn').onclick = async ()=>{
      clearError();
      const email = emailEl().value.trim(), password = passEl().value.trim();
      if(!checkCreds(email,password)) return;
      let err=null; try{ ({error:err} = await client.auth.signInWithPassword({ email, password })); }catch(e){ err=e; }
      if(err) showError(normalizeError(err)); else closeModal();
    };
    backdrop.querySelector('#doSignUp').onclick = async ()=>{
      clearError();
      const email = emailEl().value.trim(), password = passEl().value.trim();
      if(!checkCreds(email,password)) return;
      let err=null; try{ ({error:err} = await client.auth.signUp({ email, password })); }catch(e){ err=e; }
      if(err) showError(normalizeError(err));
      else { closeModal(); alert('Проверь почту для подтверждения (если включено).'); }
    };
  }
  function openModal(){ buildModal(); backdrop.style.display='flex'; }
  function closeModal(){ if(backdrop) backdrop.style.display='none'; }

  // Header user widget
  function ensureHeaderButtons(){
    const header = document.querySelector('header .wrap.nav') || document.querySelector('header');
    if(!header) return;
    if(!header.querySelector('#authOpen')){
      const b=document.createElement('button'); b.id='authOpen'; b.className='btn'; b.textContent='🔐 Войти'; b.onclick=openModal; header.appendChild(b);
    }
    if(!header.querySelector('#userWidget')){
      const div = document.createElement('div'); div.id = 'userWidget'; div.className = 'userwidget'; header.appendChild(div);
    }
  }

  async function getProfile(user){
    if(!user) return null;
    await client.from('profiles').upsert({ user_id: user.id, email: user.email }).select().single().catch(()=>{});
    const { data } = await client.from('profiles').select('full_name, avatar_url, email').eq('user_id', user.id).single();
    return data || { full_name: null, avatar_url: null, email: user.email };
  }

  function renderUserWidget(state){
    const header = document.querySelector('header .wrap.nav') || document.querySelector('header');
    if(!header) return;
    const loginBtn = header.querySelector('#authOpen');
    const w = header.querySelector('#userWidget');

    if(!state || !state.user){
      if(loginBtn) { loginBtn.style.display=''; loginBtn.textContent='🔐 Войти'; loginBtn.onclick=openModal; }
      if(w) w.innerHTML = '';
      return;
    }
    if(loginBtn) loginBtn.style.display='none';

    const name = state.profile?.full_name || state.user.user_metadata?.full_name || state.user.email;
    const avatar = state.profile?.avatar_url || state.user.user_metadata?.avatar_url || '';

    w.innerHTML = `
      <img class="avatar" src="${avatar || 'assets/avatar-placeholder.png'}" alt="avatar" onerror="this.src='assets/avatar-placeholder.png'"/>
      <span class="name" id="userName" title="Нажми, чтобы открыть меню">${name}</span>
      <div class="menu" id="userMenu">
        <a href="profile.html">Профиль</a>
        <button id="logoutBtn">Выйти</button>
      </div>
    `;
    const nameEl = w.querySelector('#userName');
    const menu = w.querySelector('#userMenu');
    nameEl.onclick = ()=>{ menu.style.display = (menu.style.display==='block' ? 'none' : 'block'); };
    w.addEventListener('mouseleave', ()=>{ menu.style.display='none'; });
    w.querySelector('#logoutBtn').onclick = async ()=>{ await client.auth.signOut(); };
  }

  async function refreshUI(){
    ensureHeaderButtons();
    const { data: { session } } = await client.auth.getSession();
    if(!session || !session.user){ renderUserWidget(null); return; }
    const profile = await getProfile(session.user);
    renderUserWidget({ user: session.user, profile });
  }

  client.auth.onAuthStateChange(async ()=>{ await refreshUI(); });
  window.addEventListener('DOMContentLoaded', refreshUI);

  window.Auth = { client, open: openModal, close: closeModal, refreshUI };
})();