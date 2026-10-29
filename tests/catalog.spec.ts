import { test, expect, type Locator, type Page } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const mime: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff": "font/woff", ".woff2": "font/woff2" };
const snapshot = JSON.parse(await readFile(path.join(root, "site/public/catalog.json"), "utf8"));
const projectResources = [
  ["website", "https://covel.cc/", "Covel website", "Covel 官网"],
  ["demo", "https://demo.covel.cc/", "Try in your browser", "在线体验"],
  ["docs", "https://covel.cc/docs/en/", "User documentation", "使用文档"],
  ["project-source", "https://github.com/ackness/covel", "Covel source", "Covel 主仓库"],
  ["directory-source", "https://github.com/covel-ai/covel-worlds", "Directory source", "本目录源码"],
  ["publishing", "https://github.com/covel-ai/covel-worlds/blob/main/CONTRIBUTING.md", "Publishing guide", "发布指南"],
] as const;
async function expectProjectResources(container: Locator, locale: "en" | "zh") {
  for (const [resource, href, en, zh] of projectResources) {
    const link = container.locator(`a[data-resource="${resource}"]`);
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toContainText(locale === "en" ? en : zh);
  }
  await expect(container).toContainText("API key");
}
async function routeSite(page: Page, folder = "dist") {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.route("https://covel.test/covel-worlds/**", async (route) => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname.slice("/covel-worlds/".length));
    const filename = path.resolve(root, folder, pathname || "index.html");
    if (!filename.startsWith(`${path.resolve(root, folder)}/`)) return route.abort();
    try { await route.fulfill({ body: await readFile(filename), contentType: mime[path.extname(filename)] ?? "application/octet-stream" }); }
    catch { await route.fulfill({ status: 404, body: "Missing test artifact" }); }
  });
  return failures;
}

test("worlds use the shared local UI: translated search, source tabs, details and themes", async ({ page }) => {
  const failures = await routeSite(page);
  await page.goto("https://covel.test/covel-worlds/");
  await expect(page.locator(".package-row")).toHaveCount(2);
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await expect(page.getByText("Local preview", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "+ List your repository", exact: true }).click();
  const listing = page.locator(".listing-dialog");
  await expect(listing).toBeVisible();
  await expect(listing.locator(".listing-steps > li")).toHaveCount(3);
  await expect(listing.locator(".listing-topics code")).toHaveText(["covel-world", "covel-worlds"]);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: "https://covel.test" });
  await listing.locator(".listing-topics > span").first().getByRole("button", { name: "Copy", exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("covel-world");
  await listing.locator(".listing-topics > span").last().getByRole("button", { name: "Copy", exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("covel-worlds");
  await expect(listing.locator('a[data-slot="button"]')).toHaveAttribute("href", "https://github.com/covel-ai/covel-worlds/blob/main/CONTRIBUTING.md");
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Community", exact: true }).click();
  await expect(page.getByText("No matching packages", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "All sources", exact: true }).click();
  const search = page.getByRole("textbox", { name: /Search by/ });
  await search.fill("灯塔");
  await expect(page.locator(".package-row")).toHaveCount(1);
  await expect(page).toHaveURL(/q=/);
  await page.getByRole("button", { name: "切换为中文", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await page.locator(".package-name button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByText(/连接共享服务后/)).toBeVisible();
  await expect(page.getByRole("button", { name: "下载 ZIP", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Light theme", exact: true }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator(".package-row")).toHaveCount(1);
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
  await page.getByRole("button", { name: "Dark theme", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(failures).toEqual([]);
});

for (const width of [390, 768, 1440]) {
  test(`worlds layout fits ${width}px without horizontal overflow`, async ({ page }) => {
    const failures = await routeSite(page);
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.goto("https://covel.test/covel-worlds/");
    await expect(page.locator(".package-row")).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator("h1").evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeLessThanOrEqual(32);
    if (width === 390) {
      await page.locator(".mobile-filter").click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("dialog").getByRole("combobox", { name: "Category", exact: true })).toBeVisible();
      const sibling = page.getByRole("dialog").getByRole("link", { name: "Plugins", exact: true });
      await expect(sibling).toBeVisible();
      await expect(sibling).toHaveAttribute("href", "https://plugins.covel.cc/");
      await expectProjectResources(page.locator(".filter-dialog"), "en");
      await page.keyboard.press("Escape");
    } else {
      const navigation = page.getByRole("navigation", { name: "Directories", exact: true });
      await expect(navigation.getByRole("link", { name: "Plugins", exact: true })).toBeVisible();
      await expect(navigation.getByRole("link", { name: "Plugins", exact: true })).toHaveAttribute("href", "https://plugins.covel.cc/");
      await expect(navigation.getByRole("link", { name: "Worlds", exact: true })).toHaveAttribute("href", "https://worlds.covel.cc/");
      await expectProjectResources(page.locator(".sidebar-bottom"), "en");
    }
    await expectProjectResources(page.locator(".project-resources"), "en");
    await expect(page.locator('.project-resources a[data-resource="project-source"]')).toContainText("ackness/covel");
    await expect(page.locator('.project-resources a[data-resource="directory-source"]')).toContainText("covel-ai/covel-worlds");
    await expect(page.locator(".contribute-strip")).toContainText("covel-world");
    await expect(page.locator(".contribute-strip")).toContainText("covel-worlds");
    await mkdir(path.join(root, ".taste-skill/inspection"), { recursive: true });
    await page.screenshot({ path: path.join(root, `.taste-skill/inspection/worlds-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "切换为中文", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expectProjectResources(page.locator(".project-resources"), "zh");
    if (width === 390) {
      await page.locator(".mobile-filter").click();
      await expectProjectResources(page.locator(".filter-dialog"), "zh");
      await page.keyboard.press("Escape");
    } else {
      await expectProjectResources(page.locator(".sidebar-bottom"), "zh");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: path.join(root, `.taste-skill/inspection/worlds-${width}-zh.png`), fullPage: true });
    expect(failures).toEqual([]);
  });
}

for (const total of [100, 1000, 10000]) test(`production ${total} entries: 24 summaries, stable paging and no full snapshot`, async ({ page }, testInfo) => {
  const failures = await routeSite(page, ".cache/ui-api");
  const calls: URL[] = [];
  const payloadSizes: number[] = [];
  await page.route("https://registry.test/v1/catalog?**", async (route) => {
    const url = new URL(route.request().url()); calls.push(url);
    const offset = url.searchParams.get("cursor") ? 24 : 0;
    const items = Array.from({ length: 24 }, (_, i) => ({ ...snapshot.entries[0], key: `fixture:${offset + i}`, name: `World ${offset + i}`, id: `world-${offset + i}`, translations: {}, stars: i, downloadRequests: i }));
    const data = { schemaVersion: 1, kind: "worlds", snapshotId: "fixed", metricsSnapshot: "fixed", generatedAt: null, mode: "github", topics: snapshot.topics, items, total, nextCursor: offset ? null : "page-2", policyVersion: "fixture", facets: { categories: [items[0].category], locales: ["en-US"] } };
    const body = JSON.stringify(data); payloadSizes.push(Buffer.byteLength(body));
    await route.fulfill({ body, contentType: "application/json" });
  });
  let fullSnapshotRead = false;
  page.on("request", (request) => { if (new URL(request.url()).pathname.endsWith("/catalog.json")) fullSnapshotRead = true; });
  const started = Date.now();
  await page.goto("https://covel.test/covel-worlds/");
  await expect(page.locator(".package-row")).toHaveCount(24);
  const firstPageMs = Date.now() - started;
  await expect(page.getByText(`${total === 10000 ? "10K" : total.toLocaleString("en-US")} results`, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("button", { name: "World 24", exact: true })).toBeVisible();
  await expect(page.locator(".package-row")).toHaveCount(24);
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.getByRole("button", { name: "World 0", exact: true })).toBeVisible();
  expect(calls.every((url) => url.searchParams.get("limit") === "24" && url.searchParams.get("kind") === "worlds")).toBe(true);
  expect(payloadSizes.every((bytes) => bytes < 100_000)).toBe(true);
  expect(fullSnapshotRead).toBe(false);
  expect(failures).toEqual([]);
  await testInfo.attach("page-size-benchmark", { body: JSON.stringify({ total, firstPageMs, apiPayloadBytes: payloadSizes[0], renderedRows: 24, domNodes: await page.locator("*").count() }), contentType: "application/json" });
});
