import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("desktop category sidebar has an independent vertical scroll area", () => {
  const visualRefresh = html.match(/<style id="catalog-visual-refresh">([\s\S]*?)<\/style>/)?.[1];
  assert.ok(visualRefresh, "catalog visual refresh styles should exist");

  const sidebarRule = visualRefresh.match(/\.category-sidebar\s*\{([^}]*)\}/)?.[1];
  assert.ok(sidebarRule, "desktop category sidebar rule should exist");
  assert.match(sidebarRule, /(?<!-)height:\s*calc\(100vh\s*-\s*76px\)/);
  assert.match(sidebarRule, /overflow-y:\s*auto/);
  assert.match(sidebarRule, /overscroll-behavior-y:\s*contain/);
});

test("mobile layout still replaces the sidebar with the category select", () => {
  const mobileRule = html.match(/@media \(max-width: 760px\)\s*\{([\s\S]*)<\/style>/)?.[1];
  assert.ok(mobileRule, "mobile styles should exist");
  assert.match(mobileRule, /\.category-sidebar\s*\{\s*display:\s*none;\s*\}/);
  assert.match(mobileRule, /\.mobile-controls\s*\{[^}]*display:\s*grid/);
});
