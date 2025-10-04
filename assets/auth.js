(function(){
  const SUPABASE_URL = window.SUPABASE_URL || "https://sgswdxdpgursjfpvwnpj.supabase.co";
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnc3dkeGRwZ3Vyc2pmcHZ3bnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MzUzNDksImV4cCI6MjA3NTExMTM0OX0.f4NWkoEkMqFLG0Ms2gmEVGAAebaSmBwJ9NpmHfM0RYs";
  if (!window.supabase) { console.warn("[auth] Supabase SDK not found."); return; }
  const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const css = `
    .auth-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;z-index:9998}
    .auth-modal{background:var(--card,#111827);color:var(--text,#e5e7eb);border:1px solid var(--border,#2f3640);border-radius:16px;max-width:420px;width:94%;padding:18px;box-shadow:0 12px 30px rgba(0,0,0,.35)}
    .auth-modal h3{margin:0 0 8px;font-size:18px}
    .auth-modal label{display:flex;flex-direction:column;gap:6px;margin:8px 0}
    .auth-modal input{padding:10px 12px;border-radius:12px;border:1px solid var(--border,#2f3640);background:color-mix(in oklab, var(--card,#111827) 80%, var(--bg,#0b1220));color:inherit}
    .auth-modal .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
    .auth-modal button{cursor:pointer;border:1px solid var(--border,#2f3640);background:var(--card,#111827);color:inherit;border-radius:10px;padding:8px 12px}
    .auth-error{color:#ef4444;font-size:13px;margin-top:6px;white-space:pre-wrap}
  `;
  const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);

  function ensureButtons(){
    const headerNav = document.querySelector("header .wrap.nav") || document.querySelector("header .nav") || document.querySelector("header");
    if(!headerNav) return;
    if(!headerNav.querySelector("#authOpen")){
      const btnOpen = document.createElement("button");
      btnOpen.className = "btn"; btnOpen.id = "authOpen"; btnOpen.textContent = "🔐 Войти";
      btnOpen.addEventListener("click", openModal); headerNav.appendChild(btnOpen);
    }
    if(!headerNav.querySelector("#signOutBtn")){
      const btnOut = document.createElement("button");
      btnOut.className = "btn"; btnOut.id = "signOutBtn"; btnOut.style.display = "none"; btnOut.textContent = "Выйти";
      btnOut.addEventListener("click", async ()=>{ await client.auth.signOut(); });
      headerNav.appendChild(btnOut);
    }
  }

  let backdrop;
  function buildModal(){
    if(backdrop) return;
    backdrop = document.createElement("div"); backdrop.className = "auth-modal-backdrop";
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
    backdrop.addEventListener("click", (e)=>{ if(e.target===backdrop) closeModal(); });
    backdrop.querySelector("#closeAuth").addEventListener("click", closeModal);

    const emailEl = ()=> backdrop.querySelector("#authEmail");
    const passEl  = ()=> backdrop.querySelector("#authPass");

    function showError(msg){ const box=document.getElementById("authError"); if(box){ box.textContent=msg; box.style.display="block"; } }
    function clearError(){ const box=document.getElementById("authError"); if(box){ box.textContent=""; box.style.display="none"; } }
    function checkCreds(email, password){
      if(!email || !password){ showError("Укажи email и пароль."); return false; }
      const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if(!okEmail){ showError("Некорректный email."); return false; }
      if(password.length < 8){ showError("Пароль минимум 8 символов."); return false; }
      return true;
    }
    function normalizeError(error){
      const msg=(error && (error.message||error.toString()))||"Unknown error";
      if(msg==="Failed to fetch"){ return "Failed to fetch\n\nПроверь: 1) ключи SUPABASE_URL/ANON_KEY, 2) открывай по http/https (не file://), 3) отключи VPN/AdBlock/Protect, 4) домен в Authentication → URL Configuration."; }
      if(/Anonymous sign-ins/.test(msg)) return "Введи email и пароль — анонимный вход отключён.";
      return msg;
    }

    backdrop.querySelector("#doSignIn").addEventListener("click", async ()=>{
      clearError(); const email=emailEl().value.trim(); const password=passEl().value.trim();
      if(!checkCreds(email,password)) return;
      let error=null; try{ ({error}=await client.auth.signInWithPassword({ email, password })); }catch(e){ error=e; }
      if(error){ showError(normalizeError(error)); } else { closeModal(); }
    });
    backdrop.querySelector("#doSignUp").addEventListener("click", async ()=>{
      clearError(); const email=emailEl().value.trim(); const password=passEl().value.trim();
      if(!checkCreds(email,password)) return;
      let error=null; try{ ({error}=await client.auth.signUp({ email, password })); }catch(e){ error=e; }
      if(error){ showError(normalizeError(error)); } else { closeModal(); alert("Проверь почту для подтверждения (если включено)."); }
    });
  }

  function openModal(){ buildModal(); backdrop.style.display="flex"; }
  function closeModal(){ if(backdrop) backdrop.style.display="none"; }

  async function refreshUI(){
    const { data: { session } } = await client.auth.getSession();
    const inBtn=document.getElementById("authOpen"); const outBtn=document.getElementById("signOutBtn");
    if(session?.user){ if(inBtn){ inBtn.textContent="Аккаунт"; inBtn.onclick=openModal; } if(outBtn) outBtn.style.display=""; }
    else { if(inBtn){ inBtn.textContent="🔐 Войти"; inBtn.onclick=openModal; } if(outBtn) outBtn.style.display="none"; }
  }
  client.auth.onAuthStateChange(async()=>{ await refreshUI(); });
  window.addEventListener("DOMContentLoaded", ()=>{ ensureButtons(); refreshUI(); });

  window.Auth = { client, open: openModal, close: closeModal, refreshUI };
  window.SUPABASE_URL = window.SUPABASE_URL || SUPABASE_URL;
  window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
})();