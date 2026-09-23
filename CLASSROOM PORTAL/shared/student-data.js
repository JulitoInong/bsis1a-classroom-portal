window.BSISStudentData = (() => {
  async function getContext() {
    const { data: { session } = {}, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError || !session) return null;

    const { data: student, error: studentError } = await supabaseClient
      .from('students')
      .select('id, student_no, full_name, auth_user_id')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();

    if (studentError) throw studentError;

    const { data: admin } = await supabaseClient
      .from('admin_users')
      .select('id')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();

    return { session, student: student || null, isAdmin: Boolean(admin) };
  }

  async function listStudents(isAdmin) {
    const query = supabaseClient.from('students').select('id, student_no, full_name');
    const { data, error } = isAdmin
      ? await query.order('full_name')
      : await query.limit(0);
    if (error) throw error;
    return data || [];
  }

  async function loadAttendance(context, date = null) {
    let query = supabaseClient
      .from('student_attendance')
      .select('student_id, attendance_date, status, marked_at, students(student_no, full_name)')
      .order('attendance_date', { ascending: false });
    if (date) query = query.eq('attendance_date', date);
    if (!context.isAdmin) query = query.eq('student_id', context.student?.id || 0);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async function markAttendance(context, studentId, date, status = 'present') {
    const { error } = await supabaseClient.from('student_attendance').upsert({
      student_id: studentId,
      attendance_date: date,
      status,
      marked_by: context.session.user.id
    }, { onConflict: 'student_id,attendance_date' });
    if (error) throw error;
  }

  return { getContext, listStudents, loadAttendance, markAttendance };
})();