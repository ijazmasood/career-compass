/**
 * assessment.js - Clean Step-by-Step Assessment Runner for the 3 Career Compass Quizzes
 */
(function (global, $) {
  'use strict';

  const { escapeHtml, showToast, confirmModal, renderResilientImage } = global.CGAMSUI;

  let state = {
    student: null,
    test: null,
    questions: [],
    answers: {},
    currentIndex: 0,
    mode: 'intro' // 'intro' | 'active' | 'review'
  };

  function isAnswered(q, val) {
    if (val === undefined || val === null || val === '') return false;
    if (Array.isArray(val)) return val.length > 0;
    return true;
  }

  function countAnswered() {
    return state.questions.filter((q) => isAnswered(q, state.answers[q.id])).length;
  }

  function persistDraft() {
    if (!state.student || !state.test) return;
    CGAMSStorage.saveDraft(state.student.id, state.test.id, state.answers, state.currentIndex);
    const savedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    $('#draftStatusText').text(`Saved at ${savedAt}`);
  }

  function renderIntro() {
    state.mode = 'intro';
    $('#assessmentIntroSection').removeClass('d-none');
    $('#assessmentWorkspace').addClass('d-none');
    $('#assessmentReviewSection').addClass('d-none');

    const t = state.test;
    const draft = CGAMSStorage.getDraft(state.student.id, t.id);
    const draftAnswered = draft && draft.answers ? Object.keys(draft.answers).length : 0;

    $('#introTestTitle').text(t.title);
    $('#introTestCategory').text(t.category);
    $('#introTestDesc').text(t.description);
    $('#introTestInstructions').text(t.instructions);
    $('#introQuestionCount').text(state.questions.length);
    $('#introDuration').text(`~${t.estimatedMinutes} min`);

    if (t.cardImage) {
      $('#introCardImage').attr('src', t.cardImage).removeClass('d-none');
    }

    const stuParts = [state.student.fullName];
    if (state.student.rollNo) stuParts.push('ID: ' + state.student.rollNo);
    if (state.student.grade) stuParts.push(state.student.grade);
    $('#introStudentBanner').text(stuParts.join(' · '));

    if (draftAnswered > 0) {
      $('#btnStartTest').html(`<i class="bi bi-play-circle"></i> Resume Quiz (${draftAnswered}/${state.questions.length} answered)`);
    } else {
      $('#btnStartTest').html('<i class="bi bi-play-circle"></i> Start Quiz');
    }
  }

  function renderNavigatorGrid() {
    const html = state.questions
      .map((q, idx) => {
        const answered = isAnswered(q, state.answers[q.id]);
        const isCurr = idx === state.currentIndex;
        const cls = ['q-nav-btn'];
        if (answered) cls.push('answered');
        if (isCurr) cls.push('current');
        return `<button type="button" class="${cls.join(' ')}" data-nav-index="${idx}" title="Question ${idx + 1}">${idx + 1}</button>`;
      })
      .join('');
    $('#questionNavigatorGrid').html(html);
  }

  function renderActiveQuestion() {
    state.mode = 'active';
    $('#assessmentIntroSection').addClass('d-none');
    $('#assessmentWorkspace').removeClass('d-none');
    $('#assessmentReviewSection').addClass('d-none');

    const q = state.questions[state.currentIndex];
    const total = state.questions.length;
    const answeredCount = countAnswered();
    const pct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

    $('#runnerTestTitle').text(state.test.title);
    $('#runnerProgressLabel').text(`${answeredCount} of ${total} answered (${pct}%)`);
    $('#runnerProgressFill').css('width', pct + '%');
    $('#questionCounterBadge').text(`Question ${state.currentIndex + 1} of ${total}`);
    $('#questionRequiredTag').text(q.required ? 'Required' : 'Optional');

    renderNavigatorGrid();

    let bodyHtml = '';
    const currentVal = state.answers[q.id];

    if (q.type === 'image') {
      bodyHtml += `<div class="photo-prompt-banner"><i class="bi bi-camera me-1"></i> How would you feel about doing this type of work?</div>`;
      bodyHtml += `<h2 class="h4 fw-bold mb-1">${escapeHtml(q.text)}</h2>`;
      if (q.description) {
        bodyHtml += `<p class="text-secondary small mb-3">${escapeHtml(q.description)}</p>`;
      }
      bodyHtml += `<div class="question-photo-frame">${renderResilientImage(
        q.imageUrl,
        q.fallbackSvg,
        q.text
      )}</div>`;

      const photoBtnStyles = {
        Like: { icon: 'bi-hand-thumbs-up-fill', cls: 'opt-like' },
        'Not Sure': { icon: 'bi-question-circle-fill', cls: 'opt-neutral' },
        Unsure: { icon: 'bi-question-circle-fill', cls: 'opt-neutral' },
        Dislike: { icon: 'bi-hand-thumbs-down-fill', cls: 'opt-dislike' }
      };

      bodyHtml += '<div class="like-dislike-grid mt-2">';
      (q.options || []).forEach((opt) => {
        const isSel = String(currentVal) === String(opt.value);
        const st = photoBtnStyles[opt.label] || { icon: 'bi-check-circle', cls: 'opt-neutral' };
        bodyHtml += `
          <button type="button" class="like-dislike-card ${st.cls} answer-single-btn ${isSel ? 'selected' : ''}" data-value="${escapeHtml(opt.value)}">
            <i class="bi ${st.icon} fs-4"></i>
            <span>${escapeHtml(opt.label)}</span>
          </button>
        `;
      });
      bodyHtml += '</div>';
    } else if (q.type === 'interest_scale') {
      bodyHtml += `<h2 class="h4 fw-bold mb-2">${escapeHtml(q.text)}</h2>`;
      if (q.description) {
        bodyHtml += `<p class="text-secondary mb-3">${escapeHtml(q.description)}</p>`;
      }
      const scaleIcons = ['bi-dash-circle', 'bi-circle-half', 'bi-check-circle', 'bi-star-fill'];
      bodyHtml += '<div class="interest-scale-grid mt-4">';
      (q.options || []).forEach((opt, idx) => {
        const isSel = String(currentVal) === String(opt.value);
        bodyHtml += `
          <button type="button" class="interest-scale-card answer-single-btn ${isSel ? 'selected' : ''}" data-value="${escapeHtml(opt.value)}">
            <i class="bi ${scaleIcons[idx] || 'bi-circle'} fs-5 ${isSel ? 'text-teal' : 'text-secondary'}"></i>
            <span>${escapeHtml(opt.label)}</span>
          </button>
        `;
      });
      bodyHtml += '</div>';
    } else if (q.type === 'like_unsure_dislike') {
      bodyHtml += `<h2 class="h4 fw-bold mb-2">${escapeHtml(q.text)}</h2>`;
      bodyHtml += '<div class="like-dislike-grid mt-4">';
      (q.options || []).forEach((opt) => {
        const isSel = String(currentVal) === String(opt.value);
        const cls = opt.label === 'Like' ? 'opt-like' : opt.label === 'Dislike' ? 'opt-dislike' : 'opt-neutral';
        const icon = opt.label === 'Like' ? 'bi-hand-thumbs-up-fill' : opt.label === 'Dislike' ? 'bi-hand-thumbs-down-fill' : 'bi-question-circle-fill';
        bodyHtml += `
          <button type="button" class="like-dislike-card ${cls} answer-single-btn ${isSel ? 'selected' : ''}" data-value="${escapeHtml(opt.value)}">
            <i class="bi ${icon} fs-4"></i>
            <span>${escapeHtml(opt.label)}</span>
          </button>
        `;
      });
      bodyHtml += '</div>';
    } else if (q.type === 'likert') {
      bodyHtml += `<h2 class="h4 fw-bold mb-2">${escapeHtml(q.text)}</h2>`;
      if (q.description) {
        bodyHtml += `<p class="text-secondary mb-3">${escapeHtml(q.description)}</p>`;
      }
      bodyHtml += '<div class="d-grid gap-2 mt-3">';
      (q.options || []).forEach((opt) => {
        const isSel = String(currentVal) === String(opt.value);
        bodyHtml += `
          <button type="button" class="option-choice-btn answer-single-btn ${isSel ? 'selected' : ''}" data-value="${escapeHtml(opt.value)}">
            <span>${escapeHtml(opt.label)}</span>
            <i class="bi ${isSel ? 'bi-check-circle-fill text-teal' : 'bi-circle text-secondary'}"></i>
          </button>
        `;
      });
      bodyHtml += '</div>';
    } else if (q.type === 'single_choice') {
      bodyHtml += `<h2 class="h4 fw-bold mb-2">${escapeHtml(q.text)}</h2>`;
      if (q.description) {
        bodyHtml += `<p class="text-secondary mb-3">${escapeHtml(q.description)}</p>`;
      }
      bodyHtml += '<div class="d-grid gap-2 mt-3">';
      (q.options || []).forEach((opt) => {
        const isSel = currentVal === opt.label;
        bodyHtml += `
          <button type="button" class="option-choice-btn answer-single-btn ${isSel ? 'selected' : ''}" data-value="${escapeHtml(opt.label)}">
            <span>${escapeHtml(opt.label)}</span>
            <i class="bi ${isSel ? 'bi-check-circle-fill text-teal' : 'bi-circle text-secondary'}"></i>
          </button>
        `;
      });
      bodyHtml += '</div>';
    } else if (q.type === 'multiple_choice') {
      bodyHtml += `<h2 class="h4 fw-bold mb-2">${escapeHtml(q.text)}</h2>`;
      if (q.description) {
        bodyHtml += `<p class="text-secondary mb-3">${escapeHtml(q.description)}</p>`;
      }
      const selectedArr = Array.isArray(currentVal) ? currentVal : [];
      bodyHtml += '<div class="d-grid gap-2 mt-3">';
      (q.options || []).forEach((opt, i) => {
        const isSel = selectedArr.includes(opt.label);
        bodyHtml += `
          <label class="option-choice-btn ${isSel ? 'selected' : ''}" for="mcOpt_${i}">
            <span class="d-flex align-items-center gap-2">
              <input class="form-check-input mt-0 answer-multi-check" type="checkbox" id="mcOpt_${i}" value="${escapeHtml(opt.label)}" ${isSel ? 'checked' : ''}>
              <span>${escapeHtml(opt.label)}</span>
            </span>
          </label>
        `;
      });
      bodyHtml += '</div>';
    } else if (q.type === 'ranking') {
      bodyHtml += `<h2 class="h4 fw-bold mb-2">${escapeHtml(q.text)}</h2>`;
      const opts = (q.options || []).map((o) => o.label);
      const currentRank = Array.isArray(currentVal) && currentVal.length === opts.length ? currentVal : [...opts];
      if (!Array.isArray(currentVal)) {
        state.answers[q.id] = currentRank;
      }
      bodyHtml += '<p class="small text-secondary mb-2">Use the arrows to rank items from highest preference (1) to lowest.</p>';
      bodyHtml += '<div class="d-grid gap-2" id="rankingList">';
      currentRank.forEach((lbl, idx) => {
        bodyHtml += `
          <div class="d-flex align-items-center justify-content-between p-2 px-3 border rounded bg-white">
            <div class="d-flex align-items-center gap-3">
              <span class="font-mono-num fw-bold text-secondary">${idx + 1}.</span>
              <span class="fw-medium">${escapeHtml(lbl)}</span>
            </div>
            <div class="d-flex gap-1">
              <button type="button" class="btn btn-outline-slate btn-sm rank-move-btn" data-idx="${idx}" data-dir="-1" ${idx === 0 ? 'disabled' : ''}>
                <i class="bi bi-arrow-up"></i>
              </button>
              <button type="button" class="btn btn-outline-slate btn-sm rank-move-btn" data-idx="${idx}" data-dir="1" ${idx === currentRank.length - 1 ? 'disabled' : ''}>
                <i class="bi bi-arrow-down"></i>
              </button>
            </div>
          </div>
        `;
      });
      bodyHtml += '</div>';
    } else if (q.type === 'text') {
      bodyHtml += `<h2 class="h4 fw-bold mb-2">${escapeHtml(q.text)}</h2>`;
      bodyHtml += `
        <div class="mt-3">
          <textarea class="form-control" id="answerTextInput" rows="4" placeholder="Write your thoughts here...">${escapeHtml(currentVal || '')}</textarea>
        </div>
      `;
    }

    $('#questionStageContent').html(bodyHtml);

    $('#btnPrevQuestion').prop('disabled', state.currentIndex === 0);
    if (state.currentIndex === total - 1) {
      $('#btnNextQuestion').html('Review &amp; Finish <i class="bi bi-check2-all"></i>');
    } else {
      $('#btnNextQuestion').html('Next <i class="bi bi-arrow-right"></i>');
    }
  }

  function renderReviewScreen() {
    state.mode = 'review';
    $('#assessmentIntroSection').addClass('d-none');
    $('#assessmentWorkspace').addClass('d-none');
    $('#assessmentReviewSection').removeClass('d-none');

    const missingRequired = state.questions.filter(
      (q) => q.required && !isAnswered(q, state.answers[q.id])
    );

    if (missingRequired.length > 0) {
      $('#reviewMissingWarning')
        .removeClass('d-none')
        .text(`${missingRequired.length} required question(s) still need an answer. Click "Edit" on any unanswered item to complete it.`);
      $('#btnFinalSubmit').prop('disabled', true);
    } else {
      $('#reviewMissingWarning').addClass('d-none');
      $('#btnFinalSubmit').prop('disabled', false);
    }

    const rowsHtml = state.questions
      .map((q, idx) => {
        const val = state.answers[q.id];
        let displayAns = '<span class="text-danger fw-semibold">Unanswered</span>';
        if (isAnswered(q, val)) {
          if (Array.isArray(val)) {
            displayAns = escapeHtml(val.join(', '));
          } else if (
            q.type === 'like_unsure_dislike' ||
            q.type === 'image' ||
            q.type === 'likert' ||
            q.type === 'interest_scale'
          ) {
            const matched = (q.options || []).find((o) => String(o.value) === String(val));
            displayAns = matched ? escapeHtml(matched.label) : escapeHtml(val);
          } else {
            displayAns = escapeHtml(val);
          }
        }
        return `
          <tr>
            <td class="font-mono-num text-secondary">${idx + 1}</td>
            <td class="fw-medium">${escapeHtml(q.text)}</td>
            <td>${displayAns}</td>
            <td class="text-end">
              <button type="button" class="btn btn-outline-slate btn-sm review-jump-btn" data-index="${idx}">
                Edit
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    $('#reviewAnswersTableBody').html(rowsHtml);
  }

  async function handleFinalSubmit() {
    const confirmed = await confirmModal({
      title: 'Submit Career Assessment',
      message: `Submit "${state.test.title}" now and generate your personalized Career Compass report?`,
      confirmLabel: 'Submit & View Report',
      confirmClass: 'btn-teal'
    });
    if (!confirmed) return;

    const careers = CGAMSStorage.getCareers();
    const scored = CGAMSScoring.scoreSubmission(
      state.questions,
      state.answers,
      state.student,
      careers
    );

    const newSubmission = CGAMSStorage.upsertSubmission({
      studentId: state.student.id,
      testId: state.test.id,
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      answers: state.answers,
      rawScores: scored.raw,
      maxScores: scored.max,
      riasecScores: scored.percentages,
      topCareers: scored.topMatches.map((c) => ({ id: c.id, title: c.title, match: c.match })),
      counsellorNotes: '',
      isDemo: false
    });

    CGAMSStorage.clearDraft(state.student.id, state.test.id);
    window.location.href = 'result.html?submissionId=' + encodeURIComponent(newSubmission.id);
  }

  async function initAssessment() {
    await CGAMSStorage.init();
    const settings = CGAMSStorage.getSettings();
    $('[data-system-name]').text(settings.systemName || 'Career Compass');

    const student = CGAMSStorage.getActiveStudent();
    if (!student) {
      showToast('Please enter your name on the Student Profile page first.', 'warning');
      setTimeout(() => {
        window.location.href = 'student.html';
      }, 900);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const testId = params.get('testId') || 'career-personality';
    const test =
      CGAMSStorage.getTests().find((t) => t.id === testId && t.active) ||
      CGAMSStorage.getTests().find((t) => t.active);

    if (!test) {
      showToast('No active assessment found.', 'danger');
      window.location.href = 'student.html';
      return;
    }

    const questions = CGAMSStorage.getQuestionsByTest(test.id);
    const draft = CGAMSStorage.getDraft(student.id, test.id);

    state.student = student;
    state.test = test;
    state.questions = questions;
    state.answers = (draft && draft.answers) || {};
    state.currentIndex = Math.min(
      Math.max(0, (draft && draft.currentIndex) || 0),
      Math.max(0, questions.length - 1)
    );

    renderIntro();

    $('#btnStartTest').on('click', () => renderActiveQuestion());

    $(document).on('click', '.answer-single-btn', function () {
      const q = state.questions[state.currentIndex];
      const val = $(this).data('value');
      state.answers[q.id] = q.type === 'single_choice' ? String(val) : Number(val);
      persistDraft();
      renderActiveQuestion();
    });

    $(document).on('change', '.answer-multi-check', function () {
      const q = state.questions[state.currentIndex];
      const selected = [];
      $('.answer-multi-check:checked').each(function () {
        selected.push($(this).val());
      });
      state.answers[q.id] = selected;
      persistDraft();
      renderActiveQuestion();
    });

    $(document).on('click', '.rank-move-btn', function () {
      const q = state.questions[state.currentIndex];
      const idx = Number($(this).data('idx'));
      const dir = Number($(this).data('dir'));
      const arr = [...(state.answers[q.id] || [])];
      const swapIdx = idx + dir;
      if (swapIdx >= 0 && swapIdx < arr.length) {
        [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
        state.answers[q.id] = arr;
        persistDraft();
        renderActiveQuestion();
      }
    });

    $(document).on('input', '#answerTextInput', function () {
      const q = state.questions[state.currentIndex];
      state.answers[q.id] = $(this).val();
      persistDraft();
    });

    $('#btnPrevQuestion').on('click', () => {
      if (state.currentIndex > 0) {
        state.currentIndex -= 1;
        persistDraft();
        renderActiveQuestion();
      }
    });

    $('#btnNextQuestion').on('click', () => {
      if (state.currentIndex < state.questions.length - 1) {
        state.currentIndex += 1;
        persistDraft();
        renderActiveQuestion();
      } else {
        renderReviewScreen();
      }
    });

    $('#btnOpenReview').on('click', () => renderReviewScreen());
    $('#btnBackToQuestions').on('click', () => renderActiveQuestion());
    $('#btnSaveDraftManual').on('click', () => {
      persistDraft();
      showToast('Progress saved in your browser.', 'success');
    });

    $(document).on('click', '[data-nav-index]', function () {
      state.currentIndex = Number($(this).data('nav-index'));
      persistDraft();
      renderActiveQuestion();
    });

    $(document).on('click', '.review-jump-btn', function () {
      state.currentIndex = Number($(this).data('index'));
      renderActiveQuestion();
    });

    $('#btnFinalSubmit').on('click', () => handleFinalSubmit());
  }

  $(document).ready(() => {
    if (document.body.dataset.page === 'assessment') {
      initAssessment().catch((err) => {
        console.error(err);
        showToast('Could not start assessment.', 'danger');
      });
    }
  });
})(window, window.jQuery);
