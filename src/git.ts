import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

export type Contributor = {
	name: string;
	email: string;
	avatar: string;
	username?: string;
	role: string;
	commits: number;
};

async function checkUrlExists(url: string): Promise<boolean> {
	try {
		const res = await fetch(url, { method: 'HEAD' as any });
		return res.ok;
	} catch (e) {
		return false;
	}
}

function gravatarFor(email: string) {
	const hash = crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
	return `https://www.gravatar.com/avatar/${hash}?s=200&d=identicon`;
}

function sanitizeFilename(s: string) {
	return s.replace(/[^a-z0-9.-]+/gi, '_').replace(/^_+|_+$/g, '');
}

async function detectAvatar(email: string): Promise<string> {
	// Try GitHub avatar by guessing username from email local-part
	const local = email.split('@')[0];
	const ghUrl = `https://github.com/${local}.png`;
	if (await checkUrlExists(ghUrl)) return ghUrl;
	// Try using local part with common GitHub username mangling (strip dots)
	const localNoDots = local.replace(/\./g, '');
	const ghUrl2 = `https://github.com/${localNoDots}.png`;
	if (await checkUrlExists(ghUrl2)) return ghUrl2;
	// fallback to gravatar
	return gravatarFor(email);
}

async function collectContributors(options?: { maintainerThreshold?: number }) {
	const threshold = options?.maintainerThreshold ?? 5;

	// Determine git repository root so commands run in correct directory
	let gitRoot = process.cwd();
	try {
		gitRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
	} catch (e) {
		console.warn('Could not determine git root, using current working directory');
	}

	// Try shortlog first (gives commit counts)
	let stdout = '';
	try {
		stdout = execSync(`git -C "${gitRoot}" shortlog -sne`, { encoding: 'utf8' });
	} catch (e) {
		console.warn('git shortlog failed, falling back to git log parsing');
	}

	let lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);

	const authors: Array<{ name: string; email: string; commits: number }> = [];

	if (lines.length === 0) {
		// Fallback: parse full log and count occurrences of "Name <email>"
		try {
			const logOut = execSync(`git -C "${gitRoot}" log --pretty=format:%an' <%ae>'`, { encoding: 'utf8' });
			const logLines = logOut.split('\n').map(l => l.trim()).filter(Boolean);
			const map = new Map<string, { name: string; email: string; commits: number }>();
			for (const entry of logLines) {
				// entry example: "Jane Doe <jane@example.com>"
				const mm = entry.match(/(.+)\s+<(.+)>/);
				if (!mm) continue;
				const name = mm[1].trim();
				const email = mm[2].trim();
				const key = `${name} <${email}>`;
				const cur = map.get(key);
				if (cur) cur.commits += 1; else map.set(key, { name, email, commits: 1 });
			}
			for (const v of map.values()) authors.push(v);
		} catch (e) {
			console.warn('git log fallback also failed — no authors found');
		}
	} else {
		for (const line of lines) {
			// Example line: "   42\tJane Doe <jane@example.com>"
			const m = line.match(/^(\d+)\s+(.+)\s+<(.+)>$/);
			if (m) {
				const commits = parseInt(m[1], 10);
				const name = m[2].trim();
				const email = m[3].trim();
				authors.push({ name, email, commits });
			} else {
				// fallback: try to split by tab
				const parts = line.split('\t').filter(Boolean);
				if (parts.length >= 2) {
					const commits = parseInt(parts[0].trim(), 10) || 0;
					const rest = parts[1];
					const mm = rest.match(/(.+)\s+<(.+)>/);
					if (mm) {
						authors.push({ name: mm[1].trim(), email: mm[2].trim(), commits });
					}
				}
			}
		}
	}

	// Merge authors by (case-insensitive) name to deduplicate multiple emails
	function extractGithubUsernameFromNoreply(email: string): string | null {
		const m = email.match(/^([^@]+)@users\.noreply\.github\.com$/i);
		if (!m) return null;
		const local = m[1];
		const plusIdx = local.indexOf('+');
		if (plusIdx !== -1) return local.slice(plusIdx + 1);
		if (!/^[0-9]+$/.test(local)) return local;
		return null;
	}

	async function detectAvatarForUsername(username: string): Promise<string | null> {
		const url = `https://github.com/${username}.png`;
		if (await checkUrlExists(url)) return url;
		return null;
	}

	const merged = new Map<string, { name: string; emails: Set<string>; commits: number }>();
	for (const a of authors) {
		const key = a.name.trim().toLowerCase();
		const cur = merged.get(key);
		if (cur) {
			cur.emails.add(a.email);
			cur.commits += a.commits;
		} else {
			merged.set(key, { name: a.name.trim(), emails: new Set([a.email]), commits: a.commits });
		}
	}

	const out: Contributor[] = [];
	for (const { name, emails, commits } of merged.values()) {
		// Prefer a non-noreply GitHub email as primary if present
		let primaryEmail: string | null = null;
		for (const e of emails) {
			if (!/users\.noreply\.github\.com$/i.test(e)) {
				primaryEmail = e;
				break;
			}
		}
		if (!primaryEmail) primaryEmail = Array.from(emails)[0];

		// Try to detect a GitHub username from any associated email
		let ghUsername: string | null = null;
		for (const e of emails) {
			const u = extractGithubUsernameFromNoreply(e);
			if (u) {
				ghUsername = u;
				break;
			}
		}

		let avatar = '';
		let username: string | null = null;
		if (ghUsername) {
			const gh = await detectAvatarForUsername(ghUsername);
			if (gh) {
				avatar = gh;
				username = ghUsername;
			}
		}
		if (!avatar && primaryEmail) {
			avatar = await detectAvatar(primaryEmail);
			// if avatar looks like a GitHub avatar, extract username from URL
			const m = avatar.match(/^https:\/\/github\.com\/([^/]+)\.png/);
			if (m) username = username ?? m[1];
		}

		const role = commits >= threshold ? 'Maintainer' : 'Contributor';
		out.push({ name, email: primaryEmail ?? '', avatar, username: username ?? undefined, role, commits });
	}

	// Ensure contributors dir exists
	const outDir = path.join(process.cwd(), 'contributors');
	fs.mkdirSync(outDir, { recursive: true });

	// Write combined JSON
	const combinedPath = path.join(outDir, 'contributors.json');
	fs.writeFileSync(combinedPath, JSON.stringify(out, null, 2), 'utf8');

	// Write per-contributor files
	for (const c of out) {
		const fname = sanitizeFilename(`${c.name}-${c.email}`) || sanitizeFilename(c.email);
		const filePath = path.join(outDir, `${fname}.json`);
		fs.writeFileSync(filePath, JSON.stringify(c, null, 2), 'utf8');
	}

	console.log(`Wrote ${out.length} contributors to ${outDir}`);
}

// Run when executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('git.ts')) {
	(async () => {
		try {
			const thresholdArg = process.argv.find(a => a.startsWith('--threshold='));
			const threshold = thresholdArg ? parseInt(thresholdArg.split('=')[1], 10) : undefined;
			await collectContributors({ maintainerThreshold: threshold });
		} catch (e) {
			// eslint-disable-next-line no-console
			console.error('Error collecting contributors:', e);
			process.exit(1);
		}
	})();
}

export { collectContributors };

