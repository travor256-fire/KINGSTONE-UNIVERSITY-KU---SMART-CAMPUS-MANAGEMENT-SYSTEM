/**
 * app.js
 * Kingstone University (KU) - Smart Campus Management System
 * Web Edition: HTML5 + CSS3 + Vanilla JS  |  Backend: Java SE + SQLite
 *
 * File layout:
 *   1. Config
 *   2. State
 *   3. Data seeds (course units, students)
 *   4. Utilities (escape, grading, toasts)
 *   5. Backend detection
 *   6. Role switching
 *   7. Admin  — registry, search, filter, pagination, register
 *   8. Lecturer — units, attendance, grading
 *   9. Student — ID card + transcript
 *  10. Event wiring
 *  11. Bootstrap
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. CONFIG
  // =========================================================================
  const API_BASE = '/api';
  const ADMIN_PAGE_SIZE = 20;
  const MIN_ATTENDANCE_PCT = 75.0;
  const ROLE_ORDER = ['ADMIN', 'LECTURER', 'STUDENT'];

  // =========================================================================
  // 2. STATE
  // =========================================================================
  const state = {
    role: 'ADMIN',
    isServerConnected: false,
    students: [],
    adminSearch: '',
    adminFaculty: 'ALL',
    adminPage: 1,
    currentUnit: 'CSC1101',
    units: {},
    currentStudentReg: 'KU/2024/001'
  };

  // =========================================================================
  // 3. DATA SEEDS
  // =========================================================================
  const UNIT_CATALOG = {
    'CSC1101': { title: 'Computer Architecture & Organization', week: 7, topic: 'Object-Oriented Principles & Design Patterns', hall: 'Science Hub 1' },
    'SWE2101': { title: 'Systems Analysis & Design',             week: 7, topic: 'UML Modelling & Requirements Engineering',       hall: 'Science Hub 2' },
    'CSC3105': { title: 'Artificial Intelligence & Expert Systems', week: 7, topic: 'Search Strategies & Knowledge Representation',   hall: 'AI Lab' },
    'MTH1102': { title: 'Discrete Mathematics',                  week: 7, topic: 'Graph Theory & Combinatorics',                  hall: 'Maths Theatre A' }
  };

  const SEED_ROSTER = [
    { regNumber: 'KU/2024/001', name: 'Samuel Mukasa' },
    { regNumber: 'KU/2024/002', name: 'Brenda Nabirye' },
    { regNumber: 'KU/2024/003', name: 'John Baptist Ochieng' },
    { regNumber: 'KU/2024/004', name: 'Grace Achieng' },
    { regNumber: 'KU/2024/005', name: 'Emmanuel Ssenyonjo' },
    { regNumber: 'KU/2024/006', name: 'Fiona Namubiru' },
    { regNumber: 'KU/2024/007', name: 'David Kato' },
    { regNumber: 'KU/2024/008', name: 'Patricia Alum' }
  ];

  const SEED_MARKS = {
    'CSC1101': { attended: [15, 16, 10, 14,  8, 15, 13, 16], cw: [34, 36, 22, 31, 18, 35, 28, 38], exam: [52, 54, 38, 48, 28, 50, 45, 55] },
    'SWE2101': { attended: [14, 15, 11, 13,  9, 14, 12, 15], cw: [33, 35, 24, 30, 20, 34, 27, 36], exam: [50, 52, 40, 46, 32, 49, 44, 53] },
    'CSC3105': { attended: [13, 16,  9, 12,  7, 14, 11, 15], cw: [30, 37, 20, 28, 16, 33, 25, 36], exam: [47, 55, 36, 44, 26, 50, 42, 54] },
    'MTH1102': { attended: [16, 16, 12, 15, 10, 16, 14, 16], cw: [36, 38, 26, 33, 22, 36, 30, 38], exam: [54, 56, 42, 50, 32, 52, 46, 56] }
  };

  const TOTAL_SESSIONS = 16;

  // =========================================================================
  // 4. UTILITIES
  // =========================================================================

  /** Escape user-provided strings before inserting into innerHTML. */
  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** KU Senate grading scale. */
  function computeGrade(total) {
    if (total >= 80) return 'A';
    if (total >= 75) return 'B+';
    if (total >= 70) return 'B';
    if (total >= 65) return 'C+';
    if (total >= 60) return 'C';
    if (total >= 50) return 'D';
    return 'F';
  }

  function computeGradePoint(total) {
    if (total >= 80) return 5.0;
    if (total >= 75) return 4.5;
    if (total >= 70) return 4.0;
    if (total >= 65) return 3.5;
    if (total >= 60) return 3.0;
    if (total >= 50) return 2.0;
    return 0.0;
  }

  function getDegreeClassification(cgpa) {
    if (cgpa >= 4.40) return 'FIRST CLASS HONOURS';
    if (cgpa >= 3.60) return 'SECOND CLASS HONOURS (UPPER DIVISION)';
    if (cgpa >= 2.80) return 'SECOND CLASS HONOURS (LOWER DIVISION)';
    if (cgpa >= 2.00) return 'PASS DEGREE';
    return 'FAIL / ACADEMIC PROBATION';
  }

  function initialsOf(fullName) {
    return String(fullName)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('');
  }

  /** Shorthand for setting textContent safely. */
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  /** Toast notification. */
  function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  // =========================================================================
  // 5. DATA GENERATORS
  // =========================================================================
  function generateInitialStudents(count) {
    const firstNames = ['Samuel', 'Brenda', 'John', 'Grace', 'Emmanuel', 'Fiona', 'David', 'Patricia', 'Daniel', 'Sarah', 'Joseph', 'Rebecca', 'Brian', 'Joan', 'Michael', 'Esther', 'Paul', 'Ruth', 'Peter', 'Mercy'];
    const lastNames  = ['Mukasa', 'Nabirye', 'Ochieng', 'Achieng', 'Ssenyonjo', 'Namubiru', 'Kato', 'Alum', 'Okello', 'Akello', 'Mugisha', 'Kembabazi', 'Wasswa', 'Nakato', 'Kiprotich', 'Chebet', 'Bwambale', 'Biira', 'Musoke', 'Babirye'];
    const faculties  = [
      { name: 'Faculty of Science & Technology',  course: 'B.Sc. Computer Science' },
      { name: 'Faculty of Business & Management', course: 'Bachelor of Business Administration' },
      { name: 'Faculty of Law',                   course: 'Bachelor of Laws (LL.B)' },
      { name: 'Faculty of Health Sciences',       course: 'Bachelor of Medicine & Surgery' },
      { name: 'Faculty of Engineering',           course: 'B.Sc. Civil Engineering' }
    ];

    const list = [];
    for (let i = 1; i <= count; i++) {
      const fn  = firstNames[(i - 1) % firstNames.length];
      const ln  = lastNames[Math.floor((i - 1) / firstNames.length) % lastNames.length];
      const fac = faculties[(i - 1) % faculties.length];
      const reg = `KU/2024/${String(i).padStart(3, '0')}`;
      const attendance = Math.min(100, Math.max(50, 70 + ((i * 7) % 31)));
      const cgpa = parseFloat((2.5 + ((i * 13) % 25) / 10).toFixed(2));

      list.push({
        id: `std-${i}`,
        regNumber: reg,
        fullName: `${fn} ${ln}`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@ku.ac.ug`,
        facultyName: fac.name,
        courseName: fac.course,
        yearOfStudy: ((i - 1) % 4) + 1,
        cgpa,
        attendanceRate: attendance,
        status: 'ACTIVE'
      });
    }
    return list;
  }

  function buildUnitRoster(unitCode) {
    const seed = SEED_MARKS[unitCode] || SEED_MARKS['CSC1101'];
    return SEED_ROSTER.map((s, i) => ({
      regNumber: s.regNumber,
      name: s.name,
      attended: seed.attended[i],
      total: TOTAL_SESSIONS,
      cw: seed.cw[i],
      exam: seed.exam[i],
      sessionStatus: null
    }));
  }

  function buildAllUnits() {
    Object.keys(UNIT_CATALOG).forEach(code => {
      state.units[code] = {
        meta: UNIT_CATALOG[code],
        roster: buildUnitRoster(code)
      };
    });
  }

  // =========================================================================
  // 6. BACKEND DETECTION
  // =========================================================================
  async function checkBackendConnection() {
    const dot  = document.getElementById('server-dot');
    const text = document.getElementById('server-status-text');

    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (res.ok) {
        const stats = await res.json();
        state.isServerConnected = true;
        if (dot)  dot.style.backgroundColor = '#10B981';
        if (text) text.textContent = `Java WebServer & SQLite Database Connected (${stats.totalStudents} Students)`;
        await loadStudentsFromBackend();
        return;
      }
    } catch (_) { /* backend offline — use fallback */ }

    state.isServerConnected = false;
    if (dot)  dot.style.backgroundColor = '#D4AF37';
    if (text) text.textContent = `Local Standalone Mode (${state.students.length} Enrolled Students)`;
  }

  async function loadStudentsFromBackend() {
    try {
      const res = await fetch(`${API_BASE}/students`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        state.students = data;
        renderAdminStudentsTable();
      }
    } catch (e) {
      console.warn('Could not load students from backend:', e);
    }
  }

  // =========================================================================
  // 7. ROLE SWITCHING
  // =========================================================================
  function switchRole(role) {
    if (!ROLE_ORDER.includes(role)) return;
    state.role = role;

    document.querySelectorAll('.role-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-role') === role);
    });

    const identity = {
      ADMIN:    { label: 'ADMINISTRATOR',         name: 'Dr. Arthur Pendelton', email: 'admin@ku.ac.ug' },
      LECTURER: { label: 'SENIOR LECTURER',       name: 'Dr. Joyce Okello',     email: 'j.okello@ku.ac.ug' },
      STUDENT:  { label: 'UNDERGRADUATE STUDENT', name: 'Samuel Mukasa',        email: 'KU/2024/001' }
    }[role];

    setText('role-display',      identity.label);
    setText('user-name-display', identity.name);
    setText('user-id-display',   identity.email);

    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`${role.toLowerCase()}-view`);
    if (target) target.classList.add('active');

    if (role === 'ADMIN')    renderAdminStudentsTable();
    if (role === 'LECTURER') renderLecturerWorkspace();
    if (role === 'STUDENT')  renderStudentView();

    showToast(`Switched view to ${role} Portal`);
  }

  // =========================================================================
  // 8. ADMIN — Registry
  // =========================================================================
  function getFilteredStudents() {
    const q   = state.adminSearch.toLowerCase().trim();
    const fac = state.adminFaculty;

    return state.students.filter(s => {
      const matchesSearch = !q ||
        s.regNumber.toLowerCase().includes(q) ||
        s.fullName.toLowerCase().includes(q);
      const matchesFaculty = fac === 'ALL' || s.facultyName === fac;
      return matchesSearch && matchesFaculty;
    });
  }

  function renderAdminStudentsTable() {
    const tbody = document.getElementById('admin-students-tbody');
    if (!tbody) return;

    const filtered = getFilteredStudents();
    const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
    if (state.adminPage > totalPages) state.adminPage = totalPages;

    const start = (state.adminPage - 1) * ADMIN_PAGE_SIZE;
    const pageRows = filtered.slice(start, start + ADMIN_PAGE_SIZE);

    if (pageRows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--ku-text-muted);">No student records matched your search query.</td></tr>`;
    } else {
      tbody.innerHTML = pageRows.map(s => {
        const cleared = (s.attendanceRate || 0) >= MIN_ATTENDANCE_PCT;
        const badgeClass = cleared ? 'badge-success' : 'badge-danger';
        const badgeText  = cleared ? 'CLEARED ✓' : 'BARRED ⚠️';

        return `
          <tr>
            <td><strong style="color: var(--ku-royal-blue);">${esc(s.regNumber)}</strong></td>
            <td>
              <div style="font-weight: 600;">${esc(s.fullName)}</div>
              <div style="font-size: 0.75rem; color: var(--ku-text-muted);">${esc(s.email)}</div>
            </td>
            <td>
              <div>${esc(s.facultyName || 'Science & Technology')}</div>
              <div style="font-size: 0.75rem; color: var(--ku-text-muted);">${esc(s.courseName || 'B.Sc. Computer Science')}</div>
            </td>
            <td>Year ${Number(s.yearOfStudy || 1)}</td>
            <td><strong>${Number(s.cgpa || 0).toFixed(2)}</strong></td>
            <td>
              <div style="font-weight: 600;">${Number(s.attendanceRate || 0).toFixed(1)}%</div>
              <div style="width: 70px; height: 4px; background: #E2E8F0; border-radius: 2px; overflow: hidden; margin-top: 2px;">
                <div style="width: ${Math.min(100, s.attendanceRate || 0)}%; height: 100%; background: ${cleared ? 'var(--ku-success)' : 'var(--ku-danger)'};"></div>
              </div>
            </td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
          </tr>
        `;
      }).join('');
    }

    setText('stat-students', `${state.students.length}+`);
    renderAdminPagination(filtered.length, totalPages);
  }

  function renderAdminPagination(totalRecords, totalPages) {
    let bar = document.getElementById('admin-pagination');
    if (!bar) {
      const host = document.querySelector('#admin-view .card .card-body');
      if (!host) return;
      bar = document.createElement('div');
      bar.id = 'admin-pagination';
      bar.className = 'pagination-bar';
      host.appendChild(bar);
    }

    const from = totalRecords === 0 ? 0 : (state.adminPage - 1) * ADMIN_PAGE_SIZE + 1;
    const to   = Math.min(state.adminPage * ADMIN_PAGE_SIZE, totalRecords);

    bar.innerHTML = `
      <div>Showing <strong>${from}–${to}</strong> of <strong>${totalRecords}</strong> student records</div>
      <div class="pagination-controls">
        <button data-page="1" ${state.adminPage === 1 ? 'disabled' : ''}>« First</button>
        <button data-page="${state.adminPage - 1}" ${state.adminPage === 1 ? 'disabled' : ''}>‹ Prev</button>
        <span style="padding: 0 0.5rem;">Page ${state.adminPage} / ${totalPages}</span>
        <button data-page="${state.adminPage + 1}" ${state.adminPage === totalPages ? 'disabled' : ''}>Next ›</button>
        <button data-page="${totalPages}" ${state.adminPage === totalPages ? 'disabled' : ''}>Last »</button>
      </div>
    `;

    bar.querySelectorAll('button[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = Number(btn.getAttribute('data-page'));
        if (p >= 1 && p <= totalPages) {
          state.adminPage = p;
          renderAdminStudentsTable();
        }
      });
    });
  }

  async function handleRegisterStudent(e) {
    e.preventDefault();

    const fullName = document.getElementById('reg-fullname')?.value.trim();
    const email    = document.getElementById('reg-email')?.value.trim();
    const faculty  = document.getElementById('reg-faculty')?.value;
    const course   = document.getElementById('reg-course')?.value;

    if (!fullName || !email) return;

    const count = state.students.length + 1;
    const newRegNumber = `KU/2024/${String(count).padStart(3, '0')}`;

    const newStudent = {
      id: `std-${Date.now()}`,
      regNumber: newRegNumber,
      fullName,
      email,
      facultyName: faculty,
      courseName: course,
      yearOfStudy: 1,
      cgpa: 3.80,
      attendanceRate: 95.0,
      status: 'ACTIVE'
    };

    if (state.isServerConnected) {
      try {
        const res = await fetch(`${API_BASE}/students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newStudent)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        console.warn('Backend rejected student; keeping local copy only:', err);
        showToast('⚠️ Saved locally — server unreachable');
      }
    }

    state.students.unshift(newStudent);
    state.adminPage = 1;
    renderAdminStudentsTable();

    document.getElementById('form-register-student')?.reset();
    document.getElementById('modal-register-student')?.classList.remove('active');
    showToast(`Successfully enrolled: ${fullName} (${newRegNumber})`);
  }

  // =========================================================================
  // 9. LECTURER — Attendance & Grading
  // =========================================================================
  function renderLecturerWorkspace() {
    renderSessionHeader();
    renderLecturerAttendance();
    renderLecturerGrading();
  }

  function renderSessionHeader() {
    const unit = state.units[state.currentUnit];
    if (!unit) return;

    const header = document.querySelector('#lecturer-view .card-body > div[style*="background-color"]');
    if (!header) return;

    // Update the visible session text
    const strong = header.querySelector('strong');
    if (strong) {
      strong.nextSibling.textContent = ` Week ${unit.meta.week} - ${unit.meta.topic}`;
    }

    // Update Hall label
    const dateSpan = header.querySelector('span#current-session-date')?.parentElement;
    if (dateSpan) {
      dateSpan.innerHTML = `Date: <span id="current-session-date">${new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span> | Hall: ${esc(unit.meta.hall)}`;
    }
  }

  function renderLecturerAttendance() {
    const tbody = document.getElementById('lecturer-attendance-tbody');
    if (!tbody) return;

    const unit = state.units[state.currentUnit];
    if (!unit) return;

    tbody.innerHTML = unit.roster.map((item, idx) => {
      const rate = (item.attended / item.total) * 100;
      const isCleared = rate >= MIN_ATTENDANCE_PCT;
      const s = item.sessionStatus;

      const btn = (status, label, cls) =>
        `<button class="att-btn ${cls} ${s === status ? 'active' : ''}" data-idx="${idx}" data-status="${status}">${label}</button>`;

      return `
        <tr>
          <td><strong style="color: var(--ku-royal-blue);">${esc(item.regNumber)}</strong></td>
          <td style="font-weight: 600;">${esc(item.name)}</td>
          <td>${item.attended} / ${item.total} lectures</td>
          <td><strong style="color: ${isCleared ? 'var(--ku-success)' : 'var(--ku-danger)'}">${rate.toFixed(1)}%</strong></td>
          <td>
            <span class="badge ${isCleared ? 'badge-success' : 'badge-danger'}">
              ${isCleared ? 'CLEARED ✓' : 'BARRED ⚠️ (<75%)'}
            </span>
          </td>
          <td>
            <div class="attendance-actions">
              ${btn('P', 'P', 'present')}
              ${btn('L', 'L', 'late')}
              ${btn('A', 'A', 'absent')}
              ${btn('E', 'E', 'excused')}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.att-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx    = Number(btn.getAttribute('data-idx'));
        const status = btn.getAttribute('data-status');
        toggleAttendance(state.currentUnit, idx, status);
        renderLecturerAttendance();
      });
    });
  }

  /**
   * Toggle a student's session status.
   * Only 'P' counts toward attended total; changing state reverses the previous
   * mark instead of stacking. Clicking the same button again clears the mark.
   */
  function toggleAttendance(unitCode, idx, newStatus) {
    const student = state.units[unitCode]?.roster[idx];
    if (!student) return;

    const prev = student.sessionStatus;

    if (prev === newStatus) {
      // Clear the mark
      if (prev === 'P') student.attended = Math.max(0, student.attended - 1);
      student.sessionStatus = null;
      return;
    }

    if (prev === 'P') student.attended = Math.max(0, student.attended - 1);
    if (newStatus === 'P') student.attended = Math.min(student.total, student.attended + 1);

    student.sessionStatus = newStatus;
  }

  function renderLecturerGrading() {
    const tbody = document.getElementById('lecturer-grading-tbody');
    if (!tbody) return;

    const unit = state.units[state.currentUnit];
    if (!unit) return;

    tbody.innerHTML = unit.roster.map((item, idx) => {
      const total = (item.cw || 0) + (item.exam || 0);
      const grade = computeGrade(total);
      const gp    = computeGradePoint(total);

      return `
        <tr>
          <td><strong style="color: var(--ku-royal-blue);">${esc(item.regNumber)}</strong></td>
          <td style="font-weight: 600;">${esc(item.name)}</td>
          <td><input type="number" step="0.5" min="0" max="40" class="mark-input cw-input" data-idx="${idx}" value="${item.cw}"></td>
          <td><input type="number" step="0.5" min="0" max="60" class="mark-input exam-input" data-idx="${idx}" value="${item.exam}"></td>
          <td><strong id="total-${idx}">${total.toFixed(1)}</strong> / 100</td>
          <td><span class="badge ${grade === 'F' ? 'badge-danger' : 'badge-neutral'}" id="grade-${idx}">${grade}</span></td>
          <td><strong id="gp-${idx}">${gp.toFixed(1)}</strong></td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.mark-input').forEach(input => {
      input.addEventListener('input', () => {
        const idx = Number(input.getAttribute('data-idx'));
        const row = state.units[state.currentUnit].roster[idx];
        if (!row) return;

        const cwInput   = tbody.querySelector(`.cw-input[data-idx="${idx}"]`);
        const examInput = tbody.querySelector(`.exam-input[data-idx="${idx}"]`);

        row.cw   = Math.min(40, Math.max(0, parseFloat(cwInput?.value)  || 0));
        row.exam = Math.min(60, Math.max(0, parseFloat(examInput?.value) || 0));

        const total = row.cw + row.exam;
        const grade = computeGrade(total);
        const gp    = computeGradePoint(total);

        const tEl = document.getElementById(`total-${idx}`);
        const gEl = document.getElementById(`grade-${idx}`);
        const pEl = document.getElementById(`gp-${idx}`);

        if (tEl) tEl.textContent = total.toFixed(1);
        if (gEl) {
          gEl.textContent = grade;
          gEl.className = `badge ${grade === 'F' ? 'badge-danger' : 'badge-neutral'}`;
        }
        if (pEl) pEl.textContent = gp.toFixed(1);
      });
    });
  }

  function handleSaveGrades() {
    showToast('Grades validated and submitted to the KU Examination Board.');
  }

  // =========================================================================
  // 10. STUDENT — ID Card + Transcript
  // =========================================================================
  function renderStudentView() {
    const student = state.students.find(s => s.regNumber === state.currentStudentReg)
                 || state.students[0]
                 || null;
    if (!student) return;

    // --- ID Card ---
    setText('student-avatar-initials', initialsOf(student.fullName));
    setText('student-name-header',     student.fullName);
    setText('student-reg-header',      student.regNumber);
    setText('student-course-header',   student.courseName);
    setText('student-faculty-header',  `${student.facultyName} • Year ${student.yearOfStudy} Semester 1`);
    setText('student-cgpa-val',        Number(student.cgpa).toFixed(2));
    setText('student-honours-val',     getDegreeClassification(student.cgpa));

    // --- Transcript bio grid ---
    setText('trans-name',    student.fullName.toUpperCase());
    setText('trans-reg',     student.regNumber);
    setText('trans-course',  student.courseName);
    setText('trans-faculty', student.facultyName.replace(/^Faculty of /, ''));

    const clearanceEl = document.getElementById('trans-clearance');
    if (clearanceEl) {
      const cleared = student.attendanceRate >= MIN_ATTENDANCE_PCT;
      clearanceEl.textContent = cleared
        ? `CLEARED (${Number(student.attendanceRate).toFixed(0)}% ATTENDANCE)`
        : `BARRED (${Number(student.attendanceRate).toFixed(0)}% ATTENDANCE)`;
      clearanceEl.style.color = cleared ? 'var(--ku-success)' : 'var(--ku-danger)';
    }

    // --- Module rows ---
    const modules = [
      { code: 'CSC1101', title: 'Introduction to Programming & OOP',      cu: 4, cw: 34.0, exam: 52.0 },
      { code: 'CSC1102', title: 'Computer Architecture & Organization',    cu: 4, cw: 31.5, exam: 47.0 },
      { code: 'MTH1103', title: 'Calculus & Discrete Mathematics',         cu: 4, cw: 29.0, exam: 44.0 },
      { code: 'ENG1104', title: 'Communication Skills & Academic Writing', cu: 3, cw: 35.0, exam: 50.0 }
    ];

    const tbody = document.getElementById('transcript-tbody');
    if (tbody) {
      tbody.innerHTML = modules.map(m => {
        const total = m.cw + m.exam;
        const grade = computeGrade(total);
        const gp    = computeGradePoint(total);
        return `
          <tr>
            <td><strong style="color: var(--ku-royal-blue);">${esc(m.code)}</strong></td>
            <td>${esc(m.title)}</td>
            <td>${m.cu}</td>
            <td>${m.cw.toFixed(1)}</td>
            <td>${m.exam.toFixed(1)}</td>
            <td><strong>${total.toFixed(1)}</strong></td>
            <td><span class="badge ${grade === 'F' ? 'badge-danger' : 'badge-neutral'}">${grade}</span></td>
            <td><strong>${gp.toFixed(1)}</strong></td>
          </tr>
        `;
      }).join('');
    }

    setText('trans-cgpa',    `${Number(student.cgpa).toFixed(2)} / 5.00`);
    setText('trans-honours', getDegreeClassification(student.cgpa));
  }

  // =========================================================================
  // 11. EVENT WIRING
  // =========================================================================
  function setupDateDisplay() {
    setText('current-session-date', new Date().toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    }));
  }

  function setupFooterYear() {
    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  function setupEventListeners() {
    // Role switcher
    document.querySelectorAll('.role-btn').forEach(btn => {
      btn.addEventListener('click', () => switchRole(btn.getAttribute('data-role')));
    });

    // Admin: search / filter
    const searchInput = document.getElementById('admin-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        state.adminSearch = searchInput.value;
        state.adminPage = 1;
        renderAdminStudentsTable();
      });
    }

    const facultyFilter = document.getElementById('admin-faculty-filter');
    if (facultyFilter) {
      facultyFilter.addEventListener('change', () => {
        state.adminFaculty = facultyFilter.value;
        state.adminPage = 1;
        renderAdminStudentsTable();
      });
    }

    // Modal open / close
    const btnOpenModal  = document.getElementById('btn-open-register-modal');
    const registerModal = document.getElementById('modal-register-student');
    if (btnOpenModal && registerModal) {
      btnOpenModal.addEventListener('click', () => registerModal.classList.add('active'));
    }

    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.currentTarget.getAttribute('data-close');
        const m = id && document.getElementById(id);
        if (m) m.classList.remove('active');
      });
    });

    // Register form
    const regForm = document.getElementById('form-register-student');
    if (regForm) regForm.addEventListener('submit', handleRegisterStudent);

    // Lecturer: course unit switch
    const unitSelect = document.getElementById('lecturer-unit-select');
    if (unitSelect) {
      unitSelect.addEventListener('change', () => {
        state.currentUnit = unitSelect.value;
        renderLecturerWorkspace();
        showToast(`Loaded unit ${unitSelect.value}`);
      });
    }

    // Lecturer: save grades
    const btnSaveGrades = document.getElementById('btn-save-grades');
    if (btnSaveGrades) btnSaveGrades.addEventListener('click', handleSaveGrades);

    // Student: print transcript
    const btnPrint = document.getElementById('btn-print-transcript');
    if (btnPrint) btnPrint.addEventListener('click', () => window.print());

    // Header: switch user (cycles roles)
    const btnLoginLogout = document.getElementById('btn-login-logout');
    if (btnLoginLogout) {
      btnLoginLogout.addEventListener('click', () => {
        const next = ROLE_ORDER[(ROLE_ORDER.indexOf(state.role) + 1) % ROLE_ORDER.length];
        switchRole(next);
      });
    }
  }

  // =========================================================================
  // 12. BOOTSTRAP
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    // Seed
    state.students = generateInitialStudents(500);
    buildAllUnits();

    // Wire
    setupDateDisplay();
    setupFooterYear();
    setupEventListeners();

    // First paint
    renderAdminStudentsTable();
    renderLecturerWorkspace();
    renderStudentView();

    // Backend check last (may overwrite students if server is live)
    checkBackendConnection();
  });

})();