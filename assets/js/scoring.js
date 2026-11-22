/**
 * CGAMSScoring - Weighted Interest Scoring, Career Matching & Profile Narrative Engine
 */
(function (global) {
  'use strict';

  const DIMENSIONS = {
    R: {
      code: 'R',
      name: 'Practical / Realistic',
      short: 'Practical',
      color: '#0F2547',
      description: 'Hands-on building, technical work, tools, outdoor environments, and practical problem-solving.',
      strength: 'You enjoy turning ideas into tangible results using tools, technology, or hands-on action.',
      explore: 'Try building small practical prototypes, lab projects, or field activities to test hands-on fields.'
    },
    I: {
      code: 'I',
      name: 'Analytical / Investigative',
      short: 'Analytical',
      color: '#0D9488',
      description: 'Science, research, technology, logic puzzles, data analysis, and understanding how things work.',
      strength: 'You bring strong curiosity, logical reasoning, and persistence when solving complex questions.',
      explore: 'Explore STEM research clubs, data puzzles, or science experiments to stretch your analytical curiosity.'
    },
    A: {
      code: 'A',
      name: 'Creative / Artistic',
      short: 'Creative',
      color: '#7C3AED',
      description: 'Visual design, writing, media, original ideas, aesthetics, and open-ended creative expression.',
      strength: 'You notice visual detail, generate original ideas, and communicate effectively through creative media.',
      explore: 'Build a small creative portfolio such as sketches, design mockups, writing samples, or media projects.'
    },
    S: {
      code: 'S',
      name: 'Social / Helping',
      short: 'Social',
      color: '#2563EB',
      description: 'Teaching, healthcare, mentoring, counselling, teamwork, and making a positive human impact.',
      strength: 'You connect naturally with people, listen empathetically, and feel energized when helping others succeed.',
      explore: 'Look for peer tutoring, volunteering, or community leadership opportunities to build people-focused skills.'
    },
    E: {
      code: 'E',
      name: 'Leadership / Enterprising',
      short: 'Leadership',
      color: '#D97706',
      description: 'Leading projects, entrepreneurship, business strategy, persuasion, and motivating teams.',
      strength: 'You take initiative confidently, organize teams toward goals, and enjoy pitching or debating ideas.',
      explore: 'Practice organizing school events, joining debate clubs, or leading small student venture projects.'
    },
    C: {
      code: 'C',
      name: 'Organizational / Conventional',
      short: 'Organizational',
      color: '#475569',
      description: 'Structured planning, numbers, finance, records, clear systems, and dependable accuracy.',
      strength: 'You bring reliability, precision with numbers and details, and clear structure to group projects.',
      explore: 'Explore budgeting tools, structured project timelines, or data organization tasks.'
    }
  };

  const CODES = ['R', 'I', 'A', 'S', 'E', 'C'];

  function computeRiasecBreakdown(questions, answers) {
    const raw = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    const max = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    const collectedSubjects = new Set();

    (questions || []).forEach((q) => {
      if (q.type === 'text') return;

      const ans = answers ? answers[q.id] : undefined;
      const baseWeights = q.categoryWeights || {};

      if (q.type === 'photo_pair' || q.type === 'single_choice') {
        const hasOptionWeights = (q.options || []).some((o) => o.weights);
        if (hasOptionWeights) {
          const perDimMax = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
          (q.options || []).forEach((o) => {
            const val = Number(o.value || 1);
            CODES.forEach((c) => {
              const w = Number((o.weights && o.weights[c]) || 0);
              perDimMax[c] = Math.max(perDimMax[c], val * w);
            });
          });
          CODES.forEach((c) => {
            max[c] += perDimMax[c];
          });
          if (ans !== undefined && ans !== null && ans !== '') {
            const chosen = (q.options || []).find(
              (o) =>
                (o.id !== undefined && String(o.id) === String(ans)) ||
                o.label === ans ||
                (q.type !== 'photo_pair' && String(o.value) === String(ans))
            );
            if (chosen) {
              const val = Number(chosen.value || 1);
              CODES.forEach((c) => {
                const w = Number((chosen.weights && chosen.weights[c]) || 0);
                raw[c] += val * w;
              });
              (chosen.subjects || []).forEach((s) => collectedSubjects.add(s));
            }
          }
          return;
        }
      }

      if (q.type === 'multiple_choice') {
        const selectedArr = Array.isArray(ans) ? ans : [];
        const perDimMax = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
        const perDimRaw = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

        (q.options || []).forEach((o) => {
          const val = Number(o.value || 1);
          const weights = o.weights || baseWeights;
          CODES.forEach((c) => {
            const contrib = val * Number(weights[c] || 0);
            perDimMax[c] = Math.max(perDimMax[c], contrib);
            if (selectedArr.includes(o.label)) {
              perDimRaw[c] += contrib;
            }
          });
          if (selectedArr.includes(o.label)) {
            (o.subjects || []).forEach((s) => collectedSubjects.add(s));
          }
        });

        CODES.forEach((c) => {
          max[c] += perDimMax[c];
          raw[c] += Math.min(perDimMax[c], perDimRaw[c]);
        });
        return;
      }

      if (q.type === 'ranking') {
        const opts = q.options || [];
        const n = opts.length;
        const rankedLabels = Array.isArray(ans) ? ans : [];
        opts.forEach((o) => {
          const weights = o.weights || baseWeights;
          CODES.forEach((c) => {
            max[c] += n * Number(weights[c] || 0);
          });
        });
        rankedLabels.forEach((lbl, idx) => {
          const chosen = opts.find((o) => o.label === lbl);
          if (chosen) {
            const rankScore = Math.max(1, n - idx);
            const weights = chosen.weights || baseWeights;
            CODES.forEach((c) => {
              raw[c] += rankScore * Number(weights[c] || 0);
            });
          }
        });
        return;
      }

      // Standard weighted items: interest_scale (0-3), image (0-2), likert (1-5), or simple single_choice
      const maxVal = (q.options || []).reduce((m, o) => Math.max(m, Number(o.value || 0)), 0) || 3;
      CODES.forEach((c) => {
        const w = Number(baseWeights[c] || 0);
        max[c] += maxVal * w;
      });

      if (ans !== undefined && ans !== null && ans !== '') {
        let numericVal = Number(ans);
        if (Number.isNaN(numericVal)) {
          const found = (q.options || []).find((o) => o.label === ans);
          numericVal = found ? Number(found.value || 0) : 0;
        }
        CODES.forEach((c) => {
          const w = Number(baseWeights[c] || 0);
          raw[c] += numericVal * w;
        });
      }
    });

    const percentages = {};
    CODES.forEach((c) => {
      percentages[c] = max[c] > 0 ? Math.min(100, Math.round((raw[c] / max[c]) * 100)) : 0;
    });

    return {
      raw,
      max,
      percentages,
      collectedSubjects: Array.from(collectedSubjects)
    };
  }

  function rankDimensions(percentages) {
    const ranked = CODES.map((c) => ({
      code: c,
      ...DIMENSIONS[c],
      score: Number((percentages && percentages[c]) || 0)
    })).sort((a, b) => b.score - a.score);

    return {
      ranked,
      topThree: ranked.slice(0, 3),
      lowerInterest: ranked.slice(-2).reverse()
    };
  }

  function matchCareers(percentages, student, extraSubjects, careers) {
    const studentSubjects = new Set([
      ...((student && student.favoriteSubjects) || []).map((s) => s.toLowerCase()),
      ...((extraSubjects || []).map((s) => s.toLowerCase()))
    ]);

    const scoredCareers = (careers || []).map((career) => {
      const cw = career.riasecWeights || {};
      let dot = 0;
      let weightSum = 0;
      const alignedDims = [];

      CODES.forEach((c) => {
        const w = Number(cw[c] || 0);
        if (w > 0) {
          dot += (Number(percentages[c] || 0) / 100) * w;
          weightSum += w;
          if ((percentages[c] || 0) >= 50) {
            alignedDims.push({ code: c, name: DIMENSIONS[c].short, score: percentages[c], weight: w });
          }
        }
      });

      const riasecRatio = weightSum > 0 ? dot / weightSum : 0.4;
      const riasecComponent = Math.min(100, Math.round(riasecRatio * 105));

      const careerSubjects = (career.suggestedSubjects || []).map((s) => s.toLowerCase());
      const matchedSubjects = [];
      careerSubjects.forEach((cs, idx) => {
        const originalLabel = (career.suggestedSubjects || [])[idx];
        for (const ss of studentSubjects) {
          if (cs.includes(ss) || ss.includes(cs)) {
            matchedSubjects.push(originalLabel);
            break;
          }
        }
      });

      let finalScore = riasecComponent;
      if (studentSubjects.size > 0 && careerSubjects.length > 0) {
        const subjectRatio = Math.min(1, matchedSubjects.length / Math.min(2, careerSubjects.length));
        const subjectComponent = Math.round(subjectRatio * 100);
        finalScore = Math.round(riasecComponent * 0.78 + subjectComponent * 0.22);
      }

      if (student && student.careerIdeas) {
        const ideas = student.careerIdeas.toLowerCase();
        const titleWords = career.title.toLowerCase().split(/[\s/]+/);
        if (titleWords.some((w) => w.length > 3 && ideas.includes(w))) {
          finalScore = Math.min(98, finalScore + 4);
        }
      }

      finalScore = Math.max(25, Math.min(98, finalScore));

      const reasons = [];
      if (alignedDims.length > 0) {
        alignedDims.sort((a, b) => b.score - a.score);
        const dimSummary = alignedDims
          .slice(0, 2)
          .map((d) => `${d.name} (${d.score}%)`)
          .join(' and ');
        reasons.push(`Strong match with your ${dimSummary} scores.`);
      } else {
        reasons.push(`Connects with ${(career.requiredInterests || []).join(', ')} career interests.`);
      }

      if (matchedSubjects.length > 0) {
        reasons.push(`Matches your preferred subject areas: ${matchedSubjects.join(', ')}.`);
      }

      if (career.workEnvironment) {
        reasons.push(`Fits environments like ${career.workEnvironment.toLowerCase()}.`);
      }

      return {
        ...career,
        match: finalScore,
        reasons,
        matchedSubjects
      };
    });

    scoredCareers.sort((a, b) => b.match - a.match);

    return {
      topMatches: scoredCareers.slice(0, 5),
      alternatives: scoredCareers.slice(5, 10)
    };
  }

  function buildProfileSummary(student, topThree, topMatches) {
    const first = topThree[0];
    const second = topThree[1];
    const third = topThree[2];
    const topCareerNames = (topMatches || [])
      .slice(0, 3)
      .map((c) => c.title)
      .join(', ');

    const name = (student && student.fullName) ? student.fullName.split(' ')[0] : 'Your';
    const prefix = (student && student.fullName) ? `${name}'s profile highlights` : 'Your responses highlight';

    return `${prefix} a strong combination of ${first.short} (${first.score}%), ${second.short} (${second.score}%), and ${third.short} (${third.score}%) interests. You tend to thrive in environments that value ${first.description.charAt(0).toLowerCase() + first.description.slice(1).replace(/\.$/, '')}, paired with ${second.short.toLowerCase()} curiosity. Top career paths aligned with this blend include ${topCareerNames}.`;
  }

  function buildStrengthsList(topThree, student, collectedSubjects) {
    const list = topThree.map((d) => ({
      label: `${d.short} (${d.score}%)`,
      text: d.strength
    }));

    const subjList = Array.from(
      new Set([
        ...((student && student.favoriteSubjects) || []),
        ...(collectedSubjects || [])
      ])
    ).slice(0, 4);

    if (subjList.length > 0) {
      list.push({
        label: 'Academic Curiosity',
        text: `Enjoying subjects like ${subjList.join(', ')} gives you a helpful foundation for related degree programs and technical skills.`
      });
    }

    return list.slice(0, 4);
  }

  function scoreSubmission(questions, answers, student, careers) {
    const breakdown = computeRiasecBreakdown(questions, answers);
    const ranking = rankDimensions(breakdown.percentages);
    const careerResults = matchCareers(
      breakdown.percentages,
      student,
      breakdown.collectedSubjects,
      careers
    );

    return {
      raw: breakdown.raw,
      max: breakdown.max,
      percentages: breakdown.percentages,
      collectedSubjects: breakdown.collectedSubjects,
      ranked: ranking.ranked,
      topThree: ranking.topThree,
      lowerInterest: ranking.lowerInterest,
      topMatches: careerResults.topMatches,
      alternatives: careerResults.alternatives,
      summaryText: buildProfileSummary(student, ranking.topThree, careerResults.topMatches),
      strengths: buildStrengthsList(ranking.topThree, student, breakdown.collectedSubjects)
    };
  }

  function computeCombinedProfile(student, submissions, careers) {
    const completed = (submissions || []).filter((s) => s.status === 'completed' && s.riasecScores);
    if (completed.length === 0) return null;

    const avg = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    completed.forEach((sub) => {
      CODES.forEach((c) => {
        avg[c] += Number(sub.riasecScores[c] || 0);
      });
    });
    CODES.forEach((c) => {
      avg[c] = Math.round(avg[c] / completed.length);
    });

    const ranking = rankDimensions(avg);
    const careerResults = matchCareers(avg, student, [], careers);

    return {
      testCount: completed.length,
      submissions: completed,
      percentages: avg,
      ranked: ranking.ranked,
      topThree: ranking.topThree,
      lowerInterest: ranking.lowerInterest,
      topMatches: careerResults.topMatches,
      alternatives: careerResults.alternatives,
      summaryText: buildProfileSummary(student, ranking.topThree, careerResults.topMatches),
      strengths: buildStrengthsList(ranking.topThree, student, [])
    };
  }

  function summarizePhotoChoices(questions, answers) {
    const pairQuestions = (questions || []).filter((q) => q.type === 'photo_pair');
    if (pairQuestions.length === 0) return null;

    const chosenScenes = [];
    const winCounts = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    const totalShown = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

    function topDimOf(weights) {
      let best = 'R';
      let bestVal = -1;
      CODES.forEach((c) => {
        const v = Number((weights && weights[c]) || 0);
        if (v > bestVal) {
          bestVal = v;
          best = c;
        }
      });
      return best;
    }

    pairQuestions.forEach((q) => {
      const opts = q.options || [];
      opts.forEach((o) => {
        const d = topDimOf(o.weights);
        totalShown[d] += 1;
      });
      const ans = answers ? answers[q.id] : undefined;
      if (ans === undefined || ans === null || ans === '') return;
      const chosen = opts.find((o) => String(o.id) === String(ans) || o.label === ans);
      const other = opts.find((o) => o !== chosen) || null;
      if (chosen) {
        const primaryCode = topDimOf(chosen.weights);
        winCounts[primaryCode] += 1;
        chosenScenes.push({
          questionId: q.id,
          order: q.order,
          optionId: chosen.id || 'A',
          label: chosen.label,
          imageUrl: chosen.imageUrl,
          fallbackSvg: chosen.fallbackSvg,
          primaryCode,
          primaryName: DIMENSIONS[primaryCode].short,
          primaryColor: DIMENSIONS[primaryCode].color,
          overLabel: other ? other.label : ''
        });
      }
    });

    return {
      totalPairs: pairQuestions.length,
      answeredPairs: chosenScenes.length,
      winCounts,
      totalShown,
      chosenScenes
    };
  }

  global.CGAMSScoring = {
    DIMENSIONS,
    CODES,
    computeRiasecBreakdown,
    rankDimensions,
    matchCareers,
    buildProfileSummary,
    buildStrengthsList,
    scoreSubmission,
    computeCombinedProfile,
    summarizePhotoChoices
  };
})(window);
