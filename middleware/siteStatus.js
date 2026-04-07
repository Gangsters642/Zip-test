const { readJSON } = require('../utils/jsonHelpers');

function getSettings() {
  return readJSON('data/settings.json');
}

function checkSiteStatus(req, res, next) {
  const settings = getSettings();
  if (!settings.websiteActive) {
    req.siteDown = true;
    req.shutdownMessage = settings.shutdownMessage;
  } else {
    req.siteDown = false;
  }
  next();
}

module.exports = { checkSiteStatus, getSettings };