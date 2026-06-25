import { createRequire } from "node:module";
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import net from "node:net";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEFAULT_OUTPUT_ROOT = join(ROOT, "reference", "layout-sweep");
const DEFAULT_PORT = 5180;
const OVERLAP_EPSILON = 3;

const VIEWPORTS = [
  { width: 640, height: 360, label: "640x360-mobile-min" },
  { width: 740, height: 390, label: "740x390-mobile-small" },
  { width: 844, height: 390, label: "844x390-mobile-wide" },
  { width: 932, height: 430, label: "932x430-mobile-large" },
  { width: 1024, height: 576, label: "1024x576-small-laptop" },
  { width: 1180, height: 664, label: "1180x664-mid" },
  { width: 1280, height: 720, label: "1280x720-base" },
  { width: 1366, height: 768, label: "1366x768-laptop" },
  { width: 1440, height: 900, label: "1440x900-16x10" },
  { width: 1600, height: 900, label: "1600x900-desktop" },
  { width: 1920, height: 1080, label: "1920x1080-fullhd" },
  { width: 2560, height: 1080, label: "2560x1080-ultrawide" },
  { width: 3440, height: 1440, label: "3440x1440-ultrawide" },
  { width: 1024, height: 768, label: "1024x768-4x3-boundary" },
  { width: 390, height: 844, label: "390x844-portrait" },
  { width: 430, height: 932, label: "430x932-portrait" },
];

const QUICK_VIEWPORTS = [
  { width: 640, height: 360, label: "640x360-mobile-min" },
  { width: 844, height: 390, label: "844x390-mobile-wide" },
  { width: 1280, height: 720, label: "1280x720-base" },
  { width: 1920, height: 1080, label: "1920x1080-fullhd" },
  { width: 390, height: 844, label: "390x844-portrait" },
];

const STATES = [
  { id: "main", label: "Main" },
  { id: "song-menu", label: "Song Menu" },
  { id: "locale-menu", label: "Locale Menu" },
  { id: "soundmark-panel", label: "Soundmark Panel" },
  { id: "note-progress", label: "Note Progress" },
  { id: "dock-collapsed", label: "Dock Collapsed" },
  { id: "onboarding-guide", label: "Onboarding 1 Guide", onboardingStep: 0 },
  { id: "onboarding-song", label: "Onboarding 2 Song", onboardingStep: 1 },
  { id: "onboarding-notes", label: "Onboarding 3 Notes", onboardingStep: 2 },
  { id: "onboarding-panel", label: "Onboarding 4 Panel", onboardingStep: 3 },
  { id: "onboarding-collection", label: "Onboarding 5 Collection", onboardingStep: 4 },
  { id: "onboarding-controls", label: "Onboarding 6 Controls", onboardingStep: 5 },
  { id: "orientation", label: "Portrait Orientation", portraitOnly: true },
];

const QUICK_STATES = [
  "main",
  "song-menu",
  "locale-menu",
  "soundmark-panel",
  "note-progress",
  "onboarding-guide",
  "onboarding-collection",
  "orientation",
];

const BOX_SPECS = [
  { id: "app", selector: "#app", label: "app", color: "#6ee7ff", category: "stage" },
  { id: "lyric-guide", selector: "#lyric-guide", label: "lyric guide", color: "#fef08a", category: "primary" },
  { id: "fullscreen-toggle", selector: "#btn-fullscreen", label: "fullscreen", color: "#a7f3d0", category: "control" },
  { id: "control-dock", selector: "#control-dock", label: "dock", color: "#38bdf8", category: "dock" },
  { id: "dock-panel", selector: "#dock-panel", label: "dock panel", color: "#60a5fa", category: "dock" },
  { id: "song-select", selector: ".song-select", label: "song select", color: "#c084fc", category: "dock-child" },
  { id: "song-list", selector: "#song-list", label: "song list", color: "#f0abfc", category: "popover" },
  { id: "playback-core", selector: ".playback-core", label: "playback core", color: "#93c5fd", category: "dock-child" },
  { id: "transport", selector: ".transport", label: "transport", color: "#bfdbfe", category: "dock-child" },
  { id: "progress-track", selector: "#progress-track", label: "progress", color: "#e0f2fe", category: "dock-child" },
  { id: "player-side", selector: ".player-side", label: "player side", color: "#2dd4bf", category: "dock-child" },
  { id: "time-row", selector: ".time-row", label: "time", color: "#99f6e4", category: "dock-child" },
  { id: "volume-control", selector: ".volume-control", label: "volume", color: "#5eead4", category: "dock-child" },
  { id: "locale-picker", selector: ".locale-picker", label: "locale picker", color: "#14b8a6", category: "dock-child" },
  { id: "locale-menu", selector: "#locale-menu", label: "locale menu", color: "#34d399", category: "popover" },
  { id: "soundmark-panel", selector: "#soundmark-panel", label: "info panel", color: "#fb7185", category: "panel" },
  { id: "note-progress-toast", selector: "#note-progress-toast", label: "note progress", color: "#facc15", category: "toast" },
  { id: "onboarding", selector: "#onboarding", label: "onboarding", color: "#64748b", category: "onboarding" },
  { id: "onboarding-locale", selector: ".locale-switcher-onboarding", label: "onboarding locale", color: "#22c55e", category: "onboarding" },
  { id: "onboarding-guide", selector: ".onboarding-callout-guide", label: "callout guide", color: "#f97316", category: "onboarding-callout" },
  { id: "onboarding-song", selector: ".onboarding-callout-song", label: "callout song", color: "#fb923c", category: "onboarding-callout" },
  { id: "onboarding-notes", selector: ".onboarding-callout-notes", label: "callout notes", color: "#fdba74", category: "onboarding-callout" },
  { id: "onboarding-panel", selector: ".onboarding-callout-panel", label: "callout panel", color: "#fed7aa", category: "onboarding-callout" },
  { id: "onboarding-collection", selector: ".onboarding-callout-collection", label: "callout collection", color: "#fde68a", category: "onboarding-callout" },
  { id: "onboarding-controls", selector: ".onboarding-callout-controls", label: "callout controls", color: "#fef3c7", category: "onboarding-callout" },
  { id: "onboarding-nav", selector: ".onboarding-nav", label: "onboarding nav", color: "#fde047", category: "onboarding" },
  { id: "orientation-lock", selector: ".orientation-lock", label: "orientation lock", color: "#a78bfa", category: "orientation" },
  { id: "orientation-card", selector: ".orientation-card", label: "orientation card", color: "#c4b5fd", category: "orientation" },
  { id: "orientation-locale", selector: ".locale-switcher-orientation", label: "orientation locale", color: "#86efac", category: "orientation" },
  { id: "orientation-fullscreen", selector: "#btn-orientation-fullscreen", label: "orientation fullscreen", color: "#ddd6fe", category: "orientation" },
];

const NO_OVERLAP_PAIRS = [
  ["lyric-guide", "fullscreen-toggle"],
  ["lyric-guide", "control-dock"],
  ["lyric-guide", "soundmark-panel"],
  ["lyric-guide", "note-progress-toast"],
  ["fullscreen-toggle", "soundmark-panel"],
  ["soundmark-panel", "control-dock"],
  ["soundmark-panel", "note-progress-toast"],
  ["note-progress-toast", "control-dock"],
  ["song-select", "playback-core"],
  ["playback-core", "player-side"],
  ["transport", "progress-track"],
  ["time-row", "volume-control"],
  ["time-row", "locale-picker"],
  ["volume-control", "locale-picker"],
  ["song-list", "playback-core"],
  ["song-list", "player-side"],
  ["song-list", "locale-menu"],
  ["locale-menu", "playback-core"],
  ["locale-menu", "transport"],
  ["locale-menu", "progress-track"],
  ["onboarding-locale", "lyric-guide"],
  ["onboarding-locale", "fullscreen-toggle"],
  ["onboarding-locale", "soundmark-panel"],
  ["onboarding-nav", "control-dock"],
  ["onboarding-nav", "soundmark-panel"],
  ["onboarding-nav", "note-progress-toast"],
  ["onboarding-guide", "onboarding-song"],
  ["onboarding-guide", "onboarding-notes"],
  ["onboarding-guide", "onboarding-panel"],
  ["onboarding-guide", "onboarding-collection"],
  ["onboarding-guide", "onboarding-controls"],
  ["onboarding-song", "onboarding-notes"],
  ["onboarding-song", "onboarding-panel"],
  ["onboarding-song", "onboarding-collection"],
  ["onboarding-song", "onboarding-controls"],
  ["onboarding-notes", "onboarding-panel"],
  ["onboarding-notes", "onboarding-collection"],
  ["onboarding-notes", "onboarding-controls"],
  ["onboarding-panel", "onboarding-collection"],
  ["onboarding-panel", "onboarding-controls"],
  ["onboarding-collection", "onboarding-controls"],
  ["onboarding-guide", "onboarding-nav"],
  ["onboarding-song", "onboarding-nav"],
  ["onboarding-notes", "onboarding-nav"],
  ["onboarding-panel", "onboarding-nav"],
  ["onboarding-collection", "onboarding-nav"],
  ["onboarding-controls", "onboarding-nav"],
];

const TEXT_CHECK_SELECTORS = [
  ".locale-option",
  ".locale-menu-option",
  ".locale-compact b",
  ".track-title",
  ".track-artist",
  ".time-display",
  ".fullscreen-label",
  ".onboarding-button",
  ".onboarding-callout h2",
  ".onboarding-callout p",
  ".orientation-card strong",
  ".orientation-card > span",
  ".orientation-fullscreen-toggle",
];

const args = parseArgs(process.argv.slice(2));
const selectedViewports = selectViewports(args.quick ? QUICK_VIEWPORTS : VIEWPORTS, args.viewports);
const selectedStates = selectStates(args.quick ? STATES.filter((state) => QUICK_STATES.includes(state.id)) : STATES, args.states);
const outputDir = resolve(args.out ?? join(DEFAULT_OUTPUT_ROOT, timestampName()));
await mkdir(outputDir, { recursive: true });

const { chromium } = loadPlaywright();
const browserExecutable = findBrowserExecutable();
const server = args.url ? null : await startDevServer();
const baseUrl = args.url ?? server.url;

const browser = await chromium.launch({
  headless: true,
  executablePath: browserExecutable,
  args: ["--disable-gpu", "--font-render-hinting=none"],
});

const results = [];

try {
  for (const viewport of selectedViewports) {
    const statesForViewport = selectedStates.filter((state) => {
      if (state.portraitOnly) return viewport.width < viewport.height;
      return viewport.width >= viewport.height;
    });
    const viewportResults = await runViewportCases(browser, baseUrl, viewport, statesForViewport, outputDir, {
      screenshots: args.screenshots,
    });
    results.push(...viewportResults);

    for (const caseResult of viewportResults) {
      const issueCount = caseResult.issues.length;
      console.log(`${issueCount > 0 ? "!" : "✓"} ${viewport.label} / ${caseResult.state.id}: ${issueCount} issue(s)`);
    }
  }
} finally {
  await browser.close();
  if (server) server.stop();
}

const summary = summarizeResults(results);
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  outputDir,
  viewportCount: selectedViewports.length,
  stateCount: selectedStates.length,
  summary,
  results,
};

await writeFile(join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(join(outputDir, "report.html"), renderHtmlReport(report), "utf8");

console.log("");
console.log(`Layout sweep complete: ${outputDir}`);
console.log(`Cases: ${results.length}`);
console.log(`Cases with issues: ${summary.casesWithIssues}`);
console.log(`Total issues: ${summary.totalIssues}`);

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--quick") {
      parsed.quick = true;
    } else if (arg === "--no-screenshots") {
      parsed.screenshots = false;
    } else if (arg === "--url") {
      parsed.url = rawArgs[++index];
    } else if (arg.startsWith("--url=")) {
      parsed.url = arg.slice("--url=".length);
    } else if (arg === "--out") {
      parsed.out = rawArgs[++index];
    } else if (arg.startsWith("--out=")) {
      parsed.out = arg.slice("--out=".length);
    } else if (arg === "--states") {
      parsed.states = rawArgs[++index];
    } else if (arg.startsWith("--states=")) {
      parsed.states = arg.slice("--states=".length);
    } else if (arg === "--viewports") {
      parsed.viewports = rawArgs[++index];
    } else if (arg.startsWith("--viewports=")) {
      parsed.viewports = arg.slice("--viewports=".length);
    }
  }
  parsed.screenshots ??= true;
  return parsed;
}

function selectViewports(defaults, filter) {
  if (!filter) return defaults;
  const wanted = new Set(filter.split(",").map((item) => item.trim()).filter(Boolean));
  return defaults.filter((viewport) => wanted.has(viewport.label) || wanted.has(`${viewport.width}x${viewport.height}`));
}

function selectStates(defaults, filter) {
  if (!filter) return defaults;
  const wanted = new Set(filter.split(",").map((item) => item.trim()).filter(Boolean));
  return defaults.filter((state) => wanted.has(state.id));
}

function loadPlaywright() {
  const candidates = [];
  if (process.env.LAYOUT_SWEEP_PLAYWRIGHT_ROOT) {
    candidates.push(process.env.LAYOUT_SWEEP_PLAYWRIGHT_ROOT);
  }

  const codexNodeModules = join(
    process.env.USERPROFILE ?? "",
    ".cache",
    "codex-runtimes",
    "codex-primary-runtime",
    "dependencies",
    "node",
    "node_modules",
    ".pnpm",
  );
  if (existsSync(codexNodeModules)) {
    for (const entry of listDirSync(codexNodeModules)) {
      if (/^playwright@\d/.test(entry)) {
        candidates.push(join(codexNodeModules, entry, "node_modules", "playwright"));
      }
    }
  }

  candidates.push(join(ROOT, "node_modules", "playwright"));

  for (const candidate of candidates) {
    const packageJson = join(candidate, "package.json");
    if (!existsSync(packageJson)) continue;

    try {
      const requireFromPlaywright = createRequire(packageJson);
      return requireFromPlaywright("playwright");
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error("Unable to load Playwright. Set LAYOUT_SWEEP_PLAYWRIGHT_ROOT to a playwright package directory.");
}

function listDirSync(path) {
  try {
    return requireFs().readdirSync(path);
  } catch {
    return [];
  }
}

function requireFs() {
  return createRequire(import.meta.url)("node:fs");
}

function findBrowserExecutable() {
  const candidates = [
    process.env.LAYOUT_SWEEP_BROWSER,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error("Unable to find Chrome/Edge. Set LAYOUT_SWEEP_BROWSER to a Chromium executable.");
  }
  return found;
}

async function startDevServer() {
  const port = await findFreePort(DEFAULT_PORT);
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCommand, ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    windowsHide: true,
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

  const url = `http://127.0.0.1:${port}/`;
  await waitForServer(url, child, () => `${stdout}\n${stderr}`);
  return {
    url,
    stop() {
      if (child.exitCode != null) return;
      if (process.platform === "win32") {
        spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        child.kill("SIGTERM");
      }
      child.stdout.destroy();
      child.stderr.destroy();
    },
  };
}

function findFreePort(startPort) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const server = net.createServer();
      server.once("error", (error) => {
        if (error.code === "EADDRINUSE") {
          tryPort(port + 1);
          return;
        }
        reject(error);
      });
      server.once("listening", () => {
        server.close(() => resolve(port));
      });
      server.listen(port, "127.0.0.1");
    };
    tryPort(startPort);
  });
}

async function waitForServer(url, child, getLogs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 25000) {
    if (child.exitCode != null) {
      throw new Error(`Vite dev server exited early.\n${getLogs()}`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await wait(250);
  }

  throw new Error(`Timed out waiting for dev server at ${url}\n${getLogs()}`);
}

async function runViewportCases(browser, baseUrl, viewport, states, outputRoot, options = {}) {
  if (states.length <= 0) return [];

  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    locale: "ja-JP",
  });
  await context.addInitScript(() => {
    localStorage.setItem("sonareLakeLocale", "ja");
    localStorage.setItem("sonareLakeDockCollapsed", "false");
    localStorage.removeItem("sonareLakeSoundmarks");
  });

  const page = await context.newPage();

  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(document.querySelector("#app")), null, { timeout: 30000 });
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-delay: 0s !important;
          animation-duration: 0s !important;
          transition-delay: 0s !important;
          transition-duration: 0s !important;
        }
      `,
    });
    await page.waitForTimeout(700);

    const viewportResults = [];
    for (const state of states) {
      viewportResults.push(await captureCaseOnPage(page, viewport, state, outputRoot, options));
    }
    return viewportResults;
  } catch (error) {
    return states.map((state) => ({
      viewport,
      state: { id: state.id, label: state.label },
      screenshot: null,
      boxes: [],
      textOverflows: [],
      issues: [{
        type: "viewport-error",
        severity: "error",
        message: error.stack || error.message,
      }],
      stage: null,
      orientation: viewport.width >= viewport.height ? "landscape" : "portrait",
    }));
  } finally {
    await context.close();
  }
}

async function captureCaseOnPage(page, viewport, state, outputRoot, options = {}) {
  const caseDir = join(outputRoot, viewport.label);
  await mkdir(caseDir, { recursive: true });

  try {
    await setupCaseState(page, state);
    await page.waitForTimeout(80);

    const audit = await page.evaluate(collectLayoutAudit, {
      boxSpecs: BOX_SPECS,
      textCheckSelectors: TEXT_CHECK_SELECTORS,
      stateId: state.id,
      viewport,
    });
    const issues = evaluateIssues(audit, state, viewport);
    let screenshot = null;
    if (options.screenshots) {
      await page.evaluate(drawLayoutOverlay, {
        boxes: audit.boxes,
        issues,
        viewport,
        state,
      });
      await page.waitForTimeout(40);

      const screenshotPath = join(caseDir, `${state.id}.jpg`);
      await page.screenshot({
        path: screenshotPath,
        type: "jpeg",
        quality: 82,
        fullPage: false,
        animations: "disabled",
      });
      screenshot = relative(outputRoot, screenshotPath).split(sep).join("/");
    }

    return {
      viewport,
      state: { id: state.id, label: state.label },
      screenshot,
      boxes: audit.boxes,
      textOverflows: audit.textOverflows,
      issues,
      stage: audit.stage,
      orientation: viewport.width >= viewport.height ? "landscape" : "portrait",
    };
  } catch (error) {
    return {
      viewport,
      state: { id: state.id, label: state.label },
      screenshot: null,
      boxes: [],
      textOverflows: [],
      issues: [{
        type: "case-error",
        severity: "error",
        message: error.stack || error.message,
      }],
      stage: null,
      orientation: viewport.width >= viewport.height ? "landscape" : "portrait",
    };
  }
}

async function setupCaseState(page, state) {
  await page.evaluate((stateToApply) => {
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => Array.from(document.querySelectorAll(selector));

    const loading = $("#app-loading");
    if (loading) loading.classList.add("is-hidden");

    const app = $("#app");
    const onboarding = $("#onboarding");
    const dock = $("#control-dock");
    const dockPanel = $("#dock-panel");
    const soundmarkPanel = $("#soundmark-panel");
    const noteProgress = $("#note-progress-toast");
    const songList = $("#song-list");
    const songButton = $("#btn-song-menu");
    const localeMenu = $("#locale-menu");
    const localeButton = $("#btn-locale-menu");
    const fullscreen = $("#btn-fullscreen");

    function hideOnboarding() {
      if (!onboarding) return;
      onboarding.hidden = true;
      onboarding.classList.remove("is-open");
      app?.classList.remove("onboarding-active");
    }

    function ensureGuide() {
      const guide = $("#lyric-guide");
      if (!guide) return;
      guide.className = "lyric-guide";
      guide.dataset.phase = "day";
      guide.innerHTML = `
        <div class="lyric-guide-lines">
          <span class="guide-line"><span class="guide-word active">湖面に映る、</span></span>
          <span class="guide-line secondary"><span class="guide-word active">音のしるし</span></span>
        </div>
      `;
    }

    function closeSoundmarkPanel() {
      if (!soundmarkPanel) return;
      soundmarkPanel.hidden = true;
      soundmarkPanel.classList.remove("is-open");
      app?.classList.remove("soundmark-panel-open");
    }

    function openSoundmarkPanel() {
      if (!soundmarkPanel) return;
      const title = $("#soundmark-title");
      const body = $("#soundmark-body");
      const source = $("#soundmark-source");
      if (title) title.textContent = "弁天島の鳥居";
      if (body) {
        body.textContent = "弁天島海浜公園では、浜名湖に立つ赤い鳥居がシンボルタワーとして親しまれています。";
      }
      if (source) {
        source.textContent = "出典 / 浜松市";
        source.href = "#";
      }
      soundmarkPanel.hidden = false;
      soundmarkPanel.dataset.phase = "day";
      soundmarkPanel.classList.add("is-open");
      app?.classList.add("soundmark-panel-open");
    }

    function closeNoteProgress() {
      if (!noteProgress) return;
      noteProgress.hidden = true;
      noteProgress.classList.remove("is-visible");
    }

    function openNoteProgress() {
      if (!noteProgress) return;
      const count = $("#note-progress-count");
      const bar = $("#note-progress-bar");
      if (count) count.textContent = "8/24";
      if (bar) bar.style.width = "33.3%";
      noteProgress.style.setProperty("--note-progress", "33.3%");
      noteProgress.hidden = false;
      noteProgress.classList.add("is-visible");
    }

    function closeSongMenu() {
      if (!songList || !songButton) return;
      songList.hidden = true;
      songButton.classList.remove("is-open");
      songButton.setAttribute("aria-expanded", "false");
    }

    function openSongMenu() {
      if (!songList || !songButton) return;
      songList.hidden = false;
      songButton.classList.add("is-open");
      songButton.setAttribute("aria-expanded", "true");
    }

    function closeLocaleMenu() {
      if (!localeMenu || !localeButton) return;
      localeMenu.hidden = true;
      localeButton.classList.remove("is-open");
      localeButton.setAttribute("aria-expanded", "false");
      dock?.classList.remove("locale-menu-open");
    }

    function openLocaleMenu() {
      if (!localeMenu || !localeButton) return;
      localeButton.disabled = false;
      localeMenu.hidden = false;
      localeButton.classList.add("is-open");
      localeButton.setAttribute("aria-expanded", "true");
      dock?.classList.add("locale-menu-open");
    }

    function setDockCollapsed(collapsed) {
      dock?.classList.toggle("collapsed", collapsed);
      app?.classList.toggle("dock-collapsed", collapsed);
      if (dockPanel) {
        dockPanel.inert = collapsed;
        dockPanel.setAttribute("aria-hidden", String(collapsed));
      }
      if (collapsed) closeSongMenu();
    }

    function setupOnboarding(step) {
      if (!onboarding) return;
      onboarding.hidden = false;
      onboarding.classList.add("is-open");
      onboarding.dataset.step = String(step);
      app?.classList.add("onboarding-active");
      setDockCollapsed(false);
      ensureGuide();
      closeSongMenu();
      closeLocaleMenu();
      closeSoundmarkPanel();
      closeNoteProgress();
      if (localeButton) localeButton.disabled = true;

      const calloutOrder = ["guide", "song", "notes", "panel", "collection", "controls"];
      $$(".onboarding-callout").forEach((callout) => {
        callout.classList.toggle("is-active", callout.dataset.callout === calloutOrder[step]);
      });

      const label = $("#onboarding-step-label");
      if (label) label.textContent = `${step + 1} / 6`;
      const prev = $("#btn-onboarding-prev");
      const next = $("#btn-onboarding-next");
      if (prev) prev.disabled = step <= 0;
      if (next) next.textContent = step >= 5 ? "はじめる" : "次へ";

      if (step === 3) openSoundmarkPanel();
      if (step === 4) openNoteProgress();
    }

    if (stateToApply.id === "orientation") {
      hideOnboarding();
      ensureGuide();
      closeSoundmarkPanel();
      closeNoteProgress();
      closeSongMenu();
      closeLocaleMenu();
      setDockCollapsed(false);
      return;
    }

    if (Number.isInteger(stateToApply.onboardingStep)) {
      setupOnboarding(stateToApply.onboardingStep);
      return;
    }

    hideOnboarding();
    ensureGuide();
    closeSoundmarkPanel();
    closeNoteProgress();
    closeSongMenu();
    closeLocaleMenu();
    setDockCollapsed(false);
    if (fullscreen) fullscreen.hidden = false;
    if (localeButton) localeButton.disabled = false;

    if (stateToApply.id === "song-menu") openSongMenu();
    if (stateToApply.id === "locale-menu") openLocaleMenu();
    if (stateToApply.id === "soundmark-panel") openSoundmarkPanel();
    if (stateToApply.id === "note-progress") openNoteProgress();
    if (stateToApply.id === "dock-collapsed") setDockCollapsed(true);
  }, state);
}

function collectLayoutAudit({ boxSpecs, textCheckSelectors, stateId, viewport }) {
  const isVisible = (element) => {
    if (!element) return false;
    for (let current = element; current && current.nodeType === 1; current = current.parentElement) {
      const currentStyle = getComputedStyle(current);
      if (
        current.hidden
        || currentStyle.display === "none"
        || currentStyle.visibility === "hidden"
        || Number(currentStyle.opacity || 1) <= 0.01
      ) {
        return false;
      }
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0
      && rect.height > 0;
  };

  const toRect = (element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: round(rect.left),
      top: round(rect.top),
      right: round(rect.right),
      bottom: round(rect.bottom),
      width: round(rect.width),
      height: round(rect.height),
      centerX: round(rect.left + rect.width / 2),
      centerY: round(rect.top + rect.height / 2),
    };
  };

  const boxes = [];
  for (const spec of boxSpecs) {
    if (stateId === "orientation" && spec.category !== "orientation") continue;
    const element = document.querySelector(spec.selector);
    if (!isVisible(element)) continue;
    const style = getComputedStyle(element);
    boxes.push({
      ...spec,
      rect: toRect(element),
      zIndex: style.zIndex,
      position: style.position,
    });
  }

  const textOverflows = [];
  for (const selector of textCheckSelectors) {
    for (const element of document.querySelectorAll(selector)) {
      if (stateId === "orientation" && !element.closest(".orientation-lock")) continue;
      if (!isVisible(element)) continue;
      const overflowX = element.scrollWidth - element.clientWidth;
      const overflowY = element.scrollHeight - element.clientHeight;
      const style = getComputedStyle(element);
      const hasIntentionalEllipsis = style.textOverflow === "ellipsis" && style.overflow !== "visible";
      const hasHorizontalOverflow = overflowX > 1 && !hasIntentionalEllipsis;
      const hasVerticalOverflow = overflowY > 4;

      if (hasHorizontalOverflow || hasVerticalOverflow) {
        textOverflows.push({
          selector,
          text: element.textContent.trim().slice(0, 80),
          rect: toRect(element),
          overflowX: round(overflowX),
          overflowY: round(overflowY),
        });
      }
    }
  }

  return {
    stateId,
    viewport,
    stage: boxes.find((box) => box.id === "app")?.rect ?? null,
    boxes,
    textOverflows,
  };

  function round(value) {
    return Math.round(Number(value) * 100) / 100;
  }
}

function evaluateIssues(audit, state, viewport) {
  const issues = [];
  const byId = new Map(audit.boxes.map((box) => [box.id, box]));
  const viewportRect = { left: 0, top: 0, right: viewport.width, bottom: viewport.height };
  const appBox = byId.get("app");

  for (const box of audit.boxes) {
    if (box.id === "orientation-lock") continue;
    const bounds = box.category === "orientation" ? viewportRect : (appBox?.rect ?? viewportRect);
    const outside = outsideDistance(box.rect, bounds);
    if (outside > OVERLAP_EPSILON) {
      issues.push({
        type: "out-of-bounds",
        severity: "error",
        ids: [box.id],
        message: `${box.label} escapes ${box.category === "orientation" ? "viewport" : "app stage"} by ${outside.toFixed(1)}px`,
        rect: box.rect,
      });
    }
  }

  for (const [leftId, rightId] of NO_OVERLAP_PAIRS) {
    const left = byId.get(leftId);
    const right = byId.get(rightId);
    if (!left || !right) continue;
    const overlap = intersection(left.rect, right.rect);
    if (overlap.width > OVERLAP_EPSILON && overlap.height > OVERLAP_EPSILON) {
      issues.push({
        type: "overlap",
        severity: "error",
        ids: [left.id, right.id],
        message: `${left.label} overlaps ${right.label} (${overlap.width.toFixed(1)}x${overlap.height.toFixed(1)}px)`,
        overlap,
      });
    }
  }

  const localeMenu = byId.get("locale-menu");
  const soundmarkPanel = byId.get("soundmark-panel");
  if (localeMenu && soundmarkPanel) {
    const overlap = intersection(localeMenu.rect, soundmarkPanel.rect);
    if (overlap.area > 0 && numericZ(localeMenu.zIndex) <= numericZ(soundmarkPanel.zIndex)) {
      issues.push({
        type: "z-index",
        severity: "warning",
        ids: ["locale-menu", "soundmark-panel"],
        message: "locale menu overlaps soundmark panel but does not report a higher z-index",
        overlap,
      });
    }
  }

  for (const overflow of audit.textOverflows) {
    issues.push({
      type: "text-overflow",
      severity: "warning",
      ids: [overflow.selector],
      message: `${overflow.selector} text overflows by ${Math.max(overflow.overflowX, overflow.overflowY).toFixed(1)}px: ${overflow.text}`,
      rect: overflow.rect,
    });
  }

  if (state.portraitOnly && viewport.width >= viewport.height) {
    issues.push({
      type: "invalid-case",
      severity: "warning",
      message: "portrait-only state was captured in landscape viewport",
    });
  }

  return issues;
}

function intersection(a, b) {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  return {
    left,
    top,
    right,
    bottom,
    width,
    height,
    area: width * height,
  };
}

function outsideDistance(rect, bounds) {
  return Math.max(
    bounds.left - rect.left,
    rect.right - bounds.right,
    bounds.top - rect.top,
    rect.bottom - bounds.bottom,
    0,
  );
}

function numericZ(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function drawLayoutOverlay({ boxes, issues, viewport, state }) {
  document.querySelector("#layout-audit-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "layout-audit-overlay";
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483647",
    "pointer-events:none",
    "font:11px/1.2 ui-monospace, SFMono-Regular, Consolas, monospace",
    "color:white",
  ].join(";");

  const issueIds = new Set(issues.flatMap((issue) => issue.ids ?? []));

  for (const box of boxes) {
    const node = document.createElement("div");
    const color = issueIds.has(box.id) ? "#ff375f" : box.color;
    node.style.cssText = [
      "position:fixed",
      `left:${box.rect.left}px`,
      `top:${box.rect.top}px`,
      `width:${box.rect.width}px`,
      `height:${box.rect.height}px`,
      `border:1.5px solid ${color}`,
      `background:${hexToRgba(color, issueIds.has(box.id) ? 0.13 : 0.055)}`,
      "box-shadow:0 0 0 1px rgba(0,0,0,0.32), 0 0 10px rgba(0,0,0,0.28)",
    ].join(";");

    const label = document.createElement("span");
    label.textContent = box.label;
    label.style.cssText = [
      "position:absolute",
      "left:0",
      "top:0",
      "max-width:100%",
      "overflow:hidden",
      "text-overflow:ellipsis",
      "white-space:nowrap",
      `background:${hexToRgba(color, 0.82)}`,
      "color:#06141c",
      "padding:1px 4px",
      "font-weight:700",
    ].join(";");
    node.appendChild(label);
    overlay.appendChild(node);
  }

  for (const issue of issues.filter((item) => item.type === "overlap")) {
    const mark = document.createElement("div");
    mark.style.cssText = [
      "position:fixed",
      `left:${issue.overlap.left}px`,
      `top:${issue.overlap.top}px`,
      `width:${issue.overlap.width}px`,
      `height:${issue.overlap.height}px`,
      "background:rgba(255,55,95,0.32)",
      "border:1px dashed rgba(255,255,255,0.9)",
    ].join(";");
    overlay.appendChild(mark);
  }

  const badge = document.createElement("div");
  badge.textContent = `${viewport.width}x${viewport.height} / ${state.id} / ${issues.length} issue(s)`;
  badge.style.cssText = [
    "position:fixed",
    "left:8px",
    "bottom:8px",
    "padding:5px 8px",
    "border:1px solid rgba(255,255,255,0.28)",
    "border-radius:6px",
    "background:rgba(0,12,20,0.76)",
    "color:white",
    "backdrop-filter:blur(8px)",
  ].join(";");
  overlay.appendChild(badge);
  document.body.appendChild(overlay);

  function hexToRgba(hex, alpha) {
    const value = hex.replace("#", "");
    const r = Number.parseInt(value.slice(0, 2), 16);
    const g = Number.parseInt(value.slice(2, 4), 16);
    const b = Number.parseInt(value.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
}

function summarizeResults(resultsToSummarize) {
  const totalIssues = resultsToSummarize.reduce((sum, result) => sum + result.issues.length, 0);
  const casesWithIssues = resultsToSummarize.filter((result) => result.issues.length > 0).length;
  const byType = {};
  const byState = {};
  const byViewport = {};

  for (const result of resultsToSummarize) {
    if (result.issues.length > 0) {
      byState[result.state.id] = (byState[result.state.id] ?? 0) + result.issues.length;
      byViewport[result.viewport.label] = (byViewport[result.viewport.label] ?? 0) + result.issues.length;
    }
    for (const issue of result.issues) {
      byType[issue.type] = (byType[issue.type] ?? 0) + 1;
    }
  }

  return {
    totalIssues,
    casesWithIssues,
    byType,
    byState,
    byViewport,
  };
}

function renderHtmlReport(report) {
  const rows = report.results.map((result) => {
    const issueMarkup = result.issues.length > 0
      ? `<ul>${result.issues.map((issue) => `<li><strong>${escapeHtml(issue.type)}</strong> ${escapeHtml(issue.message)}</li>`).join("")}</ul>`
      : "<span class=\"ok\">No issues</span>";
    const imageMarkup = result.screenshot
      ? `<a href="${escapeHtml(result.screenshot)}"><img src="${escapeHtml(result.screenshot)}" alt="${escapeHtml(result.viewport.label)} ${escapeHtml(result.state.id)}"></a>`
      : "";
    return `
      <article class="${result.issues.length > 0 ? "case has-issues" : "case"}">
        <header>
          <h2>${escapeHtml(result.viewport.label)} / ${escapeHtml(result.state.id)}</h2>
          <span>${result.viewport.width}x${result.viewport.height}</span>
        </header>
        ${imageMarkup}
        ${issueMarkup}
      </article>
    `;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Layout Sweep Report</title>
  <style>
    :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; background: #08131a; color: #e5f2f6; }
    body { margin: 0; padding: 28px; }
    h1 { margin: 0 0 8px; font-size: 26px; }
    .summary { display: flex; flex-wrap: wrap; gap: 10px; margin: 18px 0 28px; }
    .summary div { padding: 10px 12px; border: 1px solid rgba(255,255,255,.14); border-radius: 8px; background: rgba(255,255,255,.05); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 18px; }
    .case { border: 1px solid rgba(255,255,255,.12); border-radius: 10px; overflow: hidden; background: rgba(255,255,255,.045); }
    .case.has-issues { border-color: rgba(255, 85, 120, .65); }
    header { display: flex; justify-content: space-between; gap: 10px; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.10); }
    h2 { margin: 0; font-size: 14px; }
    header span { color: #a6bdc6; font-size: 12px; }
    img { display: block; width: 100%; background: #02080c; }
    ul { margin: 0; padding: 12px 12px 14px 28px; color: #ffd5de; font-size: 12px; line-height: 1.45; }
    .ok { display: block; padding: 12px; color: #9be7c4; font-size: 12px; }
    code { color: #a7f3d0; }
  </style>
</head>
<body>
  <h1>Layout Sweep Report</h1>
  <p>Generated at <code>${escapeHtml(report.generatedAt)}</code> from <code>${escapeHtml(report.baseUrl)}</code>.</p>
  <section class="summary">
    <div>Total cases: <strong>${report.results.length}</strong></div>
    <div>Cases with issues: <strong>${report.summary.casesWithIssues}</strong></div>
    <div>Total issues: <strong>${report.summary.totalIssues}</strong></div>
    <div>By type: <code>${escapeHtml(JSON.stringify(report.summary.byType))}</code></div>
  </section>
  <main class="grid">
    ${rows}
  </main>
</body>
</html>
`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function timestampName() {
  return new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
