
const adminGoogleBtn = document.getElementById("adminGoogleBtn");
const adminLoginMessage = document.getElementById("adminLoginMessage");

function showAdminMessage(message) {
  adminLoginMessage.textContent = message || "";
}

async function startAdminGoogleLogin() {
  showAdminMessage("");
  adminGoogleBtn.disabled = true;

  const redirectTo = new URL("admin-callback.html", window.location.href).href;

  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo }
  });

  if (error) {
    console.error(error);
    showAdminMessage(error.message || "Unable to start Google sign-in.");
    adminGoogleBtn.disabled = false;
  }
}

adminGoogleBtn.addEventListener("click", startAdminGoogleLogin);
