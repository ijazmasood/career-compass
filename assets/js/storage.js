/**
 * CGAMSStorage - Modular Browser Persistence Abstraction Layer for Career Compass
 *
 * NOTE: This static demo stores data in browser localStorage hydrated from /data/*.json.
 * All CRUD operations go through this module so a future REST API backend can replace
 * localStorage without rewriting UI components.
 */
(function (global) {
  'use strict';

  const KEYS = {
    initialized: 'career_compass_initialized_v3',
    tests: 'cc_tests',
    questions: 'cc_questions',
    careers: 'cc_careers',
    students: 'cc_students',
    submissions: 'cc_submissions',
    settings: 'cc_settings',
    activeStudentId: 'cc_active_student_id',
    drafts: 'cc_drafts',
    adminSession: 'cc_admin_demo_session'
  };

  const LEGACY_KEYS = [
    'cgams_initialized_v1',
    'career_compass_initialized_v2',
    'cgams_tests',
    'cgams_questions',
    'cgams_careers',
    'cgams_rules',
    'cgams_students',
    'cgams_submissions',
    'cgams_counselling',
    'cgams_settings',
    'cgams_active_student_id',
    'cgams_drafts',
    'cgams_admin_demo_session'
  ];

  async function fetchJson(path) {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('Failed to load seed data: ' + path);
    }
    return res.json();
  }

  function readList(key, fallback = []) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('Storage read error for', key, e);
      return fallback;
    }
  }

  function writeData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function cleanupLegacyKeys() {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  }

  async function hydrateFromSeed() {
    cleanupLegacyKeys();
    const [tests, questions, careers, students, submissions, settings] = await Promise.all([
      fetchJson('data/tests.json'),
      fetchJson('data/questions.json'),
      fetchJson('data/careers.json'),
      fetchJson('data/students.json'),
      fetchJson('data/submissions.json'),
      fetchJson('data/settings.json')
    ]);

    writeData(KEYS.tests, tests);
    writeData(KEYS.questions, questions);
    writeData(KEYS.careers, careers);
    writeData(KEYS.students, students);
    writeData(KEYS.submissions, submissions);
    writeData(KEYS.settings, settings);
    writeData(KEYS.drafts, {});
    localStorage.setItem(KEYS.initialized, 'true');
  }

  async function init() {
    if (!localStorage.getItem(KEYS.initialized)) {
      await hydrateFromSeed();
    }
  }

  async function resetDemoData() {
    Object.values(KEYS).forEach((k) => {
      if (k !== KEYS.adminSession) {
        localStorage.removeItem(k);
      }
    });
    await hydrateFromSeed();
  }

  function generateId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  }

  // Tests CRUD (Strictly manages the 3 core assessment modules)
  function getTests() {
    return readList(KEYS.tests, []);
  }
  function saveTests(list) {
    return writeData(KEYS.tests, list);
  }
  function upsertTest(testObj) {
    const list = getTests();
    const idx = list.findIndex((t) => t.id === testObj.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...testObj };
    }
    return saveTests(list);
  }

  // Questions CRUD
  function getQuestions() {
    return readList(KEYS.questions, []);
  }
  function getQuestionsByTest(testId) {
    return getQuestions()
      .filter((q) => q.testId === testId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  function saveQuestions(list) {
    const next = writeData(KEYS.questions, list);
    const tests = getTests().map((t) => ({
      ...t,
      questionCount: next.filter((q) => q.testId === t.id).length
    }));
    saveTests(tests);
    return next;
  }
  function upsertQuestion(qObj) {
    const list = getQuestions();
    const idx = list.findIndex((q) => q.id === qObj.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...qObj };
    } else {
      const siblingMax = list
        .filter((q) => q.testId === qObj.testId)
        .reduce((max, q) => Math.max(max, Number(q.order || 0)), 0);
      list.push({
        ...qObj,
        id: qObj.id || generateId('q'),
        order: qObj.order || siblingMax + 1
      });
    }
    return saveQuestions(list);
  }
  function deleteQuestion(questionId) {
    return saveQuestions(getQuestions().filter((q) => q.id !== questionId));
  }
  function duplicateQuestion(questionId) {
    const list = getQuestions();
    const target = list.find((q) => q.id === questionId);
    if (!target) return list;
    const copy = JSON.parse(JSON.stringify(target));
    copy.id = generateId('q');
    copy.text = target.text + ' (Copy)';
    const siblingMax = list
      .filter((q) => q.testId === target.testId)
      .reduce((max, q) => Math.max(max, Number(q.order || 0)), 0);
    copy.order = siblingMax + 1;
    list.push(copy);
    return saveQuestions(list);
  }

  // Careers CRUD
  function getCareers() {
    return readList(KEYS.careers, []);
  }
  function saveCareers(list) {
    return writeData(KEYS.careers, list);
  }
  function upsertCareer(careerObj) {
    const list = getCareers();
    const idx = list.findIndex((c) => c.id === careerObj.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...careerObj };
    } else {
      list.push({ ...careerObj, id: careerObj.id || generateId('career') });
    }
    return saveCareers(list);
  }
  function deleteCareer(careerId) {
    return saveCareers(getCareers().filter((c) => c.id !== careerId));
  }

  // Students CRUD
  function getStudents() {
    return readList(KEYS.students, []);
  }
  function getStudentById(studentId) {
    return getStudents().find((s) => s.id === studentId) || null;
  }
  function saveStudents(list) {
    return writeData(KEYS.students, list);
  }
  function upsertStudent(studentObj) {
    const list = getStudents();
    let saved;
    const idx = studentObj.id ? list.findIndex((s) => s.id === studentObj.id) : -1;
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...studentObj };
      saved = list[idx];
    } else {
      saved = {
        ...studentObj,
        id: studentObj.id || generateId('stu'),
        isDemo: Boolean(studentObj.isDemo)
      };
      list.unshift(saved);
    }
    saveStudents(list);
    return saved;
  }
  function deleteStudent(studentId) {
    saveStudents(getStudents().filter((s) => s.id !== studentId));
    saveSubmissions(getSubmissions().filter((sub) => sub.studentId !== studentId));
    if (getActiveStudentId() === studentId) {
      localStorage.removeItem(KEYS.activeStudentId);
    }
  }
  function getActiveStudentId() {
    return localStorage.getItem(KEYS.activeStudentId) || '';
  }
  function setActiveStudentId(studentId) {
    if (!studentId) {
      localStorage.removeItem(KEYS.activeStudentId);
      return;
    }
    localStorage.setItem(KEYS.activeStudentId, studentId);
  }
  function getActiveStudent() {
    const id = getActiveStudentId();
    return id ? getStudentById(id) : null;
  }

  // Submissions CRUD
  function getSubmissions() {
    return readList(KEYS.submissions, []);
  }
  function getSubmissionById(subId) {
    return getSubmissions().find((s) => s.id === subId) || null;
  }
  function getSubmissionsByStudent(studentId) {
    return getSubmissions().filter((s) => s.studentId === studentId);
  }
  function saveSubmissions(list) {
    return writeData(KEYS.submissions, list);
  }
  function upsertSubmission(subObj) {
    const list = getSubmissions();
    let saved;
    const idx = subObj.id ? list.findIndex((s) => s.id === subObj.id) : -1;
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...subObj };
      saved = list[idx];
    } else {
      saved = {
        ...subObj,
        id: subObj.id || generateId('sub'),
        isDemo: Boolean(subObj.isDemo)
      };
      list.unshift(saved);
    }
    saveSubmissions(list);
    return saved;
  }
  function deleteSubmission(subId) {
    return saveSubmissions(getSubmissions().filter((s) => s.id !== subId));
  }

  // Draft Auto-save
  function getDraft(studentId, testId) {
    const all = readList(KEYS.drafts, {});
    return all[studentId + '::' + testId] || null;
  }
  function saveDraft(studentId, testId, answers, currentIndex) {
    const all = readList(KEYS.drafts, {});
    all[studentId + '::' + testId] = {
      answers: answers || {},
      currentIndex: currentIndex || 0,
      updatedAt: new Date().toISOString()
    };
    writeData(KEYS.drafts, all);
  }
  function clearDraft(studentId, testId) {
    const all = readList(KEYS.drafts, {});
    delete all[studentId + '::' + testId];
    writeData(KEYS.drafts, all);
  }

  // Settings
  function getSettings() {
    return readList(KEYS.settings, {
      systemName: 'Career Compass',
      subtitle: 'Student Career Guidance & Assessment System',
      schoolName: 'Student Career Counselling Portal',
      defaultDisclaimer:
        'Career suggestions are exploratory guidance based on your responses. They do not determine your future. Discuss your results with a career counsellor and consider your academic performance, skills, opportunities, and personal goals.',
      counsellorName: 'Career Counsellor'
    });
  }
  function saveSettings(settingsObj) {
    return writeData(KEYS.settings, settingsObj);
  }

  // Demo-only Admin Auth
  function isAdminLoggedIn() {
    return (
      sessionStorage.getItem(KEYS.adminSession) === 'true' ||
      localStorage.getItem(KEYS.adminSession) === 'true'
    );
  }
  function loginAdmin(username, password) {
    if (String(username).trim() === 'admin' && String(password) === 'admin123') {
      sessionStorage.setItem(KEYS.adminSession, 'true');
      localStorage.setItem(KEYS.adminSession, 'true');
      return true;
    }
    return false;
  }
  function logoutAdmin() {
    sessionStorage.removeItem(KEYS.adminSession);
    localStorage.removeItem(KEYS.adminSession);
  }

  // Export Utilities
  function downloadBlob(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportAllJSON() {
    const payload = {
      exportedAt: new Date().toISOString(),
      note: 'Career Compass Browser Demo Data Snapshot',
      settings: getSettings(),
      tests: getTests(),
      questions: getQuestions(),
      careers: getCareers(),
      students: getStudents(),
      submissions: getSubmissions()
    };
    downloadBlob(
      'career-compass-export-' + new Date().toISOString().slice(0, 10) + '.json',
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8'
    );
  }

  function csvCell(val) {
    const str = String(val === null || val === undefined ? '' : val).replace(/"/g, '""');
    return '"' + str + '"';
  }

  function exportSubmissionsCSV(filteredSubmissions) {
    const submissions = filteredSubmissions || getSubmissions();
    const students = getStudents();
    const tests = getTests();
    const headers = [
      'Submission ID',
      'Student Name',
      'Student ID',
      'Class / Grade',
      'Test Type',
      'Date',
      'Practical (R) %',
      'Analytical (I) %',
      'Creative (A) %',
      'Social (S) %',
      'Leadership (E) %',
      'Organizational (C) %',
      'Top Career',
      'Match %',
      'Counsellor Notes',
      'Record Type'
    ];
    const rows = submissions.map((sub) => {
      const stu = students.find((s) => s.id === sub.studentId) || {};
      const test = tests.find((t) => t.id === sub.testId) || {};
      const sc = sub.riasecScores || {};
      const top = (sub.topCareers && sub.topCareers[0]) || {};
      return [
        sub.id,
        stu.fullName || 'Unknown',
        stu.rollNo || '',
        stu.grade || '',
        test.shortTitle || test.title || sub.testId,
        sub.completedAt ? sub.completedAt.slice(0, 10) : (sub.startedAt || '').slice(0, 10),
        sc.R ?? 0,
        sc.I ?? 0,
        sc.A ?? 0,
        sc.S ?? 0,
        sc.E ?? 0,
        sc.C ?? 0,
        top.title || '',
        top.match ?? '',
        sub.counsellorNotes || sub.counsellorRecommendation || '',
        sub.isDemo ? 'DEMO DATA' : 'LIVE SUBMISSION'
      ]
        .map(csvCell)
        .join(',');
    });
    const csv = [headers.map(csvCell).join(','), ...rows].join('\n');
    downloadBlob(
      'career-compass-results-' + new Date().toISOString().slice(0, 10) + '.csv',
      csv,
      'text/csv;charset=utf-8'
    );
  }

  global.CGAMSStorage = {
    KEYS,
    init,
    resetDemoData,
    generateId,
    getTests,
    saveTests,
    upsertTest,
    getQuestions,
    getQuestionsByTest,
    saveQuestions,
    upsertQuestion,
    deleteQuestion,
    duplicateQuestion,
    getCareers,
    saveCareers,
    upsertCareer,
    deleteCareer,
    getStudents,
    getStudentById,
    saveStudents,
    upsertStudent,
    deleteStudent,
    getActiveStudentId,
    setActiveStudentId,
    getActiveStudent,
    getSubmissions,
    getSubmissionById,
    getSubmissionsByStudent,
    saveSubmissions,
    upsertSubmission,
    deleteSubmission,
    getDraft,
    saveDraft,
    clearDraft,
    getSettings,
    saveSettings,
    isAdminLoggedIn,
    loginAdmin,
    logoutAdmin,
    downloadBlob,
    exportAllJSON,
    exportSubmissionsCSV
  };
})(window);
