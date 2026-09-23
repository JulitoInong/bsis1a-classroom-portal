window.addEventListener('DOMContentLoaded', async () => {
  const session = await requireSession();
  if (!session) return;

  const { data: student, error } = await supabaseClient
    .from('students')
    .select('id')
    .eq('auth_user_id', session.user.id)
    .maybeSingle();

  if (error || !student) redirectToRegistrar();
});