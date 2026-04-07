const fs = require('fs');
const path = require('path');

function readJSON(filePath) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    const data = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    if (filePath.includes('apps.json')) return [];
    if (filePath.includes('requests.json')) return [];
    if (filePath.includes('settings.json')) return { websiteActive: true, shutdownMessage: '', siteTitle: 'APK Hub' };
    return {};
  }
}

function writeJSON(filePath, data) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

module.exports = { readJSON, writeJSON };