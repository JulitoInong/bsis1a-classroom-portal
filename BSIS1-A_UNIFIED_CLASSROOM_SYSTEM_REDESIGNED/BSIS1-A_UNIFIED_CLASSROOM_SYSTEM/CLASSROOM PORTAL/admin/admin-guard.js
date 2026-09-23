(async function enforceAdminAccess() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.replace(`${window.location.origin}/login/index.html`);
    return;
  }

  const { data, error } = await supabaseClient
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", session.user.id)
    .maybeSingle();

  if (error || !data) {
    await supabaseClient.auth.signOut();
    window.location.replace(`${window.location.origin}/login/index.html`);
  }
})();
