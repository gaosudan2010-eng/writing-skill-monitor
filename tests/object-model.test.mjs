import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("summary separates platform records, atomic skills, and collections", () => {
  assert.match(html, /id="allRecordsFilter"[^>]*data-scope="all"[^>]*aria-pressed="false"/);
  assert.match(html, /id="atomicSkillsFilter"[^>]*data-scope="atomic"[^>]*aria-pressed="true"/);
  assert.match(html, /id="collectionFilter"[^>]*data-scope="collection"[^>]*aria-pressed="false"/);
});

test("canonical identity uses repository plus skill key instead of name alone", () => {
  assert.match(html, /function repositoryFromRecord\(skill\)/);
  assert.match(html, /function skillPathFromRecord\(skill\)/);
  assert.match(html, /const canonicalSkillId = skill\.canonicalSkillId/);
  assert.match(html, /`\$\{parentProject\}::\$\{skillPath\}`/);
  assert.match(html, /const key = skill\.canonicalSkillId/);
});

test("object and metric scopes are explicit", () => {
  assert.match(html, /skill\.category === "合集与目录" \? "collection" : "atomic"/);
  assert.match(html, /direct: \{ label:"直接指标"/);
  assert.match(html, /aggregate: \{ label:"合集指标"/);
  assert.match(html, /inherited: \{ label:"继承指标"/);
});

test("atomic objects retain their source records for inspection and export", () => {
  assert.match(html, /sourceRecords: \[\.\.\.group\]\.sort/);
  assert.match(html, /<summary>\$\{sourceRecords\.length\} 条平台记录<\/summary>/);
  assert.match(html, /"Canonical ID"/);
  assert.match(html, /metricScopeMeta\[skill\.metricScope\]\.label/);
  assert.match(html, /childSkills: atomic\.filter/);
});

test("scope switch clears stale filters", () => {
  const setScope = html.match(/function setScope\(scope\) \{([\s\S]*?)\n    \}/)?.[1];
  assert.ok(setScope, "setScope should exist");
  assert.match(setScope, /state\.source = "all"/);
  assert.match(setScope, /state\.category = "all"/);
  assert.match(setScope, /state\.query = ""/);
  assert.match(setScope, /state\.bookmarkOnly = false/);
});
