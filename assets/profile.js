(function(){
  function msg(s){ const el = document.getElementById('msg'); if(el) el.textContent = s || ''; }

  async function waitForAuth(ms=5000){
    const t0 = Date.now();
    while(Date.now()-t0 < ms){
      if(window.Auth?.client) return window.Auth.client;
      await new Promise(r=>setTimeout(r,50));
    }
    throw new Error('auth-not-ready');
  }

  async function requireAuth(SB){
    const { data: { user } } = await SB.auth.getUser();
    if(!user){ if(window.Auth) Auth.open(); throw new Error('not-auth'); }
    return user;
  }

  const placeholderAvatar = 'assets/avatar-placeholder.png';

  function clearProfileUI(){
    const nameEl = document.getElementById('fullName');
    if(nameEl) nameEl.value = '';
    const avatarEl = document.getElementById('avatar');
    if(avatarEl) avatarEl.src = placeholderAvatar;
  }

  async function loadProfile(){
    const SB = await waitForAuth();
    const user = await requireAuth(SB).catch(()=>null);
    if(!user) return;
    await SB.from('profiles').upsert({ user_id: user.id, email: user.email }).select().single().catch(()=>{});
    const { data, error } = await SB.from('profiles').select('full_name, avatar_url, email').eq('user_id', user.id).single();
    if(error){ msg('Ошибка чтения профиля: ' + error.message); return; }
    document.getElementById('fullName').value = data?.full_name || '';
    const url = data?.avatar_url || placeholderAvatar;
    document.getElementById('avatar').src = url;
  }

  async function saveProfile(){
    try{
      const SB = await waitForAuth();
      const user = await requireAuth(SB);
      const full = document.getElementById('fullName').value.trim();
      const { error } = await SB.from('profiles').update({ full_name: full }).eq('user_id', user.id);
      if(error) { msg('Ошибка сохранения: ' + error.message); return; }
      msg('Сохранено.'); Auth.refreshUI && Auth.refreshUI();
    }catch(e){ msg('Ошибка: ' + (e.message||e)); }
  }

  async function uploadAvatar(){
    try{
      const SB = await waitForAuth();
      const user = await requireAuth(SB);
      const f = document.getElementById('avatarFile').files[0];
      if(!f){ msg('Выбери файл.'); return; }
      const ext = (f.type.split('/')[1] || 'png').toLowerCase();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await SB.storage.from('avatars').upload(path, f, { upsert: true, contentType: f.type });
      if(upErr){ msg('Загрузка не удалась: ' + upErr.message); return; }
      const { data: pub } = SB.storage.from('avatars').getPublicUrl(path);
      const url = pub?.publicUrl;
      if(!url){ msg('Не удалось получить ссылку.'); return; }
      const { error: updErr } = await SB.from('profiles').update({ avatar_url: url }).eq('user_id', user.id);
      if(updErr){ msg('Ссылка не сохранилась: ' + updErr.message); return; }
      document.getElementById('avatar').src = url;
      msg('Аватар обновлён.'); Auth.refreshUI && Auth.refreshUI();
    }catch(e){ msg('Ошибка: ' + (e.message||e)); }
  }

  window.addEventListener('DOMContentLoaded', ()=>{
    loadProfile().catch(()=>{});
    document.getElementById('saveProfile').onclick = saveProfile;
    document.getElementById('saveAvatar').onclick = uploadAvatar;

    (async()=>{
      try{
        const SB = await waitForAuth();
        SB.auth.onAuthStateChange((event)=>{
          if(event === 'SIGNED_IN'){
            loadProfile().catch(()=>{});
          }else if(event === 'SIGNED_OUT'){
            clearProfileUI();
          }
        });
      }catch(e){
        console.error('auth-listener-error', e);
      }
    })();
  });
})();
