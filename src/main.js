import { createLakeScene } from "./lakeScene.js";
import { SONGS, findSong } from "./songs.js";
import { SOUNDMARKS } from "./soundmarks.js";
import { buildLyricChunks, collectPhrases, collectSegments, collectWords } from "./lyrics.js";
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
const LYRIC_GUIDE_LEAD_MS = 80;
const LYRIC_GUIDE_TAIL_MS = 420;
const LYRIC_GUIDE_SINGLE_LINE_MAX = 9;
const SCENE_HORIZON_Y = 0.565;
const TORII_CENTER_X = 0.341;
const TORII_ASSET_ASPECT = 1.248;
const TORII_SCENE_WATERLINE_MIX = 0.12;
const TORII_WATERLINE_LOCAL = 0.108;
const TORII_REFLECTION_PILLAR_LOCAL_X = [0.26, 0.74];
const TORII_EXCLUSION_MARGIN_X = 0.045;
const TORII_EXCLUSION_SCREEN_TOP = 0.33;
const TORII_EXCLUSION_SCREEN_BOTTOM = 0.58;
const SOUNDMARK_PANEL_EXCLUSION_LEFT = 0.665;
const SOUNDMARK_PANEL_EXCLUSION_RIGHT = 0.995;
const SOUNDMARK_PANEL_EXCLUSION_BOTTOM = 0.13;
const SOUNDMARK_PANEL_EXCLUSION_TOP = 0.90;
const SOUNDMARK_PLACEMENT_LEFT = 0.12;
const SOUNDMARK_PLACEMENT_RIGHT = 0.76;
const SOUNDMARK_PLACEMENT_TOP = 0.50;
const SOUNDMARK_PLACEMENT_FALLBACK_BOTTOM = 0.22;
const SOUNDMARK_PLACEMENT_DOCK_MARGIN_PX = 24;
const SOUNDMARK_PIN_HALF_WIDTH_PX = 30;
const SOUNDMARK_PIN_HALF_HEIGHT_PX = 38;
const SOUNDMARK_PLACEMENT_CANDIDATE_COUNT = 24;
const SOUNDMARK_REWIND_RESET_DELTA = 0.08;
const DEBUG_MODE = new URLSearchParams(window.location.search).get("debug");
const DEBUG_TORII_EXCLUSION_ZONE = DEBUG_MODE === "torii-zone";
const DEBUG_TORII_REFLECTION = DEBUG_MODE === "torii-reflection";
const DEBUG_SOUNDMARKS = DEBUG_MODE === "soundmarks";
const DEBUG_SOUNDMARK_DEFAULT_PROGRESS = 0.58;
const DEBUG_PLAYER_DURATION_MS = 298000;
const PROGRESS_SCALE = 1000;
const DEBUG_SOUNDMARK_PHASES = [
  { label: "Day", progress: 0.06 },
  { label: "Sunset", progress: 0.34 },
  { label: "Twilight", progress: 0.58 },
  { label: "Night", progress: 0.86 },
];
const LYRIC_GUIDE_PALETTES = {
  day: {
    ink: [250, 255, 255, 0.96],
    active: [255, 255, 255, 1],
    edge: [0, 48, 68, 0.38],
    shadow: [0, 34, 52, 0.34],
    glow: [0, 34, 52, 0.18],
    activeGlow: [255, 255, 255, 0.26],
    chorusGlow: [255, 219, 116, 0.18],
  },
  sunset: {
    ink: [112, 51, 35, 0.94],
    active: [255, 230, 154, 0.98],
    edge: [255, 232, 174, 0.25],
    shadow: [98, 31, 18, 0.30],
    glow: [255, 161, 72, 0.16],
    activeGlow: [255, 219, 116, 0.30],
    chorusGlow: [255, 219, 116, 0.30],
  },
  twilight: {
    ink: [206, 194, 233, 0.90],
    active: [255, 245, 232, 0.98],
    edge: [255, 245, 232, 0.24],
    shadow: [37, 21, 78, 0.34],
    glow: [150, 118, 220, 0.18],
    activeGlow: [255, 245, 232, 0.24],
    chorusGlow: [255, 219, 116, 0.22],
  },
  night: {
    ink: [216, 237, 255, 0.90],
    active: [255, 255, 250, 1],
    edge: [255, 255, 255, 0.18],
    shadow: [103, 174, 255, 0.34],
    glow: [103, 174, 255, 0.32],
    activeGlow: [255, 255, 250, 0.28],
    chorusGlow: [255, 219, 116, 0.20],
  },
};
const SOUNDMARK_PALETTES = {
  day: {
    panelBg: [214, 250, 255, 0.075],
    panelBgDeep: [16, 76, 96, 0.105],
    border: [236, 255, 255, 0.720],
    ink: [246, 255, 255, 0.960],
    muted: [221, 248, 250, 0.760],
    accent: [125, 241, 237, 0.820],
    glow: [92, 224, 229, 0.360],
    caustic: [255, 255, 255, 0.260],
    pin: [232, 255, 255, 0.940],
    ring: [104, 238, 236, 0.460],
    core: [255, 255, 255, 0.880],
  },
  sunset: {
    panelBg: [255, 206, 155, 0.085],
    panelBgDeep: [98, 54, 42, 0.115],
    border: [255, 226, 154, 0.700],
    ink: [255, 247, 229, 0.960],
    muted: [255, 230, 194, 0.780],
    accent: [255, 217, 127, 0.900],
    glow: [255, 171, 83, 0.380],
    caustic: [255, 221, 148, 0.280],
    pin: [255, 238, 183, 0.950],
    ring: [255, 200, 102, 0.500],
    core: [255, 250, 226, 0.900],
  },
  twilight: {
    panelBg: [166, 154, 255, 0.080],
    panelBgDeep: [42, 54, 110, 0.130],
    border: [216, 205, 255, 0.700],
    ink: [245, 244, 255, 0.960],
    muted: [219, 216, 249, 0.780],
    accent: [199, 189, 255, 0.880],
    glow: [146, 120, 255, 0.360],
    caustic: [220, 213, 255, 0.270],
    pin: [222, 220, 255, 0.950],
    ring: [175, 159, 255, 0.500],
    core: [250, 248, 255, 0.900],
  },
  night: {
    panelBg: [52, 104, 160, 0.075],
    panelBgDeep: [8, 24, 48, 0.170],
    border: [178, 224, 255, 0.720],
    ink: [234, 247, 255, 0.970],
    muted: [185, 218, 244, 0.800],
    accent: [139, 222, 255, 0.880],
    glow: [91, 180, 255, 0.400],
    caustic: [164, 225, 255, 0.280],
    pin: [205, 238, 255, 0.960],
    ring: [108, 204, 255, 0.520],
    core: [244, 252, 255, 0.920],
  },
};

const lake = createLakeScene($("#lake-scene"));
const player = createTextAlivePlayer($("#media"));

let activeSong = null;
let phrases = [];
let lyricWords = [];
let lyricChunks = [];
let guidePhrases = [];
let segments = [];
let maxAmplitude = 1;
let readyToPlay = false;
let lyricChunkCursor = 0;
let previousPosition = 0;
let lastBeatToken = null;
let previousLyricPosition = null;
let activeGuidePhraseKey = null;
const spawnedSoundmarkIds = new Set();
const soundmarkPositions = new Map();
let activeSoundmarkId = null;
let soundmarkLastProgress = 0;
let soundmarkCloseTimer = null;
let debugSoundmarkProgress = DEBUG_SOUNDMARK_DEFAULT_PROGRESS;
let debugPlaybackActive = false;
let playbackActive = false;
let isProgressScrubbing = false;

renderSongList();
bindControls();
restoreDockState();
initializeVolumeControl();
initializeSoundmarks();
initializeSoundmarkDebugMode();
initializeSoundmarkPlacementOverlay();
initializeToriiExclusionZoneOverlay();
initializeToriiReflectionOverlay();
setTransportEnabled(false);

player.addListener({
  onAppReady(app) {
    if (DEBUG_SOUNDMARKS) {
      $("#status").textContent = "Soundmark debug mode. Playback is not required.";
      return;
    }

    $("#status").textContent = app.managed
      ? "Waiting for the TextAlive host song..."
      : "Ready. Choose a target song.";
  },

  onVideoReady(video) {
    const song = player.data.song;
    phrases = collectPhrases(video);
    lyricWords = collectWords(video);
    lyricChunks = lyricWords.length > 0
      ? buildLyricChunks(lyricWords, { findBeat: (position) => player.findBeat(position) })
      : phrases.map((phrase) => ({
        startTime: phrase.startTime,
        endTime: phrase.endTime,
        text: phrase.text,
      }));
    guidePhrases = buildLyricGuidePhrases(phrases, lyricWords);
    segments = collectSegments(player);
    lyricChunkCursor = 0;
    previousPosition = 0;
    lastBeatToken = null;
    previousLyricPosition = null;
    activeGuidePhraseKey = null;
    resetSoundmarks();

    $("#song-title").textContent = song.name || activeSong?.title || "-";
    $("#song-artist").textContent = song.artist?.name || activeSong?.artist || "-";
    $("#now-duration").textContent = formatPlayerTime(video.duration);
    $("#status").textContent = `${phrases.length} phrases / ${lyricWords.length} words / ${lyricChunks.length} chunks loaded`;

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
    playbackActive = true;
    lake.setAmbientRipplesEnabled(false);
    updatePlayPauseButton();
  },

  onPause() {
    playbackActive = false;
    lake.setAmbientRipplesEnabled(true);
    updatePlayPauseButton();
  },

  onStop() {
    playbackActive = false;
    lake.setAmbientRipplesEnabled(true);
    lyricChunkCursor = 0;
    previousPosition = 0;
    lastBeatToken = null;
    previousLyricPosition = null;
    activeGuidePhraseKey = null;
    resetSoundmarks();
    updatePlayback(0);
    updatePlayPauseButton();
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
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", "false");
    button.innerHTML = `
      <span>${song.award}</span>
      <strong>${song.title}</strong>
      <em>${song.artist}</em>
    `;
    button.addEventListener("click", () => {
      selectSong(song.id);
      setSongMenuOpen(false);
    });
    list.appendChild(button);
  }
}

function bindControls() {
  $("#btn-play").addEventListener("click", togglePlayback);
  $("#btn-stop").addEventListener("click", stopPlayback);
  $("#btn-prev-song").addEventListener("click", () => selectAdjacentSong(-1));
  $("#btn-next-song").addEventListener("click", () => selectAdjacentSong(1));
  $("#btn-song-menu").addEventListener("click", (event) => {
    event.stopPropagation();
    setSongMenuOpen($("#song-list").hidden);
  });
  $("#btn-toggle-dock").addEventListener("click", toggleDock);
  $("#volume-slider").addEventListener("input", (event) => {
    setVolume(event.currentTarget.value, { persist: true });
  });
  $("#progress-slider").addEventListener("input", handleProgressInput);
  $("#progress-slider").addEventListener("change", handleProgressCommit);
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".song-select")) setSongMenuOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setSongMenuOpen(false);
  });
}

function togglePlayback() {
  if (DEBUG_SOUNDMARKS) {
    debugPlaybackActive = !debugPlaybackActive;
    lake.setAmbientRipplesEnabled(!debugPlaybackActive);
    updatePlayPauseButton();
    return;
  }

  if (!readyToPlay) return;

  if (isPlaybackActive()) {
    player.requestPause();
  } else {
    player.requestPlay();
  }
}

function stopPlayback() {
  if (DEBUG_SOUNDMARKS) {
    debugPlaybackActive = false;
    lake.setAmbientRipplesEnabled(true);
    setDebugSoundmarkProgress(debugSoundmarkProgress);
    updatePlayPauseButton();
    return;
  }

  playbackActive = false;
  player.requestStop();
  updatePlayPauseButton();
}

function selectAdjacentSong(direction) {
  if (!activeSong) {
    selectSong(SONGS[0].id);
    return;
  }

  const currentIndex = Math.max(0, SONGS.findIndex((song) => song.id === activeSong.id));
  const nextIndex = (currentIndex + direction + SONGS.length) % SONGS.length;
  selectSong(SONGS[nextIndex].id);
}

function setSongMenuOpen(open) {
  const list = $("#song-list");
  const button = $("#btn-song-menu");
  if (!list || !button) return;

  list.hidden = !open;
  button.setAttribute("aria-expanded", String(open));
  button.classList.toggle("is-open", open);
}

function handleProgressInput(event) {
  const progress = clamp(Number(event.currentTarget.value) / PROGRESS_SCALE, 0, 1);
  isProgressScrubbing = true;
  updateProgressDisplay(progress, { syncSlider: false });

  if (DEBUG_SOUNDMARKS) {
    setDebugSoundmarkProgress(progress);
    return;
  }

  const duration = player.video?.duration ?? 0;
  if (duration > 0) $("#now-position").textContent = formatPlayerTime(progress * duration);
}

function handleProgressCommit(event) {
  const progress = clamp(Number(event.currentTarget.value) / PROGRESS_SCALE, 0, 1);
  isProgressScrubbing = false;

  if (DEBUG_SOUNDMARKS) {
    setDebugSoundmarkProgress(progress);
    return;
  }

  seekToProgress(progress);
}

function seekToProgress(progress) {
  const duration = player.video?.duration ?? 0;
  if (!readyToPlay || duration <= 0) return;

  const position = clamp(progress, 0, 1) * duration;
  player.requestMediaSeek(position);
  updatePlayback(position);
}

function formatPlayerTime(ms) {
  if (ms == null || Number.isNaN(ms)) return "-";

  const safeMs = Math.max(0, Number(ms));
  const minutes = Math.floor(safeMs / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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
  $("#btn-toggle-dock").title = collapsed ? "Show controls" : "Hide controls";
  $("#btn-toggle-dock").setAttribute("aria-label", collapsed ? "Show controls" : "Hide controls");
  $("#btn-toggle-dock").setAttribute("aria-expanded", String(!collapsed));
  if (collapsed) setSongMenuOpen(false);
  scheduleAnimationFrame(updateSoundmarkPlacementOverlay);
  setTimeout(updateSoundmarkPlacementOverlay, 220);
}

function selectSong(songId) {
  activeSong = findSong(songId);
  phrases = [];
  lyricWords = [];
  lyricChunks = [];
  guidePhrases = [];
  segments = [];
  readyToPlay = false;
  playbackActive = false;
  lyricChunkCursor = 0;
  previousPosition = 0;
  lastBeatToken = null;
  previousLyricPosition = null;
  activeGuidePhraseKey = null;
  resetSoundmarks();

  setTransportEnabled(false);
  markActiveSong();
  resetDisplay();
  if (DEBUG_SOUNDMARKS) {
    $("#status").textContent = "Soundmark debug mode. Playback is not required.";
    setDebugSoundmarkProgress(debugSoundmarkProgress);
    showDebugSoundmarks();
    return;
  }

  $("#status").textContent = `Loading ${activeSong.title}...`;
  loadSong(player, activeSong);
}

function markActiveSong() {
  document.querySelectorAll(".song-card").forEach((button) => {
    const active = button.dataset.songId === activeSong?.id;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function resetDisplay() {
  $("#song-title").textContent = activeSong.title;
  $("#song-artist").textContent = activeSong.artist;
  $("#now-position").textContent = formatPlayerTime(0);
  $("#now-duration").textContent = "-";
  $("#beat-label").textContent = "-";
  $("#chorus-label").textContent = "-";
  $("#amp-label").textContent = "-";
  updateProgressDisplay(0);
  updatePlayPauseButton();
  lake.setAudioState({ amplitude: 0, chorus: false });
  lake.setSongProgress(0);
  resetLyricGuide();
  resetSoundmarks();
}

function setTransportEnabled(enabled) {
  const transportEnabled = enabled || DEBUG_SOUNDMARKS;
  for (const id of ["#btn-play", "#btn-stop"]) {
    const button = $(id);
    if (button) button.disabled = !transportEnabled;
  }

  const progressSlider = $("#progress-slider");
  if (progressSlider) progressSlider.disabled = !transportEnabled;
  updatePlayPauseButton();
}

function updatePlayPauseButton() {
  const button = $("#btn-play");
  const icon = $("#play-icon");
  if (!button || !icon) return;

  const playing = isPlaybackActive();
  button.setAttribute("aria-label", playing ? "Pause" : "Play");
  button.title = playing ? "Pause" : "Play";
  icon.textContent = playing ? "Ⅱ" : "▶";
}

function isPlaybackActive() {
  return DEBUG_SOUNDMARKS ? debugPlaybackActive : playbackActive;
}

function updateProgressDisplay(progress, { syncSlider = true } = {}) {
  const clampedProgress = clamp(progress, 0, 1);
  const progressBar = $("#progress-bar");
  if (progressBar) progressBar.style.width = `${clampedProgress * 100}%`;

  const slider = $("#progress-slider");
  if (slider && syncSlider && !isProgressScrubbing) {
    slider.value = String(Math.round(clampedProgress * PROGRESS_SCALE));
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

  if (!isProgressScrubbing) $("#now-position").textContent = formatPlayerTime(position);
  updateProgressDisplay(progress);
  $("#beat-label").textContent = beat ? `${beat.position}/${beat.length}` : "-";
  $("#chorus-label").textContent = chorus ? "on" : "off";
  $("#amp-label").textContent = amplitude.toFixed(2);

  lake.setAudioState({ amplitude, chorus: Boolean(chorus) });
  lake.setSongProgress(progress);
  updateSoundmarkSystem(progress);
  updateLyricGuide(position, progress, Boolean(chorus));
  pulseBeatIfNeeded(beat, position, amplitude);
  spawnDueLyricChunks(position, amplitude, Boolean(chorus));
}

function buildLyricGuidePhrases(sourcePhrases, words) {
  return sourcePhrases.map((phrase, index) => ({
    ...phrase,
    key: `${index}-${phrase.startTime}-${phrase.endTime}`,
    words: words.filter((word) => isWordInPhrase(word, phrase)),
  }));
}

function isWordInPhrase(word, phrase) {
  if (word?.parent && phrase?.ref && word.parent === phrase.ref) return true;

  const startTime = Number(word?.startTime);
  const endTime = Number(word?.endTime);
  return Number.isFinite(startTime)
    && Number.isFinite(endTime)
    && startTime >= phrase.startTime - 1
    && endTime <= phrase.endTime + 1;
}

function updateLyricGuide(position, progress, chorus) {
  const guide = $("#lyric-guide");
  if (!guide) return;

  applyLyricGuidePalette(guide, progress);
  guide.dataset.phase = getLyricGuidePhaseLabel(progress);
  guide.classList.toggle("chorus", chorus);

  const phrase = findLyricGuidePhrase(position);
  if (!phrase?.text?.trim()) {
    hideLyricGuide();
    return;
  }

  if (activeGuidePhraseKey !== phrase.key) {
    activeGuidePhraseKey = phrase.key;
    renderLyricGuidePhrase(phrase);
  }

  guide.classList.remove("is-empty");
  guide.setAttribute("aria-label", phrase.text);
  updateLyricGuideWordState(position);
}

function findLyricGuidePhrase(position) {
  const activePhrase = guidePhrases.find((phrase) =>
    phrase.startTime - LYRIC_GUIDE_LEAD_MS <= position
      && position < phrase.endTime,
  );
  if (activePhrase) return activePhrase;

  return guidePhrases.find((phrase) =>
    phrase.endTime <= position
      && position < phrase.endTime + LYRIC_GUIDE_TAIL_MS,
  ) ?? null;
}

function renderLyricGuidePhrase(phrase) {
  const guide = $("#lyric-guide");
  if (!guide) return;

  const lines = splitLyricGuideUnits(getLyricGuideUnits(phrase));
  const container = document.createElement("div");
  container.className = "lyric-guide-lines";

  for (const lineUnits of lines) {
    if (lineUnits.length === 0) continue;

    const line = document.createElement("span");
    line.className = "guide-line";

    lineUnits.forEach((unit, index) => {
      const word = document.createElement("span");
      word.className = "guide-word";
      word.textContent = `${shouldPrefixGuideSpace(lineUnits[index - 1], unit) ? " " : ""}${unit.text}`;
      if (Number.isFinite(unit.startTime)) word.dataset.start = String(unit.startTime);
      if (Number.isFinite(unit.endTime)) word.dataset.end = String(unit.endTime);
      line.appendChild(word);
    });

    container.appendChild(line);
  }

  guide.replaceChildren(container);
}

function getLyricGuideUnits(phrase) {
  const timedWords = phrase.words
    .filter((word) => word.text?.trim())
    .map((word) => ({
      text: word.text.trim(),
      startTime: Number(word.startTime),
      endTime: Number(word.endTime),
      language: word.language,
    }));

  if (timedWords.length > 0) return timedWords;

  return [...phrase.text.trim()].map((text) => ({
    text,
    startTime: Number.NaN,
    endTime: Number.NaN,
    language: "ja",
  }));
}

function splitLyricGuideUnits(units) {
  const totalLength = getGuideUnitsLength(units);
  if (totalLength <= LYRIC_GUIDE_SINGLE_LINE_MAX || units.length < 2) return [units, []];

  let bestIndex = 1;
  let bestScore = Infinity;
  let prefixLength = 0;

  for (let index = 1; index < units.length; index += 1) {
    prefixLength += getVisibleLength(units[index - 1].text);
    const previous = units[index - 1].text;
    const current = units[index].text;
    const balanceScore = Math.abs(totalLength * 0.5 - prefixLength);
    const punctuationBonus = /[、。,.!?！？]$/.test(previous) ? -2.6 : 0;
    const awkwardBreakPenalty = /^[、。,.!?！？)]/.test(current) || /[(（「『]$/.test(previous) ? 4 : 0;
    const score = balanceScore + punctuationBonus + awkwardBreakPenalty;

    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return [units.slice(0, bestIndex), units.slice(bestIndex)];
}

function updateLyricGuideWordState(position) {
  const guide = $("#lyric-guide");
  if (!guide) return;

  guide.querySelectorAll(".guide-word").forEach((word) => {
    const start = Number(word.dataset.start);
    const end = Number(word.dataset.end);
    const timed = Number.isFinite(start) && Number.isFinite(end);
    const active = timed && start - 60 <= position && position < end + 140;
    const past = timed && end + 140 <= position;

    word.classList.toggle("active", active);
    word.classList.toggle("past", past);
  });
}

function hideLyricGuide() {
  const guide = $("#lyric-guide");
  if (!guide) return;

  guide.classList.add("is-empty");
  guide.removeAttribute("aria-label");
  activeGuidePhraseKey = null;
}

function resetLyricGuide() {
  const guide = $("#lyric-guide");
  if (!guide) return;

  guide.replaceChildren();
  guide.classList.add("is-empty");
  guide.dataset.phase = "day";
  applyLyricGuidePalette(guide, 0);
  guide.classList.remove("chorus");
  guide.removeAttribute("aria-label");
  activeGuidePhraseKey = null;
}

function initializeSoundmarks() {
  $("#soundmark-close")?.addEventListener("click", closeSoundmarkPanel);
  applySoundmarkPalette(0);
  closeSoundmarkPanel({ immediate: true });
}

function initializeSoundmarkDebugMode() {
  if (!DEBUG_SOUNDMARKS) return;

  $("#app")?.classList.add("debug-soundmarks");
  activeSong = activeSong ?? SONGS[0];
  $("#song-title").textContent = activeSong.title;
  $("#song-artist").textContent = activeSong.artist;
  readyToPlay = false;
  setTransportEnabled(false);
  setDockCollapsed(false);
  markActiveSong();
  renderSoundmarkDebugTools();
  setDebugSoundmarkProgress(DEBUG_SOUNDMARK_DEFAULT_PROGRESS);
  showDebugSoundmarks();
  openSoundmarkPanel(SOUNDMARKS[0]);
  $("#status").textContent = "Soundmark debug mode. Playback is not required.";
}

function renderSoundmarkDebugTools() {
  const app = $("#app");
  if (!app || $("#soundmark-debug-tools")) return;

  const tools = document.createElement("section");
  tools.id = "soundmark-debug-tools";
  tools.className = "soundmark-debug-tools";
  tools.setAttribute("aria-label", "soundmark debug tools");

  const label = document.createElement("span");
  label.className = "soundmark-debug-label";
  label.textContent = "Soundmark debug";
  tools.appendChild(label);

  for (const phase of DEBUG_SOUNDMARK_PHASES) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.progress = String(phase.progress);
    button.textContent = phase.label;
    button.addEventListener("click", () => setDebugSoundmarkProgress(phase.progress));
    tools.appendChild(button);
  }

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "Close panel";
  closeButton.addEventListener("click", () => closeSoundmarkPanel());
  tools.appendChild(closeButton);

  app.appendChild(tools);
}

function setDebugSoundmarkProgress(progress) {
  debugSoundmarkProgress = clamp(progress, 0, 1);
  soundmarkLastProgress = debugSoundmarkProgress;
  $("#now-position").textContent = formatPlayerTime(debugSoundmarkProgress * DEBUG_PLAYER_DURATION_MS);
  $("#now-duration").textContent = formatPlayerTime(DEBUG_PLAYER_DURATION_MS);
  updateProgressDisplay(debugSoundmarkProgress);
  lake.setSongProgress(debugSoundmarkProgress);
  lake.setAudioState({
    amplitude: 0.36,
    chorus: debugSoundmarkProgress >= 0.42 && debugSoundmarkProgress <= 0.72,
  });
  applySoundmarkPalette(debugSoundmarkProgress);
  renderDebugLyricGuide(debugSoundmarkProgress);
  updateSoundmarkDebugTools();
}

function updateSoundmarkDebugTools() {
  const tools = $("#soundmark-debug-tools");
  if (!tools) return;

  tools.querySelectorAll("button[data-progress]").forEach((button) => {
    const progress = Number(button.dataset.progress);
    button.classList.toggle("active", Math.abs(progress - debugSoundmarkProgress) < 0.001);
  });
}

function showDebugSoundmarks() {
  resetSoundmarkMarkers();
  soundmarkLastProgress = debugSoundmarkProgress;
  for (const soundmark of SOUNDMARKS) {
    spawnSoundmarkMarker(soundmark);
  }
}

function renderDebugLyricGuide(progress) {
  const guide = $("#lyric-guide");
  if (!guide) return;

  activeGuidePhraseKey = "debug-soundmark-guide";
  applyLyricGuidePalette(guide, progress);
  guide.dataset.phase = getLyricGuidePhaseLabel(progress);
  guide.classList.remove("is-empty");
  guide.classList.toggle("chorus", progress >= 0.42 && progress <= 0.72);
  renderLyricGuidePhrase({
    key: activeGuidePhraseKey,
    text: "湖面に映る、音のしるし",
    startTime: 0,
    endTime: 6000,
    words: [
      { text: "湖面に", startTime: 0, endTime: 1200, language: "ja" },
      { text: "映る、", startTime: 1200, endTime: 2400, language: "ja" },
      { text: "音の", startTime: 2400, endTime: 3600, language: "ja" },
      { text: "しるし", startTime: 3600, endTime: 5200, language: "ja" },
    ],
  });
  guide.setAttribute("aria-label", "湖面に映る、音のしるし");
}

function updateSoundmarkSystem(progress) {
  const clampedProgress = clamp(progress, 0, 1);
  applySoundmarkPalette(clampedProgress);

  if (!activeSong || !player.video?.duration) return;

  if (clampedProgress + SOUNDMARK_REWIND_RESET_DELTA < soundmarkLastProgress) {
    resetSoundmarkMarkers();
  }

  soundmarkLastProgress = clampedProgress;

  for (const soundmark of SOUNDMARKS) {
    if (soundmark.progress <= clampedProgress + 0.006) {
      spawnSoundmarkMarker(soundmark);
    }
  }
}

function resetSoundmarks() {
  soundmarkLastProgress = 0;
  resetSoundmarkMarkers();
  closeSoundmarkPanel({ immediate: true });
}

function resetSoundmarkMarkers() {
  spawnedSoundmarkIds.clear();
  soundmarkPositions.clear();
  $("#soundmark-layer")?.replaceChildren();
  closeSoundmarkPanel({ immediate: true });
}

function spawnSoundmarkMarker(soundmark) {
  if (spawnedSoundmarkIds.has(soundmark.id)) return;

  const layer = $("#soundmark-layer");
  if (!layer) return;

  const position = getSoundmarkPosition(soundmark);
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "soundmark-pin";
  marker.dataset.soundmarkId = soundmark.id;
  marker.style.left = `${position.x * 100}%`;
  marker.style.top = `${(1 - position.y) * 100}%`;
  marker.setAttribute("aria-label", `Open soundmark: ${soundmark.title}`);
  marker.title = soundmark.title;

  const symbol = document.createElement("span");
  symbol.className = "soundmark-symbol";
  symbol.textContent = soundmark.symbol;
  marker.appendChild(symbol);

  marker.addEventListener("click", (event) => {
    event.stopPropagation();
    lake.addRipple(position.x, position.y, 0.62);
    openSoundmarkPanel(soundmark);
  });

  layer.appendChild(marker);
  spawnedSoundmarkIds.add(soundmark.id);
  soundmarkPositions.set(soundmark.id, position);
  lake.addRipple(position.x, position.y, 0.24);

  scheduleAnimationFrame(() => marker.classList.add("is-visible"));
}

function getSoundmarkPosition(soundmark) {
  const cached = soundmarkPositions.get(soundmark.id);
  if (cached) return cached;

  const seed = hashString(`${activeSong?.id ?? "song"}-${soundmark.id}`);
  const placementRect = getSoundmarkPlacementRect();
  const forbiddenZones = getSoundmarkPlacementForbiddenZones();
  const idealPosition = createSoundmarkPlacementCandidate(soundmark, seed, placementRect, 0);
  let bestCandidate = idealPosition;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < SOUNDMARK_PLACEMENT_CANDIDATE_COUNT; attempt += 1) {
    const candidate = createSoundmarkPlacementCandidate(soundmark, seed, placementRect, attempt);
    const score = getSoundmarkPlacementCandidateScore(candidate, idealPosition, forbiddenZones);
    if (score > bestScore) {
      bestCandidate = candidate;
      bestScore = score;
    }
  }

  return bestCandidate;
}

function createSoundmarkPlacementCandidate(soundmark, seed, placementRect, attempt) {
  if (attempt === 0) {
    const x = clamp(
      soundmark.x + (randomUnit(seed, 1) - 0.5) * 0.052,
      placementRect.left,
      placementRect.right,
    );
    const rawY = soundmark.y + (randomUnit(seed, 2) - 0.5) * 0.040;
    const liftedY = rawY < placementRect.bottom
      ? placementRect.bottom + randomUnit(seed, 3) * Math.min(0.09, placementRect.top - placementRect.bottom)
      : rawY;
    const y = clamp(liftedY, placementRect.bottom, placementRect.top);
    return { x, y };
  }

  const candidateSeed = hashString(`${seed}-${attempt}`);
  const x = clamp(
    placementRect.left + randomUnit(candidateSeed, 1) * (placementRect.right - placementRect.left),
    placementRect.left,
    placementRect.right,
  );
  const y = clamp(
    placementRect.bottom + randomUnit(candidateSeed, 2) * (placementRect.top - placementRect.bottom),
    placementRect.bottom,
    placementRect.top,
  );

  return { x, y };
}

function getSoundmarkPlacementCandidateScore(candidate, idealPosition, forbiddenZones) {
  const insideForbiddenZone = forbiddenZones.some((zone) => isInsideRect(candidate, zone.rect));
  const dx = candidate.x - idealPosition.x;
  const dy = candidate.y - idealPosition.y;
  const idealDistancePenalty = (dx * dx + dy * dy) * 80;
  const avoidScore = forbiddenZones.reduce((score, zone) => score + getRectAvoidScore(candidate, zone.rect), 0);
  return (insideForbiddenZone ? -100 : 100) + Math.min(avoidScore, 12) * 0.02 - idealDistancePenalty;
}

function getRectAvoidScore(position, rect) {
  const outsideDx = Math.max(rect.left - position.x, 0, position.x - rect.right);
  const outsideDy = Math.max(rect.bottom - position.y, 0, position.y - rect.top);

  if (outsideDx > 0 || outsideDy > 0) {
    return 4 + outsideDx * outsideDx + outsideDy * outsideDy;
  }

  const halfWidth = Math.max((rect.right - rect.left) * 0.5, 0.001);
  const halfHeight = Math.max((rect.top - rect.bottom) * 0.5, 0.001);
  const centerX = (rect.left + rect.right) * 0.5;
  const centerY = (rect.bottom + rect.top) * 0.5;
  const dx = Math.abs(position.x - centerX) / halfWidth;
  const dy = Math.abs(position.y - centerY) / halfHeight;
  return dx * dx + dy * dy;
}

function isInsideRect(position, rect) {
  return rect.left <= position.x
    && position.x <= rect.right
    && rect.bottom <= position.y
    && position.y <= rect.top;
}

function getSoundmarkPlacementRect() {
  const app = $("#app");
  const dock = $("#control-dock");
  const appRect = app?.getBoundingClientRect();
  const dockRect = dock?.getBoundingClientRect();
  const appHeight = appRect?.height || window.innerHeight || 1;
  let bottom = SOUNDMARK_PLACEMENT_FALLBACK_BOTTOM;

  if (appRect && dockRect && appHeight > 0) {
    const dockTopInApp = clamp(dockRect.top - appRect.top, 0, appHeight);
    bottom = (appHeight - dockTopInApp + SOUNDMARK_PLACEMENT_DOCK_MARGIN_PX + SOUNDMARK_PIN_HALF_HEIGHT_PX) / appHeight;
  }

  bottom = clamp(bottom, 0.08, SOUNDMARK_PLACEMENT_TOP - 0.04);

  return {
    left: SOUNDMARK_PLACEMENT_LEFT,
    right: SOUNDMARK_PLACEMENT_RIGHT,
    bottom,
    top: SOUNDMARK_PLACEMENT_TOP,
  };
}

function getSoundmarkPlacementForbiddenZones() {
  const toriiRect = getToriiExclusionRect();
  const panelRect = getSoundmarkPanelExclusionRect();
  return [
    {
      id: "torii",
      label: "No marker: Torii",
      rect: expandSoundmarkRectForPin(toriiRect),
      displayRect: toriiRect,
    },
    {
      id: "panel",
      label: "No marker: Panel",
      rect: expandSoundmarkRectForPin(panelRect),
      displayRect: panelRect,
    },
  ];
}

function expandSoundmarkRectForPin(rect) {
  const halfSize = getSoundmarkPinHalfSize();
  return {
    left: rect.left - halfSize.x,
    right: rect.right + halfSize.x,
    bottom: rect.bottom - halfSize.y,
    top: rect.top + halfSize.y,
  };
}

function getSoundmarkPinHalfSize() {
  const appRect = $("#app")?.getBoundingClientRect();
  const appWidth = appRect?.width || window.innerWidth || 1;
  const appHeight = appRect?.height || window.innerHeight || 1;
  return {
    x: SOUNDMARK_PIN_HALF_WIDTH_PX / appWidth,
    y: SOUNDMARK_PIN_HALF_HEIGHT_PX / appHeight,
  };
}

function initializeSoundmarkPlacementOverlay() {
  const overlay = $("#soundmark-placement-overlay");
  if (!overlay) return;

  if (!DEBUG_SOUNDMARKS) {
    overlay.hidden = true;
    return;
  }

  ensureSoundmarkPlacementOverlayContent(overlay);
  updateSoundmarkPlacementOverlay();
  window.addEventListener("resize", updateSoundmarkPlacementOverlay);
}

function updateSoundmarkPlacementOverlay() {
  const overlay = $("#soundmark-placement-overlay");
  if (!overlay || !DEBUG_SOUNDMARKS) return;

  ensureSoundmarkPlacementOverlayContent(overlay);
  const rect = getSoundmarkPlacementRect();
  const visibleArea = overlay.querySelector(".soundmark-placement-visible");
  const forbiddenZones = getSoundmarkPlacementForbiddenZones();

  overlay.hidden = false;
  setSoundmarkOverlayRect(visibleArea, expandSoundmarkRectForPin(rect));
  visibleArea.dataset.bounds = [
    `center x ${(rect.left * 100).toFixed(0)}-${(rect.right * 100).toFixed(0)}%`,
    `center y ${(rect.bottom * 100).toFixed(0)}-${(rect.top * 100).toFixed(0)}%`,
  ].join(" / ");

  for (const zone of forbiddenZones) {
    const element = overlay.querySelector(`[data-zone="${zone.id}"]`);
    if (!element) continue;
    element.dataset.label = zone.label;
    setSoundmarkOverlayRect(element, zone.displayRect);
  }
}

function ensureSoundmarkPlacementOverlayContent(overlay) {
  if (overlay.dataset.ready === "true") return;

  overlay.innerHTML = `
    <div class="soundmark-placement-visible"></div>
    <div class="soundmark-placement-forbidden soundmark-placement-forbidden-torii" data-zone="torii"></div>
    <div class="soundmark-placement-forbidden soundmark-placement-forbidden-panel" data-zone="panel"></div>
  `;
  overlay.dataset.ready = "true";
}

function setSoundmarkOverlayRect(element, rect) {
  if (!element) return;

  const left = clamp(rect.left, 0, 1);
  const right = clamp(rect.right, 0, 1);
  const bottom = clamp(rect.bottom, 0, 1);
  const top = clamp(rect.top, 0, 1);

  if (right <= left || top <= bottom) {
    element.hidden = true;
    return;
  }

  element.hidden = false;
  element.style.left = `${left * 100}%`;
  element.style.top = `${(1 - top) * 100}%`;
  element.style.width = `${(right - left) * 100}%`;
  element.style.height = `${(top - bottom) * 100}%`;
}

function openSoundmarkPanel(soundmark) {
  const panel = $("#soundmark-panel");
  if (!panel) return;

  clearTimeout(soundmarkCloseTimer);
  activeSoundmarkId = soundmark.id;
  $("#app")?.classList.add("soundmark-panel-open");

  $("#soundmark-title").textContent = soundmark.title;
  $("#soundmark-body").textContent = soundmark.body;
  $("#soundmark-caption").textContent = soundmark.caption;
  renderSoundmarkTags(soundmark.tags);
  renderSoundmarkSource(soundmark);
  markActiveSoundmark();

  panel.hidden = false;
  panel.dataset.phase = getLyricGuidePhaseLabel(soundmarkLastProgress);
  scheduleAnimationFrame(() => panel.classList.add("is-open"));
}

function closeSoundmarkPanel(options = {}) {
  const { immediate = false } = options;
  const panel = $("#soundmark-panel");
  if (!panel) return;

  clearTimeout(soundmarkCloseTimer);
  activeSoundmarkId = null;
  $("#app")?.classList.remove("soundmark-panel-open");
  markActiveSoundmark();

  panel.classList.remove("is-open");
  if (immediate) {
    panel.hidden = true;
    return;
  }

  soundmarkCloseTimer = setTimeout(() => {
    if (!activeSoundmarkId) panel.hidden = true;
  }, 300);
}

function renderSoundmarkTags(tags) {
  const container = $("#soundmark-tags");
  if (!container) return;

  container.replaceChildren();
  for (const tag of tags ?? []) {
    const element = document.createElement("span");
    element.className = "soundmark-tag";
    element.textContent = tag;
    container.appendChild(element);
  }
}

function renderSoundmarkSource(soundmark) {
  const source = $("#soundmark-source");
  if (!source) return;

  if (!soundmark.sourceUrl) {
    source.hidden = true;
    source.removeAttribute("href");
    source.textContent = "";
    return;
  }

  source.hidden = false;
  source.href = soundmark.sourceUrl;
  source.textContent = `SOURCE / ${soundmark.sourceLabel}`;
}

function markActiveSoundmark() {
  document.querySelectorAll(".soundmark-pin").forEach((marker) => {
    marker.classList.toggle("active", marker.dataset.soundmarkId === activeSoundmarkId);
  });
}

function applySoundmarkPalette(progress) {
  const palette = getSoundmarkPalette(progress);
  const targets = [$("#soundmark-layer"), $("#soundmark-panel"), $("#control-dock")].filter(Boolean);

  for (const target of targets) {
    target.style.setProperty("--soundmark-bg", formatRgba(palette.panelBg));
    target.style.setProperty("--soundmark-bg-deep", formatRgba(palette.panelBgDeep));
    target.style.setProperty("--soundmark-border", formatRgba(palette.border));
    target.style.setProperty("--soundmark-ink", formatRgba(palette.ink));
    target.style.setProperty("--soundmark-muted", formatRgba(palette.muted));
    target.style.setProperty("--soundmark-accent", formatRgba(palette.accent));
    target.style.setProperty("--soundmark-glow", formatRgba(palette.glow));
    target.style.setProperty("--soundmark-caustic", formatRgba(palette.caustic));
    target.style.setProperty("--soundmark-pin", formatRgba(palette.pin));
    target.style.setProperty("--soundmark-ring", formatRgba(palette.ring));
    target.style.setProperty("--soundmark-core", formatRgba(palette.core));
  }

  $("#soundmark-panel")?.setAttribute("data-phase", getLyricGuidePhaseLabel(progress));
}

function getSoundmarkPalette(progress) {
  const clampedProgress = clamp(progress, 0, 1);
  let palette = SOUNDMARK_PALETTES.day;
  palette = mixGuidePalette(palette, SOUNDMARK_PALETTES.sunset, smoothstep(0.10, 0.42, clampedProgress));
  palette = mixGuidePalette(palette, SOUNDMARK_PALETTES.twilight, smoothstep(0.44, 0.70, clampedProgress));
  palette = mixGuidePalette(palette, SOUNDMARK_PALETTES.night, getNightPhase(clampedProgress));
  return palette;
}

function applyLyricGuidePalette(guide, progress) {
  const palette = getLyricGuidePalette(progress);
  guide.style.setProperty("--guide-ink", formatRgba(palette.ink));
  guide.style.setProperty("--guide-active", formatRgba(palette.active));
  guide.style.setProperty("--guide-edge", formatRgba(palette.edge));
  guide.style.setProperty("--guide-shadow", formatRgba(palette.shadow));
  guide.style.setProperty("--guide-glow", formatRgba(palette.glow));
  guide.style.setProperty("--guide-active-glow", formatRgba(palette.activeGlow));
  guide.style.setProperty("--guide-chorus-glow", formatRgba(palette.chorusGlow));
}

function getLyricGuidePalette(progress) {
  const clampedProgress = clamp(progress, 0, 1);
  let palette = LYRIC_GUIDE_PALETTES.day;
  palette = mixGuidePalette(palette, LYRIC_GUIDE_PALETTES.sunset, smoothstep(0.10, 0.42, clampedProgress));
  palette = mixGuidePalette(palette, LYRIC_GUIDE_PALETTES.twilight, smoothstep(0.44, 0.70, clampedProgress));
  palette = mixGuidePalette(palette, LYRIC_GUIDE_PALETTES.night, getNightPhase(clampedProgress));
  return palette;
}

function mixGuidePalette(from, to, amount) {
  const mixed = {};
  for (const key of Object.keys(from)) {
    mixed[key] = mixRgba(from[key], to[key], amount);
  }
  return mixed;
}

function mixRgba(from, to, amount) {
  return from.map((value, index) => mix(value, to[index], amount));
}

function formatRgba(color) {
  const [red, green, blue, alpha] = color;
  return `rgba(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}, ${clamp(alpha, 0, 1).toFixed(3)})`;
}

function getLyricGuidePhaseLabel(progress) {
  const sunset = getSunsetPhase(progress);
  const twilight = getTwilightPhase(progress);
  const night = getNightPhase(progress);

  if (night >= 0.38) return "night";
  if (twilight >= 0.34) return "twilight";
  if (sunset >= 0.28) return "sunset";
  return "day";
}

function getSunsetPhase(progress) {
  return smoothstep(0.12, 0.40, progress) * (1 - smoothstep(0.48, 0.70, progress));
}

function getTwilightPhase(progress) {
  return smoothstep(0.42, 0.66, progress) * (1 - smoothstep(0.70, 0.90, progress));
}

function getNightPhase(progress) {
  return smoothstep(0.70, 0.98, progress);
}

function shouldPrefixGuideSpace(previous, current) {
  return previous?.language === "en"
    && current?.language === "en"
    && !/^[、。,.!?！？)]/.test(current.text)
    && !/[(（「『]$/.test(previous.text);
}

function getGuideUnitsLength(units) {
  return units.reduce((sum, unit) => sum + getVisibleLength(unit.text), 0);
}

function getVisibleLength(text) {
  return [...String(text ?? "")].length;
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
  let bestCandidate = candidates[0];
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const screenPosition = toScreenPosition(candidate);
    const insidePreviousRect = previousLyricPosition
      ? isInsideAvoidRect(screenPosition, previousLyricPosition)
      : false;
    const insideToriiRect = isInsideToriiExclusionRect(candidate);
    const insideSoundmarkPanelRect = isInsideSoundmarkPanelExclusionRect(candidate);
    const score = getPlacementCandidateScore(candidate, screenPosition);
    if (!insidePreviousRect && !insideToriiRect && !insideSoundmarkPanelRect) {
      return candidate;
    }
    if (score > bestScore) {
      bestCandidate = candidate;
      bestScore = score;
    }
  }

  return bestCandidate;
}

function getPlacementCandidateScore(candidate, screenPosition) {
  const previousScore = previousLyricPosition ? getAvoidScore(screenPosition, previousLyricPosition) : 0;
  return previousScore
    + getToriiExclusionScore(candidate) * 1.6
    + getSoundmarkPanelExclusionScore(candidate) * 1.7;
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

function isInsideToriiExclusionRect(position) {
  const rect = getToriiExclusionRect();
  return rect.left <= position.x
    && position.x <= rect.right
    && rect.bottom <= position.y
    && position.y <= rect.top;
}

function getToriiExclusionScore(position) {
  const rect = getToriiExclusionRect();
  const outsideDx = Math.max(rect.left - position.x, 0, position.x - rect.right);
  const outsideDy = Math.max(rect.bottom - position.y, 0, position.y - rect.top);

  if (outsideDx > 0 || outsideDy > 0) {
    return 4 + outsideDx * outsideDx + outsideDy * outsideDy;
  }

  const halfWidth = Math.max((rect.right - rect.left) * 0.5, 0.001);
  const halfHeight = Math.max((rect.top - rect.bottom) * 0.5, 0.001);
  const centerX = (rect.left + rect.right) * 0.5;
  const centerY = (rect.bottom + rect.top) * 0.5;
  const dx = Math.abs(position.x - centerX) / halfWidth;
  const dy = Math.abs(position.y - centerY) / halfHeight;
  return dx * dx + dy * dy;
}

function getToriiExclusionRect() {
  const { width } = getToriiSceneSize();
  const top = 1 - TORII_EXCLUSION_SCREEN_TOP;
  const bottom = 1 - TORII_EXCLUSION_SCREEN_BOTTOM;
  const halfWidth = width * 0.5 + TORII_EXCLUSION_MARGIN_X;

  return {
    left: clamp(TORII_CENTER_X - halfWidth, 0, 1),
    right: clamp(TORII_CENTER_X + halfWidth, 0, 1),
    bottom: clamp(bottom, 0, 1),
    top: clamp(top, 0, 1),
  };
}

function isInsideSoundmarkPanelExclusionRect(position) {
  if (!activeSoundmarkId) return false;

  const rect = getSoundmarkPanelExclusionRect();
  return rect.left <= position.x
    && position.x <= rect.right
    && rect.bottom <= position.y
    && position.y <= rect.top;
}

function getSoundmarkPanelExclusionScore(position) {
  if (!activeSoundmarkId) return 0;

  const rect = getSoundmarkPanelExclusionRect();
  const outsideDx = Math.max(rect.left - position.x, 0, position.x - rect.right);
  const outsideDy = Math.max(rect.bottom - position.y, 0, position.y - rect.top);

  if (outsideDx > 0 || outsideDy > 0) {
    return 4 + outsideDx * outsideDx + outsideDy * outsideDy;
  }

  const halfWidth = Math.max((rect.right - rect.left) * 0.5, 0.001);
  const halfHeight = Math.max((rect.top - rect.bottom) * 0.5, 0.001);
  const centerX = (rect.left + rect.right) * 0.5;
  const centerY = (rect.bottom + rect.top) * 0.5;
  const dx = Math.abs(position.x - centerX) / halfWidth;
  const dy = Math.abs(position.y - centerY) / halfHeight;
  return dx * dx + dy * dy;
}

function getSoundmarkPanelExclusionRect() {
  return {
    left: SOUNDMARK_PANEL_EXCLUSION_LEFT,
    right: SOUNDMARK_PANEL_EXCLUSION_RIGHT,
    bottom: SOUNDMARK_PANEL_EXCLUSION_BOTTOM,
    top: SOUNDMARK_PANEL_EXCLUSION_TOP,
  };
}

function getToriiSceneSize() {
  const aspect = getSceneAspect();
  const narrow = 1 - smoothstep(0.55, 1.20, aspect);
  const height = mix(0.170, 0.108, narrow);
  const width = Math.min(height * TORII_ASSET_ASPECT / Math.max(aspect, 0.38), 0.34);
  return { width, height };
}

function getToriiSceneFrame() {
  const { width, height } = getToriiSceneSize();
  const waterlineY = mix(SCENE_HORIZON_Y, 0, TORII_SCENE_WATERLINE_MIX);
  const left = TORII_CENTER_X - width * 0.5;
  const bottom = waterlineY - height * TORII_WATERLINE_LOCAL;

  return {
    left,
    right: left + width,
    bottom,
    top: bottom + height,
    width,
    height,
    waterlineY,
  };
}

function getToriiReflectionPoints() {
  const frame = getToriiSceneFrame();
  return TORII_REFLECTION_PILLAR_LOCAL_X.map((localX) => ({
    localX,
    x: frame.left + frame.width * localX,
    y: frame.waterlineY,
  }));
}

function getSceneAspect() {
  const scene = $("#lake-scene");
  const width = scene?.clientWidth || window.innerWidth || 1;
  const height = scene?.clientHeight || window.innerHeight || 1;
  return Math.max(1, width / Math.max(height, 1));
}

function initializeToriiExclusionZoneOverlay() {
  const overlay = $("#torii-exclusion-zone");
  if (!overlay) return;

  if (!DEBUG_TORII_EXCLUSION_ZONE) {
    overlay.hidden = true;
    return;
  }

  const updateOverlay = () => {
    const rect = getToriiExclusionRect();
    overlay.hidden = false;
    overlay.style.left = `${rect.left * 100}%`;
    overlay.style.top = `${(1 - rect.top) * 100}%`;
    overlay.style.width = `${(rect.right - rect.left) * 100}%`;
    overlay.style.height = `${(rect.top - rect.bottom) * 100}%`;
  };

  updateOverlay();
  window.addEventListener("resize", updateOverlay);
}

function initializeToriiReflectionOverlay() {
  const overlay = $("#torii-reflection-overlay");
  if (!overlay) return;

  if (!DEBUG_TORII_REFLECTION) {
    overlay.hidden = true;
    return;
  }

  overlay.innerHTML = `
    <div class="torii-reflection-box"></div>
    <div class="torii-reflection-waterline"><span>waterline</span></div>
    <div class="torii-reflection-zone reflection-zone-left"></div>
    <div class="torii-reflection-zone reflection-zone-right"></div>
    <div class="torii-reflection-point reflection-point-left"><span>left pillar localX 0.26</span></div>
    <div class="torii-reflection-point reflection-point-right"><span>right pillar localX 0.74</span></div>
  `;

  const updateOverlay = () => {
    const frame = getToriiSceneFrame();
    const points = getToriiReflectionPoints();
    const box = overlay.querySelector(".torii-reflection-box");
    const waterline = overlay.querySelector(".torii-reflection-waterline");

    overlay.hidden = false;
    box.style.left = `${frame.left * 100}%`;
    box.style.top = `${(1 - frame.top) * 100}%`;
    box.style.width = `${frame.width * 100}%`;
    box.style.height = `${frame.height * 100}%`;

    waterline.style.left = `${frame.left * 100}%`;
    waterline.style.top = `${(1 - frame.waterlineY) * 100}%`;
    waterline.style.width = `${frame.width * 100}%`;

    points.forEach((point, index) => {
      const pointElement = overlay.querySelector(index === 0 ? ".reflection-point-left" : ".reflection-point-right");
      const zone = overlay.querySelector(index === 0 ? ".reflection-zone-left" : ".reflection-zone-right");
      const zoneWidth = frame.width * 0.70;
      const zoneHeight = frame.height * 2.0;

      pointElement.style.left = `${point.x * 100}%`;
      pointElement.style.top = `${(1 - point.y) * 100}%`;
      zone.style.left = `${point.x * 100}%`;
      zone.style.top = `${(1 - point.y) * 100}%`;
      zone.style.width = `${zoneWidth * 100}%`;
      zone.style.height = `${zoneHeight * 100}%`;
    });
  };

  updateOverlay();
  window.addEventListener("resize", updateOverlay);
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

function mix(a, b, t) {
  return a * (1 - t) + b * t;
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
