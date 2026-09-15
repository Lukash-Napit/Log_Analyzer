const fs = require('fs');

const levels = ['INFO', 'WARN', 'ERROR'];
const errorMessages = [
  'Failed to connect to database: timeout',
  'Invalid auth token provided',
  'Request timeout after 30s',
];

const LINE_COUNT = 500000;
const stream = fs.createWriteStream('large-test.log');

for (let i = 0; i < LINE_COUNT; i++) {
  const level = levels[Math.floor(Math.random() * levels.length)];
  const message =
    level === 'ERROR'
      ? errorMessages[Math.floor(Math.random() * errorMessages.length)]
      : 'Request processed';
  stream.write(`2026-01-15T10:23:${(i % 60).toString().padStart(2, '0')}Z ${level} ${message}\n`);
}

stream.end(() => {
  console.log(`Generated ${LINE_COUNT} lines -> large-test.log`);
});
