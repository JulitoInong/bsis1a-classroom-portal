/* BSIS 1-A — shared admin recognition
   Visibility is based on public.admin_users.auth_user_id.
   This is UI recognition only; admin/admin-guard.js remains the access-control gate.
*/
window.BSISAdmin = (() => {
  let cached = null;

  async function getAdminIdentity(force = false) {
    if (cached && !force) return cached;
    const { data: { session } = {} } = await supabaseClient.auth.getSession();
    if (!session) {
      cached = { isAdmin: false, session: null, student: null };
      return cached;
    }

    const { data: admin, error: adminError } = await supabaseClient
      .from('admin_users')
      .select('id, auth_user_id, created_at')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();

    if (adminError || !admin) {
      cached = { isAdmin: false, session, student: null };
      return cached;
    }

    const { data: student } = await supabaseClient
      .from('students')
      .select('student_no, full_name, gmail, avatar_url')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();

    cached = {
      isAdmin: true,
      session,
      student: student || null,
      name: student?.full_name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email || 'Administrator',
      email: student?.gmail || session.user.email || '—',
      avatar: student?.avatar_url || session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || ''
    };
    return cached;
  }

  function setVisible(el, visible) {
    if (!el) return;
    el.classList.toggle('hidden', !visible);
    el.setAttribute('aria-hidden', String(!visible));
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setAvatar(id, url, name) {
    const img = document.getElementById(id);
    if (!img) return;
    if (url) {
      img.src = `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
      img.alt = `${name || 'Administrator'} profile photo`;
      img.style.display = 'block';
    } else {
      img.removeAttribute('src');
      img.style.display = 'none';
    }
  }

  async function apply(options = {}) {
    const info = await getAdminIdentity();

    document.querySelectorAll('[data-admin-only]').forEach(el => setVisible(el, info.isAdmin));
    document.querySelectorAll('[data-admin-role]').forEach(el => {
      setVisible(el, info.isAdmin);
      if (info.isAdmin && options.roleText !== false) el.textContent = 'ADMINISTRATOR';
    });

    if (info.isAdmin) {
      setText('adminIdentityName', info.name);
      setText('adminIdentityEmail', info.email);
      setText('adminIdentityRole', 'Administrator');
      setText('adminSidebarName', info.name);
      setText('adminSidebarEmail', info.email);
      setText('adminHomeBadge', 'Administrator');
      setAvatar('adminIdentityAvatar', info.avatar, info.name);
      setAvatar('adminHomeAvatar', info.avatar, info.name);
      setAvatar('adminProfileAvatar', info.avatar, info.name);
      setAvatar('adminSidebarAvatar', info.avatar, info.name);
      const initials = String(info.name || 'A').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0].toUpperCase()).join('') || 'A';
      document.querySelectorAll('[data-admin-initials]').forEach(el => el.textContent = initials);
    }

    return info;
  }

  return { getAdminIdentity, apply };
})();
