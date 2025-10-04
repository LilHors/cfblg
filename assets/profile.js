(function(){
  const SB = window.Auth?.client;
  const msg = (s)=>{ const el = document.getElementById('msg'); if(el) el.textContent = s; };

  async function requireAuth(){
    const { data: { user } } = await SB.auth.getUser();
    if(!user){ if(window.Auth) Auth.open(); throw new Error('not-auth'); }
    return user;
  }

  async function loadProfile(){
    const user = await requireAuth();
    await SB.from('profiles').upsert({ user_id: user.id, email: user.email }).select().single().catch(()=>{});
    const { data, error } = await SB.from('profiles').select('full_name, avatar_url, email').eq('user_id', user.id).single();
    if(error){ msg('Ошибка чтения профиля: ' + error.message); return; }
    document.getElementById('fullName').value = data?.full_name || '';
    const url = data?.avatar_url || 'assets/avatar-placeholder.png';
    document.getElementById('avatar').src = url;
  }

  async function saveProfile(){
    const user = await requireAuth();
    const full = document.getElementById('fullName').value.trim();
    const { error } = await SB.from('profiles').update({ full_name: full }).eq('user_id', user.id);
    if(error) { msg('Ошибка сохранения: ' + error.message); return; }
    msg('Сохранено.');
    if(window.Auth) Auth.refreshUI();
  }

  async function uploadAvatar(){
    const user = await requireAuth();
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
    msg('Аватар обновлён.');
    if(window.Auth) Auth.refreshUI();
  }

  window.addEventListener('DOMContentLoaded', ()=>{
    loadProfile().catch(()=>{});
    document.getElementById('saveProfile').onclick = saveProfile;
    document.getElementById('saveAvatar').onclick = uploadAvatar;
  });
})();