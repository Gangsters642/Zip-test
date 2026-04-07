const sessions = new Map();

function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function isAuthenticated(req, res, next) {
  const sessionId = req.cookies?.sessionId;
  if (sessionId && sessions.has(sessionId)) {
    req.session = sessions.get(sessionId);
    return next();
  }
  if (req.path === process.env.ADMIN_SECRET_ROUTE || req.path === process.env.ADMIN_SECRET_ROUTE + '/' || req.path.endsWith('.html')) {
    return res.redirect(process.env.ADMIN_SECRET_ROUTE + '/login');
  }
  res.status(401).json({ error: 'Unauthorized. Please login first.' });
}

function adminLogin(req, res) {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    const sessionId = generateSessionId();
    sessions.set(sessionId, { loggedIn: true, loginTime: Date.now() });
    res.cookie('sessionId', sessionId, { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 });
    res.json({ success: true, redirect: process.env.ADMIN_SECRET_ROUTE });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
}

function adminLogout(req, res) {
  const sessionId = req.cookies?.sessionId;
  if (sessionId) sessions.delete(sessionId);
  res.clearCookie('sessionId');
  res.json({ success: true });
}

module.exports = { isAuthenticated, adminLogin, adminLogout, sessions };