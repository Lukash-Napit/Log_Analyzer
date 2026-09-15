const fs = require('fs');
const readline = require('readline');

async function analyzeLog(filePath) {
  const readStream = fs.createReadStream(filePath);
  readStream.on('error', (err) => {
    if (err.code === 'ENOENT') {
      console.error(`Error: file not found at "${filePath}"`);
    } else {
      console.error(`Error reading file "${filePath}": ${err.message}`);
    }
    process.exit(1);
  });

  const rl = readline.createInterface({
    input: readStream,
    crlfDelay: Infinity, // treat \r\n as ONE line ending regardless of timing
  });

  let totalLines = 0;
  let errorCount = 0;
  const errorBreakdown = new Map(); // message text -> count
  const memorySnapshots = [];

  for await (const line of rl) {
    totalLines++;

    if (line.includes('ERROR')) {
      errorCount++;
      const message = line.split('ERROR')[1]?.trim() ?? 'unknown';
      errorBreakdown.set(message, (errorBreakdown.get(message) || 0) + 1);
    }

    if (totalLines % 50000 === 0) {
      const mb = process.memoryUsage().heapUsed / 1024 / 1024;
      memorySnapshots.push({ line: totalLines, heapUsedMB: mb });
      console.log(`Processed ${totalLines} lines... (${mb.toFixed(2)} MB heap)`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Total lines: ${totalLines}`);
  console.log(`Total errors: ${errorCount}`);

  console.log('\n--- Error Breakdown ---');
  const sortedBreakdown = [...errorBreakdown.entries()].sort((a, b) => b[1] - a[1]);
  for (const [message, count] of sortedBreakdown) {
    console.log(`${count}x  ${message}`);
  }

  return { totalLines, errorCount, errorBreakdown, memorySnapshots };
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node analyze.js <path-to-log-file>');
  process.exit(1);
}

analyzeLog(filePath).catch((err) => {
  console.error(`Unexpected error: ${err.message}`);
  process.exit(1);
});
