let attendanceHistory = [];

function formatHistoryDate(value) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function renderStudentHistory() {
  const list = document.getElementById('attendanceHistory');
  if (!list) return;
  if (!attendanceHistory.length) {
    list.innerHTML = '<div class="history-empty">No attendance records yet.</div>';
    return;
  }
  list.innerHTML = attendanceHistory.map(record => `
    <div class="history-row">
      <div><strong>${escapeHTML(formatHistoryDate(record.attendance_date))}</strong><span>${escapeHTML(new Date(record.marked_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))}</span></div>
      <b class="present-pill">${escapeHTML(String(record.status || 'present').toUpperCase())}</b>
    </div>`).join('');
}

async function initializeAttendanceHistory() {
  if (!attendanceContext || attendanceContext.isAdmin) return;
  try {
    attendanceHistory = await BSISStudentData.loadAttendance(attendanceContext);
    renderStudentHistory();
  } catch (error) {
    console.error('Unable to load attendance history:', error);
  }
}

window.addEventListener('DOMContentLoaded', initializeAttendanceHistory);
window.addEventListener('attendance-context-ready', initializeAttendanceHistory);