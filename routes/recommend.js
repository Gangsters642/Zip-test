const express = require('express');
const router = express.Router();
const { readJSON } = require('../utils/jsonHelpers');

function jaccard(tagsA, tagsB) {
  if (!tagsA.length || !tagsB.length) return 0;
  const setA = new Set(tagsA), setB = new Set(tagsB);
  const inter = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return inter.size / union.size;
}

router.get('/', (req, res) => {
  const appId = req.query.appId;
  const limit = parseInt(req.query.limit) || 5;
  const apps = readJSON('data/apps.json').filter(a => a.status === 'approved');
  const requests = readJSON('data/requests.json');
  const requestCounts = {};
  requests.forEach(r => requestCounts[r.appId] = (requestCounts[r.appId] || 0) + 1);
  const maxPop = Math.max(...Object.values(requestCounts), 1);

  let targetApp = null;
  if (appId) targetApp = apps.find(a => a.id === appId);
  const scored = apps.map(app => {
    let score = 0;
    if (targetApp && app.id !== targetApp.id) score += jaccard(targetApp.tags, app.tags) * 0.6;
    const pop = (requestCounts[app.id] || 0) / maxPop;
    score += pop * 0.4;
    return { app, score };
  });
  const recommendations = scored.filter(s => s.score > 0).sort((a,b) => b.score - a.score).slice(0, limit).map(s => s.app);
  res.json({ recommendations, forApp: targetApp ? targetApp.name : null });
});

module.exports = router;