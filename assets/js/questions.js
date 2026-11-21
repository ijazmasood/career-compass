/**
 * questions.js - Manage the 3 Career Compass Tests & Full Question Bank CRUD
 */
(function (global, $) {
  'use strict';

  const { escapeHtml, showToast, confirmModal } = global.CGAMSUI;

  let selectedTestId = 'career-personality';

  function render() {
    const tests = CGAMSStorage.getTests();
    if (!tests.some((t) => t.id === selectedTestId) && tests.length > 0) {
      selectedTestId = tests[0].id;
    }

    const testListHtml = tests
      .map((t) => {
        const isActive = t.id === selectedTestId;
        const count = CGAMSStorage.getQuestionsByTest(t.id).length;
        return `
          <div class="p-3 border rounded mb-2 ${isActive ? 'border-primary bg-white shadow-sm' : 'bg-white'}">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div class="flex-grow-1 select-test-item" data-test-id="${escapeHtml(t.id)}" style="cursor:pointer;">
                <div class="fw-bold small text-dark">${escapeHtml(t.title)}</div>
                <div class="meta-inline mt-1">
                  <span>${escapeHtml(t.category)}</span>
                  <span class="sep">·</span>
                  <span class="font-mono-num">${count} items</span>
                  <span class="sep">·</span>
                  <span class="font-mono-num">${t.estimatedMinutes} min</span>
                  <span class="sep">·</span>
                  <span class="${t.active ? 'text-success' : 'text-secondary'} fw-semibold">${t.active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <div class="d-flex gap-1">
                <button type="button" class="btn btn-outline-slate btn-sm btn-toggle-test" data-test-id="${escapeHtml(t.id)}" title="Activate/Deactivate">
                  <i class="bi ${t.active ? 'bi-pause-circle' : 'bi-play-circle'}"></i>
                </button>
                <button type="button" class="btn btn-outline-slate btn-sm btn-edit-test" data-test-id="${escapeHtml(t.id)}" title="Edit Test">
                  <i class="bi bi-pencil"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    $('#adminTestsList').html(testListHtml);
    renderQuestionsForSelectedTest();
  }

  function renderQuestionsForSelectedTest() {
    const test = CGAMSStorage.getTests().find((t) => t.id === selectedTestId);
    const questions = CGAMSStorage.getQuestionsByTest(selectedTestId);
    $('#qBankSelectedTestTitle').text(test ? test.title : 'Select a Test');
    $('#qBankCountBadge').text(`${questions.length} Question(s)`);

    const qHtml = questions
      .map((q, idx) => {
        const w = q.categoryWeights || {};
        const weightSummary = CGAMSScoring.CODES.filter((c) => Number(w[c] || 0) > 0)
          .map((c) => `${c}:${w[c]}`)
          .join(' ');
        return `
          <tr>
            <td class="font-mono-num text-secondary">${q.order || idx + 1}</td>
            <td>
              <div class="fw-semibold text-dark">${escapeHtml(q.text)}</div>
              <div class="meta-inline mt-1">
                <span>${escapeHtml(q.type)}</span>
                <span class="sep">·</span>
                <span>${q.required ? 'Required' : 'Optional'}</span>
              </div>
            </td>
            <td class="font-mono-num small">${escapeHtml(weightSummary || 'Option-based')}</td>
            <td class="text-end">
              <div class="d-inline-flex gap-1">
                <button type="button" class="btn btn-outline-slate btn-sm btn-move-q" data-q-id="${escapeHtml(q.id)}" data-dir="-1" title="Move Up" ${idx === 0 ? 'disabled' : ''}>
                  <i class="bi bi-arrow-up"></i>
                </button>
                <button type="button" class="btn btn-outline-slate btn-sm btn-move-q" data-q-id="${escapeHtml(q.id)}" data-dir="1" title="Move Down" ${idx === questions.length - 1 ? 'disabled' : ''}>
                  <i class="bi bi-arrow-down"></i>
                </button>
                <button type="button" class="btn btn-outline-slate btn-sm btn-dup-q" data-q-id="${escapeHtml(q.id)}" title="Duplicate">
                  <i class="bi bi-copy"></i>
                </button>
                <button type="button" class="btn btn-outline-slate btn-sm btn-edit-q" data-q-id="${escapeHtml(q.id)}" title="Edit">
                  <i class="bi bi-pencil"></i>
                </button>
                <button type="button" class="btn btn-outline-danger btn-sm btn-del-q" data-q-id="${escapeHtml(q.id)}" title="Delete">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    $('#adminQuestionsTableBody').html(
      qHtml || '<tr><td colspan="4" class="text-center py-4 text-secondary">No questions in this test yet. Click "Add Question".</td></tr>'
    );
  }

  function openTestModal(testId) {
    const t = testId ? CGAMSStorage.getTests().find((x) => x.id === testId) : null;
    if (!t) return;
    $('#editTestId').val(t.id);
    $('#editTestTitle').val(t.title || '');
    $('#editTestShortTitle').val(t.shortTitle || '');
    $('#editTestCategory').val(t.category || '');
    $('#editTestDuration').val(t.estimatedMinutes || 10);
    $('#editTestDescription').val(t.description || '');
    $('#editTestInstructions').val(t.instructions || '');
    $('#editTestActive').prop('checked', Boolean(t.active));
    new bootstrap.Modal(document.getElementById('adminTestModal')).show();
  }

  function renderOptionEditorRows(options) {
    const list =
      options && options.length
        ? options
        : [
            { label: 'Not interested', value: 0 },
            { label: 'Slightly interested', value: 1 },
            { label: 'Interested', value: 2 },
            { label: 'Very interested', value: 3 }
          ];
    const html = list
      .map(
        (opt) => `
      <div class="row g-2 align-items-center mb-2 q-opt-row">
        <div class="col-7">
          <input type="text" class="form-control form-control-sm q-opt-label" value="${escapeHtml(opt.label)}" placeholder="Option label" required>
        </div>
        <div class="col-3">
          <input type="number" class="form-control form-control-sm q-opt-value" value="${Number(opt.value ?? 1)}" placeholder="Score">
        </div>
        <div class="col-2 text-end">
          <button type="button" class="btn btn-outline-danger btn-sm btn-remove-opt-row"><i class="bi bi-x"></i></button>
        </div>
      </div>
    `
      )
      .join('');
    $('#qOptionsContainer').html(html);
  }

  function toggleQuestionTypeFields(type) {
    $('#qImageConfigBox').toggleClass('d-none', type !== 'image');
    $('#qOptionsWrapper').toggleClass('d-none', type === 'text');
  }

  function openQuestionModal(qId) {
    const q = qId ? CGAMSStorage.getQuestions().find((x) => x.id === qId) : null;
    const siblingCount = CGAMSStorage.getQuestionsByTest(selectedTestId).length;
    const defaultType = selectedTestId === 'photo-career-quiz' ? 'image' : 'likert';

    $('#editQId').val(q?.id || '');
    $('#editQTestId').val(q?.testId || selectedTestId);
    $('#editQText').val(q?.text || '');
    $('#editQDescription').val(q?.description || '');
    $('#editQType').val(q?.type || defaultType);
    $('#editQOrder').val(q?.order || siblingCount + 1);
    $('#editQImageUrl').val(q?.imageUrl || '');
    $('#editQFallbackSvg').val(q?.fallbackSvg || 'assets/images/careers/business.svg');
    $('#editQRequired').prop('checked', q ? Boolean(q.required) : true);

    const w = q?.categoryWeights || { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    CGAMSScoring.CODES.forEach((c) => {
      $(`#editQW_${c}`).val(Number(w[c] || 0));
    });

    toggleQuestionTypeFields($('#editQType').val());
    renderOptionEditorRows(q?.options);
    new bootstrap.Modal(document.getElementById('adminQuestionModal')).show();
  }

  function bindEvents() {
    $(document).on('click', '.select-test-item', function () {
      selectedTestId = $(this).data('test-id');
      render();
    });

    $(document).on('click', '.btn-edit-test', function () {
      openTestModal($(this).data('test-id'));
    });

    $(document).on('click', '.btn-toggle-test', function () {
      const id = $(this).data('test-id');
      const test = CGAMSStorage.getTests().find((t) => t.id === id);
      if (!test) return;
      CGAMSStorage.upsertTest({ ...test, active: !test.active });
      showToast(`Test "${test.shortTitle || test.title}" ${!test.active ? 'activated' : 'deactivated'}.`, 'info');
      render();
    });

    $('#adminTestForm').on('submit', function (e) {
      e.preventDefault();
      const id = $('#editTestId').val();
      const existing = CGAMSStorage.getTests().find((t) => t.id === id);
      if (!existing) return;
      CGAMSStorage.upsertTest({
        ...existing,
        title: $('#editTestTitle').val().trim(),
        shortTitle: $('#editTestShortTitle').val().trim(),
        category: $('#editTestCategory').val().trim(),
        estimatedMinutes: Number($('#editTestDuration').val()) || 10,
        description: $('#editTestDescription').val().trim(),
        instructions: $('#editTestInstructions').val().trim(),
        active: $('#editTestActive').is(':checked')
      });
      bootstrap.Modal.getInstance(document.getElementById('adminTestModal')).hide();
      showToast('Assessment settings updated.', 'success');
      render();
    });

    $('#btnAddQuestionAdmin').on('click', () => openQuestionModal(null));

    $('#editQType').on('change', function () {
      const type = $(this).val();
      toggleQuestionTypeFields(type);
      if (type === 'likert') {
        renderOptionEditorRows([
          { label: 'Strongly Disagree', value: 1 },
          { label: 'Disagree', value: 2 },
          { label: 'Neutral', value: 3 },
          { label: 'Agree', value: 4 },
          { label: 'Strongly Agree', value: 5 }
        ]);
      } else if (type === 'interest_scale') {
        renderOptionEditorRows([
          { label: 'Not interested', value: 0 },
          { label: 'Slightly interested', value: 1 },
          { label: 'Interested', value: 2 },
          { label: 'Very interested', value: 3 }
        ]);
      } else if (type === 'image') {
        renderOptionEditorRows([
          { label: 'Like', value: 2 },
          { label: 'Not Sure', value: 1 },
          { label: 'Dislike', value: 0 }
        ]);
      }
    });

    $('#btnAddOptionRow').on('click', () => {
      $('#qOptionsContainer').append(`
        <div class="row g-2 align-items-center mb-2 q-opt-row">
          <div class="col-7">
            <input type="text" class="form-control form-control-sm q-opt-label" placeholder="Option label" required>
          </div>
          <div class="col-3">
            <input type="number" class="form-control form-control-sm q-opt-value" value="1" placeholder="Score">
          </div>
          <div class="col-2 text-end">
            <button type="button" class="btn btn-outline-danger btn-sm btn-remove-opt-row"><i class="bi bi-x"></i></button>
          </div>
        </div>
      `);
    });

    $(document).on('click', '.btn-remove-opt-row', function () {
      $(this).closest('.q-opt-row').remove();
    });

    $(document).on('click', '.btn-edit-q', function () {
      openQuestionModal($(this).data('q-id'));
    });

    $(document).on('click', '.btn-dup-q', function () {
      CGAMSStorage.duplicateQuestion($(this).data('q-id'));
      showToast('Question duplicated.', 'success');
      render();
    });

    $(document).on('click', '.btn-del-q', async function () {
      const id = $(this).data('q-id');
      const ok = await confirmModal({
        title: 'Delete Question',
        message: 'Remove this question from the assessment?',
        confirmLabel: 'Delete',
        confirmClass: 'btn-danger'
      });
      if (!ok) return;
      CGAMSStorage.deleteQuestion(id);
      showToast('Question removed.', 'success');
      render();
    });

    $(document).on('click', '.btn-move-q', function () {
      const qId = $(this).data('q-id');
      const dir = Number($(this).data('dir'));
      const list = CGAMSStorage.getQuestionsByTest(selectedTestId);
      const idx = list.findIndex((q) => q.id === qId);
      const swapIdx = idx + dir;
      if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return;

      const qA = list[idx];
      const qB = list[swapIdx];
      const orderA = qA.order || idx + 1;
      const orderB = qB.order || swapIdx + 1;
      CGAMSStorage.upsertQuestion({ ...qA, order: orderB });
      CGAMSStorage.upsertQuestion({ ...qB, order: orderA });
      renderQuestionsForSelectedTest();
    });

    $('#adminQuestionForm').on('submit', function (e) {
      e.preventDefault();
      const id = $('#editQId').val() || undefined;
      const testId = $('#editQTestId').val() || selectedTestId;
      const type = $('#editQType').val();
      const existing = id ? CGAMSStorage.getQuestions().find((x) => x.id === id) : {};

      const options = [];
      if (type !== 'text') {
        $('.q-opt-row').each(function (i) {
          const lbl = $(this).find('.q-opt-label').val().trim();
          const val = Number($(this).find('.q-opt-value').val());
          if (lbl) {
            const oldOpt = existing?.options && existing.options[i];
            options.push({
              ...(oldOpt || {}),
              label: lbl,
              value: Number.isNaN(val) ? 1 : val
            });
          }
        });
      }

      const categoryWeights = {};
      CGAMSScoring.CODES.forEach((c) => {
        categoryWeights[c] = Number($(`#editQW_${c}`).val()) || 0;
      });

      CGAMSStorage.upsertQuestion({
        ...existing,
        id,
        testId,
        text: $('#editQText').val().trim(),
        description: $('#editQDescription').val().trim(),
        type,
        order: Number($('#editQOrder').val()) || 1,
        imageUrl: type === 'image' ? $('#editQImageUrl').val().trim() : '',
        fallbackSvg: type === 'image' ? $('#editQFallbackSvg').val() : '',
        required: $('#editQRequired').is(':checked'),
        options,
        categoryWeights
      });

      bootstrap.Modal.getInstance(document.getElementById('adminQuestionModal')).hide();
      showToast('Question saved.', 'success');
      render();
    });
  }

  $(document).ready(() => {
    if (document.body.dataset.page === 'admin') {
      bindEvents();
    }
  });

  global.CGAMSQuestions = {
    render
  };
})(window, window.jQuery);
