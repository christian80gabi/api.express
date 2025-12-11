import * as fs from 'fs';
import * as path from 'path';

const CONTRIBUTORS_PATH = path.resolve(process.cwd(), 'contributors', 'contributors.json');

/**
 * Read contributors.json asynchronously and return parsed array.
 * Returns an empty array if the file does not exist.
 */
export async function getContributors(): Promise<any[]> {
    console.log('Reading contributors from', CONTRIBUTORS_PATH);
    try {
        const raw = await fs.promises.readFile(CONTRIBUTORS_PATH, 'utf8');
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch (err: any) {
        if (err && err.code === 'ENOENT') return [];
        throw err;
    }
}

/**
 * Return a single contributor by GitHub username (case-insensitive).
 * Resolves to `null` if not found.
 */
export async function getContributorByUsername(username: string): Promise<any | null> {
    if (!username) return null;
    const list = await getContributors();
    const lower = username.toLowerCase();
    return list.find((c: any) => (c.username || '').toLowerCase() === lower) ?? null;
}

export default getContributors;