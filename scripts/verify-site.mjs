import { readFile } from 'node:fs/promises';

const html = await readFile('index.html', 'utf8');
const javascript = await readFile('js/main.js', 'utf8');
const dataSource = await readFile('data/activity.json', 'utf8');
const data = JSON.parse(dataSource);
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);

if (duplicateIds.length) {
    throw new Error(`Duplicate IDs: ${[...new Set(duplicateIds)].join(', ')}`);
}

const referencedIds = [...javascript.matchAll(/getElementById\('([^']+)'\)/g)].map((match) => match[1]);
const missingIds = [...new Set(referencedIds.filter((id) => !ids.includes(id)))];

if (missingIds.length) {
    throw new Error(`JavaScript references missing HTML IDs: ${missingIds.join(', ')}`);
}

for (const key of ['weekKm', 'monthKm', 'yearKm', 'monthRunCount']) {
    if (!Number.isFinite(Number(data.running?.[key]))) {
        throw new Error(`Invalid running value: ${key}`);
    }
}

const allowedTopLevelKeys = new Set(['updatedAt', 'running']);
const allowedRunningKeys = new Set([
    'weekKm',
    'monthKm',
    'yearKm',
    'monthRunCount',
    'weekTargetKm',
    'updatedLabel',
    'comparisonLabel'
]);
const unexpectedTopLevelKeys = Object.keys(data).filter((key) => !allowedTopLevelKeys.has(key));
const unexpectedRunningKeys = Object.keys(data.running || {}).filter((key) => !allowedRunningKeys.has(key));

if (unexpectedTopLevelKeys.length || unexpectedRunningKeys.length) {
    throw new Error(`Unexpected public activity fields: ${[...unexpectedTopLevelKeys, ...unexpectedRunningKeys].join(', ')}`);
}

const privateActivityField = /(coordinates?|latitude|longitude|labelId|activityId|startTimestamp|endTimestamp|heartRate)/i;
if (privateActivityField.test(dataSource)) {
    throw new Error('Private activity detail was found in public activity data.');
}

const combinedPublicSource = [html, javascript, await readFile('css/style.css', 'utf8'), dataSource].join('\n');
const secretAssignment = /(api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)\s*[:=]\s*['"][^'"]+/i;

if (secretAssignment.test(combinedPublicSource)) {
    throw new Error('A possible secret was found in public browser source.');
}

console.log(`Verified ${ids.length} unique IDs and running activity data.`);
