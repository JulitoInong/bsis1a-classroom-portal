let attendanceContext = null;
let attendanceStudents = [];
let attendanceRemoteReady = false;
const ATTENDANCE_QUEUE_KEY = 'bsis1a_attendance_sync_queue';
const ATTENDANCE_ROSTER_KEY = 'bsis1a_attendance_roster';

function readAttendanceQueue() {
  try { return JSON.parse(localStorage.getItem(ATTENDANCE_QUEUE_KEY) || '[]'); } catch (error) { return []; }
}

function writeAttendanceQueue(queue) {
  localStorage.setItem(ATTENDANCE_QUEUE_KEY, JSON.stringify(queue));
}

function readAttendanceRoster() {
  try { return JSON.parse(localStorage.getItem(ATTENDANCE_ROSTER_KEY) || '[]'); } catch (error) { return []; }
}

function queueAttendance(studentId, date) {
  const queue = readAttendanceQueue();
  if (!queue.some(item => item.studentId === studentId && item.date === date)) {
    queue.push({ studentId, date });
    writeAttendanceQueue(queue);
  }
}

async function flushAttendanceQueue() {
  if (!attendanceContext?.isAdmin || !navigator.onLine) return;
  const pending = readAttendanceQueue();
  const remaining = [];
  for (const item of pending) {
    try { await BSISStudentData.markAttendance(attendanceContext, item.studentId, item.date); }
    catch (error) { remaining.push(item); }
  }
  writeAttendanceQueue(remaining);
  if (pending.length && !remaining.length) showToast('Offline attendance synced');
}

function attendanceDateKey() {
  return localDateKey(new Date());
}

function attendanceRoster() {
  if (attendanceContext && !attendanceContext.isAdmin) return attendanceStudents;
  return attendanceStudents.length ? attendanceStudents : ROSTER;
}

function renderAttendanceRoster() {
  const roster = attendanceRoster();
  const q = (document.getElementById("search").value || "").trim().toLowerCase();
  const rows = roster.filter(student => {
    const no = String(student.student_no || "");
    const present = Boolean(no && attendance[no]);
    const match = !q || String(student.full_name || "").toLowerCase().includes(q) || no.includes(q);
    return match && (filterMode === "all" || (filterMode === "present" && present) || (filterMode === "absent" && !present));
  });
  const list = document.getElementById("attendanceList");
  list.innerHTML = rows.length ? rows.map(student => {
    const no = student.student_no || "Student No. not assigned";
    const present = Boolean(student.student_no && attendance[student.student_no]);
    const time = present ? attendance[student.student_no].time : "";
    return `<div class="student"><div class="avatar">${escapeHTML(initials(student.full_name || "Student"))}</div><div class="student-main"><div class="student-name">${escapeHTML(student.full_name || "Student")}</div><div class="student-no">${escapeHTML(no)}${time ? " • " + escapeHTML(time) : ""}</div></div><span class="${present ? "present-pill" : "absent-pill"}">${present ? "PRESENT" : "ABSENT"}</span></div>`;
  }).join("") : '<div class="empty">No students match this view.</div>';
}

function renderAttendanceSummary() {
  const roster = attendanceRoster();
  const total = roster.length;
  const present = roster.filter(student => student.student_no && attendance[student.student_no]).length;
  document.getElementById("total").textContent = total;
  document.getElementById("present").textContent = present;
  document.getElementById("absent").textContent = Math.max(total - present, 0);
  document.getElementById("rate").textContent = total ? Math.round(present / total * 100) + "%" : "0%";
  document.getElementById("rosterCount").textContent = total;
  renderAttendanceRoster();
}

async function loadRemoteAttendance() {
  if (!attendanceContext) return;
  const localAttendance = { ...attendance };
  const records = await BSISStudentData.loadAttendance(attendanceContext, attendanceDateKey());
  if (records.length) {
    attendance = {};
    records.forEach(record => {
      const no = record.students?.student_no;
      if (no) attendance[no] = { student_no: no, full_name: record.students.full_name, time: new Date(record.marked_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }) };
    });
  } else {
    attendance = localAttendance;
    for (const [studentNo] of Object.entries(localAttendance)) {
      const student = attendanceRoster().find(item => item.student_no === studentNo);
      if (student) {
        try { await BSISStudentData.markAttendance(attendanceContext, student.id, attendanceDateKey()); } catch (error) { console.warn("Unable to migrate local attendance record:", error); }
      }
    }
  }
  attendanceRemoteReady = true;
  renderAttendanceSummary();
}

window.markPresent = async function markPresentRemote(no) {
  if (!attendanceContext?.isAdmin) { showResult('Read-only attendance', 'Only an administrator can record attendance.', 'err'); return false; }
  no = String(no || "").trim();
  const student = attendanceRoster().find(item => item.student_no === no);
  if (!no) { showResult("Student No. required", "Enter a Student No. to continue.", "err"); return false; }
  if (!student) { showResult("Student not found", no + " is not in the current roster.", "err"); return false; }
  if (!student.id) { showResult('Roster unavailable', 'Connect once before recording attendance offline.', 'err'); return false; }
  if (attendance[no]) { showResult("Already Present", student.full_name + " was already marked at " + attendance[no].time + ".", "err"); return false; }
  if (attendanceRemoteReady && navigator.onLine) {
    try {
      await BSISStudentData.markAttendance(attendanceContext, student.id, attendanceDateKey());
    } catch (error) {
      queueAttendance(student.id, attendanceDateKey());
      showToast('Saved offline; will sync when online');
    }
  } else if (attendanceContext?.isAdmin) {
    queueAttendance(student.id, attendanceDateKey());
  }
  attendance[no] = { student_no: no, full_name: student.full_name, time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }) };
  save();
  renderAttendanceSummary();
  showResult("Present", student.full_name + " • " + attendance[no].time, "ok");
  showToast("Attendance recorded");
  return true;
};

window.markManual = async function markManualRemote() {
  const input = document.getElementById("manual");
  if (await window.markPresent(input.value)) { input.value = ""; input.focus(); }
};

window.onScan = async function onScanRemote(decodedText) {
  const now = Date.now();
  if (decodedText === lastScan && now - lastScanAt < 2500) return;
  lastScan = decodedText;
  lastScanAt = now;
  await window.markPresent(decodedText);
};

window.clearToday = async function clearRemoteToday() {
  if (!confirm("Clear all attendance for " + niceDate(new Date()) + "?")) return;
  if (attendanceRemoteReady) {
    if (!attendanceContext.isAdmin) {
      showToast("Only an administrator can clear cloud attendance");
      return;
    }
    const { error } = await supabaseClient.from("student_attendance").delete().eq("attendance_date", attendanceDateKey());
    if (error) {
      console.error("Unable to clear cloud attendance:", error);
      showResult("Cloud clear failed", "Attendance was not changed.", "err");
      return;
    }
  }
  attendance = {};
  save();
  renderAttendanceSummary();
  showResult("Attendance cleared", "Today's attendance has been cleared.", "ok");
  showToast("Today's attendance cleared");
};

function prepareStudentHistoryView() {
  document.querySelectorAll('.panel').forEach((panel, index) => {
    if (index < 2 || index === 2) panel.style.display = 'none';
  });
  document.querySelector('.hero').style.display = 'none';
  const history = document.createElement('section');
  history.className = 'panel';
  history.innerHTML = '<div class="panel-head"><div><h3>My Attendance History</h3><div class="hint">Your attendance is saved day by day.</div></div><span class="hint">READ ONLY</span></div><div id="attendanceHistory" class="list"></div>';
  document.querySelector('.app').insertBefore(history, document.querySelector('.footer'));
}

window.exportCSV = function exportRemoteCSV() {
  const rows = [["student_no", "full_name", "status", "time"]];
  attendanceRoster().forEach(student => rows.push([
    student.student_no || "",
    student.full_name || "",
    student.student_no && attendance[student.student_no] ? "Present" : "Absent",
    student.student_no && attendance[student.student_no] ? attendance[student.student_no].time : ""
  ]));
  const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `BSIS1-A_Attendance_${attendanceDateKey()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

window.render = renderAttendanceSummary;
window.renderRoster = renderAttendanceRoster;

window.addEventListener("DOMContentLoaded", async () => {
  try {
    attendanceContext = await BSISStudentData.getContext();
    if (!attendanceContext) { redirectToLogin(); return; }
    if (!attendanceContext.isAdmin && !attendanceContext.student) { redirectToRegistrar(); return; }
    if (!attendanceContext.isAdmin) prepareStudentHistoryView();
    if (attendanceContext.isAdmin) {
      try {
        attendanceStudents = await BSISStudentData.listStudents(true);
        localStorage.setItem(ATTENDANCE_ROSTER_KEY, JSON.stringify(attendanceStudents));
      } catch (error) {
        attendanceStudents = readAttendanceRoster();
      }
    } else {
      attendanceStudents = attendanceContext.student ? [attendanceContext.student] : [];
    }
    document.querySelector('[onclick="clearToday()"]')?.classList.toggle("hidden", !attendanceContext.isAdmin);
    await loadRemoteAttendance();
    await flushAttendanceQueue();
    window.dispatchEvent(new Event('attendance-context-ready'));
  } catch (error) {
    console.error("Supabase attendance setup failed; local data remains available:", error);
    showToast("Cloud attendance is unavailable");
  }
});

window.addEventListener('online', flushAttendanceQueue);