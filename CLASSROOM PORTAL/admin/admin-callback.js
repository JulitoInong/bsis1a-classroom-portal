const title = document.getElementById("title");
const message = document.getElementById("message");

async function verifyAdmin() {
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

  if (error) {
    console.error(error);
    title.textContent = "Admin verification failed";
    message.textContent = "Check that the admin_users table and RLS policy have been configured.";
    message.className = "error";
    return;
  }

  if (!data) {
    await supabaseClient.auth.signOut();
    window.location.replace(`${window.location.origin}/login/index.html`);
    return;
  }

  window.location.replace(`${window.location.origin}/admin/admin.html`);
}

verifyAdmin();
