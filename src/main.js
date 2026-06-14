import { createLakeScene } from "./lakeScene.js";
import { SONGS, findSong } from "./songs.js";
import { buildLyricChunks, collectPhrases, collectSegments, collectWords, formatTime } from "./lyrics.js";
import { createTextAlivePlayer, loadSong } from "./textalive.js";

const $ = (selector) => document.querySelector(selector);
const DOCK_COLLAPSED_KEY = "sonareLakeDockCollapsed";
const VOLUME_KEY = "sonareLakeVolume";
const LYRIC_SPAWN_LEAD_MS = 80;
const LYRIC_BASE_DROP_MS = 2200;
const LYRIC_FADE_OUT_MS = 520;
const LYRIC_DRIFT_MS = 900;
const LYRIC_MAX_DROP_MS = 14000;
const LYRIC_PLACEMENT_X_MIN = 0.13;
const LYRIC_PLACEMENT_X_MAX = 0.87;
const LYRIC_PLACEMENT_DEPTH_MIN = 0.07;
const LYRIC_PLACEMENT_DEPTH_MAX = 0.55;
const LYRIC_PLACEMENT_WATER_HEIGHT = 0.535;
const LYRIC_PLACEMENT_CANDIDATE_COUNT = 10;
const LYRIC_PLACEMENT_AVOID_HALF_WIDTH = 0.13;
const LYRIC_PLACEMENT_AVOID_HALF_HEIGHT = 0.075;

const lake = createLakeScene($("#lake-scene"));
const player = createTextAlivePlayer($("#media"));

let activeSong = null;
let phrases = [];
let lyricChunks = [];
let segments = [];
let maxAmplitude = 1;
let readyToPlay = false;
let lyricChunkCursor = 0;
let previousPosition = 0;
let lastBeatToken = null;
let previousLyricPosition = null;

renderSongList();
bindControls();
restoreDockState();
initializeVolumeControl();
setTransportEnabled(false);

player.addListener({
  onAppReady(app) {
    $("#status").textContent = app.managed
      ? "Waiting for the TextAlive host song..."
      : "Ready. Choose a target song.";
  },

  onVideoReady(video) {
    const song = player.data.song;
    phrases = collectPhrases(video);
    const words = collectWords(video);
    lyricChunks = words.length > 0
      ? buildLyricChunks(words, { findBeat: (position) => player.findBeat(position) })
      : phrases.map((phrase) => ({
        startTime: phrase.startTime,
        endTime: phrase.endTime,
        text: phrase.text,
      }));
    segments = collectSegments(player);
    lyricChunkCursor = 0;
    previousPosition = 0;
    lastBeatToken = null;
    previousLyricPosition = null;

    $("#song-title").textContent = song.name || activeSong?.title || "-";
    $("#song-artist").textContent = song.artist?.name || activeSong?.artist || "-";
    $("#now-duration").textContent = formatTime(video.duration);
    $("#status").textContent = `${phrases.length} phrases / ${words.length} words / ${lyricChunks.length} chunks loaded`;

    setTransportEnabled(readyToPlay);
  },

  onTimerReady() {
    readyToPlay = true;
    try {
      maxAmplitude = player.getMaxVocalAmplitude() || 1;
    } catch {
      maxAmplitude = 1;
    }
    setTransportEnabled(true);
    syncMediaElementVolume(getVolumeValue());
  },

  onMediaElementSet() {
    syncMediaElementVolume(getVolumeValue());
  },

  onVolumeUpdate(volume) {
    updateVolumeDisplay(volume);
    syncMediaElementVolume(volume);
  },

  onTimeUpdate(position) {
    updatePlayback(position);
  },

  onPlay() {
    lake.setAmbientRipplesEnabled(false);
  },

  onPause() {
    lake.setAmbientRipplesEnabled(true);
  },

  onStop() {
    lake.setAmbientRipplesEnabled(true);
    lyricChunkCursor = 0;
    previousPosition = 0;
    lastBeatToken = null;
    previousLyricPosition = null;
    updatePlayback(0);
  },
});

function renderSongList() {
  const list = $("#song-list");
  list.innerHTML = "";

  for (const song of SONGS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "song-card";
    button.dataset.songId = song.id;
    button.innerHTML = `
      <span>${song.award}</span>
      <strong>${song.title}</strong>
      <em>${song.artist}</em>
    `;
    button.addEventListener("click", () => selectSong(song.id));
    list.appendChild(button);
  }
}

function bindControls() {
  $("#btn-play").addEventListener("click", () => player.requestPlay());
  $("#btn-pause").addEventListener("click", () => player.requestPause());
  $("#btn-stop").addEventListener("click", () => player.requestStop());
  $("#btn-toggle-dock").addEventListener("click", toggleDock);
  $("#volume-slider").addEventListener("input", (event) => {
    setVolume(event.currentTarget.value, { persist: true });
  });
}

function initializeVolumeControl() {
  setVolume(readStoredVolume(), { persist: false });
}

function readStoredVolume() {
  try {
    const storedValue = localStorage.getItem(VOLUME_KEY);
    if (storedValue === null) return 100;

    const stored = Number(storedValue);
    return Number.isFinite(stored) ? stored : 100;
  } catch {
    return 100;
  }
}

function getVolumeValue() {
  return Number($("#volume-slider")?.value ?? player.volume ?? 100);
}

function setVolume(value, { persist = false } = {}) {
  const volume = Math.round(clamp(Number(value), 0, 100));
  player.volume = volume;
  updateVolumeDisplay(volume);
  syncMediaElementVolume(volume);

  if (persist) {
    try {
      localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      // Persisting the audio state is optional.
    }
  }
}

function updateVolumeDisplay(volume) {
  const safeVolume = Math.round(clamp(Number(volume), 0, 100));
  const slider = $("#volume-slider");
  const label = $("#volume-label");
  if (slider) slider.value = String(safeVolume);
  if (label) label.textContent = `${safeVolume}%`;
}

function syncMediaElementVolume(volume) {
  const mediaVolume = clamp(Number(volume), 0, 100) / 100;
  document.querySelectorAll("#media audio, #media video").forEach((element) => {
    element.volume = mediaVolume;
    element.muted = mediaVolume === 0;
  });
}

function restoreDockState() {
  let collapsed = false;
  try {
    collapsed = localStorage.getItem(DOCK_COLLAPSED_KEY) === "true";
  } catch {
    collapsed = false;
  }
  setDockCollapsed(collapsed);
}

function toggleDock() {
  const collapsed = !$("#control-dock").classList.contains("collapsed");
  setDockCollapsed(collapsed);
  try {
    localStorage.setItem(DOCK_COLLAPSED_KEY, String(collapsed));
  } catch {
    // Persisting the view state is optional.
  }
}

function setDockCollapsed(collapsed) {
  $("#control-dock").classList.toggle("collapsed", collapsed);
  $("#app").classList.toggle("dock-collapsed", collapsed);
  $("#btn-toggle-dock").textContent = collapsed ? "Show controls" : "Hide panel";
  $("#btn-toggle-dock").setAttribute("aria-expanded", String(!collapsed));
}

function selectSong(songId) {
  activeSong = findSong(songId);
  phrases = [];
  lyricChunks = [];
  segments = [];
  readyToPlay = false;
  lyricChunkCursor = 0;
  previousPosition = 0;
  lastBeatToken = null;
  previousLyricPosition = null;

  setTransportEnabled(false);
  markActiveSong();
  resetDisplay();
  $("#status").textContent = `Loading ${activeSong.title}...`;

  loadSong(player, activeSong);
}

function markActiveSong() {
  document.querySelectorAll(".song-card").forEach((button) => {
    button.classList.toggle("active", button.dataset.songId === activeSong?.id);
  });
}

function resetDisplay() {
  $("#song-title").textContent = activeSong.title;
  $("#song-artist").textContent = activeSong.artist;
  $("#now-position").textContent = formatTime(0);
  $("#now-duration").textContent = "-";
  $("#beat-label").textContent = "-";
  $("#chorus-label").textContent = "-";
  $("#amp-label").textContent = "-";
  $("#progress-bar").style.width = "0%";
  lake.setAudioState({ amplitude: 0, chorus: false });
  lake.setSongProgress(0);
}

function setTransportEnabled(enabled) {
  for (const id of ["#btn-play", "#btn-pause", "#btn-stop"]) {
    $(id).disabled = !enabled;
  }
}

function updatePlayback(position) {
  const duration = player.video?.duration ?? 0;
  const progress = duration > 0 ? clamp(position / duration, 0, 1) : 0;
  const chorus = segments.find((segment) => segment.chorus && segment.startTime <= position && position < segment.endTime);
  const amplitude = readAmplitude(position);
  const beat = readBeat(position);

  if (position < previousPosition || Math.abs(position - previousPosition) > 1400) {
    lyricChunkCursor = findLyricChunkCursor(position);
    lastBeatToken = null;
    previousLyricPosition = null;
  }

  previousPosition = position;

  $("#now-position").textContent = formatTime(position);
  $("#progress-bar").style.width = `${progress * 100}%`;
  $("#beat-label").textContent = beat ? `${beat.position}/${beat.length}` : "-";
  $("#chorus-label").textContent = chorus ? "on" : "off";
  $("#amp-label").textContent = amplitude.toFixed(2);

  lake.setAudioState({ amplitude, chorus: Boolean(chorus) });
  lake.setSongProgress(progress);
  pulseBeatIfNeeded(beat, position, amplitude);
  spawnDueLyricChunks(position, amplitude, Boolean(chorus));
}

function readAmplitude(position) {
  try {
    return Math.min(1, Math.max(0, player.getVocalAmplitude(position) / maxAmplitude));
  } catch {
    return 0;
  }
}

function readBeat(position) {
  try {
    return player.findBeat(position + 30);
  } catch {
    return null;
  }
}

function pulseBeatIfNeeded(beat, position, amplitude) {
  if (!beat) return;

  const token = Number.isFinite(beat.startTime) ? beat.startTime : Math.floor(position / 420);
  if (token === lastBeatToken) return;

  lastBeatToken = token;
  lake.pulseBeat(0.24 + amplitude * 0.42);
}

function spawnDueLyricChunks(position, amplitude, chorus) {
  while (lyricChunkCursor < lyricChunks.length && lyricChunks[lyricChunkCursor].startTime <= position + LYRIC_SPAWN_LEAD_MS) {
    const chunk = lyricChunks[lyricChunkCursor];
    if (chunk.endTime >= position - 420 && chunk.text?.trim()) {
      spawnLyricChunkRipple(chunk, amplitude, chorus);
    }
    lyricChunkCursor += 1;
  }
}

function spawnLyricChunkRipple(chunk, amplitude, chorus) {
  const { x, y } = getLyricPlacementPosition(chunk);
  const strength = 0.36 + amplitude * 0.72 + (chorus ? 0.22 : 0);

  lake.addRipple(x, y, strength);
  spawnLyricDrop(chunk.text, x, y, chorus, getLyricDropDuration(chunk));
}

function getLyricPlacementPosition(chunk) {
  const candidates = createLyricPlacementCandidates(chunk);
  const position = chooseLyricPlacementCandidate(candidates);
  previousLyricPosition = toScreenPosition(position);

  return position;
}

function createLyricPlacementCandidates(chunk) {
  const baseSeed = hashString(`${activeSong?.id ?? "song"}-${chunk.startTime}-${chunk.text}`);
  const candidates = [];

  for (let attempt = 0; attempt < LYRIC_PLACEMENT_CANDIDATE_COUNT; attempt += 1) {
    const jitterSeed = hashString(`${baseSeed}-${attempt}`);
    const x = LYRIC_PLACEMENT_X_MIN
      + randomUnit(jitterSeed, 1) * (LYRIC_PLACEMENT_X_MAX - LYRIC_PLACEMENT_X_MIN);
    const nearDepth = LYRIC_PLACEMENT_DEPTH_MIN
      + Math.pow(randomUnit(jitterSeed, 2), 1.25) * (LYRIC_PLACEMENT_DEPTH_MAX - LYRIC_PLACEMENT_DEPTH_MIN);

    candidates.push({
      x,
      y: LYRIC_PLACEMENT_WATER_HEIGHT * (1 - nearDepth),
    });
  }

  return candidates;
}

function chooseLyricPlacementCandidate(candidates) {
  if (!previousLyricPosition) return candidates[0];

  let bestCandidate = candidates[0];
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const screenPosition = toScreenPosition(candidate);
    const score = getAvoidScore(screenPosition, previousLyricPosition);
    if (!isInsideAvoidRect(screenPosition, previousLyricPosition)) {
      return candidate;
    }
    if (score > bestScore) {
      bestCandidate = candidate;
      bestScore = score;
    }
  }

  return bestCandidate;
}

function isInsideAvoidRect(position, previousPosition) {
  return Math.abs(position.x - previousPosition.x) < LYRIC_PLACEMENT_AVOID_HALF_WIDTH
    && Math.abs(position.y - previousPosition.y) < LYRIC_PLACEMENT_AVOID_HALF_HEIGHT;
}

function getAvoidScore(position, previousPosition) {
  const dx = Math.abs(position.x - previousPosition.x) / LYRIC_PLACEMENT_AVOID_HALF_WIDTH;
  const dy = Math.abs(position.y - previousPosition.y) / LYRIC_PLACEMENT_AVOID_HALF_HEIGHT;
  return dx * dx + dy * dy;
}

function toScreenPosition(position) {
  return {
    x: position.x,
    y: 1 - position.y,
  };
}

function spawnLyricDrop(text, x, y, chorus, duration) {
  const effect = document.createElement("span");
  effect.className = `lyric-drop${chorus ? " chorus" : ""}`;
  effect.textContent = trimLyricText(text);
  const nearDepth = clamp((0.565 - y) / 0.565, 0, 1);
  const scale = 0.5 + nearDepth * 0.78;
  const opacity = 0.45 + nearDepth * 0.55;
  effect.style.setProperty("--drop-start-scale", String(scale * 0.58));
  effect.style.setProperty("--drop-mid-scale", String(scale));
  effect.style.setProperty("--drop-end-scale", String(scale * 1.18));
  effect.style.setProperty("--drop-opacity", String(opacity));
  effect.style.left = `${x * 100}%`;
  effect.style.top = `${(1 - y) * 100}%`;
  $("#lyric-effects").appendChild(effect);
  animateLyricDrop(effect, { duration, opacity, scale });
}

function getLyricDropDuration(chunk) {
  const rawDuration = Number(chunk.endTime) - Number(chunk.startTime);
  const chunkDuration = Number.isFinite(rawDuration) ? Math.max(0, rawDuration) : 0;
  return Math.round(clamp(
    chunkDuration + LYRIC_SPAWN_LEAD_MS + LYRIC_FADE_OUT_MS,
    LYRIC_BASE_DROP_MS,
    LYRIC_MAX_DROP_MS,
  ));
}

function animateLyricDrop(effect, { duration, opacity, scale }) {
  const introMs = 420;
  const fadeDelay = Math.max(introMs, duration - LYRIC_FADE_OUT_MS);
  const driftEndDelay = Math.min(fadeDelay, introMs + LYRIC_DRIFT_MS);

  effect.style.transition = "none";
  effect.style.opacity = "0";
  effect.style.filter = "blur(4px)";
  effect.style.transform = `translate(-50%, -40%) scale(${scale * 0.58})`;

  scheduleAnimationFrame(() => {
    if (!effect.isConnected) return;
    effect.style.transition = [
      `opacity ${introMs}ms ease-out`,
      `filter ${introMs}ms ease-out`,
      `transform ${introMs}ms ease-out`,
    ].join(", ");
    effect.style.opacity = String(opacity);
    effect.style.filter = "blur(0)";
    effect.style.transform = `translate(-50%, -50%) scale(${scale})`;
  });

  setTimeout(() => {
    if (!effect.isConnected) return;
    effect.style.transition = `transform ${LYRIC_DRIFT_MS}ms ease-out`;
    effect.style.transform = `translate(-50%, -62%) scale(${scale * 1.06})`;
  }, introMs);

  setTimeout(() => {
    if (!effect.isConnected) return;
    effect.style.transition = [
      `opacity ${LYRIC_FADE_OUT_MS}ms ease-out`,
      `filter ${LYRIC_FADE_OUT_MS}ms ease-out`,
      `transform ${LYRIC_FADE_OUT_MS}ms ease-out`,
    ].join(", ");
    effect.style.opacity = "0";
    effect.style.filter = "blur(3px)";
    effect.style.transform = `translate(-50%, -82%) scale(${scale * 1.18})`;
  }, Math.max(fadeDelay, driftEndDelay));

  setTimeout(() => effect.remove(), duration + 80);
}

function scheduleAnimationFrame(callback) {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(callback);
    return;
  }

  setTimeout(callback, 16);
}

function findLyricChunkCursor(position) {
  let low = 0;
  let high = lyricChunks.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (lyricChunks[middle].startTime < position) low = middle + 1;
    else high = middle;
  }
  return low;
}

function trimLyricText(text) {
  const value = text.trim();
  return value.length > 14 ? `${value.slice(0, 14)}...` : value;
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomUnit(seed, salt) {
  const x = Math.sin((seed + salt * 1013) * 0.000001) * 43758.5453123;
  return x - Math.floor(x);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
