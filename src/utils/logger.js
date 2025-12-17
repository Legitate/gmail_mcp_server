const fs = require('fs');
const path = require('path');

// Simple logger that writes to stderr (so it doesn't mess up STDOUT JSON-RPC)
// and optionally to a file.
const LOG_FILE = path.join(__dirname, '../../server.log');

function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;

    // Write to stderr
    console.error(logMessage);

    // Write to file
    fs.appendFile(LOG_FILE, logMessage + '\n', (err) => {
        if (err) {
            // If we can't write to file, just ignore it to avoid loop
        }
    });
}

module.exports = {
    info: (msg) => log(msg, 'INFO'),
    error: (msg) => log(msg, 'ERROR'),
    warn: (msg) => log(msg, 'WARN'),
    debug: (msg) => log(msg, 'DEBUG'),
};
