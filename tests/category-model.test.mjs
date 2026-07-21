import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("known misclassified skills have explicit corrections", () => {
  assert.match(html, /"humanizer-zh": "编辑润色"/);
  assert.match(html, /"latex-thesis-zh": "学术论文"/);
  assert.match(html, /"专业中文写稿助手": "中文创作"/);
});

test("first-level Chinese writing categories use primary-task rules", () => {
  assert.match(html, /return "公文写作"/);
  assert.match(html, /return "新媒体写作"/);
  assert.match(html, /governmentStandard/);
  assert.match(html, /newMediaEligible/);
});

test("editing takes precedence over platform keywords", () => {
  const classifier = html.match(/function classifyCategory\(skill\) \{([\s\S]*?)\n    \}/)?.[1];
  assert.ok(classifier, "classifyCategory should exist");
  assert.ok(classifier.indexOf("editingName.test") < classifier.indexOf("newMediaSignals.test"));
});

test("literature review workflows are treated as academic papers", () => {
  assert.match(html, /academicPaperSignals = \/[^\n]*litreview/);
});

test("new first-level categories have navigation icons", () => {
  assert.match(html, /"公文写作":"landmark"/);
  assert.match(html, /"新媒体写作":"smartphone"/);
  assert.match(html, /"学术论文":"book-open-check"/);
});
