import { test, expect, type Page } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const mime: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff": "font/woff", ".woff2": "font/woff2" };
const snapshot = JSON.parse(await readFile(path.join(root, "site/public/catalog.json"), "utf8"));
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
  await expect(page.getByText("Local preview", { exact: true })).toBeVisible();
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
      await page.keyboard.press("Escape");
    }
    await mkdir(path.join(root, ".taste-skill/inspection"), { recursive: true });
    await page.screenshot({ path: path.join(root, `.taste-skill/inspection/worlds-${width}.png`), fullPage: true });
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
