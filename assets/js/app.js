/**
 * CGAMSUI - Shared UI Helpers, Toasts, Confirmation Modals, and Career Compass Homepage Controller
 */
(function (global, $) {
  'use strict';

  function escapeHtml(str) {
    return String(str === null || str === undefined ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function showToast(message, variant = 'success') {
    let container = document.getElementById('cgamsToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'cgamsToastContainer';
      container.className = 'cgams-toast-container';
      document.body.appendChild(container);
    }

    const iconMap = {
      success: 'bi-check-circle-fill text-success',
      warning: 'bi-exclamation-triangle-fill text-warning',
      danger: 'bi-x-circle-fill text-danger',
      info: 'bi-info-circle-fill text-primary'
    };

    const toastEl = document.createElement('div');
    toastEl.className = 'toast align-items-center bg-white border shadow-sm mb-2 show';
    toastEl.setAttribute('role', 'status');
    toastEl.innerHTML =
      '<div class="d-flex align-items-center p-2 px-3 gap-2">' +
      `<i class="bi ${iconMap[variant] || iconMap.info}"></i>` +
      `<div class="toast-body p-0 flex-grow-1 small fw-medium text-dark">${escapeHtml(message)}</div>` +
      '<button type="button" class="btn-close btn-sm ms-2" aria-label="Close"></button>' +
      '</div>';

    toastEl.querySelector('.btn-close').addEventListener('click', () => toastEl.remove());
    container.appendChild(toastEl);

    setTimeout(() => {
      if (toastEl.parentNode) toastEl.remove();
    }, 3600);
  }

  function confirmModal({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmLabel = 'Confirm',
    confirmClass = 'btn-primary-navy'
  }) {
    return new Promise((resolve) => {
      let modalEl = document.getElementById('cgamsConfirmModal');
      if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'cgamsConfirmModal';
        modalEl.className = 'modal fade';
        modalEl.tabIndex = -1;
        modalEl.innerHTML =
          '<div class="modal-dialog modal-dialog-centered">' +
          '  <div class="modal-content border-0 shadow">' +
          '    <div class="modal-header border-bottom">' +
          '      <h5 class="modal-title fw-bold" id="cgamsConfirmTitle"></h5>' +
          '      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>' +
          '    </div>' +
          '    <div class="modal-body text-secondary" id="cgamsConfirmBody"></div>' +
          '    <div class="modal-footer border-top">' +
          '      <button type="button" class="btn btn-outline-slate" data-bs-dismiss="modal" id="cgamsConfirmCancel">Cancel</button>' +
          '      <button type="button" class="btn" id="cgamsConfirmAccept"></button>' +
          '    </div>' +
          '  </div>' +
          '</div>';
        document.body.appendChild(modalEl);
      }

      document.getElementById('cgamsConfirmTitle').textContent = title;
      document.getElementById('cgamsConfirmBody').textContent = message;
      const acceptBtn = document.getElementById('cgamsConfirmAccept');
      acceptBtn.className = 'btn ' + confirmClass;
      acceptBtn.textContent = confirmLabel;

      const bsModal = new bootstrap.Modal(modalEl);
      let settled = false;

      const cleanup = () => {
        acceptBtn.onclick = null;
        modalEl.removeEventListener('hidden.bs.modal', onHidden);
      };

      const onHidden = () => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(false);
        }
      };

      acceptBtn.onclick = () => {
        settled = true;
        cleanup();
        bsModal.hide();
        resolve(true);
      };

      modalEl.addEventListener('hidden.bs.modal', onHidden);
      bsModal.show();
    });
  }

  function renderResilientImage(imageUrl, fallbackSvg, altText, extraClass = '') {
    const safeSrc = escapeHtml(imageUrl || fallbackSvg || 'assets/images/careers/business.svg');
    const safeFallback = escapeHtml(fallbackSvg || 'assets/images/careers/business.svg');
    const safeAlt = escapeHtml(altText || 'Career scenario');
    return `<img src="${safeSrc}" alt="${safeAlt}" class="${escapeHtml(extraClass)}" referrerpolicy="no-referrer" loading="lazy" onerror="if(this.dataset.fallbackApplied!=='1'){this.dataset.fallbackApplied='1';this.src='${safeFallback}';}">`;
  }

  async function initHomePage() {
    await CGAMSStorage.init();
    const settings = CGAMSStorage.getSettings();
    const tests = CGAMSStorage.getTests().filter((t) => t.active).slice(0, 3);
    const activeStudent = CGAMSStorage.getActiveStudent();
    const studentSubs = activeStudent ? CGAMSStorage.getSubmissionsByStudent(activeStudent.id) : [];

    $('[data-system-name]').text(settings.systemName || 'Career Compass');
    $('[data-school-name]').text(settings.schoolName || 'Student Career Counselling Portal');

    if (activeStudent) {
      $('#homeActiveStudentBanner').removeClass('d-none');
      $('#homeActiveStudentName').text(
        activeStudent.fullName + (activeStudent.grade ? ` (${activeStudent.grade})` : '')
      );
      const completedCount = studentSubs.filter((s) => s.status === 'completed').length;
      if (completedCount >= 2) {
        $('#homeCombinedProfileBtn')
          .removeClass('d-none')
          .attr('href', 'result.html?mode=combined&studentId=' + encodeURIComponent(activeStudent.id));
      }
    }

    const $grid = $('#homeTestCatalogGrid');
    if ($grid.length) {
      const fallbackImages = [
        'assets/images/test-personality.svg',
        'assets/images/test-photo.svg',
        'assets/images/test-discovery.svg'
      ];
      const html = tests
        .map((t, index) => {
          const idxLabel = String(index + 1).padStart(2, '0');
          const imgPath = t.cardImage || fallbackImages[index] || 'assets/images/test-personality.svg';
          return `
            <div class="col-md-6 col-lg-4">
              <div class="cgams-card test-catalog-card">
                <div class="test-card-visual">
                  <img src="${escapeHtml(imgPath)}" alt="${escapeHtml(t.title)} illustration" />
                </div>
                <div class="test-card-body">
                  <div class="step-index">${idxLabel}. ${escapeHtml(t.category)}</div>
                  <h3 class="h5 fw-bold mb-2">${escapeHtml(t.title)}</h3>
                  <p class="text-secondary small mb-3">${escapeHtml(t.description)}</p>
                  <div class="meta-inline mb-3">
                    <span><i class="bi bi-list-check me-1"></i><span class="tabular-nums">${t.questionCount}</span> questions</span>
                    <span class="sep">·</span>
                    <span><i class="bi bi-clock me-1"></i><span class="tabular-nums">~${t.estimatedMinutes}</span> min</span>
                  </div>
                  <div class="card-footer-actions">
                    <a href="student.html?preselect=${encodeURIComponent(t.id)}" class="btn btn-teal btn-sm w-100">
                      Start Quiz <i class="bi bi-arrow-right"></i>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          `;
        })
        .join('');
      $grid.html(html);
    }
  }

  global.CGAMSUI = {
    escapeHtml,
    formatDate,
    showToast,
    confirmModal,
    renderResilientImage,
    initHomePage
  };

  $(document).ready(() => {
    if (document.body.dataset.page === 'home') {
      initHomePage().catch((err) => {
        console.error(err);
        showToast('Could not initialize demo data. Please refresh.', 'danger');
      });
    }
  });
})(window, window.jQuery);
