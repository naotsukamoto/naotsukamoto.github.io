import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const DATA_PATH = new URL('../data/activity.json', import.meta.url);
const tokenPath = process.env.COROS_TOKEN_PATH;
const timeZone = 'Asia/Tokyo';

if (!tokenPath) {
    throw new Error('COROS_TOKEN_PATH is required.');
}

function dateParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date);
    return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

function isoDate(year, month, day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function compactDate(value) {
    return value.replaceAll('-', '');
}

function startOfWeek(year, month, day) {
    const date = new Date(Date.UTC(year, month - 1, day));
    const daysSinceMonday = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - daysSinceMonday);
    return isoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function extractRecords(result) {
    if (result.isError) throw new Error('COROS returned an error response.');
    const content = result.content?.find((item) => item.type === 'text')?.text;
    if (!content) throw new Error('COROS response did not contain workout text.');

    let text = content;
    if (text.startsWith('"')) text = JSON.parse(text);

    const records = [];
    const blocks = text.split(/\n\n(?=\d+\. )/);
    for (const block of blocks) {
        const date = block.match(/— (\d{4}-\d{2}-\d{2})/)?.[1];
        const distance = block.match(/Distance:\s+([\d.]+)\s+(km|m)\b/);
        if (!date || !distance) continue;
        const amount = Number(distance[1]);
        records.push({ date, km: distance[2] === 'm' ? amount / 1000 : amount });
    }
    return records;
}

function total(records, start, end) {
    return records
        .filter((record) => record.date >= start && record.date <= end)
        .reduce((sum, record) => sum + record.km, 0);
}

const now = new Date();
const current = dateParts(now);
const year = Number(current.year);
const month = Number(current.month);
const day = Number(current.day);
const today = isoDate(year, month, day);
const yearStart = isoDate(year, 1, 1);
const monthStart = isoDate(year, month, 1);
const weekStart = startOfWeek(year, month, day);

const argumentsJson = JSON.stringify({
    startDate: compactDate(yearStart),
    endDate: compactDate(today),
    sportTypeCodes: [100, 101, 102, 103],
    minDistanceKm: null,
    maxDistanceKm: null,
    minDurationMinutes: null,
    maxDurationMinutes: null,
    maxAveragePace: null,
    locationKeyword: null,
    limit: 500
});

const command = spawnSync('npx', [
    '--yes',
    'coros-mcp@0.1.1',
    '--cache-path', tokenPath,
    '--issuer', 'https://mcpus.coros.com',
    '--no-gateway-discovery',
    'call-tool',
    '--tool', 'querySportRecords',
    '--arguments-json', argumentsJson
], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 90_000
});

if (command.status !== 0) {
    throw new Error(`COROS sync failed: ${(command.stderr || 'unknown error').trim()}`);
}

const records = extractRecords(JSON.parse(command.stdout));
if (!records.length) throw new Error('COROS returned no running records.');

const previousMonthDate = new Date(Date.UTC(year, month - 2, 1));
const previousYear = previousMonthDate.getUTCFullYear();
const previousMonth = previousMonthDate.getUTCMonth() + 1;
const previousMonthLastDay = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
const comparisonDay = Math.min(day, previousMonthLastDay);
const comparisonStart = isoDate(previousYear, previousMonth, 1);
const comparisonEnd = isoDate(previousYear, previousMonth, comparisonDay);
const monthKm = total(records, monthStart, today);
const previousMonthKm = total(records, comparisonStart, comparisonEnd);
const comparisonPercent = previousMonthKm > 0
    ? Math.round(((monthKm - previousMonthKm) / previousMonthKm) * 100)
    : null;
const previousMonthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC'
}).format(previousMonthDate);
const updatedLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone
}).format(now);
const previous = JSON.parse(await readFile(DATA_PATH, 'utf8'));

const output = {
    updatedAt: now.toISOString(),
    running: {
        weekKm: Number(total(records, weekStart, today).toFixed(2)),
        monthKm: Number(monthKm.toFixed(2)),
        yearKm: Number(total(records, yearStart, today).toFixed(2)),
        monthRunCount: records.filter((record) => record.date >= monthStart && record.date <= today).length,
        weekTargetKm: Number(previous.running?.weekTargetKm) || 70,
        updatedLabel: `Updated ${updatedLabel}`,
        comparisonLabel: comparisonPercent === null
            ? ''
            : `${comparisonPercent >= 0 ? '+' : ''}${comparisonPercent}% vs ${previousMonthLabel} 1–${comparisonDay}`
    }
};

await writeFile(DATA_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`Updated running totals from ${records.length} COROS activities.`);
