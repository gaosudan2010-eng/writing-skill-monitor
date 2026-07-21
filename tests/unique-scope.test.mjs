import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("summary exposes accessible all-record and independent-skill filters", () => {
  assert.match(html, /id="allRecordsFilter"[^>]*data-scope="all"[^>]*aria-pressed="true"/);
  assert.match(html, /id="uniqueSkillsFilter"[^>]*data-scope="unique"[^>]*aria-pressed="false"/);
  assert.match(html, /els\.scopeFilters\.forEach\(button => button\.addEventListener\("click"/);
});

test("independent view deduplicates by skill key and feeds every downstream filter", () => {
  assert.match(html, /const key = skill\.key \|\| skill\.id/);
  assert.match(html, /function scopeSkills\(\)/);
  assert.match(html, /const scoped = scopeSkills\(\);/);
  assert.match(html, /const result = scopeSkills\(\)\.filter/);
  assert.match(html, /独立Skill/);
});

test("scope switch clears stale filters so the complete independent set is visible", () => {
  const setScope = html.match(/function setScope\(scope\) \{([\s\S]*?)\n    \}/)?.[1];
  assert.ok(setScope, "setScope should exist");
  assert.match(setScope, /state\.source = "all"/);
  assert.match(setScope, /state\.category = "all"/);
  assert.match(setScope, /state\.query = ""/);
  assert.match(setScope, /state\.bookmarkOnly = false/);
});
