import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { chmod, readFile, writeFile } from 'node:fs/promises';

const [, , command, inputPath, outputPath] = process.argv;
const keyValue = process.env.COROS_TOKEN_KEY;
const aad = Buffer.from('naotsukamoto.github.io/coros-token/v1', 'utf8');

if (!['encrypt', 'decrypt'].includes(command) || !inputPath || !outputPath) {
    throw new Error('Usage: coros-token.mjs <encrypt|decrypt> <input> <output>');
}

if (!keyValue) {
    throw new Error('COROS_TOKEN_KEY is required.');
}

const key = Buffer.from(keyValue, 'base64');
if (key.length !== 32) {
    throw new Error('COROS_TOKEN_KEY must be a base64-encoded 32-byte key.');
}

if (command === 'encrypt') {
    const plaintext = await readFile(inputPath);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(aad);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const payload = {
        version: 1,
        algorithm: 'aes-256-gcm',
        iv: iv.toString('base64'),
        tag: cipher.getAuthTag().toString('base64'),
        ciphertext: ciphertext.toString('base64')
    };
    await writeFile(outputPath, `${JSON.stringify(payload)}\n`, { mode: 0o600 });
} else {
    const payload = JSON.parse(await readFile(inputPath, 'utf8'));
    if (payload.version !== 1 || payload.algorithm !== 'aes-256-gcm') {
        throw new Error('Unsupported encrypted token format.');
    }
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'));
    decipher.setAAD(aad);
    decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
    const plaintext = Buffer.concat([
        decipher.update(Buffer.from(payload.ciphertext, 'base64')),
        decipher.final()
    ]);
    await writeFile(outputPath, plaintext, { mode: 0o600 });
    await chmod(outputPath, 0o600);
}
