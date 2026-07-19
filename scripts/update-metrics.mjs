import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.resolve(scriptDir, "..", "index.html");
const githubToken = process.env.GITHUB_TOKEN || "";
const stats = {
  github: { updated: 0, failed: 0 },
  clawhub: { updated: 0, failed: 0 },
  skillssh: { updated: 0, failed: 0 }
};

let html = await fs.readFile(htmlPath, "utf8");
let lines = html.split("\n");

function compact(value) {
  if (!value) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 1 : 2)}K`;
  return new Intl.NumberFormat("zh-CN").format(value);
}

function field(line, name) {
  return line.match(new RegExp(`${name}:"([^"]+)"`))?.[1];
}

function replaceMetric(line, value) {
  return line
    .replace(/metricValue:\d+/, `metricValue:${value}`)
    .replace(/metricLabel:"[^"]*"/, `metricLabel:"${compact(value)}"`);
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchJson(url, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15_000) });
      if (response.ok) return await response.json();
      lastError = new Error(`${response.status} ${response.statusText}`);
      if (![429, 500, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      lastError = error;
    }
    await sleep(700 * (attempt + 1));
  }
  throw lastError;
}

async function mapLimit(items, limit, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await worker(queue.shift());
  });
  await Promise.all(runners);
}

async function updateGithub() {
  const repos = [...new Set(lines.flatMap(line => {
    const repo = field(line, "repo");
    return repo ? [repo] : [];
  }))];
  const values = new Map();

  await mapLimit(repos, 5, async repo => {
    try {
      const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
      if (githubToken) headers.Authorization = `Bearer ${githubToken}`;
      const data = await fetchJson(`https://api.github.com/repos/${repo}`, { headers });
      values.set(repo, data.stargazers_count);
      stats.github.updated += 1;
    } catch (error) {
      stats.github.failed += 1;
      console.warn(`GitHub 保留快照 ${repo}: ${error.message}`);
    }
  });

  lines = lines.map(line => {
    const repo = field(line, "repo");
    if (!repo || !values.has(repo)) return line;
    const value = values.get(repo);
    if (line.includes('source:"github"')) return replaceMetric(line, value);
    if (line.includes(" stars:")) return line.replace(/stars:\d+/, `stars:${value}`);
    return line;
  });
}

async function updateClawHub() {
  const items = lines.flatMap((line, index) => {
    const owner = field(line, "clawOwner");
    const slug = field(line, "clawSlug");
    return owner && slug ? [{ index, owner, slug }] : [];
  });
  const values = new Map();

  await mapLimit(items, 5, async item => {
    try {
      const url = new URL(`https://clawhub.ai/api/v1/skills/${encodeURIComponent(item.slug)}`);
      url.searchParams.set("owner", item.owner);
      const data = await fetchJson(url);
      const downloads = data.skill?.stats?.downloads;
      if (!Number.isFinite(downloads)) throw new Error("响应中缺少 downloads");
      values.set(item.index, downloads);
      stats.clawhub.updated += 1;
    } catch (error) {
      stats.clawhub.failed += 1;
      console.warn(`ClawHub 保留快照 ${item.owner}/${item.slug}: ${error.message}`);
    }
  });

  lines = lines.map((line, index) => values.has(index) ? replaceMetric(line, values.get(index)) : line);
}

async function updateSkillsSh() {
  const items = lines.flatMap((line, index) => {
    const sourceType = field(line, "source");
    if (!line.includes("安装") || !["official", "skillssh"].includes(sourceType)) return [];
    const key = field(line, "name") || field(line, "key");
    const url = field(line, "url") || "";
    const match = url.match(/^https:\/\/www\.skills\.sh\/([^/]+\/[^/]+)\/([^/]+)$/);
    const preferredSource = match?.[1] || (url.includes("anthropics/skills") ? "anthropics/skills" : "anthropics/knowledge-work-plugins");
    return key ? [{ index, key, preferredSource, sourceType }] : [];
  });
  const values = new Map();

  const queries = new Map();
  for (const item of items) {
    const cacheKey = `${item.preferredSource.toLowerCase()}|${item.key.toLowerCase()}`;
    if (!queries.has(cacheKey)) queries.set(cacheKey, { ...item, indexes: [] });
    queries.get(cacheKey).indexes.push(item.index);
  }

  await mapLimit([...queries.values()], 1, async item => {
    try {
      await sleep(1_100);
      const url = new URL("https://skills.sh/api/search");
      url.searchParams.set("q", item.key);
      url.searchParams.set("limit", "100");
      const data = await fetchJson(url);
      const candidates = data.skills || [];
      let match = candidates.find(skill => skill.skillId === item.key && skill.source.toLowerCase() === item.preferredSource.toLowerCase());
      if (!match && item.sourceType === "official") {
        match = candidates.find(skill => skill.skillId === item.key && skill.source.toLowerCase().startsWith("anthropics/"));
      }
      if (!match || !Number.isFinite(match.installs)) throw new Error("未找到精确安装量");
      item.indexes.forEach(index => values.set(index, match.installs));
      stats.skillssh.updated += item.indexes.length;
    } catch (error) {
      stats.skillssh.failed += item.indexes.length;
      console.warn(`Skills.sh 保留快照 ${item.preferredSource}/${item.key}: ${error.message}`);
    }
  });

  lines = lines.map((line, index) => values.has(index) ? replaceMetric(line, values.get(index)) : line);
}

if (process.env.SKIP_NETWORK !== "1") {
  await Promise.all([
    updateGithub(),
    updateClawHub(),
    process.env.SKIP_SKILLS_SH === "1" ? Promise.resolve() : updateSkillsSh()
  ]);
}

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());

html = lines.join("\n")
  .replace(/数据快照 \d{4}-\d{2}-\d{2}/, `数据快照 ${today}`)
  .replace(/const SNAPSHOT_DATE = "\d{4}-\d{2}-\d{2}";/, `const SNAPSHOT_DATE = "${today}";`);

for (const [, body] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(body);
await fs.writeFile(htmlPath, html);

console.log(JSON.stringify({ date: today, ...stats }, null, 2));
