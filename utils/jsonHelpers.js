const fs = require('fs');
const path = require('path');

function readJSON(filePath) {
    try {
        const fullPath = path.join(__dirname, '..', filePath);
        if (!fs.existsSync(fullPath)) {
            return [];
        }
        const data = fs.readFileSync(fullPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err.message);
        return [];
    }
}

function writeJSON(filePath, data) {
    try {
        const fullPath = path.join(__dirname, '..', filePath);
        // Ensure directory exists
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`Successfully wrote to ${filePath}`);
        return true;
    } catch (err) {
        console.error(`Error writing ${filePath}:`, err.message);
        return false;
    }
}

module.exports = { readJSON, writeJSON };
