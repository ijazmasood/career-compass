/**
 * admin.js - Streamlined 5-View Career Compass Admin Router, Auth, Settings, Export & Reset
 */
(function (global, $) {
  'use strict';

  const { showToast, confirmModal } = global.CGAMSUI;

  const VIEW_TITLES = {
    dashboard: 'Dashboard Overview',
    students: 'Students & Results',
    questions: 'Tests & Questions',
    careers: 'Careers & Matching',
    settings: 'Settings & Demo Storage'
  };

  function switchAdminView(viewName) {
    const target = VIEW_TITLES[viewName] ? viewName : 'dashboard';
    $('.admin-view-section').addClass('d-none');
    $(`#view-${target}`).removeClass('d-none');

    $('.admin-nav-btn').removeClass('active');
    $(`.admin-nav-btn[data-view="${target}"]`).addClass('active');
    $('#adminBreadcrumbTitle').text(VIEW_TITLES[target]);

    $('#adminSidebar').removeClass('open');
    $('#adminSidebarBackdrop').removeClass('show');

    if (target === 'dashboard' && global.CGAMSDashboard) global.CGAMSDashboard.renderDashboard();
    if (target === 'students' && global.CGAMSDashboard) global.CGAMSDashboard.renderStudentsResultsTable();
    if (target === 'questions' && global.CGAMSQuestions) global.CGAMSQuestions.render();
    if (target === 'careers' && global.CGAMSCareers) global.CGAMSCareers.renderCareers();
    if (target === 'settings') loadSettingsForm();
  }

  function loadSettingsForm() {
    const s = CGAMSStorage.getSettings();
    $('#setSystemName').val(s.systemName || 'Career Compass');
    $('#setSubtitle').val(s.subtitle || '');
    $('#setSchoolName').val(s.schoolName || '');
    $('#setCounsellorName').val(s.counsellorName || '');
    $('#setDisclaimer').val(s.defaultDisclaimer || s.disclaimerText || '');
  }

  function initAdminLogin() {
    if (CGAMSStorage.isAdminLoggedIn()) {
      window.location.href = 'admin.html';
      return;
    }

    $('#adminLoginForm').on('submit', function (e) {
      e.preventDefault();
      const user = $('#loginUsername').val();
      const pass = $('#loginPassword').val();
      if (CGAMSStorage.loginAdmin(user, pass)) {
        window.location.href = 'admin.html';
      } else {
        $('#loginErrorAlert').removeClass('d-none');
      }
    });

    $('#btnFillDemoCreds').on('click', () => {
      $('#loginUsername').val('admin');
      $('#loginPassword').val('admin123');
      $('#loginErrorAlert').addClass('d-none');
    });
  }

  async function initAdminConsole() {
    if (!CGAMSStorage.isAdminLoggedIn()) {
      window.location.href = 'admin-login.html';
      return;
    }

    await CGAMSStorage.init();
    const settings = CGAMSStorage.getSettings();
    $('#adminSystemTitle').text(settings.systemName || 'Career Compass');
    $('#adminSchoolLabel').text(settings.schoolName || 'Counsellor Portal');
    $('#adminCounsellorBadge').text(settings.counsellorName || 'Career Counsellor');

    $(document).on('click', '.admin-nav-btn[data-view]', function () {
      switchAdminView($(this).data('view'));
    });

    $('#btnMobileSidebarToggle, #adminSidebarBackdrop').on('click', () => {
      $('#adminSidebar').toggleClass('open');
      $('#adminSidebarBackdrop').toggleClass('show');
    });

    $('#btnAdminLogout').on('click', async () => {
      const ok = await confirmModal({
        title: 'Log Out of Counsellor Console',
        message: 'End your current demo admin session?',
        confirmLabel: 'Logout',
        confirmClass: 'btn-primary-navy'
      });
      if (ok) {
        CGAMSStorage.logoutAdmin();
        window.location.href = 'admin-login.html';
      }
    });

    $('#adminSettingsForm').on('submit', function (e) {
      e.preventDefault();
      const current = CGAMSStorage.getSettings();
      const next = {
        ...current,
        systemName: $('#setSystemName').val().trim() || 'Career Compass',
        subtitle: $('#setSubtitle').val().trim(),
        schoolName: $('#setSchoolName').val().trim(),
        counsellorName: $('#setCounsellorName').val().trim() || 'Career Counsellor',
        defaultDisclaimer: $('#setDisclaimer').val().trim()
      };
      CGAMSStorage.saveSettings(next);
      $('#adminSystemTitle').text(next.systemName);
      $('#adminSchoolLabel').text(next.schoolName || 'Counsellor Portal');
      $('#adminCounsellorBadge').text(next.counsellorName);
      showToast('Settings saved.', 'success');
    });

    $('#btnExportAllJson, #btnTopExportJson').on('click', () => {
      CGAMSStorage.exportAllJSON();
      showToast('Exported complete Career Compass JSON snapshot.', 'success');
    });

    $('#btnExportSubmissionsCsv').on('click', () => {
      CGAMSStorage.exportSubmissionsCSV();
      showToast('Exported student results CSV.', 'success');
    });

    $('#btnResetDemoData').on('click', async () => {
      const ok = await confirmModal({
        title: 'Reset All Demo Data',
        message:
          'This will erase locally added students, submissions, custom questions, and edits in this browser, and restore the clean 3-test Career Compass demo dataset. Continue?',
        confirmLabel: 'Reset Demo Data',
        confirmClass: 'btn-danger'
      });
      if (!ok) return;
      await CGAMSStorage.resetDemoData();
      showToast('Demo data restored to original seed state.', 'success');
      switchAdminView('dashboard');
    });

    const hashView = window.location.hash ? window.location.hash.replace('#', '') : 'dashboard';
    switchAdminView(VIEW_TITLES[hashView] ? hashView : 'dashboard');
  }

  global.CGAMSAdmin = {
    switchAdminView
  };

  $(document).ready(() => {
    const page = document.body.dataset.page;
    if (page === 'admin-login') {
      initAdminLogin();
    } else if (page === 'admin') {
      initAdminConsole().catch((err) => {
        console.error(err);
        showToast('Error loading counsellor dashboard.', 'danger');
      });
    }
  });
})(window, window.jQuery);
