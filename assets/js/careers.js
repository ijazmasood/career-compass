/**
 * careers.js - Career Mapping CRUD Manager
 */
(function (global, $) {
  'use strict';

  const { escapeHtml, showToast, confirmModal } = global.CGAMSUI;

  function renderCareers() {
    const careers = CGAMSStorage.getCareers();

    const cHtml = careers
      .map((c) => {
        const w = c.riasecWeights || {};
        const weightsStr = CGAMSScoring.CODES.filter((code) => Number(w[code] || 0) > 0)
          .map((code) => `${code}:${w[code]}`)
          .join(' ');
        return `
          <tr>
            <td>
              <div class="d-flex align-items-center gap-2">
                <i class="bi ${escapeHtml(c.icon || 'bi-briefcase')} text-teal"></i>
                <div>
                  <div class="fw-semibold text-dark">${escapeHtml(c.title)}</div>
                  <div class="small text-secondary">${escapeHtml((c.requiredInterests || []).join(' · '))}</div>
                </div>
              </div>
            </td>
            <td class="font-mono-num small">${escapeHtml(weightsStr)}</td>
            <td class="small">${escapeHtml((c.suggestedSubjects || []).join(', '))}</td>
            <td class="small text-secondary">${escapeHtml(c.educationPathway || '—')}</td>
            <td class="text-end">
              <div class="d-inline-flex gap-1">
                <button type="button" class="btn btn-outline-slate btn-sm btn-edit-career" data-id="${escapeHtml(c.id)}" title="Edit Career"><i class="bi bi-pencil"></i></button>
                <button type="button" class="btn btn-outline-danger btn-sm btn-del-career" data-id="${escapeHtml(c.id)}" title="Delete Career"><i class="bi bi-trash"></i></button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    $('#adminCareersTableBody').html(
      cHtml || '<tr><td colspan="5" class="text-center py-4 text-secondary">No careers configured.</td></tr>'
    );
  }

  function openCareerModal(careerId) {
    const c = careerId ? CGAMSStorage.getCareers().find((x) => x.id === careerId) : null;
    $('#editCareerId').val(c?.id || '');
    $('#editCareerTitle').val(c?.title || '');
    $('#editCareerIcon').val(c?.icon || 'bi-briefcase');
    $('#editCareerDesc').val(c?.description || '');
    $('#editCareerInterests').val((c?.requiredInterests || []).join(', '));
    $('#editCareerSubjects').val((c?.suggestedSubjects || []).join(', '));
    $('#editCareerSkills').val((c?.skillsNeeded || []).join(', '));
    $('#editCareerPathway').val(c?.educationPathway || '');
    $('#editCareerEnv').val(c?.workEnvironment || '');

    const w = c?.riasecWeights || {};
    CGAMSScoring.CODES.forEach((code) => {
      $(`#editCW_${code}`).val(Number(w[code] || 0));
    });

    new bootstrap.Modal(document.getElementById('adminCareerModal')).show();
  }

  function bindEvents() {
    $('#btnAddCareerAdmin').on('click', () => openCareerModal(null));
    $(document).on('click', '.btn-edit-career', function () {
      openCareerModal($(this).data('id'));
    });

    $(document).on('click', '.btn-del-career', async function () {
      const id = $(this).data('id');
      const ok = await confirmModal({
        title: 'Delete Career Profile',
        message: 'Remove this career from the matching engine?',
        confirmLabel: 'Delete',
        confirmClass: 'btn-danger'
      });
      if (!ok) return;
      CGAMSStorage.deleteCareer(id);
      showToast('Career removed.', 'success');
      renderCareers();
    });

    $('#adminCareerForm').on('submit', function (e) {
      e.preventDefault();
      const id = $('#editCareerId').val() || undefined;
      const riasecWeights = {};
      CGAMSScoring.CODES.forEach((code) => {
        riasecWeights[code] = Number($(`#editCW_${code}`).val()) || 0;
      });
      const splitList = (val) =>
        val
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);

      CGAMSStorage.upsertCareer({
        id,
        title: $('#editCareerTitle').val().trim(),
        icon: $('#editCareerIcon').val().trim() || 'bi-briefcase',
        description: $('#editCareerDesc').val().trim(),
        riasecWeights,
        requiredInterests: splitList($('#editCareerInterests').val()),
        suggestedSubjects: splitList($('#editCareerSubjects').val()),
        skillsNeeded: splitList($('#editCareerSkills').val()),
        educationPathway: $('#editCareerPathway').val().trim(),
        workEnvironment: $('#editCareerEnv').val().trim()
      });

      bootstrap.Modal.getInstance(document.getElementById('adminCareerModal')).hide();
      showToast('Career saved.', 'success');
      renderCareers();
    });
  }

  $(document).ready(() => {
    if (document.body.dataset.page === 'admin') {
      bindEvents();
    }
  });

  global.CGAMSCareers = {
    renderCareers
  };
})(window, window.jQuery);
