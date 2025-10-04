(function(){
  const SUPABASE_URL = window.SUPABASE_URL || "https://sgswdxdpgursjfpvwnpj.supabase.co";
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnc3dkeGRwZ3Vyc2pmcHZ3bnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MzUzNDksImV4cCI6MjA3NTExMTM0OX0.f4NWkoEkMqFLG0Ms2gmEVGAAebaSmBwJ9NpmHfM0RYs";

  if (!window.supabase) { console.warn("[auth] Supabase SDK not found"); return; }
  const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const css = `
  .auth-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;z-index:9998}
  .auth-modal{background:var(--card,#111827);color:var(--text,#e5e7eb);border:1px solid var(--border,#2f3640);border-radius:16px;max-width:420px;width:94%;padding:18px;box-shadow:0 12px 30px rgba(0,0,0,.35)}
  .auth-modal h3{margin:0 0 8px;font-size:18px}
  .auth-modal label{display:flex;flex-direction:column;gap:6px;margin:8px 0}
  .auth-modal input{padding:10px 12px;border-radius:12px;border:1px solid var(--border,#2f3640);background:color-mix(in oklab, var(--card,#111827) 80%, var(--bg,#0b1220));color:inherit}
  .auth-modal .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
  .auth-modal button{cursor:pointer;border:1px solid var(--border,#2f3640);background:var(--card,#111827);color:inherit;border-radius:10px;padding:8px 12px}
  .auth-error{color:#ef4444;font-size:13px;margin-top:6px}
  `;
  const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);

  function ensureButtons(){
    const header = document.querySelector("header .wrap.nav") || document.querySelector("header");
    if(!header) return;
    if(!header.querySelector("#authOpen")){ const b=document.createElement('button'); b.id='authOpen'; b.className='btn'; b.textContent='🔐 Войти'; b.onclick=openModal; header.appendChild(b);}
    if(!header.querySelector("#signOutBtn")){ const b=document.createElement('button'); b.id='signOutBtn'; b.className='btn'; b.style.display='none'; b.textContent='Выйти'; b.onclick=async()=>{ await client.auth.signOut(); }; header.appendChild(b);}
  }

  let backdrop;
  function buildModal(){
    if(backdrop) return;
    backdrop = document.createElement("div");
    backdrop.className = "auth-modal-backdrop";
    backdrop.innerHTML = `
      <div class="auth-modal" role="dialog" aria-modal="true">
        <h3>Вход / Регистрация</h3>
        <label>Email <input id="authEmail" type="email" placeholder="you@example.com" required></label>
        <label>Пароль <input id="authPass" type="password" placeholder="••••••••" required></label>
        <div id="authError" class="auth-error" style="display:none"></div>
        <div class="row">
          <button id="doSignIn">Войти</button>
          <button id="doSignUp">Зарегистрироваться</button>
          <button id="closeAuth" style="margin-left:auto">Закрыть</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click",(e)=>{ if(e.target===backdrop) closeModal(); });
    backdrop.querySelector("#closeAuth").onclick = closeModal;
    backdrop.querySelector("#doSignIn").onclick = async()=>{
      const email=backdrop.querySelector("#authEmail").value.trim();
      const password=backdrop.querySelector("#authPass").value.trim();
      let error=null; try { ({ error } = await client.auth.signInWithPassword({ email, password })); } catch(e){ error=e; }
      if(error) showError(error.message||error.toString()); else closeModal();
    };
    backdrop.querySelector("#doSignUp").onclick = async()=>{
      const email=backdrop.querySelector("#authEmail").value.trim();
      const password=backdrop.querySelector("#authPass").value.trim();
      let error=null; try { ({ error } = await client.auth.signUp({ email, password })); } catch(e){ error=e; }
      if(error) showError(error.message||error.toString()); else { closeModal(); alert("Проверь почту, если требуется подтверждение."); }
    };
  }
  function showError(msg){ const box=document.getElementById('authError'); if(box){ box.textContent=msg; box.style.display='block'; } }
  function openModal(){ buildModal(); backdrop.style.display='flex'; }
  function closeModal(){ if(backdrop) backdrop.style.display='none'; }

  async function refreshUI(){
    const { data: { session } } = await client.auth.getSession();
    const inBtn = document.getElementById("authOpen");
    const outBtn = document.getElementById("signOutBtn");
    if(session?.user){ if(inBtn) inBtn.textContent="Аккаунт"; if(outBtn) outBtn.style.display=""; }
    else { if(inBtn) inBtn.textContent="🔐 Войти"; if(outBtn) outBtn.style.display="none"; }
  }

  client.auth.onAuthStateChange(async()=>{ await refreshUI(); });
  window.addEventListener("DOMContentLoaded", ()=>{ ensureButtons(); refreshUI(); });

  window.Auth = { client, open: openModal, close: closeModal, refreshUI };
  window.SUPABASE_URL = window.SUPABASE_URL || SUPABASE_URL;
  window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
})();