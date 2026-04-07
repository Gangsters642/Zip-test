const express = require('express');
const router = express.Router();
const { readJSON } = require('../utils/jsonHelpers');

function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j-1] === b[i-1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i-1][j] + 1, matrix[i][j-1] + 1, matrix[i-1][j-1] + cost);
    }
  }
  return matrix[b.length][a.length];
}

function similarity(str1, str2) {
  const s1 = str1.toLowerCase(), s2 = str2.toLowerCase();
  const distance = levenshtein(s1, s2);
  return 1 - distance / Math.max(s1.length, s2.length);
}

router.get('/', (req, res) => {
  const query = req.query.q || '';
  if (!query.trim()) return res.json({ results: [], suggestions: [], didYouMean: null });

  const apps = readJSON('data/apps.json').filter(a => a.status === 'approved');
  const queryLower = query.toLowerCase();
  const results = [];
  const suggestionCandidates = new Set();

  for (const app of apps) {
    let score = similarity(app.name, query) * 3;
    score += similarity(app.description, query) * 1;
    let tagScore = 0;
    for (const tag of app.tags) tagScore = Math.max(tagScore, similarity(tag, query));
    score += tagScore * 2;
    if (score > 0.2) {
      results.push({ ...app, score });
      if (similarity(app.name, query) < 0.8) {
        suggestionCandidates.add(app.name);
        app.tags.forEach(t => suggestionCandidates.add(t));
      }
    }
  }
  results.sort((a,b) => b.score - a.score);

  let didYouMean = null;
  if (results.length === 0 && suggestionCandidates.size > 0) {
    let best = '', bestScore = 0;
    for (const cand of suggestionCandidates) {
      const s = similarity(cand, query);
      if (s > bestScore && s > 0.4) { bestScore = s; best = cand; }
    }
    if (best) didYouMean = best;
  } else if (results.length > 0 && results[0].score < 0.6) {
    for (const cand of suggestionCandidates) {
      if (similarity(cand, query) > 0.6 && cand !== results[0].name) {
        didYouMean = cand; break;
      }
    }
  }

  const suggestions = [...new Set(apps.flatMap(a => [a.name, ...a.tags]))]
    .filter(term => term.toLowerCase().includes(queryLower) || similarity(term, query) > 0.4)
    .slice(0, 5);

  res.json({ results: results.slice(0,20), suggestions, didYouMean, query });
});

module.exports = router;