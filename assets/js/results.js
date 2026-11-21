/**
 * results.js - Graphical Individual & Combined Career Compass Result Report Renderer
 */
(function (global, $) {
  'use strict';

  const { escapeHtml, formatDate, showToast } = global.CGAMSUI;

  let charts = [];

  function destroyCharts() {
    charts.forEach((c) => c.destroy());
    charts = [];
  }

  function renderCharts(ranked, topMatches) {
    destroyCharts();
    const labels = ranked.map((d) => d.short);
    const values = ranked.map((d) => d.score);
    const colors = ranked.map((d) => d.color);

    // 1. Horizontal Bar Chart (Interest Breakdown)
    const barCtx = document.getElementById('riasecBarChart');
    if (barCtx) {
      charts.push(
        new Chart(barCtx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Interest Score (%)',
                data: values,
                backgroundColor: colors,
                borderRadius: 6
              }
            ]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } }
            }
          }
        })
      );
    }

    // 2. Radar Chart (Holistic Interest Shape)
    const radarCtx = document.getElementById('riasecRadarChart');
    if (radarCtx) {
      charts.push(
        new Chart(radarCtx, {
          type: 'radar',
          data: {
            labels,
            datasets: [
              {
                label: 'Your Profile (%)',
                data: values,
                backgroundColor: 'rgba(13, 148, 136, 0.18)',
                borderColor: '#0D9488',
                pointBackgroundColor: colors,
                pointBorderColor: '#ffffff',
                pointRadius: 5,
                borderWidth: 2
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              r: {
                beginAtZero: true,
                max: 100,
                ticks: { stepSize: 25, backdropColor: 'transparent' }
              }
            }
          }
        })
      );
    }

    // 3. Top 5 Career Match Horizontal Bar Chart
    const careerCtx = document.getElementById('careerMatchChart');
    if (careerCtx) {
      charts.push(
        new Chart(careerCtx, {
          type: 'bar',
          data: {
            labels: topMatches.map((c) => c.title),
            datasets: [
              {
                label: 'Match %',
                data: topMatches.map((c) => c.match),
                backgroundColor: ['#0F2547', '#0D9488', '#2563EB', '#7C3AED', '#475569'],
                borderRadius: 5
              }
            ]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } }
            }
          }
        })
      );
    }
  }

  function renderReport({
    title,
    subtitle,
    student,
    dateText,
    testNameText,
    summaryText,
    ranked,
    topThree,
    lowerInterest,
    strengths,
    topMatches,
    alternatives,
    counsellorNote,
    retakeUrl,
    combinedProfileUrl,
    settings
  }) {
    $('#reportTitle').text(title);
    $('#reportSubtitle').text(subtitle);
    $('#repSchoolName').text(student.school || settings.schoolName || 'Career Compass Guidance Portal');
    $('#repStudentName').text(student.fullName || 'Student');
    $('#repStudentId').text(student.rollNo || '—');
    $('#repStudentClass').text(
      `${student.grade || ''} ${student.section ? '(' + student.section + ')' : ''}`.trim() || '—'
    );
    $('#repTestName').text(testNameText);
    $('#repDateCompleted').text(dateText);
    $('#repProfileSummaryText').text(summaryText);
    $('#reportDisclaimerText').text(settings.defaultDisclaimer || settings.disclaimerText || '');

    if (counsellorNote) {
      $('#counsellorNoteSection').removeClass('d-none');
      $('#repCounsellorNote').text(counsellorNote);
    } else {
      $('#counsellorNoteSection').addClass('d-none');
    }

    if (retakeUrl) {
      $('#btnRetakeTest').removeClass('d-none').attr('href', retakeUrl);
    } else {
      $('#btnRetakeTest').addClass('d-none');
    }

    if (combinedProfileUrl) {
      $('#btnSwitchCombined').removeClass('d-none').attr('href', combinedProfileUrl);
    } else {
      $('#btnSwitchCombined').addClass('d-none');
    }

    // 6-dimension indicator strip + Top 3 highlights
    const dimStripHtml = ranked
      .map((d, idx) => {
        const isTop = idx < 3;
        return `
          <div class="col-6 col-md-4 col-lg-2">
            <div class="cgams-card p-3 h-100 ${isTop ? 'border-primary' : ''}">
              <div class="small text-secondary mb-1">${isTop ? 'Top #' + (idx + 1) : 'Interest'}</div>
              <div class="fw-bold small text-dark mb-1">${escapeHtml(d.short)}</div>
              <div class="font-mono-num fw-bold fs-4 mb-2" style="color: ${d.color};">${d.score}%</div>
              <div class="progress" style="height: 6px;">
                <div class="progress-bar" style="width: ${d.score}%; background-color: ${d.color};"></div>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
    $('#allSixInterestsStrip').html(dimStripHtml);

    // Top 3 Interests detail cards
    const top3Html = topThree
      .map(
        (d, idx) => `
        <div class="col-md-4">
          <div class="cgams-card p-3 h-100">
            <div class="small fw-semibold text-secondary mb-1">${idx === 0 ? 'Primary Interest' : idx === 1 ? 'Second Interest' : 'Third Interest'}</div>
            <div class="d-flex justify-content-between align-items-baseline mb-2">
              <h3 class="h5 fw-bold mb-0">${escapeHtml(d.name)}</h3>
              <span class="font-mono-num fw-bold fs-5" style="color: ${d.color};">${d.score}%</span>
            </div>
            <p class="small text-secondary mb-0">${escapeHtml(d.description)}</p>
          </div>
        </div>
      `
      )
      .join('');
    $('#topThreeInterestsGrid').html(top3Html);

    // Top 5 Recommended Career Cards
    const careersHtml = topMatches
      .map(
        (c, idx) => `
        <div class="cgams-card p-4 mb-3">
          <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-2">
            <div class="d-flex align-items-start gap-3">
              <div class="career-icon-box">
                <i class="bi ${escapeHtml(c.icon || 'bi-briefcase')}"></i>
              </div>
              <div>
                <div class="small font-mono-num text-secondary mb-1">#${idx + 1} Career Match · ${escapeHtml((c.requiredInterests || []).join(' · '))}</div>
                <h3 class="h5 fw-bold mb-0">${escapeHtml(c.title)}</h3>
              </div>
            </div>
            <div class="text-end">
              <div class="font-mono-num fw-bold fs-4" style="color: var(--cc-teal);">${c.match}%</div>
              <div class="small text-secondary">Compatibility</div>
            </div>
          </div>
          <div class="career-match-bar mb-3">
            <div class="career-match-fill" style="width: ${c.match}%;"></div>
          </div>
          <p class="small text-secondary mb-3">${escapeHtml(c.description)}</p>
          <div class="row g-3 small">
            <div class="col-md-6">
              <div class="fw-semibold text-dark mb-1">Why It Fits You</div>
              <ul class="ps-3 mb-2 text-secondary">
                ${(c.reasons || []).map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
              </ul>
              <div class="fw-semibold text-dark mb-1">Suggested Subjects</div>
              <div class="text-secondary">${escapeHtml((c.suggestedSubjects || []).join(' · '))}</div>
            </div>
            <div class="col-md-6">
              <div class="fw-semibold text-dark mb-1">Skills to Develop</div>
              <div class="text-secondary mb-2">${escapeHtml((c.skillsNeeded || []).join(' · '))}</div>
              <div class="fw-semibold text-dark mb-1">Education Pathway</div>
              <div class="text-secondary mb-2">${escapeHtml(c.educationPathway)}</div>
              <div class="fw-semibold text-dark mb-1">Work Environment</div>
              <div class="text-secondary">${escapeHtml(c.workEnvironment)}</div>
            </div>
          </div>
        </div>
      `
      )
      .join('');
    $('#recommendedCareersList').html(careersHtml);

    // Alternative careers (Ranks 6-10)
    const altHtml = alternatives
      .map(
        (c) => `
        <div class="d-flex justify-content-between align-items-center py-2 border-bottom small">
          <div class="d-flex align-items-center gap-2">
            <i class="bi ${escapeHtml(c.icon || 'bi-briefcase')} text-secondary"></i>
            <span class="fw-semibold text-dark">${escapeHtml(c.title)}</span>
            <span class="text-secondary d-none d-sm-inline">· ${escapeHtml((c.requiredInterests || []).join(', '))}</span>
          </div>
          <span class="font-mono-num fw-semibold">${c.match}%</span>
        </div>
      `
      )
      .join('');
    $('#alternativeCareersList').html(altHtml);

    // Key Strengths (3-4 personalized bullets)
    const strengthsHtml = (strengths || [])
      .map((s) => `<li class="mb-2"><strong>${escapeHtml(s.label)}:</strong> ${escapeHtml(s.text)}</li>`)
      .join('');
    $('#strengthsList').html(strengthsHtml);

    // Career Areas to Explore
    const devHtml = lowerInterest
      .map((d) => `<li class="mb-2"><strong>${escapeHtml(d.short)} (${d.score}%):</strong> ${escapeHtml(d.explore)}</li>`)
      .join('');
    $('#developmentAreasList').html(devHtml);

    renderCharts(ranked, topMatches);
  }

  async function initResultsPage() {
    await CGAMSStorage.init();
    const settings = CGAMSStorage.getSettings();
    $('[data-system-name]').text(settings.systemName || 'Career Compass');

    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const submissionId = params.get('submissionId');
    const studentId = params.get('studentId') || CGAMSStorage.getActiveStudentId();

    const careers = CGAMSStorage.getCareers();

    if (mode === 'combined') {
      const student = CGAMSStorage.getStudentById(studentId);
      if (!student) {
        showToast('Student profile not found.', 'warning');
        window.location.href = 'student.html';
        return;
      }
      const subs = CGAMSStorage.getSubmissionsByStudent(student.id);
      const combined = CGAMSScoring.computeCombinedProfile(student, subs, careers);
      if (!combined) {
        showToast('Complete at least one quiz to generate a combined profile.', 'warning');
        window.location.href = 'student.html';
        return;
      }

      const tests = CGAMSStorage.getTests();
      const testNames = combined.submissions
        .map((s) => (tests.find((t) => t.id === s.testId) || {}).shortTitle || s.testId)
        .join(' + ');

      const noteSub = combined.submissions.find((s) => s.counsellorNotes || s.counsellorRecommendation);

      renderReport({
        title: 'Combined Multi-Assessment Career Profile',
        subtitle: `Synthesized across ${combined.testCount} completed quizzes`,
        student,
        dateText: formatDate(combined.submissions[0].completedAt),
        testNameText: testNames,
        summaryText: combined.summaryText,
        ranked: combined.ranked,
        topThree: combined.topThree,
        lowerInterest: combined.lowerInterest,
        strengths: combined.strengths,
        topMatches: combined.topMatches,
        alternatives: combined.alternatives,
        counsellorNote: noteSub ? noteSub.counsellorNotes || noteSub.counsellorRecommendation : '',
        retakeUrl: 'student.html',
        combinedProfileUrl: null,
        settings
      });
    } else {
      const allSubs = CGAMSStorage.getSubmissions();
      const sub = submissionId
        ? CGAMSStorage.getSubmissionById(submissionId)
        : allSubs.find((s) => s.studentId === studentId && s.status === 'completed') || allSubs[0];

      if (!sub) {
        showToast('No quiz submission found yet.', 'warning');
        window.location.href = 'student.html';
        return;
      }

      const student = CGAMSStorage.getStudentById(sub.studentId) || { fullName: 'Student' };
      const test = CGAMSStorage.getTests().find((t) => t.id === sub.testId) || { title: sub.testId };
      const questions = CGAMSStorage.getQuestionsByTest(sub.testId);

      const breakdown = sub.riasecScores
        ? { percentages: sub.riasecScores, collectedSubjects: [] }
        : CGAMSScoring.computeRiasecBreakdown(questions, sub.answers);
      const ranking = CGAMSScoring.rankDimensions(breakdown.percentages);
      const matched = CGAMSScoring.matchCareers(
        breakdown.percentages,
        student,
        breakdown.collectedSubjects,
        careers
      );

      const completedForStudent = CGAMSStorage.getSubmissionsByStudent(student.id).filter(
        (s) => s.status === 'completed'
      );
      const combinedUrl =
        completedForStudent.length >= 2
          ? `result.html?mode=combined&studentId=${encodeURIComponent(student.id)}`
          : null;

      renderReport({
        title: 'Your Career Compass Report',
        subtitle: sub.isDemo ? 'Sample Exploratory Career Report' : 'Personalized Exploratory Career Profile',
        student,
        dateText: formatDate(sub.completedAt || sub.startedAt),
        testNameText: test.title,
        summaryText: CGAMSScoring.buildProfileSummary(student, ranking.topThree, matched.topMatches),
        ranked: ranking.ranked,
        topThree: ranking.topThree,
        lowerInterest: ranking.lowerInterest,
        strengths: CGAMSScoring.buildStrengthsList(ranking.topThree, student, breakdown.collectedSubjects),
        topMatches: matched.topMatches,
        alternatives: matched.alternatives,
        counsellorNote: sub.counsellorNotes || sub.counsellorRecommendation || '',
        retakeUrl: `assessment.html?testId=${encodeURIComponent(sub.testId)}`,
        combinedProfileUrl: combinedUrl,
        settings
      });
    }

    $('#btnPrintReport').on('click', () => window.print());
    $('#btnDownloadPdfReport').on('click', () => {
      showToast('Select "Save as PDF" in the print dialog to export a clean PDF copy.', 'info');
      setTimeout(() => window.print(), 250);
    });
  }

  $(document).ready(() => {
    if (document.body.dataset.page === 'result') {
      initResultsPage().catch((err) => {
        console.error(err);
        showToast('Failed to generate result report.', 'danger');
      });
    }
  });
})(window, window.jQuery);
