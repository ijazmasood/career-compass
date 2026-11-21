/**
 * student.js - Simple Student Profile & 3-Quiz Selection Hub
 */
(function (global, $) {
  'use strict';

  const { escapeHtml, showToast, formatDate } = global.CGAMSUI;

  const SUBJECT_OPTIONS = [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Computer Science',
    'English',
    'Accounting',
    'Economics',
    'Business Studies',
    'Fine Arts',
    'Psychology',
    'History'
  ];

  function renderSubjectChips(containerId, selectedList) {
    const selectedSet = new Set((selectedList || []).map((s) => s.toLowerCase()));
    const html = SUBJECT_OPTIONS.map((subj, idx) => {
      const checked = selectedSet.has(subj.toLowerCase()) ? 'checked' : '';
      const id = `${containerId}_${idx}`;
      return `
        <label class="subject-chip-check" for="${id}">
          <input class="subject-check-${containerId}" type="checkbox" value="${escapeHtml(subj)}" id="${id}" ${checked}>
          <span class="subject-chip-label">${escapeHtml(subj)}</span>
        </label>
      `;
    }).join('');
    $('#' + containerId).html(html);
  }

  function populateForm(student, settings) {
    $('#stuFullName').val(student?.fullName || '');
    $('#stuRollNo').val(student?.rollNo || '');
    $('#stuGrade').val(student?.grade || '');
    $('#stuSection').val(student?.section || '');
    $('#stuAge').val(student?.age || '');
    $('#stuSchool').val(student?.school || settings.schoolName || '');
    $('#stuCity').val(student?.city || '');
    $('#stuEmail').val(student?.email || '');

    renderSubjectChips('favoriteSubjectsBox', student?.favoriteSubjects || []);
  }

  function readCheckedSubjects(containerId) {
    const list = [];
    $(`.subject-check-${containerId}:checked`).each(function () {
      list.push($(this).val());
    });
    return list;
  }

  function validateAndBuildStudent() {
    const form = document.getElementById('studentProfileForm');
    form.classList.add('was-validated');

    const fullName = $('#stuFullName').val().trim();
    if (!fullName) {
      showToast('Please enter your Full Name to begin.', 'warning');
      $('#stuFullName').trigger('focus');
      return null;
    }

    const activeId = CGAMSStorage.getActiveStudentId();
    const existing = activeId ? CGAMSStorage.getStudentById(activeId) : null;
    const favSubjects = readCheckedSubjects('favoriteSubjectsBox');

    return {
      ...(existing || {}),
      id: existing ? existing.id : undefined,
      fullName,
      rollNo: $('#stuRollNo').val().trim(),
      grade: $('#stuGrade').val().trim(),
      section: $('#stuSection').val().trim(),
      age: $('#stuAge').val() ? Number($('#stuAge').val()) : '',
      school: $('#stuSchool').val().trim(),
      city: $('#stuCity').val().trim(),
      email: $('#stuEmail').val().trim(),
      date: existing?.date || new Date().toISOString().slice(0, 10),
      favoriteSubjects: favSubjects,
      isDemo: false
    };
  }

  function renderTestHub() {
    const activeStudent = CGAMSStorage.getActiveStudent();
    const tests = CGAMSStorage.getTests().filter((t) => t.active).slice(0, 3);
    const submissions = activeStudent ? CGAMSStorage.getSubmissionsByStudent(activeStudent.id) : [];

    if (!activeStudent) {
      $('#profileLockedNotice').removeClass('d-none');
      $('#activeProfileSummary').addClass('d-none');
      $('#combinedProfileCard').addClass('d-none');
    } else {
      $('#profileLockedNotice').addClass('d-none');
      $('#activeProfileSummary').removeClass('d-none');
      $('#summaryStudentName').text(activeStudent.fullName);

      const metaParts = [];
      if (activeStudent.rollNo) metaParts.push('ID: ' + activeStudent.rollNo);
      if (activeStudent.grade) metaParts.push(activeStudent.grade);
      if (activeStudent.school) metaParts.push(activeStudent.school);
      $('#summaryStudentMeta').text(metaParts.length ? metaParts.join(' · ') : 'Ready to take any assessment');

      const completedSubs = submissions.filter((s) => s.status === 'completed');
      if (completedSubs.length >= 2) {
        $('#combinedProfileCard').removeClass('d-none');
        $('#combinedCountText').text(`${completedSubs.length} completed assessments`);
        $('#viewCombinedProfileLink').attr(
          'href',
          `result.html?mode=combined&studentId=${encodeURIComponent(activeStudent.id)}`
        );
      } else {
        $('#combinedProfileCard').addClass('d-none');
      }
    }

    const preselect = new URLSearchParams(window.location.search).get('preselect');
    const fallbackImages = [
      'assets/images/test-personality.svg',
      'assets/images/test-photo.svg',
      'assets/images/test-discovery.svg'
    ];

    const html = tests
      .map((test, index) => {
        const sub = submissions.find((s) => s.testId === test.id && s.status === 'completed');
        const draft = activeStudent ? CGAMSStorage.getDraft(activeStudent.id, test.id) : null;
        const draftCount = draft && draft.answers ? Object.keys(draft.answers).length : 0;
        const isHighlighted = preselect === test.id ? 'border-primary' : '';
        const imgPath = test.cardImage || fallbackImages[index] || 'assets/images/test-personality.svg';

        let statusHtml = '<span class="status-text status-inactive"><i class="bi bi-circle"></i> Not Started</span>';
        if (sub) {
          statusHtml = `<span class="status-text status-completed"><i class="bi bi-check-circle-fill"></i> Completed (${formatDate(sub.completedAt)})</span>`;
        } else if (draftCount > 0) {
          statusHtml = `<span class="status-text status-progress"><i class="bi bi-clock-history"></i> Saved (${draftCount}/${test.questionCount})</span>`;
        }

        const primaryBtnLabel = sub
          ? 'Retake Quiz'
          : draftCount > 0
            ? 'Resume Quiz'
            : 'Start Quiz';

        return `
          <div class="col-md-6 col-lg-4">
            <div class="cgams-card test-catalog-card ${isHighlighted}">
              <div class="test-card-visual">
                <img src="${escapeHtml(imgPath)}" alt="${escapeHtml(test.title)} illustration" />
              </div>
              <div class="test-card-body">
                <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                  <span class="small fw-semibold text-teal">${escapeHtml(test.category)}</span>
                  ${statusHtml}
                </div>
                <h3 class="h5 fw-bold mb-2">${escapeHtml(test.title)}</h3>
                <p class="small text-secondary mb-3">${escapeHtml(test.description)}</p>
                <div class="meta-inline mb-3">
                  <span><i class="bi bi-list-check me-1"></i><span class="tabular-nums">${test.questionCount}</span> questions</span>
                  <span class="sep">·</span>
                  <span><i class="bi bi-clock me-1"></i><span class="tabular-nums">~${test.estimatedMinutes}</span> min</span>
                </div>
                <div class="card-footer-actions">
                  <button type="button" class="btn ${sub ? 'btn-outline-slate' : 'btn-teal'} btn-sm flex-grow-1 start-test-btn" data-test-id="${escapeHtml(test.id)}">
                    ${primaryBtnLabel} <i class="bi bi-arrow-right"></i>
                  </button>
                  ${
                    sub
                      ? `<a href="result.html?submissionId=${encodeURIComponent(sub.id)}" class="btn btn-primary-navy btn-sm">
                           <i class="bi bi-bar-chart-line"></i> View Result
                         </a>`
                      : ''
                  }
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    $('#studentTestHubGrid').html(html);
  }

  async function initStudentPortal() {
    await CGAMSStorage.init();
    const settings = CGAMSStorage.getSettings();
    $('[data-system-name]').text(settings.systemName || 'Career Compass');
    $('[data-school-name]').text(settings.schoolName || 'Student Career Counselling Portal');

    const activeStudent = CGAMSStorage.getActiveStudent();
    populateForm(activeStudent, settings);
    renderTestHub();

    if (activeStudent) {
      $('#bioDataCollapse').removeClass('show');
    }

    $('#studentProfileForm').on('submit', function (e) {
      e.preventDefault();
      const data = validateAndBuildStudent();
      if (!data) return;
      const saved = CGAMSStorage.upsertStudent(data);
      CGAMSStorage.setActiveStudentId(saved.id);
      showToast('Profile saved! Choose any of the 3 career quizzes below.', 'success');
      $('#bioDataCollapse').collapse('hide');
      renderTestHub();
      document.getElementById('assessmentHubSection').scrollIntoView({ behavior: 'smooth' });
    });

    $('#btnFillDemoStudent').on('click', () => {
      const demo = {
        fullName: 'Zara Naveed',
        rollNo: 'STU-2026-' + Math.floor(200 + Math.random() * 700),
        grade: '11 (HSSC-I)',
        section: 'A',
        age: 17,
        school: settings.schoolName || 'Student Career Counselling Portal',
        city: 'Lahore',
        email: 'zara.naveed@demo.edu',
        favoriteSubjects: ['Computer Science', 'Mathematics', 'Fine Arts']
      };
      populateForm(demo, settings);
      showToast('Sample profile filled. Click "Save & Continue" to start.', 'info');
    });

    $('#btnNewStudentSession').on('click', () => {
      CGAMSStorage.setActiveStudentId('');
      document.getElementById('studentProfileForm').classList.remove('was-validated');
      populateForm(null, settings);
      $('#bioDataCollapse').collapse('show');
      renderTestHub();
      showToast('Ready for a new student profile.', 'info');
    });

    $(document).on('click', '.start-test-btn', function () {
      const testId = $(this).data('test-id');
      let studentId = CGAMSStorage.getActiveStudentId();

      // Convenience: if user already typed their name in the form but didn't click Save yet, save smoothly
      if (!studentId) {
        const typedName = $('#stuFullName').val().trim();
        if (typedName) {
          const data = validateAndBuildStudent();
          if (data) {
            const saved = CGAMSStorage.upsertStudent(data);
            CGAMSStorage.setActiveStudentId(saved.id);
            studentId = saved.id;
          }
        }
      }

      if (!studentId) {
        showToast('Please enter your Full Name above to start the quiz.', 'warning');
        $('#bioDataCollapse').collapse('show');
        $('#stuFullName').trigger('focus');
        return;
      }

      window.location.href = 'assessment.html?testId=' + encodeURIComponent(testId);
    });
  }

  $(document).ready(() => {
    if (document.body.dataset.page === 'student') {
      initStudentPortal().catch((err) => {
        console.error(err);
        showToast('Unable to load student portal.', 'danger');
      });
    }
  });
})(window, window.jQuery);
