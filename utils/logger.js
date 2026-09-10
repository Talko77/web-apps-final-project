const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// Write to an open stream so the file is not reopened for every log line
const stream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function write(level, message, extra) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}` +
    (extra ? ` :: ${extra.stack || JSON.stringify(extra)}` : '');
  stream.write(line + '\n');
  if (level === 'ERROR') console.error(line);
  else console.log(line);
}

module.exports = {
  info: (msg, extra) => write('INFO', msg, extra),
  warn: (msg, extra) => write('WARN', msg, extra),
  error: (msg, extra) => write('ERROR', msg, extra)
};
