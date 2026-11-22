/**
 * dashboard.js - 4-KPI / 4-Chart Dashboard & Unified Students & Results Manager
 */
(function (global, $) {
  'use strict';

  const { escapeHtml, formatDate, showToast, confirmModal } = global.CGAMSUI;

  let dashCharts = [];
  let currentDateRange = 'all';
  let subSort = { col: 'date', dir: 'desc' };
  let subPage = 1;
  const PAGE_SIZE = 10;

  function destroyDashCharts() {
    dashCharts.forEach((c) => c.destroy());
    dashCharts = [];
  }

  function filterByDateRange(submissions, range) {
    if (range === 'all') return submissions;
    const now = new Date();
    const cutoff = new Date(now);
    if (range === 'today') {
      cutoff.setHours(0, 0, 0, 0);
    } else if (range === 'week') {
      cutoff.setDate(cutoff.getDate() - 7);
    } else if (range === 'month') {
      cutoff.setDate(cutoff.getDate() - 30);
    }
    return submissions.filter((sub) => {
      const dt = new Date(sub.completedAt || sub.startedAt);
      return !Number.isNaN(dt.getTime()) && dt >= cutoff;
    });
  }

  function renderDashboard() {
    const allSubs = CGAMSStorage.getSubmissions();
    const filteredSubs = filterByDateRange(allSubs, currentDateRange);
    const students = CGAMSStorage.getStudents();
    const tests = CGAMSStorage.getTests();
    const completed = filteredSubs.filter((s) => s.status === 'completed');

    // Most Popular Test
    const testCounts = {};
    filteredSubs.forEach((s) => {
      testCounts[s.testId] = (testCounts[s.testId] || 0) + 1;
    });
    const topTestEntry = Object.entries(testCounts).sort((a, b) => b[1] - a[1])[0];
    const topTestObj = topTestEntry ? tests.find((t) => t.id === topTestEntry[0]) : null;

    // Most Recommended Career
    const careerCounts = {};
    completed.forEach((s) => {
      const top = s.topCareers && s.topCareers[0];
      if (top) careerCounts[top.title] = (careerCounts[top.title] || 0) + 1;
    });
    const topCareerEntry = Object.entries(careerCounts).sort((a, b) => b[1] - a[1])[0];

    $('#kpiTotalTests').text(filteredSubs.length);
    $('#kpiTotalStudents').text(students.length);
    $('#kpiPopularTest').text(topTestObj ? topTestObj.shortTitle || topTestObj.title : '—');
    $('#kpiPopularCareer').text(topCareerEntry ? topCareerEntry[0] : '—');

    renderDashboardCharts(filteredSubs, tests);
  }

  function renderDashboardCharts(subs, tests) {
    destroyDashCharts();

    // 1. Assessments Taken by Test Type (Doughnut)
    const testCounts = {};
    tests.forEach((t) => {
      testCounts[t.shortTitle || t.title] = 0;
    });
    subs.forEach((s) => {
      const t = tests.find((x) => x.id === s.testId);
      const label = t ? t.shortTitle || t.title : s.testId;
      testCounts[label] = (testCounts[label] || 0) + 1;
    });
    const distCtx = document.getElementById('dashTestDistChart');
    if (distCtx) {
      dashCharts.push(
        new Chart(distCtx, {
          type: 'doughnut',
          data: {
            labels: Object.keys(testCounts),
            datasets: [
              {
                data: Object.values(testCounts),
                backgroundColor: ['#0F2547', '#0D9488', '#2563EB'],
                borderWidth: 2,
                borderColor: '#ffffff'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
            }
          }
        })
      );
    }

    // 2. Top Recommended Careers (Horizontal Bar)
    const careerCounts = {};
    subs.forEach((s) => {
      const top = s.topCareers && s.topCareers[0];
      if (top) careerCounts[top.title] = (careerCounts[top.title] || 0) + 1;
    });
    const topCareers = Object.entries(careerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const careerCtx = document.getElementById('dashTopCareersChart');
    if (careerCtx) {
      dashCharts.push(
        new Chart(careerCtx, {
          type: 'bar',
          data: {
            labels: topCareers.map((x) => x[0]),
            datasets: [
              {
                label: 'Students Matched',
                data: topCareers.map((x) => x[1]),
                backgroundColor: '#0F2547',
                borderRadius: 5
              }
            ]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
          }
        })
      );
    }

    // 3. Interest Category Distribution (Mean RIASEC Bar)
    const avg = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    const scored = subs.filter((s) => s.riasecScores);
    scored.forEach((s) => {
      CGAMSScoring.CODES.forEach((c) => {
        avg[c] += Number(s.riasecScores[c] || 0);
      });
    });
    if (scored.length > 0) {
      CGAMSScoring.CODES.forEach((c) => {
        avg[c] = Math.round(avg[c] / scored.length);
      });
    }
    const riasecCtx = document.getElementById('dashRiasecChart');
    if (riasecCtx) {
      dashCharts.push(
        new Chart(riasecCtx, {
          type: 'bar',
          data: {
            labels: CGAMSScoring.CODES.map((c) => CGAMSScoring.DIMENSIONS[c].short),
            datasets: [
              {
                label: 'Average %',
                data: CGAMSScoring.CODES.map((c) => avg[c]),
                backgroundColor: CGAMSScoring.CODES.map((c) => CGAMSScoring.DIMENSIONS[c].color),
                borderRadius: 5
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100 } }
          }
        })
      );
    }

    // 4. Activity Over Time (Line Chart)
    const dayCounts = {};
    subs.forEach((s) => {
      const day = (s.completedAt || s.startedAt || '').slice(0, 10);
      if (day) dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const sortedDays = Object.keys(dayCounts).sort();
    const overTimeCtx = document.getElementById('dashOverTimeChart');
    if (overTimeCtx) {
      dashCharts.push(
        new Chart(overTimeCtx, {
          type: 'line',
          data: {
            labels: sortedDays.map((d) => d.slice(5)),
            datasets: [
              {
                label: 'Assessments',
                data: sortedDays.map((d) => dayCounts[d]),
                borderColor: '#0D9488',
                backgroundColor: 'rgba(13, 148, 136, 0.14)',
                fill: true,
                tension: 0.28
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
          }
        })
      );
    }
  }

  // Unified Students & Results Management
  function populateResultFilters() {
    const students = CGAMSStorage.getStudents();
    const tests = CGAMSStorage.getTests();
    const grades = [...new Set(students.map((s) => s.grade).filter(Boolean))].sort();

    const $cf = $('#subFilterClass');
    const prevC = $cf.val();
    $cf.html(
      '<option value="">All Classes</option>' +
        grades.map((g) => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('')
    );
    $cf.val(prevC);

    const $tf = $('#subFilterTest');
    const prevT = $tf.val();
    $tf.html(
      '<option value="">All Tests</option>' +
        tests.map((t) => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.shortTitle || t.title)}</option>`).join('')
    );
    $tf.val(prevT);
  }

  function getFilteredSubmissions() {
    const search = ($('#subSearchInput').val() || '').toLowerCase();
    const cls = $('#subFilterClass').val() || '';
    const testId = $('#subFilterTest').val() || '';

    const students = CGAMSStorage.getStudents();
    const tests = CGAMSStorage.getTests();
    let list = CGAMSStorage.getSubmissions();

    list = list.map((sub) => {
      const stu = students.find((s) => s.id === sub.studentId) || {};
      const test = tests.find((t) => t.id === sub.testId) || {};
      const top = (sub.topCareers && sub.topCareers[0]) || {};
      return {
        ...sub,
        studentName: stu.fullName || 'Unknown Student',
        rollNo: stu.rollNo || '—',
        grade: stu.grade || '—',
        testName: test.shortTitle || test.title || sub.testId,
        topCareerTitle: top.title || '—',
        topCareerMatch: top.match || 0,
        sortDate: sub.completedAt || sub.startedAt || ''
      };
    });

    list = list.filter((row) => {
      const mSearch =
        !search ||
        row.studentName.toLowerCase().includes(search) ||
        row.rollNo.toLowerCase().includes(search) ||
        row.topCareerTitle.toLowerCase().includes(search);
      const mClass = !cls || row.grade === cls;
      const mTest = !testId || row.testId === testId;
      return mSearch && mClass && mTest;
    });

    list.sort((a, b) => {
      let va = a[subSort.col];
      let vb = b[subSort.col];
      if (subSort.col === 'date') {
        va = a.sortDate;
        vb = b.sortDate;
      }
      if (va < vb) return subSort.dir === 'asc' ? -1 : 1;
      if (va > vb) return subSort.dir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }

  function renderStudentsResultsTable() {
    populateResultFilters();
    const rows = getFilteredSubmissions();
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (subPage > totalPages) subPage = totalPages;

    const slice = rows.slice((subPage - 1) * PAGE_SIZE, subPage * PAGE_SIZE);

    const html = slice
      .map((row) => {
        return `
          <tr>
            <td>
              <div class="fw-semibold text-dark">${escapeHtml(row.studentName)}</div>
              <div class="small text-secondary">${row.isDemo ? 'Sample Record' : 'Live Submission'}</div>
            </td>
            <td class="font-mono-num">${escapeHtml(row.rollNo)}</td>
            <td>${escapeHtml(row.grade)}</td>
            <td>${escapeHtml(row.testName)}</td>
            <td class="font-mono-num">${formatDate(row.sortDate)}</td>
            <td>
              <div class="fw-medium">${escapeHtml(row.topCareerTitle)}</div>
              <div class="small font-mono-num text-secondary">${row.topCareerMatch ? row.topCareerMatch + '% match' : ''}</div>
            </td>
            <td class="text-end">
              <div class="d-inline-flex gap-1">
                <button type="button" class="btn btn-outline-slate btn-sm btn-view-sub" data-sub-id="${escapeHtml(row.id)}" title="View Result & Notes">
                  <i class="bi bi-eye"></i>
                </button>
                <a href="result.html?submissionId=${encodeURIComponent(row.id)}" target="_blank" class="btn btn-outline-slate btn-sm" title="Open Printable Report">
                  <i class="bi bi-printer"></i>
                </a>
                <button type="button" class="btn btn-outline-danger btn-sm btn-delete-sub" data-sub-id="${escapeHtml(row.id)}" title="Delete Submission">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    $('#submissionsTableBody').html(
      html || '<tr><td colspan="7" class="text-center py-4 text-secondary">No student results match your filters.</td></tr>'
    );

    $('#subPaginationInfo').text(
      `Showing ${slice.length} of ${rows.length} results · Page ${subPage} of ${totalPages}`
    );

    let pagHtml = '';
    for (let p = 1; p <= totalPages; p++) {
      pagHtml += `<button type="button" class="btn btn-sm ${p === subPage ? 'btn-primary-navy' : 'btn-outline-slate'} sub-page-btn" data-page="${p}">${p}</button>`;
    }
    $('#subPaginationControls').html(pagHtml);
  }

  function openSubmissionDetailModal(subId) {
    const sub = CGAMSStorage.getSubmissionById(subId);
    if (!sub) return;
    const stu = CGAMSStorage.getStudentById(sub.studentId) || {};
    const test = CGAMSStorage.getTests().find((t) => t.id === sub.testId) || {};
    const questions = CGAMSStorage.getQuestionsByTest(sub.testId);
    const studentCompleted = CGAMSStorage.getSubmissionsByStudent(sub.studentId).filter(
      (s) => s.status === 'completed'
    );

    $('#detailSubId').val(sub.id);
    $('#detailStuName').text(stu.fullName || 'Student');
    const stuMeta = [];
    if (stu.rollNo) stuMeta.push('ID: ' + stu.rollNo);
    if (stu.grade) stuMeta.push(stu.grade);
    if (stu.school) stuMeta.push(stu.school);
    if (stu.email) stuMeta.push(stu.email);
    $('#detailStuMeta').text(stuMeta.join(' · ') || 'No additional profile info');

    $('#detailTestMeta').text(`${test.title || sub.testId} · ${formatDate(sub.completedAt || sub.startedAt)}`);
    $('#detailCounsellorNotes').val(sub.counsellorNotes || sub.counsellorRecommendation || '');
    $('#detailPrintLink').attr('href', `result.html?submissionId=${encodeURIComponent(sub.id)}`);
    $('#detailDeleteBtn').data('sub-id', sub.id);

    if (studentCompleted.length >= 2 && stu.id) {
      $('#detailCombinedLink')
        .removeClass('d-none')
        .attr('href', `result.html?mode=combined&studentId=${encodeURIComponent(stu.id)}`);
    } else {
      $('#detailCombinedLink').addClass('d-none');
    }

    const scores = sub.riasecScores || {};
    const scoreBars = CGAMSScoring.CODES.map((c) => {
      const val = Number(scores[c] || 0);
      return `
        <div class="col-6 col-md-4">
          <div class="p-2 border rounded bg-light">
            <div class="d-flex justify-content-between small fw-semibold mb-1">
              <span>${CGAMSScoring.DIMENSIONS[c].short}</span>
              <span class="font-mono-num">${val}%</span>
            </div>
            <div class="progress" style="height: 6px;">
              <div class="progress-bar" style="width:${val}%; background:${CGAMSScoring.DIMENSIONS[c].color};"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    $('#detailRiasecGrid').html(scoreBars);

    const careersHtml = (sub.topCareers || [])
      .map(
        (c, idx) =>
          `<li class="mb-1"><strong>#${idx + 1} ${escapeHtml(c.title)}</strong> <span class="font-mono-num text-secondary">(${c.match}%)</span></li>`
      )
      .join('');
    $('#detailTopCareers').html(careersHtml || '<li>No career recommendations calculated yet.</li>');

    const answers = sub.answers || {};
    const ansEntries = Object.entries(answers);
    const ansHtml = ansEntries.length
      ? ansEntries
          .map(([qId, val]) => {
            const q = questions.find((item) => item.id === qId);
            let qText = q ? q.text : qId;
            let displayVal = Array.isArray(val) ? val.join(', ') : val;
            if (q && q.type === 'photo_pair' && q.options) {
              const optA = q.options[0] || {};
              const optB = q.options[1] || {};
              qText = `Pair ${q.order || ''}: ${optA.label || 'Photo A'} vs ${optB.label || 'Photo B'}`;
              const matched = q.options.find((o, i) => String(o.id || (i === 0 ? 'A' : 'B')) === String(val));
              if (matched) {
                displayVal = `Photo ${matched.id || val}: ${matched.label || ''}`;
              }
            } else if (q && !Array.isArray(val) && q.options) {
              const matched = q.options.find((o) => String(o.value) === String(val));
              if (matched) displayVal = matched.label;
            }
            return `<tr><td class="small">${escapeHtml(qText)}</td><td class="small fw-semibold">${escapeHtml(displayVal)}</td></tr>`;
          })
          .join('')
      : '<tr><td colspan="2" class="small text-secondary">Sample demo summary record.</td></tr>';
    $('#detailAnswersBody').html(ansHtml);

    new bootstrap.Modal(document.getElementById('submissionDetailModal')).show();
  }

  function bindDashboardEvents() {
    $(document).on('click', '.dash-range-btn', function () {
      $('.dash-range-btn').removeClass('active');
      $(this).addClass('active');
      currentDateRange = $(this).data('range');
      renderDashboard();
    });

    $('#subSearchInput, #subFilterClass, #subFilterTest').on('input change', () => {
      subPage = 1;
      renderStudentsResultsTable();
    });

    $(document).on('click', '.sub-sort-th', function () {
      const col = $(this).data('sort');
      if (subSort.col === col) {
        subSort.dir = subSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        subSort.col = col;
        subSort.dir = 'asc';
      }
      renderStudentsResultsTable();
    });

    $(document).on('click', '.sub-page-btn', function () {
      subPage = Number($(this).data('page'));
      renderStudentsResultsTable();
    });

    $(document).on('click', '.btn-view-sub', function () {
      openSubmissionDetailModal($(this).data('sub-id'));
    });

    $('#btnSaveCounsellorNotes').on('click', () => {
      const subId = $('#detailSubId').val();
      const sub = CGAMSStorage.getSubmissionById(subId);
      if (!sub) return;
      sub.counsellorNotes = $('#detailCounsellorNotes').val().trim();
      CGAMSStorage.upsertSubmission(sub);
      showToast('Counsellor notes saved to student report.', 'success');
      renderStudentsResultsTable();
    });

    async function deleteSubWithConfirm(subId) {
      const ok = await confirmModal({
        title: 'Delete Submission',
        message: 'Permanently delete this student assessment result from browser demo storage?',
        confirmLabel: 'Delete',
        confirmClass: 'btn-danger'
      });
      if (!ok) return false;
      CGAMSStorage.deleteSubmission(subId);
      showToast('Submission deleted.', 'success');
      renderStudentsResultsTable();
      renderDashboard();
      return true;
    }

    $(document).on('click', '.btn-delete-sub', async function () {
      await deleteSubWithConfirm($(this).data('sub-id'));
    });

    $('#detailDeleteBtn').on('click', async function () {
      const subId = $(this).data('sub-id');
      const deleted = await deleteSubWithConfirm(subId);
      if (deleted) {
        bootstrap.Modal.getInstance(document.getElementById('submissionDetailModal')).hide();
      }
    });

    $('#btnExportFilteredCsv').on('click', () => {
      const rows = getFilteredSubmissions();
      CGAMSStorage.exportSubmissionsCSV(rows);
      showToast(`Exported ${rows.length} student result(s) to CSV.`, 'success');
    });
  }

  $(document).ready(() => {
    if (document.body.dataset.page === 'admin') {
      bindDashboardEvents();
    }
  });

  global.CGAMSDashboard = {
    renderDashboard,
    renderStudentsResultsTable
  };
})(window, window.jQuery);
