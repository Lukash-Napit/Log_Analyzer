# Log-File Analyzer

A CLI tool that streams a log file line-by-line and reports error frequency — never loads the full file into memory, verified against a 500,000-line file.

## Log format targeted

```
<ISO 8601 timestamp>Z <LEVEL> <message>
```
Example:
```
2026-01-15T10:23:05Z ERROR Failed to connect to database: timeout
```

## Usage

```
node analyze.js <path-to-log-file>
```

## Generate the 500,000-line test file

```
node generate-test-log.js
```
Produces `large-test.log` (~24MB).

## Run the analyzer

```
node analyze.js large-test.log
```

## Verified results (see `sample-run-output.txt` for the full captured output)

```
Total lines: 500000
Total errors: 166705

--- Error Breakdown ---
55667x  Invalid auth token provided
55637x  Request timeout after 30s
55401x  Failed to connect to database: timeout
```

- **Line count** matches the generator's 500,000 lines exactly.
- **Error count** (166,705) is plausible: with 3 random levels, ~1/3 of lines should be ERROR — 166,705 / 500,000 ≈ 33.3%.
- **Error breakdown** correctly collapses into exactly 3 groups (matching the 3 distinct error messages used by the generator), each with a roughly even count — not ~166,705 unique groups, which is what would happen if timestamps were accidentally included in the grouping key.

## Memory usage — see `memory-usage-log.txt`

```
Processed 50000 lines... (5.79 MB heap)
Processed 100000 lines... (5.23 MB heap)
Processed 150000 lines... (6.24 MB heap)
Processed 200000 lines... (6.93 MB heap)
Processed 250000 lines... (7.98 MB heap)
Processed 300000 lines... (5.53 MB heap)
Processed 350000 lines... (6.47 MB heap)
Processed 400000 lines... (7.81 MB heap)
Processed 450000 lines... (5.27 MB heap)
Processed 500000 lines... (9.29 MB heap)
```

Memory stays in a narrow ~5-9MB band for the entire run — processing the last 50,000 lines uses no more memory than the first 50,000, which is the direct evidence that this tool is genuinely streaming rather than accumulating the file in memory.

## Error handling — tested cases

```bash
# Missing file
node analyze.js does-not-exist.log
# -> "Error: file not found at "does-not-exist.log"" (exit code 1, no stack trace)

# No argument at all
node analyze.js
# -> "Usage: node analyze.js <path-to-log-file>" (exit code 1)
```

Both fail with a clear message and correct exit code — no raw stack trace shown to the user.

## Correctness check against a known small log

Before scaling up, the analyzer was verified against a 6-line hand-written log with known exact expected counts (`tiny-test.log`): 6 total lines, 3 errors, breakdown of `2x "Failed to connect..."` and `1x "Invalid auth token..."` — all matched exactly.

## Design notes

- Uses `fs.createReadStream` + `readline.createInterface`, never `fs.readFileSync` anywhere.
- `crlfDelay: Infinity` ensures `\r\n` line endings are always treated as one line ending regardless of timing, rather than relying on a short internal delay.
- The read stream's `'error'` event is handled directly (rather than a separate `fs.existsSync` pre-check) to avoid a race condition where the file could be deleted between the check and the actual read, and to correctly handle other read errors (e.g. permissions) beyond just "file not found."
- The error breakdown groups by `line.split('ERROR')[1].trim()` — everything **after** the word `ERROR`, discarding the timestamp and level — so identical error messages collapse into one shared group instead of each timestamped line becoming its own unique group.
- Results are sorted by count, descending, so the most frequent errors appear first in the output.
