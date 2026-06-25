import { createLakeScene } from "./lakeScene.js";
import { SONGS, findSong } from "./songs.js";
import { SOUNDMARKS, SOUNDMARK_TRANSLATIONS } from "./soundmarks.js";
import { buildLyricChunks, collectPhrases, collectSegments, collectWords } from "./lyrics.js";
import { applyLyricCorrections } from "./lyricCorrections.js";
import { createTextAlivePlayer, loadSong } from "./textalive.js";

const $ = (selector) => document.querySelector(selector);
const DOCK_COLLAPSED_KEY = "sonareLakeDockCollapsed";
const VOLUME_KEY = "sonareLakeVolume";
const SOUNDMARK_COLLECTION_KEY = "sonareLakeSoundmarks";
const LOCALE_KEY = "sonareLakeLocale";
const SUPPORTED_LOCALES = ["ja", "ko", "en", "zh-Hans"];
const DEFAULT_UI_LOCALE = "ja";
const REPEAT_MODES = Object.freeze({
  OFF: "off",
  ALL: "all",
  ONE: "one",
});
const LOCALE_LABELS = {
  ja: { compact: "日本語", name: "日本語" },
  ko: { compact: "한국어", name: "한국어" },
  en: { compact: "English", name: "English" },
  "zh-Hans": { compact: "简体", name: "简体中文" },
};
const UI_TRANSLATIONS = {
  ja: {
    documentTitle: "マジカルミライ 2026 リリックアプリ",
    locale: {
      selection: "表示言語",
      selectionWithName: "表示言語: {name}",
    },
    soundmark: {
      layerAria: "響きのしるし",
      close: "響きのしるしを閉じる",
      kicker: "響きのしるし",
      noteProgress: "響きのしるし",
      open: "響きのしるしを開く: {title}",
      sourcePrefix: "出典",
      debug: "響きのしるし確認",
      debugStatus: "響きのしるし確認モードです。再生せずに確認できます。",
      closePanel: "パネルを閉じる",
    },
    onboarding: {
      guideTitle: "歌詞ガイド",
      guideCopy: "現在のフレーズを左上に表示します。",
      songTitle: "曲を選ぶ",
      songCopy: "6曲の受賞作品をここで選択できます。",
      notesTitle: "響きのしるし",
      notesCopy: "湖面に表示されるしるしをクリックして収集します。湖面をクリックすると波紋が出ます。",
      panelTitle: "情報パネル",
      panelCopy: "しるしを選択すると、右側に関連情報を表示します。",
      collectionTitle: "収集状況",
      collectionCopy: "曲の終了時に、収集したしるしの数を表示します。",
      controlsTitle: "再生コントロール",
      controlsCopy: "再生、一時停止、曲送り、音量を操作できます。",
      prev: "前へ",
      next: "次へ",
      skip: "スキップ",
      start: "はじめる",
    },
    controls: {
      dockAria: "ミュージックプレイヤーの操作",
      hide: "操作パネルを隠す",
      show: "操作パネルを開く",
      playbackPosition: "再生位置",
      placeholderTitle: "曲を選ぶ",
      placeholderArtist: "Magical Mirai 2026 Song Contest",
      targetSongs: "曲を選択",
      playerControls: "プレイヤー操作",
      previousSong: "前の曲",
      play: "再生",
      pause: "一時停止",
      stop: "停止",
      nextSong: "次の曲",
      shuffle: "シャッフル",
      repeat: "リピート",
      repeatOff: "リピートなし",
      repeatAll: "全曲リピート",
      repeatOne: "1曲リピート",
      initializing: "TextAliveを初期化しています...",
      volume: "音量",
      beat: "拍",
      chorus: "サビ",
      vocal: "ボーカル",
      statusWaiting: "TextAliveホストから楽曲情報を待っています...",
      statusReady: "準備ができました。曲を選んでください。",
      statusLoaded: "{phrases}フレーズ / {words}語 / {chunks}チャンクを読み込みました",
      loadingSong: "{title}を読み込んでいます...",
    },
    fullscreen: {
      mainEnter: "全画面",
      mainExit: "解除",
      orientationEnter: "全画面でひらく",
      orientationExit: "全画面を閉じる",
      denied: "全画面不可",
      enterAria: "全画面にする",
      exitAria: "全画面を終了",
      deniedAria: "全画面を使用できません",
      failure: "全画面に切り替えられませんでした。ブラウザ設定を確認し、端末を横向きにしてください。",
    },
    orientation: {
      aria: "横向き表示が必要です",
      title: "湖を横向きにひらく",
      copy: "端末を横向きにすると、湖面いっぱいに歌が広がります。",
    },
    guidePreview: {
      aria: "湖面に映る、音のしるし",
      text: "湖面に映る、音のしるし",
      words: [
        { text: "湖面に", startTime: 0, endTime: 1200, language: "ja" },
        { text: "映る、", startTime: 1200, endTime: 2400, language: "ja" },
        { text: "音の", startTime: 2400, endTime: 3600, language: "ja" },
        { text: "しるし", startTime: 3600, endTime: 5200, language: "ja" },
      ],
    },
  },
  ko: {
    documentTitle: "Magical Mirai 2026 리릭앱",
    locale: {
      selection: "표시 언어",
      selectionWithName: "표시 언어: {name}",
    },
    soundmark: {
      layerAria: "울림의 표식",
      close: "울림의 표식 닫기",
      kicker: "울림의 표식",
      noteProgress: "울림의 표식",
      open: "울림의 표식 열기: {title}",
      sourcePrefix: "출처",
      debug: "울림의 표식 확인",
      debugStatus: "울림의 표식 확인 모드입니다. 재생 없이 살펴볼 수 있습니다.",
      closePanel: "패널 닫기",
    },
    onboarding: {
      guideTitle: "가사 가이드",
      guideCopy: "현재 프레이즈를 왼쪽 상단에 표시합니다.",
      songTitle: "곡 선택",
      songCopy: "6곡의 수상곡을 여기에서 선택할 수 있습니다.",
      notesTitle: "울림의 표식",
      notesCopy: "수면에 표시되는 표식을 클릭해 수집합니다. 호수를 클릭하면 파문이 생깁니다.",
      panelTitle: "정보 패널",
      panelCopy: "표식을 선택하면 오른쪽에 관련 정보를 표시합니다.",
      collectionTitle: "수집 현황",
      collectionCopy: "곡이 끝나면 수집한 표식 수를 표시합니다.",
      controlsTitle: "재생 컨트롤",
      controlsCopy: "재생, 일시정지, 곡 이동, 음량을 조작할 수 있습니다.",
      prev: "이전",
      next: "다음",
      skip: "건너뛰기",
      start: "시작",
    },
    controls: {
      dockAria: "음악 플레이어 조작",
      hide: "조작 패널 숨기기",
      show: "조작 패널 열기",
      playbackPosition: "재생 위치",
      placeholderTitle: "곡 선택",
      placeholderArtist: "Magical Mirai 2026 Song Contest",
      targetSongs: "곡 선택",
      playerControls: "플레이어 조작",
      previousSong: "이전 곡",
      play: "재생",
      pause: "일시정지",
      stop: "정지",
      nextSong: "다음 곡",
      shuffle: "셔플",
      repeat: "반복",
      repeatOff: "반복 꺼짐",
      repeatAll: "전체 반복",
      repeatOne: "한 곡 반복",
      initializing: "TextAlive 초기화 중...",
      volume: "음량",
      beat: "박자",
      chorus: "후렴",
      vocal: "보컬",
      statusWaiting: "TextAlive 호스트에서 곡 정보를 기다리는 중...",
      statusReady: "준비되었습니다. 곡을 선택하세요.",
      statusLoaded: "프레이즈 {phrases}개 / 단어 {words}개 / 청크 {chunks}개를 불러왔습니다",
      loadingSong: "곡을 불러오는 중입니다: {title}",
    },
    fullscreen: {
      mainEnter: "전체화면",
      mainExit: "해제",
      orientationEnter: "전체화면으로 열기",
      orientationExit: "전체화면 해제",
      denied: "전체화면 사용 불가",
      enterAria: "전체화면으로 전환",
      exitAria: "전체화면 해제",
      deniedAria: "전체화면을 사용할 수 없음",
      failure: "전체화면으로 전환할 수 없습니다. 브라우저 설정을 확인하고 기기를 가로 방향으로 돌려 주세요.",
    },
    orientation: {
      aria: "가로 화면이 필요합니다",
      title: "호수를 가로 화면으로 열기",
      copy: "기기를 가로 방향으로 돌리면 수면 가득 노래가 펼쳐집니다.",
    },
    guidePreview: {
      aria: "湖面に映る、音のしるし",
      text: "湖面に映る、音のしるし",
      words: [
        { text: "湖面に", startTime: 0, endTime: 1200, language: "ja" },
        { text: "映る、", startTime: 1200, endTime: 2400, language: "ja" },
        { text: "音の", startTime: 2400, endTime: 3600, language: "ja" },
        { text: "しるし", startTime: 3600, endTime: 5200, language: "ja" },
      ],
    },
  },
  en: {
    documentTitle: "Magical Mirai 2026 Lyric App",
    locale: {
      selection: "Language selection",
      selectionWithName: "Language: {name}",
    },
    soundmark: {
      layerAria: "Echo Marks",
      close: "Close Echo Mark",
      kicker: "Echo Mark",
      noteProgress: "Echo Marks",
      open: "Open Echo Mark: {title}",
      sourcePrefix: "Source",
      debug: "Echo Mark Debug",
      debugStatus: "Echo Mark debug mode. Playback is not required.",
      closePanel: "Close panel",
    },
    onboarding: {
      guideTitle: "Lyric Guide",
      guideCopy: "Shows the current phrase in the upper-left area.",
      songTitle: "Choose a Song",
      songCopy: "Select one of the six winning songs here.",
      notesTitle: "Echo Marks",
      notesCopy: "Click the marks shown on the water to collect them. Click the lake to create ripples.",
      panelTitle: "Info Panel",
      panelCopy: "Select a mark to show related information on the right.",
      collectionTitle: "Collection Status",
      collectionCopy: "When a song ends, the number of collected marks is shown.",
      controlsTitle: "Player Controls",
      controlsCopy: "Control play, pause, song navigation, and volume.",
      prev: "Back",
      next: "Next",
      skip: "Skip",
      start: "Start",
    },
    controls: {
      dockAria: "Music player controls",
      hide: "Hide controls",
      show: "Show controls",
      playbackPosition: "Playback position",
      placeholderTitle: "Choose a Song",
      placeholderArtist: "Magical Mirai 2026 Song Contest",
      targetSongs: "Target songs",
      playerControls: "Player controls",
      previousSong: "Previous song",
      play: "Play",
      pause: "Pause",
      stop: "Stop",
      nextSong: "Next song",
      shuffle: "Shuffle",
      repeat: "Repeat",
      repeatOff: "Repeat off",
      repeatAll: "Repeat all",
      repeatOne: "Repeat one",
      initializing: "Initializing TextAlive...",
      volume: "VOL",
      beat: "Beat",
      chorus: "Chorus",
      vocal: "Vocal",
      statusWaiting: "Waiting for the TextAlive host song...",
      statusReady: "Ready. Choose a target song.",
      statusLoaded: "{phrases} phrases / {words} words / {chunks} chunks loaded",
      loadingSong: "Loading {title}...",
    },
    fullscreen: {
      mainEnter: "Fullscreen",
      mainExit: "Exit",
      orientationEnter: "Open fullscreen",
      orientationExit: "Exit fullscreen",
      denied: "Fullscreen unavailable",
      enterAria: "Enter fullscreen",
      exitAria: "Exit fullscreen",
      deniedAria: "Fullscreen unavailable",
      failure: "Fullscreen could not be started. Check your browser settings and rotate your device to landscape.",
    },
    orientation: {
      aria: "Landscape orientation required",
      title: "Open the Lake in Landscape",
      copy: "Rotate your device to landscape, and the song will spread across the lake.",
    },
    guidePreview: {
      aria: "湖面に映る、音のしるし",
      text: "湖面に映る、音のしるし",
      words: [
        { text: "湖面に", startTime: 0, endTime: 1200, language: "ja" },
        { text: "映る、", startTime: 1200, endTime: 2400, language: "ja" },
        { text: "音の", startTime: 2400, endTime: 3600, language: "ja" },
        { text: "しるし", startTime: 3600, endTime: 5200, language: "ja" },
      ],
    },
  },
  "zh-Hans": {
    documentTitle: "Magical Mirai 2026 歌词应用",
    locale: {
      selection: "语言选择",
      selectionWithName: "语言：{name}",
    },
    soundmark: {
      layerAria: "回响标记",
      close: "关闭回响标记",
      kicker: "回响标记",
      noteProgress: "回响标记",
      open: "打开回响标记：{title}",
      sourcePrefix: "来源",
      debug: "回响标记调试",
      debugStatus: "回响标记调试模式。无需播放即可确认。",
      closePanel: "关闭面板",
    },
    onboarding: {
      guideTitle: "歌词导览",
      guideCopy: "在左上方显示当前乐句。",
      songTitle: "选择歌曲",
      songCopy: "可在这里选择六首获奖作品。",
      notesTitle: "回响标记",
      notesCopy: "点击水面上的标记进行收集。点击湖面会产生波纹。",
      panelTitle: "信息面板",
      panelCopy: "选择标记后，右侧会显示相关信息。",
      collectionTitle: "收集进度",
      collectionCopy: "歌曲结束时会显示已收集的标记数量。",
      controlsTitle: "播放控制",
      controlsCopy: "可操作播放、暂停、切换歌曲和音量。",
      prev: "上一步",
      next: "下一步",
      skip: "跳过",
      start: "开始",
    },
    controls: {
      dockAria: "音乐播放器控制",
      hide: "隐藏控制栏",
      show: "显示控制栏",
      playbackPosition: "播放位置",
      placeholderTitle: "选择歌曲",
      placeholderArtist: "Magical Mirai 2026 Song Contest",
      targetSongs: "目标歌曲",
      playerControls: "播放器控制",
      previousSong: "上一首",
      play: "播放",
      pause: "暂停",
      stop: "停止",
      nextSong: "下一首",
      shuffle: "随机播放",
      repeat: "循环",
      repeatOff: "关闭循环",
      repeatAll: "全部循环",
      repeatOne: "单曲循环",
      initializing: "正在初始化 TextAlive...",
      volume: "VOL",
      beat: "节拍",
      chorus: "副歌",
      vocal: "人声",
      statusWaiting: "正在等待 TextAlive 主机歌曲...",
      statusReady: "准备就绪。请选择目标歌曲。",
      statusLoaded: "已加载 {phrases} 个乐句 / {words} 个词 / {chunks} 个片段",
      loadingSong: "正在加载 {title}...",
    },
    fullscreen: {
      mainEnter: "全屏",
      mainExit: "退出",
      orientationEnter: "全屏打开",
      orientationExit: "退出全屏",
      denied: "无法全屏",
      enterAria: "进入全屏",
      exitAria: "退出全屏",
      deniedAria: "无法使用全屏",
      failure: "无法进入全屏。请检查浏览器设置，并将设备旋转为横向。",
    },
    orientation: {
      aria: "需要横向屏幕",
      title: "横向打开湖面",
      copy: "将设备旋转为横向，歌曲就会铺满湖面。",
    },
    guidePreview: {
      aria: "湖面に映る、音のしるし",
      text: "湖面に映る、音のしるし",
      words: [
        { text: "湖面に", startTime: 0, endTime: 1200, language: "ja" },
        { text: "映る、", startTime: 1200, endTime: 2400, language: "ja" },
        { text: "音の", startTime: 2400, endTime: 3600, language: "ja" },
        { text: "しるし", startTime: 3600, endTime: 5200, language: "ja" },
      ],
    },
  },
};
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
const SEEK_SETTLE_TOLERANCE_MS = 700;
const SEEK_SETTLE_TIMEOUT_MS = 1800;
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
const SOUNDMARK_EXISTING_AVOID_MARGIN_PX = 14;
const SOUNDMARK_EXISTING_AVOID_MIN_MARGIN_PX = 0;
const SOUNDMARK_EXISTING_AVOID_MOBILE_HEIGHT_PX = 430;
const SOUNDMARK_PLACEMENT_CANDIDATE_COUNT = 64;
const SOUNDMARK_CORE_PER_SONG = 4;
const SOUNDMARK_MOBILE_EXTRA_COUNT = 1;
const SOUNDMARK_TABLET_EXTRA_COUNT = 2;
const SOUNDMARK_DESKTOP_EXTRA_COUNT = 4;
const SOUNDMARK_SPAWN_STAGGER_MS = 720;
const SOUNDMARK_SLOT_SYMBOLS = ["♪", "♫", "♩", "♬", "♭", "♯", "♮", "𝄞"];
const NOTE_PROGRESS_SHOW_AT = 0.985;
const NOTE_PROGRESS_VISIBLE_MS = 6000;
const ONBOARDING_STEP_COUNT = 6;
const ONBOARDING_CALLOUT_ORDER = ["guide", "song", "notes", "panel", "collection", "controls"];
const ONBOARDING_TARGETS = {
  guide: "#lyric-guide",
  song: "#btn-song-menu",
  notes: ".soundmark-pin.is-visible",
  panel: "#soundmark-panel",
  collection: "#note-progress-toast",
  controls: ".playback-core",
};
const ONBOARDING_PREVIEW_PROGRESS = 0.58;
const ONBOARDING_PREVIEW_SOUNDMARK_COUNT = 5;
const ONBOARDING_PREVIEW_NOTE_COUNT = 3;
const LOADING_MIN_VISIBLE_MS = 700;
const LOADING_FADE_MS = 520;
const SCENE_TRANSITION_IN_MS = 180;
const SCENE_TRANSITION_OUT_MS = 1100;
const SCENE_PROGRESS_TWEEN_MS = 1000;
const SONG_READY_STALE_UPDATE_WINDOW_MS = 1200;
const SONG_READY_STALE_POSITION_MS = 1500;
const PLAYBACK_START_STALE_UPDATE_WINDOW_MS = 1800;
const PLAYBACK_START_STALE_POSITION_MS = 1500;
const PLAYBACK_START_GUARD_POSITION_MS = 360;
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
let currentLocale = readPreferredLocale();

initializeLoadingScreen();

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
const pendingSoundmarkSpawnIds = new Set();
const soundmarkPositions = new Map();
const soundmarkSlotAssignments = new Map();
const discoveredSoundmarkIds = new Set(readDiscoveredSoundmarkIds());
let soundmarkTargetIds = new Set();
let activeSoundmarkId = null;
let soundmarkLastProgress = 0;
let soundmarkCloseTimer = null;
let soundmarkSpawnQueue = [];
let soundmarkSpawnTimer = null;
let noteProgressToastTimer = null;
let noteProgressShownSongId = null;
let sceneTransitionActive = false;
let visualSongProgress = 0;
let sceneProgressTweenToken = 0;
let debugSoundmarkProgress = DEBUG_SOUNDMARK_DEFAULT_PROGRESS;
let debugPlaybackActive = false;
let playbackActive = false;
let shuffleEnabled = false;
let repeatMode = REPEAT_MODES.OFF;
let shuffleQueue = [];
let playbackHistory = [];
let autoplayAfterSongLoad = false;
let playbackEndHandled = false;
let isProgressScrubbing = false;
let pendingSeekPosition = null;
let pendingSeekStartedAt = 0;
let songLoadPending = false;
let songReadySettlingUntil = 0;
let playbackStartSettlingUntil = 0;
let onboardingActive = false;
let onboardingStep = 0;
let onboardingPreviewApplied = false;
let onboardingPreviousDockCollapsed = false;
let onboardingLeaderFrame = null;
let currentStatusText = { key: "controls.initializing", replacements: {} };

renderSongList();
bindControls();
initializeLocaleControls();
restoreDockState();
initializeVolumeControl();
initializeSoundmarks();
initializeSoundmarkDebugMode();
initializeSoundmarkPlacementOverlay();
initializeToriiExclusionZoneOverlay();
initializeToriiReflectionOverlay();
initializeFullscreenControl();
initializeOnboarding();
setTransportEnabled(false);

player.addListener({
  onAppReady(app) {
    if (DEBUG_SOUNDMARKS) {
      setStatusText("soundmark.debugStatus");
      return;
    }

    setStatusText(app.managed ? "controls.statusWaiting" : "controls.statusReady");
  },

  onVideoReady(video) {
    resetPlaybackProgressDisplay();
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
    ({ lyricChunks, guidePhrases } = applyLyricCorrections(activeSong?.id, { lyricChunks, guidePhrases }));
    segments = collectSegments(player);
    lyricChunkCursor = 0;
    previousPosition = 0;
    lastBeatToken = null;
    previousLyricPosition = null;
    activeGuidePhraseKey = null;
    isProgressScrubbing = false;
    playbackEndHandled = false;
    clearPendingSeek();
    resetSoundmarks();

    setTrackDisplay(song.name || activeSong?.title || "-", song.artist?.name || activeSong?.artist || "-");
    $("#now-duration").textContent = formatPlayerTime(video.duration);
    setStatusText("controls.statusLoaded", {
      phrases: phrases.length,
      words: lyricWords.length,
      chunks: lyricChunks.length,
    });

    setTransportEnabled(readyToPlay);
  },

  onTimerReady() {
    readyToPlay = true;
    completeSongLoad();
    try {
      maxAmplitude = player.getMaxVocalAmplitude() || 1;
    } catch {
      maxAmplitude = 1;
    }
    setTransportEnabled(true);
    syncMediaElementVolume(getVolumeValue());
    if (autoplayAfterSongLoad) {
      autoplayAfterSongLoad = false;
      setTimeout(requestPlaybackStart, 0);
    }
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
    hideNoteProgressToast();
    updatePlayPauseButton();
  },

  onPause() {
    playbackActive = false;
    clearPlaybackStartSettling();
    lake.setAmbientRipplesEnabled(true);
    updatePlayPauseButton();
  },

  onStop() {
    playbackActive = false;
    autoplayAfterSongLoad = false;
    lake.setAmbientRipplesEnabled(true);
    lyricChunkCursor = 0;
    previousPosition = 0;
    lastBeatToken = null;
    previousLyricPosition = null;
    activeGuidePhraseKey = null;
    isProgressScrubbing = false;
    playbackEndHandled = false;
    clearPendingSeek();
    clearPlaybackStartSettling();
    clearSongLoadState();
    hideNoteProgressToast();
    resetSoundmarks();
    updatePlayback(0, { force: true });
    updatePlayPauseButton();
  },
});

function initializeLoadingScreen() {
  const loading = $("#app-loading");
  if (!loading || typeof lake.onAssetProgress !== "function" || typeof lake.whenAssetsReady !== "function") return;

  const progressLine = loading.querySelector(".loading-line");
  const progressBar = $("#loading-progress-bar");
  const minVisibleUntil = performance.now() + LOADING_MIN_VISIBLE_MS;

  const setProgress = (value) => {
    const progress = clamp(value, 0, 1);
    const percent = Math.round(progress * 100);
    loading.style.setProperty("--loading-progress", `${percent}%`);
    progressLine?.setAttribute("aria-valuenow", String(percent));
    if (progressBar) progressBar.style.width = `${percent}%`;
  };

  const unsubscribe = lake.onAssetProgress(({ progress }) => {
    setProgress(progress);
  });

  lake.whenAssetsReady().then(() => {
    setProgress(1);
    const delay = Math.max(0, minVisibleUntil - performance.now());
    window.setTimeout(() => {
      unsubscribe();
      loading.classList.add("is-hidden");
      window.setTimeout(() => {
        loading.hidden = true;
      }, LOADING_FADE_MS);
    }, delay);
  });
}

function renderSongList() {
  const list = $("#song-list");
  list.innerHTML = "";

  for (const song of SONGS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "song-card";
    button.dataset.songId = song.id;
    button.lang = "ja";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", "false");
    button.innerHTML = `
      <strong lang="ja">${song.title}</strong>
      <em lang="ja">${song.artist}</em>
    `;
    button.addEventListener("click", () => {
      transitionToSong(song.id, {
        autoplay: isPlaybackActive(),
        resetShuffleQueue: true,
      });
      setSongMenuOpen(false);
    });
    list.appendChild(button);
  }
}

function bindControls() {
  $("#btn-play").addEventListener("click", togglePlayback);
  $("#btn-stop")?.addEventListener("click", stopPlayback);
  $("#btn-shuffle")?.addEventListener("click", toggleShuffle);
  $("#btn-repeat")?.addEventListener("click", toggleRepeat);
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

function initializeLocaleControls() {
  document.querySelectorAll("[data-locale-option]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setLocale(button.dataset.localeOption);
      setLocaleMenuOpen(false);
    });
  });

  $("#btn-locale-menu")?.addEventListener("click", (event) => {
    event.stopPropagation();
    setLocaleMenuOpen($("#locale-menu")?.hidden ?? true);
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".locale-picker")) setLocaleMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setLocaleMenuOpen(false);
  });

  setLocale(currentLocale, { persist: false });
}

function readPreferredLocale() {
  try {
    const storedLocale = normalizeLocale(localStorage.getItem(LOCALE_KEY));
    if (storedLocale) return storedLocale;
  } catch {
    // Local storage is optional.
  }

  const browserLocales = typeof navigator !== "undefined"
    ? [navigator.language, ...(navigator.languages ?? [])]
    : [];
  for (const locale of browserLocales) {
    const normalized = normalizeLocale(locale);
    if (normalized) return normalized;
  }

  return "ja";
}

function normalizeLocale(locale) {
  if (!locale) return null;
  const value = String(locale).trim().toLowerCase();
  if (value === "zh" || value === "zh-cn" || value === "zh-hans" || value.startsWith("zh-hans")) return "zh-Hans";
  if (value.startsWith("ko")) return "ko";
  if (value.startsWith("en")) return "en";
  if (value.startsWith("ja")) return "ja";
  return SUPPORTED_LOCALES.includes(locale) ? locale : null;
}

function getUiLocale() {
  return UI_TRANSLATIONS[currentLocale] ? currentLocale : DEFAULT_UI_LOCALE;
}

function getTranslationValue(key) {
  const segments = key.split(".");
  const findValue = (locale) => segments.reduce((value, segment) => value?.[segment], UI_TRANSLATIONS[locale]);
  return findValue(getUiLocale()) ?? findValue(DEFAULT_UI_LOCALE) ?? "";
}

function t(key, replacements = {}) {
  const value = getTranslationValue(key);
  if (typeof value !== "string") return value;

  return value.replace(/\{(\w+)\}/g, (_, name) => (
    replacements[name] == null ? "" : String(replacements[name])
  ));
}

function setText(selector, text) {
  const element = $(selector);
  if (element) element.textContent = text;
}

function setAttribute(selector, name, value) {
  const element = $(selector);
  if (element) element.setAttribute(name, value);
}

function setTrackDisplay(title, artist, { language = "ja", originalSong = true } = {}) {
  const titleElement = $("#song-title");
  const artistElement = $("#song-artist");
  const selector = $("#btn-song-menu");

  if (titleElement) {
    titleElement.textContent = title;
    titleElement.lang = language;
  }
  if (artistElement) {
    artistElement.textContent = artist;
    artistElement.lang = language;
  }
  selector?.classList.toggle("has-original-song", originalSong);
}

function updateDataLineLabel(selector, label) {
  const element = $(selector);
  if (!element) return;

  const textNode = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
  if (textNode) {
    textNode.nodeValue = `${label} `;
  } else {
    element.insertBefore(document.createTextNode(`${label} `), element.firstChild);
  }
}

function setCalloutText(name, title, copy) {
  const callout = document.querySelector(`.onboarding-callout[data-callout="${name}"]`);
  if (!callout) return;

  const titleElement = callout.querySelector("h2");
  const copyElement = callout.querySelector("p");
  if (titleElement) titleElement.textContent = title;
  if (copyElement) copyElement.textContent = copy;
}

function setStatusText(key, replacements = {}) {
  currentStatusText = { key, replacements };
  setText("#status", t(key, replacements));
}

function getLocalizedSoundmark(soundmark) {
  if (!soundmark) return null;

  const translation = SOUNDMARK_TRANSLATIONS[getUiLocale()]?.[soundmark.id];
  if (!translation) return soundmark;

  return {
    ...soundmark,
    ...translation,
    sourceLabel: translation.sourceLabel ?? soundmark.sourceLabel,
  };
}

function applyLocaleText() {
  document.title = t("documentTitle");

  setAttribute("#soundmark-layer", "aria-label", t("soundmark.layerAria"));
  setAttribute("#soundmark-close", "aria-label", t("soundmark.close"));
  setText(".soundmark-kicker", t("soundmark.kicker"));
  setText(".note-progress-copy span", t("soundmark.noteProgress"));

  document.querySelectorAll(".locale-switcher").forEach((switcher) => {
    switcher.setAttribute("aria-label", t("locale.selection"));
  });
  setCalloutText("guide", t("onboarding.guideTitle"), t("onboarding.guideCopy"));
  setCalloutText("song", t("onboarding.songTitle"), t("onboarding.songCopy"));
  setCalloutText("notes", t("onboarding.notesTitle"), t("onboarding.notesCopy"));
  setCalloutText("panel", t("onboarding.panelTitle"), t("onboarding.panelCopy"));
  setCalloutText("collection", t("onboarding.collectionTitle"), t("onboarding.collectionCopy"));
  setCalloutText("controls", t("onboarding.controlsTitle"), t("onboarding.controlsCopy"));
  setText("#btn-onboarding-prev", t("onboarding.prev"));
  setText("#btn-onboarding-skip", t("onboarding.skip"));
  setText(
    "#btn-onboarding-next",
    onboardingStep >= ONBOARDING_STEP_COUNT - 1 ? t("onboarding.start") : t("onboarding.next"),
  );

  setAttribute("#control-dock", "aria-label", t("controls.dockAria"));
  setDockToggleCopy($("#control-dock")?.classList.contains("collapsed") ?? false);
  setAttribute("#progress-slider", "aria-label", t("controls.playbackPosition"));
  if (!activeSong) {
    setTrackDisplay(t("controls.placeholderTitle"), t("controls.placeholderArtist"), {
      language: toHtmlLanguageTag(getUiLocale()),
      originalSong: false,
    });
  }
  setAttribute("#song-list", "aria-label", t("controls.targetSongs"));
  setAttribute(".transport", "aria-label", t("controls.playerControls"));
  setAttribute("#btn-prev-song", "aria-label", t("controls.previousSong"));
  setAttribute("#btn-stop", "aria-label", t("controls.stop"));
  setAttribute("#btn-next-song", "aria-label", t("controls.nextSong"));
  setAttribute("#btn-shuffle", "aria-label", t("controls.shuffle"));
  setAttribute("#btn-repeat", "aria-label", t("controls.repeat"));
  setAttribute("#volume-slider", "aria-label", t("controls.volume"));
  updateDataLineLabel(".data-line span:nth-child(1)", t("controls.beat"));
  updateDataLineLabel(".data-line span:nth-child(2)", t("controls.chorus"));
  updateDataLineLabel(".data-line span:nth-child(3)", t("controls.vocal"));
  setText(".soundmark-debug-label", t("soundmark.debug"));
  setText(".soundmark-debug-close", t("soundmark.closePanel"));
  if (currentStatusText) setText("#status", t(currentStatusText.key, currentStatusText.replacements));
  document.querySelectorAll(".soundmark-pin").forEach((marker) => {
    const soundmark = SOUNDMARKS.find((item) => item.id === marker.dataset.soundmarkId);
    const localized = getLocalizedSoundmark(soundmark);
    if (localized) {
      marker.setAttribute("aria-label", t("soundmark.open", { title: localized.title }));
      marker.title = localized.title;
    }
  });

  setAttribute(".orientation-lock", "aria-label", t("orientation.aria"));
  setText("#orientation-title", t("orientation.title"));
  setText("#orientation-copy", t("orientation.copy"));

  updatePlayPauseButton();
  updatePlaybackModeButtons();
  updateFullscreenControl();
  if (onboardingPreviewApplied) {
    renderOnboardingLyricGuide(ONBOARDING_PREVIEW_PROGRESS);
  } else if (DEBUG_SOUNDMARKS && activeGuidePhraseKey === "debug-soundmark-guide") {
    renderDebugLyricGuide(debugSoundmarkProgress);
  }
  if (activeSoundmarkId) {
    const soundmark = SOUNDMARKS.find((item) => item.id === activeSoundmarkId);
    if (soundmark) renderSoundmarkPanelContent(soundmark);
  }
}

function setLocale(locale, options = {}) {
  const { persist = true } = options;
  const normalized = normalizeLocale(locale) ?? DEFAULT_UI_LOCALE;
  currentLocale = normalized;
  document.documentElement.dataset.locale = normalized;

  if (persist) {
    try {
      localStorage.setItem(LOCALE_KEY, normalized);
    } catch {
      // Persisting language preference is optional.
    }
  }

  syncRenderedLanguage();
  syncLocaleControls();
  applyLocaleText();
}

function syncLocaleControls() {
  const label = LOCALE_LABELS[currentLocale] ?? LOCALE_LABELS.ja;
  const compactLabel = $("#locale-current-label");
  if (compactLabel) compactLabel.textContent = label.compact;

  const menuButton = $("#btn-locale-menu");
  if (menuButton) {
    menuButton.dataset.currentLocale = currentLocale;
    menuButton.setAttribute("aria-label", t("locale.selectionWithName", { name: label.name }));
  }

  document.querySelectorAll("[data-locale-option]").forEach((button) => {
    const active = normalizeLocale(button.dataset.localeOption) === currentLocale;
    button.classList.toggle("is-active", active);
    if (button.getAttribute("role") === "menuitemradio") {
      button.setAttribute("aria-checked", String(active));
    } else {
      button.setAttribute("aria-pressed", String(active));
    }
  });
}

function syncRenderedLanguage() {
  const renderedLanguage = toHtmlLanguageTag(getUiLocale());
  document.documentElement.lang = renderedLanguage;
  document.querySelectorAll("#app, .orientation-lock").forEach((element) => {
    element.lang = renderedLanguage;
  });

  document.querySelectorAll("[data-locale-option]").forEach((button) => {
    const optionLocale = normalizeLocale(button.dataset.localeOption);
    if (optionLocale) button.lang = toHtmlLanguageTag(optionLocale);
  });
}

function toHtmlLanguageTag(locale) {
  return locale === "zh-Hans" ? "zh-Hans" : locale;
}

function setLocaleMenuOpen(open) {
  const menu = $("#locale-menu");
  const button = $("#btn-locale-menu");
  const dock = $("#control-dock");
  if (!menu || !button) {
    dock?.classList.remove("locale-menu-open");
    return;
  }

  menu.hidden = !open;
  button.classList.toggle("is-open", open);
  button.setAttribute("aria-expanded", String(open));
  dock?.classList.toggle("locale-menu-open", open);
}

function setDockLocaleMenuDisabled(disabled) {
  const button = $("#btn-locale-menu");
  if (!button) return;

  if (disabled) setLocaleMenuOpen(false);
  button.disabled = disabled;
  if (disabled) {
    button.setAttribute("aria-disabled", "true");
  } else {
    button.removeAttribute("aria-disabled");
  }
}

function initializeFullscreenControl() {
  const buttons = getFullscreenButtons();
  const app = $("#app");
  if (buttons.length <= 0 || !app) return;

  const fullscreenAvailable = Boolean(document.fullscreenEnabled && app.requestFullscreen);
  if (!fullscreenAvailable) {
    for (const button of buttons) {
      button.hidden = true;
    }
    return;
  }

  for (const button of buttons) {
    button.hidden = false;
    button.classList.add("is-supported");
    button.addEventListener("click", handleFullscreenToggle);
  }

  updateFullscreenControl();
  document.addEventListener("fullscreenchange", updateFullscreenControl);
}

async function handleFullscreenToggle() {
  const app = $("#app");
  const buttons = getFullscreenButtons();
  if (!app) return;

  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await app.requestFullscreen({ navigationUI: "hide" });
      try {
        await screen.orientation?.lock?.("landscape");
      } catch {
        // Orientation lock support varies by browser and is optional.
      }
    }
  } catch {
    setFullscreenStatus(t("fullscreen.failure"));
    for (const button of buttons) {
      button.classList.add("is-denied");
      setFullscreenButtonCopy(button, false, { denied: true });
    }
    setTimeout(() => {
      setFullscreenStatus("");
      updateFullscreenControl();
    }, 1800);
    return;
  }

  setFullscreenStatus("");
  updateFullscreenControl();
}

function updateFullscreenControl() {
  const buttons = getFullscreenButtons();
  const app = $("#app");
  if (buttons.length <= 0 || !app) return;

  const active = document.fullscreenElement === app;
  const soundmarkPanelOpen = app.classList.contains("soundmark-panel-open");
  app.classList.toggle("is-fullscreen", active);
  for (const button of buttons) {
    if (button.hidden) continue;
    const blockedByPanel = button.id === "btn-fullscreen" && soundmarkPanelOpen;
    button.classList.remove("is-denied");
    button.disabled = blockedByPanel;
    button.setAttribute("aria-hidden", String(blockedByPanel));
    setFullscreenButtonCopy(button, active);
  }
}

function getFullscreenButtons() {
  return ["#btn-fullscreen", "#btn-orientation-fullscreen"]
    .map((selector) => $(selector))
    .filter(Boolean);
}

function setFullscreenButtonCopy(button, active, options = {}) {
  const labels = getFullscreenButtonLabels(button);
  const denied = Boolean(options.denied);
  const label = button.querySelector(".fullscreen-label");
  const text = denied ? labels.denied : active ? labels.exit : labels.enter;
  if (label) {
    label.textContent = text;
  } else {
    button.textContent = text;
  }
  button.setAttribute("aria-label", denied ? labels.deniedAria : active ? labels.exitAria : labels.enterAria);
  button.setAttribute("aria-pressed", String(active));
}

function getFullscreenButtonLabels(button) {
  if (button.id === "btn-orientation-fullscreen") {
    return {
      enter: t("fullscreen.orientationEnter"),
      exit: t("fullscreen.orientationExit"),
      denied: t("fullscreen.denied"),
      enterAria: t("fullscreen.enterAria"),
      exitAria: t("fullscreen.exitAria"),
      deniedAria: t("fullscreen.deniedAria"),
    };
  }
  return {
    enter: t("fullscreen.mainEnter"),
    exit: t("fullscreen.mainExit"),
    denied: t("fullscreen.denied"),
    enterAria: t("fullscreen.enterAria"),
    exitAria: t("fullscreen.exitAria"),
    deniedAria: t("fullscreen.deniedAria"),
  };
}

function setFullscreenStatus(message) {
  const status = $("#fullscreen-status");
  if (!status) return;
  status.textContent = message;
}

function initializeOnboarding() {
  const overlay = $("#onboarding");
  if (!overlay || DEBUG_MODE) return;

  $("#btn-onboarding-skip")?.addEventListener("click", closeOnboarding);
  $("#btn-onboarding-prev")?.addEventListener("click", handleOnboardingPrev);
  $("#btn-onboarding-next")?.addEventListener("click", handleOnboardingNext);
  document.addEventListener("keydown", handleOnboardingKeydown);
  window.addEventListener("resize", scheduleOnboardingLeaderLineUpdate);
  window.addEventListener("sonare:onboarding-layout", updateOnboardingLeaderLine);
  showOnboarding();
}

function showOnboarding() {
  const overlay = $("#onboarding");
  const app = $("#app");
  if (!overlay || !app) return;

  onboardingActive = true;
  onboardingStep = 0;
  onboardingPreviousDockCollapsed = $("#control-dock")?.classList.contains("collapsed") ?? false;

  overlay.hidden = false;
  app.classList.add("onboarding-active");
  setDockCollapsed(false);
  setDockLocaleMenuDisabled(true);
  applyOnboardingPreview();
  updateOnboardingStep();
  scheduleAnimationFrame(() => overlay.classList.add("is-open"));

  const nextButton = $("#btn-onboarding-next");
  if (nextButton) nextButton.focus({ preventScroll: true });
}

function closeOnboarding() {
  const overlay = $("#onboarding");
  const app = $("#app");
  if (!overlay || !app) return;

  onboardingActive = false;
  overlay.classList.remove("is-open");
  app.classList.remove("onboarding-active");
  delete app.dataset.onboardingStep;
  clearOnboardingLeaderLine();
  resetOnboardingPreview();
  setDockCollapsed(onboardingPreviousDockCollapsed);
  setDockLocaleMenuDisabled(false);

  setTimeout(() => {
    if (!onboardingActive) overlay.hidden = true;
  }, 260);
}

function handleOnboardingNext() {
  if (!onboardingActive) return;
  if (onboardingStep >= ONBOARDING_STEP_COUNT - 1) {
    closeOnboarding();
    return;
  }

  onboardingStep += 1;
  updateOnboardingStep();
}

function handleOnboardingPrev() {
  if (!onboardingActive || onboardingStep <= 0) return;

  onboardingStep -= 1;
  updateOnboardingStep();
}

function handleOnboardingKeydown(event) {
  if (!onboardingActive) return;

  if (event.key === "Escape") {
    event.preventDefault();
    closeOnboarding();
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    handleOnboardingNext();
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    handleOnboardingPrev();
  }
}

function updateOnboardingStep() {
  const overlay = $("#onboarding");
  const label = $("#onboarding-step-label");
  const prevButton = $("#btn-onboarding-prev");
  const nextButton = $("#btn-onboarding-next");
  if (!overlay) return;

  overlay.dataset.step = String(onboardingStep);
  $("#app")?.setAttribute("data-onboarding-step", String(onboardingStep));
  updateOnboardingActiveCallout(overlay);
  if (label) label.textContent = `${onboardingStep + 1} / ${ONBOARDING_STEP_COUNT}`;
  if (prevButton) prevButton.disabled = onboardingStep <= 0;
  if (nextButton) nextButton.textContent = onboardingStep >= ONBOARDING_STEP_COUNT - 1
    ? t("onboarding.start")
    : t("onboarding.next");
  updateOnboardingSoundmarkPanelPreview();
  updateOnboardingNoteProgressPreview();
  clearOnboardingLeaderLine();
  updateOnboardingLeaderLine();
}

function updateOnboardingActiveCallout(overlay) {
  const activeCallout = getOnboardingCalloutName(onboardingStep);

  overlay.querySelectorAll(".onboarding-callout").forEach((callout) => {
    callout.classList.toggle("is-active", callout.dataset.callout === activeCallout);
  });
}

function getOnboardingCalloutName(step) {
  return ONBOARDING_CALLOUT_ORDER[step] ?? ONBOARDING_CALLOUT_ORDER[0];
}

function scheduleOnboardingLeaderLineUpdate() {
  const run = () => {
    onboardingLeaderFrame = null;
    updateOnboardingLeaderLine();
  };

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    if (onboardingLeaderFrame != null) window.cancelAnimationFrame(onboardingLeaderFrame);
    onboardingLeaderFrame = window.requestAnimationFrame(run);
    return;
  }

  setTimeout(run, 16);
}

function updateOnboardingLeaderLine() {
  const overlay = $("#onboarding");
  const svg = $("#onboarding-leaders");
  const path = $("#onboarding-leader-line");
  const activeCallout = overlay?.querySelector(".onboarding-callout.is-active");
  const dot = activeCallout?.querySelector(".onboarding-dot");
  const target = getOnboardingTargetElement(activeCallout?.dataset.callout, activeCallout);

  if (!overlay || !svg || !path || !activeCallout || !dot || !target || overlay.hidden || !onboardingActive) {
    clearOnboardingLeaderLine();
    return;
  }

  const overlayWidth = overlay.clientWidth;
  const overlayHeight = overlay.clientHeight;
  const calloutRect = getLayoutRectRelativeTo(activeCallout, overlay);
  const targetRect = getLayoutRectRelativeTo(target, overlay);
  if (overlayWidth <= 0 || overlayHeight <= 0 || calloutRect.width <= 0 || targetRect.width <= 0 || targetRect.height <= 0) {
    clearOnboardingLeaderLine();
    return;
  }

  const targetPoint = getRectCenter(targetRect);
  dot.style.left = `${(targetPoint.x - calloutRect.left).toFixed(1)}px`;
  dot.style.top = `${(targetPoint.y - calloutRect.top).toFixed(1)}px`;
  dot.style.right = "auto";
  dot.style.bottom = "auto";

  const anchor = getRectEdgePointToward(calloutRect, targetPoint);
  const dx = targetPoint.x - anchor.x;
  const dy = targetPoint.y - anchor.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 8) {
    clearOnboardingLeaderLine();
    return;
  }

  const unitX = dx / distance;
  const unitY = dy / distance;
  const dotRect = getLayoutRectRelativeTo(dot, overlay);
  const dotRadius = Math.max(dotRect.width, dotRect.height) / 2;
  const start = {
    x: anchor.x + unitX * 2,
    y: anchor.y + unitY * 2,
  };
  const end = {
    x: targetPoint.x - unitX * (dotRadius + 2),
    y: targetPoint.y - unitY * (dotRadius + 2),
  };

  svg.setAttribute("viewBox", `0 0 ${overlayWidth.toFixed(1)} ${overlayHeight.toFixed(1)}`);
  path.dataset.targetCallout = activeCallout.dataset.callout ?? "";
  path.dataset.targetSelector = ONBOARDING_TARGETS[activeCallout.dataset.callout] ?? "";
  path.setAttribute(
    "d",
    `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} L ${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
  );
}

function getLayoutRectRelativeTo(element, root) {
  const rootRect = root.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left - rootRect.left,
    top: rect.top - rootRect.top,
    width: rect.width,
    height: rect.height,
    right: rect.right - rootRect.left,
    bottom: rect.bottom - rootRect.top,
  };
}

function getOnboardingTargetElement(calloutName, activeCallout) {
  document.querySelectorAll("[data-onboarding-target]").forEach((target) => {
    delete target.dataset.onboardingTarget;
  });

  if (calloutName === "notes") {
    const soundmarkTarget = getOnboardingSoundmarkTarget(activeCallout);
    if (soundmarkTarget) soundmarkTarget.dataset.onboardingTarget = "true";
    return soundmarkTarget;
  }

  const selector = ONBOARDING_TARGETS[calloutName];
  if (!selector) return null;
  const target = document.querySelector(selector);
  if (target) target.dataset.onboardingTarget = "true";
  return target;
}

function getRectCenter(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function getOnboardingSoundmarkTarget(activeCallout) {
  const markers = Array.from(document.querySelectorAll(".soundmark-pin.is-visible"));
  if (markers.length <= 1) return markers[0] ?? null;

  const calloutRect = activeCallout?.getBoundingClientRect();
  if (!calloutRect) return markers[0];
  const calloutCenter = {
    x: calloutRect.left + calloutRect.width / 2,
    y: calloutRect.top + calloutRect.height / 2,
  };

  return markers
    .map((marker) => {
      const rect = marker.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      return {
        marker,
        overlap: rectIntersectionArea(calloutRect, rect),
        distance: Math.hypot(center.x - calloutCenter.x, center.y - calloutCenter.y),
      };
    })
    .sort((left, right) => {
      const leftOverlaps = left.overlap > 0;
      const rightOverlaps = right.overlap > 0;
      if (leftOverlaps !== rightOverlaps) return leftOverlaps ? 1 : -1;
      return left.distance - right.distance;
    })[0]?.marker ?? markers[0];
}

function rectIntersectionArea(left, right) {
  const width = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left));
  const height = Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
  return width * height;
}

function getRectEdgePointToward(rect, target) {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = target.x - centerX;
  const dy = target.y - centerY;
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return { x: centerX, y: centerY };
  }

  const scaleX = Math.abs(dx) > 0.001 ? rect.width / 2 / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const scaleY = Math.abs(dy) > 0.001 ? rect.height / 2 / Math.abs(dy) : Number.POSITIVE_INFINITY;
  const scale = Math.min(scaleX, scaleY);

  return {
    x: centerX + dx * scale,
    y: centerY + dy * scale,
  };
}

function clearOnboardingLeaderLine() {
  if (onboardingLeaderFrame != null && typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
    window.cancelAnimationFrame(onboardingLeaderFrame);
    onboardingLeaderFrame = null;
  }
  const path = $("#onboarding-leader-line");
  path?.removeAttribute("d");
  if (path) {
    delete path.dataset.targetCallout;
    delete path.dataset.targetSelector;
  }
}

function applyOnboardingPreview() {
  if (onboardingPreviewApplied || DEBUG_SOUNDMARKS || activeSong || readyToPlay) return;

  const progress = ONBOARDING_PREVIEW_PROGRESS;
  onboardingPreviewApplied = true;
  soundmarkLastProgress = progress;
  cancelSceneProgressTween();
  setVisualSongProgress(progress);
  lake.setAudioState({ amplitude: 0.34, chorus: true });
  applySoundmarkPalette(progress);
  renderOnboardingLyricGuide(progress);
  resetSoundmarkMarkers();

  const previewSongId = SONGS[0]?.id;
  const previewSoundmarks = SOUNDMARKS
    .filter((soundmark) => soundmark.songId === previewSongId && soundmark.progress <= progress + 0.006)
    .sort(compareSoundmarkProgress)
    .slice(0, ONBOARDING_PREVIEW_SOUNDMARK_COUNT);

  for (const soundmark of previewSoundmarks) {
    spawnSoundmarkMarker(soundmark);
  }

  openOnboardingSoundmarkPanelPreview();
}

function resetOnboardingPreview() {
  if (!onboardingPreviewApplied) return;

  onboardingPreviewApplied = false;
  if (!activeSong && !readyToPlay && !DEBUG_SOUNDMARKS) {
    closeSoundmarkPanel({ immediate: true });
    resetSoundmarkMarkers();
    resetLyricGuide();
    hideNoteProgressToast();
    soundmarkLastProgress = 0;
    cancelSceneProgressTween();
    setVisualSongProgress(0);
    lake.setAudioState({ amplitude: 0, chorus: false });
    applySoundmarkPalette(0);
  }
}

function renderOnboardingLyricGuide(progress) {
  const guide = $("#lyric-guide");
  if (!guide) return;

  const preview = t("guidePreview");
  activeGuidePhraseKey = "onboarding-guide";
  applyLyricGuidePalette(guide, progress);
  guide.dataset.phase = getLyricGuidePhaseLabel(progress);
  guide.classList.remove("is-empty");
  guide.classList.add("chorus");
  renderLyricGuidePhrase({
    key: activeGuidePhraseKey,
    text: preview.text,
    startTime: 0,
    endTime: 6000,
    words: preview.words,
  });
  guide.setAttribute("aria-label", preview.aria);
}

function showOnboardingNoteProgressPreview() {
  const toast = $("#note-progress-toast");
  const count = $("#note-progress-count");
  if (!toast || !count) return;

  const total = SOUNDMARKS.length;
  const found = Math.min(ONBOARDING_PREVIEW_NOTE_COUNT, total);
  const progress = total > 0 ? clamp(found / total, 0, 1) : 0;

  clearTimeout(noteProgressToastTimer);
  count.textContent = `${found}/${total}`;
  toast.style.setProperty("--note-progress", `${(progress * 100).toFixed(1)}%`);
  toast.hidden = false;
  toast.classList.add("is-visible");
}

function openOnboardingSoundmarkPanelPreview() {
  if (!onboardingPreviewApplied) return;

  const previewSongId = SONGS[0]?.id;
  const previewSoundmark = SOUNDMARKS
    .filter((soundmark) => soundmark.songId === previewSongId && soundmark.progress <= ONBOARDING_PREVIEW_PROGRESS + 0.006)
    .sort(compareSoundmarkProgress)[0] ?? SOUNDMARKS[0];

  if (previewSoundmark) {
    openSoundmarkPanel(previewSoundmark, { recordDiscovery: false });
  }
}

function updateOnboardingSoundmarkPanelPreview() {
  if (!onboardingActive || !onboardingPreviewApplied) return;

  if (onboardingStep >= 4) {
    closeSoundmarkPanel({ immediate: true });
  } else if (onboardingStep === 3) {
    openOnboardingSoundmarkPanelPreview();
  }
}

function updateOnboardingNoteProgressPreview() {
  if (!onboardingActive || !onboardingPreviewApplied) return;

  if (onboardingStep === 4) {
    showOnboardingNoteProgressPreview();
  } else {
    hideNoteProgressToast();
  }
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
    requestPlaybackStart();
  }
}

function requestPlaybackStart() {
  beginPlaybackStartSettling();
  player.requestPlay();
}

function toggleShuffle() {
  shuffleEnabled = !shuffleEnabled;
  if (shuffleEnabled) {
    resetShuffleQueue(activeSong?.id);
  } else {
    shuffleQueue = [];
    playbackHistory = [];
  }
  updatePlaybackModeButtons();
}

function toggleRepeat() {
  repeatMode = getNextRepeatMode(repeatMode);
  updatePlaybackModeButtons();
}

function getNextRepeatMode(mode) {
  if (mode === REPEAT_MODES.OFF) return REPEAT_MODES.ALL;
  if (mode === REPEAT_MODES.ALL) return REPEAT_MODES.ONE;
  return REPEAT_MODES.OFF;
}

function stopPlayback() {
  if (DEBUG_SOUNDMARKS) {
    debugPlaybackActive = false;
    lake.setAmbientRipplesEnabled(true);
    hideNoteProgressToast();
    setDebugSoundmarkProgress(debugSoundmarkProgress);
    updatePlayPauseButton();
    return;
  }

  playbackActive = false;
  autoplayAfterSongLoad = false;
  playbackEndHandled = false;
  isProgressScrubbing = false;
  clearPendingSeek();
  clearPlaybackStartSettling();
  clearSongLoadState();
  clearSoundmarkSpawnQueue();
  hideNoteProgressToast();
  player.requestStop();
  updatePlayPauseButton();
}

function selectAdjacentSong(direction) {
  if (!activeSong) {
    transitionToSong(SONGS[0].id, { resetShuffleQueue: true });
    return;
  }

  const songId = direction > 0
    ? getNextSongId({ manual: true })
    : getPreviousSongId({ manual: true });
  if (!songId) return;

  transitionToSong(songId, {
    autoplay: isPlaybackActive(),
    recordHistory: direction > 0,
    resetShuffleQueue: false,
  });
}

function getNextSongId({ manual = false } = {}) {
  if (!activeSong) return SONGS[0]?.id ?? null;

  if (shuffleEnabled && SONGS.length > 1) {
    return takeNextShuffleSongId(activeSong.id, {
      allowNewCycle: manual || repeatMode === REPEAT_MODES.ALL,
    });
  }

  const currentIndex = getActiveSongIndex();
  if (currentIndex < 0) return SONGS[0]?.id ?? null;
  const nextIndex = currentIndex + 1;
  if (nextIndex < SONGS.length) return SONGS[nextIndex].id;
  return manual || repeatMode === REPEAT_MODES.ALL ? SONGS[0]?.id ?? null : null;
}

function getPreviousSongId({ manual = false } = {}) {
  if (!activeSong) return SONGS[0]?.id ?? null;

  if (shuffleEnabled && playbackHistory.length > 0) {
    return playbackHistory.pop();
  }

  const currentIndex = getActiveSongIndex();
  if (currentIndex < 0) return SONGS[0]?.id ?? null;
  const previousIndex = currentIndex - 1;
  if (previousIndex >= 0) return SONGS[previousIndex].id;
  return manual ? SONGS[SONGS.length - 1]?.id ?? null : null;
}

function getActiveSongIndex() {
  return SONGS.findIndex((song) => song.id === activeSong?.id);
}

function takeNextShuffleSongId(currentSongId, { allowNewCycle = false } = {}) {
  if (shuffleQueue.length <= 0 && allowNewCycle) {
    resetShuffleQueue(currentSongId);
  }

  while (shuffleQueue.length > 0) {
    const nextId = shuffleQueue.shift();
    if (nextId && nextId !== currentSongId) return nextId;
  }

  if (allowNewCycle) {
    resetShuffleQueue(currentSongId);
    return shuffleQueue.shift() ?? null;
  }

  return null;
}

function resetShuffleQueue(currentSongId = activeSong?.id) {
  shuffleQueue = shuffleSongIds(SONGS
    .map((song) => song.id)
    .filter((songId) => songId !== currentSongId));
}

function shuffleSongIds(songIds) {
  const values = [...songIds];
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
}

function recordPlaybackHistory(songId) {
  if (!songId) return;
  playbackHistory = playbackHistory.filter((historySongId) => historySongId !== songId);
  playbackHistory.push(songId);
  if (playbackHistory.length > SONGS.length) {
    playbackHistory = playbackHistory.slice(-SONGS.length);
  }
}

function getRepeatModeLabel() {
  if (repeatMode === REPEAT_MODES.ALL) return t("controls.repeatAll");
  if (repeatMode === REPEAT_MODES.ONE) return t("controls.repeatOne");
  return t("controls.repeatOff");
}

function restartCurrentSong({ resume = false } = {}) {
  clearPendingSeek();
  clearSoundmarkSpawnQueue();
  hideNoteProgressToast();
  player.requestMediaSeek(0);
  updatePlayback(0, { force: true });
  if (resume) {
    setTimeout(requestPlaybackStart, 0);
  }
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
  clearPendingSeek();
  clearSoundmarkSpawnQueue();
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
  playbackEndHandled = false;
  setPendingSeek(position);
  clearSoundmarkSpawnQueue();
  player.requestMediaSeek(position);
  updatePlayback(position, { force: true });
}

function formatPlayerTime(ms) {
  if (ms == null || Number.isNaN(ms)) return "-";

  const safeMs = Math.max(0, Number(ms));
  const minutes = Math.floor(safeMs / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
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
  if (slider) slider.value = String(safeVolume);
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
  const dock = $("#control-dock");
  const app = $("#app");
  const panel = $("#dock-panel");

  dock.classList.toggle("collapsed", collapsed);
  app.classList.toggle("dock-collapsed", collapsed);
  setDockToggleCopy(collapsed);
  if (panel) {
    panel.inert = collapsed;
    panel.setAttribute("aria-hidden", String(collapsed));
  }
  if (collapsed) setSongMenuOpen(false);
  scheduleAnimationFrame(updateSoundmarkPlacementOverlay);
  setTimeout(updateSoundmarkPlacementOverlay, 220);
}

function setDockToggleCopy(collapsed) {
  const button = $("#btn-toggle-dock");
  if (!button) return;

  const label = collapsed ? t("controls.show") : t("controls.hide");
  button.title = label;
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-expanded", String(!collapsed));
}

async function transitionToSong(songId, {
  autoplay = false,
  recordHistory = false,
  resetShuffleQueue: shouldResetShuffleQueue = false,
} = {}) {
  if (sceneTransitionActive) return;
  if (activeSong?.id === songId && !DEBUG_SOUNDMARKS) return;

  const previousSongId = activeSong?.id;
  sceneTransitionActive = true;
  autoplayAfterSongLoad = Boolean(autoplay);
  if (recordHistory) {
    recordPlaybackHistory(previousSongId);
  }
  try {
    await setSceneTransitionVisible(true);
    selectSong(songId, { resetSceneProgress: false });
    if (shouldResetShuffleQueue && shuffleEnabled) {
      resetShuffleQueue(songId);
      playbackHistory = [];
    }
    await tweenVisualSongProgress(visualSongProgress, 0, SCENE_PROGRESS_TWEEN_MS);
    await wait(Math.max(0, SCENE_TRANSITION_OUT_MS - SCENE_PROGRESS_TWEEN_MS));
  } finally {
    await setSceneTransitionVisible(false);
    sceneTransitionActive = false;
  }
}

function setSceneTransitionVisible(visible) {
  const overlay = $("#scene-transition");
  if (!overlay) return Promise.resolve();

  if (visible) {
    overlay.hidden = false;
    return new Promise((resolve) => {
      scheduleAnimationFrame(() => {
        overlay.classList.add("is-active");
        setTimeout(resolve, SCENE_TRANSITION_IN_MS);
      });
    });
  }

  overlay.classList.remove("is-active");
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!overlay.classList.contains("is-active")) overlay.hidden = true;
      resolve();
    }, SCENE_TRANSITION_IN_MS);
  });
}

function tweenVisualSongProgress(from, to, durationMs) {
  const token = ++sceneProgressTweenToken;
  const startTime = performance.now();
  const startValue = clamp(from, 0, 1);
  const endValue = clamp(to, 0, 1);

  return new Promise((resolve) => {
    const step = (now) => {
      if (token !== sceneProgressTweenToken) {
        resolve(false);
        return;
      }

      const progress = durationMs > 0 ? clamp((now - startTime) / durationMs, 0, 1) : 1;
      const eased = easeInOutCubic(progress);
      setVisualSongProgress(mix(startValue, endValue, eased));

      if (progress < 1) {
        requestAnimationFrame(step);
        return;
      }

      resolve(true);
    };

    requestAnimationFrame(step);
  });
}

function cancelSceneProgressTween() {
  sceneProgressTweenToken += 1;
}

function setVisualSongProgress(progress) {
  visualSongProgress = clamp(progress, 0, 1);
  lake.setSongProgress(visualSongProgress);
}

function selectSong(songId, { resetSceneProgress = true } = {}) {
  activeSong = findSong(songId);
  beginSongLoad();
  phrases = [];
  lyricWords = [];
  lyricChunks = [];
  guidePhrases = [];
  segments = [];
  readyToPlay = false;
  playbackActive = false;
  playbackEndHandled = false;
  isProgressScrubbing = false;
  noteProgressShownSongId = null;
  clearPlaybackStartSettling();
  lyricChunkCursor = 0;
  previousPosition = 0;
  lastBeatToken = null;
  previousLyricPosition = null;
  activeGuidePhraseKey = null;
  clearPendingSeek();
  resetSoundmarks();
  hideNoteProgressToast();

  setTransportEnabled(false);
  markActiveSong();
  resetDisplay({ resetSceneProgress });
  if (DEBUG_SOUNDMARKS) {
    completeSongLoad({ skipSettling: true });
    setStatusText("soundmark.debugStatus");
    setDebugSoundmarkProgress(debugSoundmarkProgress);
    return;
  }

  setStatusText("controls.loadingSong", { title: activeSong.title });
  loadSong(player, activeSong);
}

function markActiveSong() {
  document.querySelectorAll(".song-card").forEach((button) => {
    const active = button.dataset.songId === activeSong?.id;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function resetDisplay({ resetSceneProgress = true } = {}) {
  setTrackDisplay(activeSong.title, activeSong.artist);
  resetPlaybackProgressDisplay();
  $("#now-duration").textContent = "-";
  $("#beat-label").textContent = "-";
  $("#chorus-label").textContent = "-";
  $("#amp-label").textContent = "-";
  updatePlayPauseButton();
  lake.setAudioState({ amplitude: 0, chorus: false });
  if (resetSceneProgress) {
    cancelSceneProgressTween();
    setVisualSongProgress(0);
  }
  resetLyricGuide();
  resetSoundmarks();
  hideNoteProgressToast();
}

function resetPlaybackProgressDisplay() {
  $("#now-position").textContent = formatPlayerTime(0);
  updateProgressDisplay(0, { force: true });
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
  updatePlaybackModeButtons();
}

function updatePlayPauseButton() {
  const button = $("#btn-play");
  if (!button) return;

  const playing = isPlaybackActive();
  const label = playing ? t("controls.pause") : t("controls.play");
  button.classList.toggle("is-playing", playing);
  button.setAttribute("aria-label", label);
  button.title = label;
}

function isPlaybackActive() {
  return DEBUG_SOUNDMARKS ? debugPlaybackActive : playbackActive;
}

function updatePlaybackModeButtons() {
  const shuffleButton = $("#btn-shuffle");
  if (shuffleButton) {
    shuffleButton.classList.toggle("active", shuffleEnabled);
    shuffleButton.setAttribute("aria-pressed", String(shuffleEnabled));
    shuffleButton.title = t("controls.shuffle");
  }

  const repeatButton = $("#btn-repeat");
  if (repeatButton) {
    const repeatActive = repeatMode !== REPEAT_MODES.OFF;
    const repeatLabel = getRepeatModeLabel();
    repeatButton.classList.toggle("active", repeatActive);
    repeatButton.classList.toggle("repeat-one", repeatMode === REPEAT_MODES.ONE);
    repeatButton.dataset.repeatMode = repeatMode;
    repeatButton.setAttribute("aria-pressed", String(repeatActive));
    repeatButton.setAttribute("aria-label", repeatLabel);
    repeatButton.title = repeatLabel;
  }
}

function updateProgressDisplay(progress, { syncSlider = true, force = false } = {}) {
  if (!force && syncSlider && isProgressScrubbing) return;

  const clampedProgress = clamp(progress, 0, 1);
  const progressBar = $("#progress-bar");
  if (progressBar) progressBar.style.width = `${clampedProgress * 100}%`;

  const slider = $("#progress-slider");
  if (slider && syncSlider && !isProgressScrubbing) {
    slider.value = String(Math.round(clampedProgress * PROGRESS_SCALE));
  }
}

function updatePlayback(position, { force = false } = {}) {
  if (sceneTransitionActive) return;
  if (!force && shouldSkipPlaybackUpdateForSongLoad(position)) return;
  if (!force && shouldSkipPlaybackUpdateForPendingSeek(position)) return;
  if (!force && shouldSkipPlaybackUpdateForPlaybackStart(position)) return;

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
  updateProgressDisplay(progress, { force });
  $("#beat-label").textContent = beat ? `${beat.position}/${beat.length}` : "-";
  $("#chorus-label").textContent = chorus ? "on" : "off";
  $("#amp-label").textContent = amplitude.toFixed(2);

  lake.setAudioState({ amplitude, chorus: Boolean(chorus) });
  cancelSceneProgressTween();
  setVisualSongProgress(progress);
  updateSoundmarkSystem(progress, { immediate: force });
  updateNoteProgressToast(progress);
  updateLyricGuide(position, progress, Boolean(chorus));
  pulseBeatIfNeeded(beat, position, amplitude);
  spawnDueLyricChunks(position, amplitude, Boolean(chorus));
  handlePlaybackEnd(progress, duration);
}

function handlePlaybackEnd(progress, duration) {
  if (progress < 0.98) {
    playbackEndHandled = false;
    return;
  }

  if (
    playbackEndHandled
    || !readyToPlay
    || duration <= 0
    || progress < 0.999
    || isProgressScrubbing
    || sceneTransitionActive
  ) {
    return;
  }

  playbackEndHandled = true;
  const shouldResume = isPlaybackActive();

  if (repeatMode === REPEAT_MODES.ONE) {
    restartCurrentSong({ resume: shouldResume });
    return;
  }

  const nextSongId = getNextSongId();
  if (!nextSongId) return;

  clearPendingSeek();
  clearSoundmarkSpawnQueue();
  hideNoteProgressToast();
  transitionToSong(nextSongId, {
    autoplay: shouldResume,
    recordHistory: true,
    resetShuffleQueue: false,
  });
}

function beginSongLoad() {
  songLoadPending = true;
  songReadySettlingUntil = 0;
}

function completeSongLoad({ skipSettling = false } = {}) {
  if (!songLoadPending && !skipSettling) return;

  songLoadPending = false;
  songReadySettlingUntil = skipSettling
    ? 0
    : performance.now() + SONG_READY_STALE_UPDATE_WINDOW_MS;
}

function clearSongLoadState() {
  songLoadPending = false;
  songReadySettlingUntil = 0;
}

function shouldSkipPlaybackUpdateForSongLoad(position) {
  if (songLoadPending) return true;
  if (songReadySettlingUntil <= 0) return false;

  if (performance.now() > songReadySettlingUntil) {
    songReadySettlingUntil = 0;
    return false;
  }

  const looksStale = previousPosition === 0 && Number(position) > SONG_READY_STALE_POSITION_MS;
  if (looksStale) return true;

  songReadySettlingUntil = 0;
  return false;
}

function beginPlaybackStartSettling() {
  if (!shouldGuardPlaybackStart()) {
    clearPlaybackStartSettling();
    return;
  }

  playbackStartSettlingUntil = performance.now() + PLAYBACK_START_STALE_UPDATE_WINDOW_MS;
}

function clearPlaybackStartSettling() {
  playbackStartSettlingUntil = 0;
}

function shouldGuardPlaybackStart() {
  return readyToPlay
    && pendingSeekPosition == null
    && previousPosition <= PLAYBACK_START_GUARD_POSITION_MS;
}

function shouldSkipPlaybackUpdateForPlaybackStart(position) {
  if (playbackStartSettlingUntil <= 0) return false;

  if (performance.now() > playbackStartSettlingUntil) {
    clearPlaybackStartSettling();
    return false;
  }

  const looksStale = previousPosition <= PLAYBACK_START_GUARD_POSITION_MS
    && Number(position) > PLAYBACK_START_STALE_POSITION_MS;
  if (looksStale) return true;

  clearPlaybackStartSettling();
  return false;
}

function setPendingSeek(position) {
  pendingSeekPosition = Number(position);
  pendingSeekStartedAt = performance.now();
}

function clearPendingSeek() {
  pendingSeekPosition = null;
  pendingSeekStartedAt = 0;
}

function shouldSkipPlaybackUpdateForPendingSeek(position) {
  if (pendingSeekPosition == null) return false;

  const distance = Math.abs(Number(position) - pendingSeekPosition);
  const elapsed = performance.now() - pendingSeekStartedAt;
  if (distance <= SEEK_SETTLE_TOLERANCE_MS || elapsed >= SEEK_SETTLE_TIMEOUT_MS) {
    clearPendingSeek();
    return false;
  }

  return true;
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

  const activePhrases = findLyricGuidePhrases(position);
  if (activePhrases.length === 0) {
    hideLyricGuide();
    return;
  }

  const phraseKey = getLyricGuidePhraseKey(activePhrases);
  if (activeGuidePhraseKey !== phraseKey) {
    activeGuidePhraseKey = phraseKey;
    renderLyricGuidePhrases(activePhrases);
  }

  guide.classList.remove("is-empty");
  guide.setAttribute("aria-label", activePhrases.map((phrase) => phrase.text).join(" / "));
}

function findLyricGuidePhrases(position) {
  const visiblePhrases = guidePhrases.filter((phrase) => phrase?.text?.trim());
  const activePhrases = visiblePhrases.filter((phrase) =>
    phrase.startTime - getLyricGuideLeadMs(phrase) <= position
      && position < phrase.endTime,
  );
  if (activePhrases.length > 0) return buildLyricGuidePhraseSet(activePhrases, position);

  return buildLyricGuidePhraseSet(visiblePhrases.filter((phrase) =>
    phrase.endTime <= position
      && position < phrase.endTime + LYRIC_GUIDE_TAIL_MS,
  ), position);
}

function buildLyricGuidePhraseSet(phrasesToShow, position) {
  const backingPhrases = phrasesToShow.filter(isBackingGuidePhrase);
  const mainPhrase = selectMainLyricGuidePhrase(
    phrasesToShow.filter((phrase) => !isBackingGuidePhrase(phrase)),
    position,
  );

  return sortLyricGuidePhrases([
    ...(mainPhrase ? [mainPhrase] : []),
    ...backingPhrases,
  ]);
}

function selectMainLyricGuidePhrase(mainPhrases, position) {
  if (mainPhrases.length <= 1) return mainPhrases[0] ?? null;

  const startedPhrases = mainPhrases.filter((phrase) =>
    phrase.startTime <= position && position < phrase.endTime,
  );
  if (startedPhrases.length > 0) {
    return [...startedPhrases].sort((a, b) => b.startTime - a.startTime || b.endTime - a.endTime)[0];
  }

  const upcomingPhrases = mainPhrases.filter((phrase) => position < phrase.startTime);
  if (upcomingPhrases.length > 0) {
    return [...upcomingPhrases].sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime)[0];
  }

  return [...mainPhrases].sort((a, b) => b.endTime - a.endTime || b.startTime - a.startTime)[0];
}

function sortLyricGuidePhrases(phrasesToSort) {
  return [...phrasesToSort].sort((a, b) => {
    const variantOrder = getLyricGuideVariantOrder(a) - getLyricGuideVariantOrder(b);
    return variantOrder || a.startTime - b.startTime || a.endTime - b.endTime;
  });
}

function getLyricGuideVariantOrder(phrase) {
  return isBackingGuidePhrase(phrase) ? 1 : 0;
}

function isBackingGuidePhrase(phrase) {
  return phrase.variant === "backing";
}

function getLyricGuideLeadMs(phrase) {
  return isBackingGuidePhrase(phrase) ? 0 : LYRIC_GUIDE_LEAD_MS;
}

function getLyricGuidePhraseKey(phrasesToKey) {
  return phrasesToKey.map((phrase) => phrase.key).join("|");
}

function renderLyricGuidePhrases(phrasesToRender) {
  const guide = $("#lyric-guide");
  if (!guide) return;

  const container = document.createElement("div");
  container.className = "lyric-guide-lines";

  for (const phrase of phrasesToRender) {
    const lines = getLyricGuideLines(phrase);

    lines.forEach((lineUnits, lineIndex) => {
      if (lineUnits.length === 0) return;

      const line = document.createElement("span");
      line.className = [
        "guide-line",
        lineIndex > 0 ? "secondary" : "",
        phrase.variant === "backing" ? "backing" : "",
      ].filter(Boolean).join(" ");

      lineUnits.forEach((unit, index) => {
        const word = document.createElement("span");
        word.className = "guide-word active";
        word.textContent = `${shouldPrefixGuideSpace(lineUnits[index - 1], unit) ? " " : ""}${unit.text}`;
        line.appendChild(word);
      });

      container.appendChild(line);
    });
  }

  guide.replaceChildren(container);
}

function renderLyricGuidePhrase(phrase) {
  renderLyricGuidePhrases([phrase]);
}

function getLyricGuideLines(phrase) {
  if (Array.isArray(phrase.guideLineTexts) && phrase.guideLineTexts.length > 0) {
    return phrase.guideLineTexts.map((lineText) => [{
      text: String(lineText),
      startTime: Number.NaN,
      endTime: Number.NaN,
      language: "ja",
    }]);
  }

  return splitLyricGuideUnits(getLyricGuideUnits(phrase));
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
  setTrackDisplay(activeSong.title, activeSong.artist);
  readyToPlay = false;
  setTransportEnabled(false);
  setDockCollapsed(false);
  markActiveSong();
  renderSoundmarkDebugTools();
  setDebugSoundmarkProgress(DEBUG_SOUNDMARK_DEFAULT_PROGRESS);
  openSoundmarkPanel(getVisibleSoundmarks(debugSoundmarkProgress)[0] ?? SOUNDMARKS[0]);
  setStatusText("soundmark.debugStatus");
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
  label.textContent = t("soundmark.debug");
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
  closeButton.className = "soundmark-debug-close";
  closeButton.textContent = t("soundmark.closePanel");
  closeButton.addEventListener("click", () => closeSoundmarkPanel());
  tools.appendChild(closeButton);

  app.appendChild(tools);
}

function setDebugSoundmarkProgress(progress) {
  cancelSceneProgressTween();
  debugSoundmarkProgress = clamp(progress, 0, 1);
  soundmarkLastProgress = debugSoundmarkProgress;
  $("#now-position").textContent = formatPlayerTime(debugSoundmarkProgress * DEBUG_PLAYER_DURATION_MS);
  $("#now-duration").textContent = formatPlayerTime(DEBUG_PLAYER_DURATION_MS);
  updateProgressDisplay(debugSoundmarkProgress);
  setVisualSongProgress(debugSoundmarkProgress);
  lake.setAudioState({
    amplitude: 0.36,
    chorus: debugSoundmarkProgress >= 0.42 && debugSoundmarkProgress <= 0.72,
  });
  applySoundmarkPalette(debugSoundmarkProgress);
  renderDebugLyricGuide(debugSoundmarkProgress);
  updateSoundmarkDebugTools();
  showDebugSoundmarks();
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
  for (const soundmark of getVisibleSoundmarks(debugSoundmarkProgress)) {
    spawnSoundmarkMarker(soundmark);
  }
}

function renderDebugLyricGuide(progress) {
  const guide = $("#lyric-guide");
  if (!guide) return;

  const preview = t("guidePreview");
  activeGuidePhraseKey = "debug-soundmark-guide";
  applyLyricGuidePalette(guide, progress);
  guide.dataset.phase = getLyricGuidePhaseLabel(progress);
  guide.classList.remove("is-empty");
  guide.classList.toggle("chorus", progress >= 0.42 && progress <= 0.72);
  renderLyricGuidePhrase({
    key: activeGuidePhraseKey,
    text: preview.text,
    startTime: 0,
    endTime: 6000,
    words: preview.words,
  });
  guide.setAttribute("aria-label", preview.aria);
}

function getVisibleSoundmarks(progress) {
  const activeSongId = activeSong?.id ?? SONGS[0]?.id;
  const eligibleProgress = clamp(progress, 0, 1) + 0.006;
  const limit = getSoundmarkVisibleLimit();
  const coreSoundmarks = SOUNDMARKS
    .filter((soundmark) => soundmark.songId === activeSongId && soundmark.progress <= eligibleProgress)
    .sort(compareSoundmarkProgress);
  assignCoreSoundmarkSlots(activeSongId);

  if (coreSoundmarks.length >= limit) return coreSoundmarks.slice(0, limit);

  const extraSlots = Math.max(0, limit - SOUNDMARK_CORE_PER_SONG);
  const echoSoundmarks = getVisibleEchoSoundmarks(activeSongId, eligibleProgress, extraSlots);

  return [...coreSoundmarks, ...echoSoundmarks].sort(compareSoundmarkProgress);
}

function getSoundmarkVisibleLimit() {
  const appRect = $("#app")?.getBoundingClientRect();
  const width = appRect?.width || window.innerWidth || 1;
  const height = appRect?.height || window.innerHeight || 1;
  let extraCount = SOUNDMARK_DESKTOP_EXTRA_COUNT;

  if (width <= 760 || height <= 430) {
    extraCount = 0;
  } else if (width <= 980 || height <= 520) {
    extraCount = SOUNDMARK_MOBILE_EXTRA_COUNT;
  } else if (width <= 1280 || height <= 650) {
    extraCount = SOUNDMARK_TABLET_EXTRA_COUNT;
  }

  return SOUNDMARK_CORE_PER_SONG + extraCount;
}

function assignCoreSoundmarkSlots(activeSongId) {
  SOUNDMARKS
    .filter((soundmark) => soundmark.songId === activeSongId)
    .sort(compareSoundmarkProgress)
    .forEach((soundmark, index) => {
      soundmarkSlotAssignments.set(soundmark.id, index);
    });
}

function getVisibleEchoSoundmarks(activeSongId, eligibleProgress, extraSlots) {
  if (extraSlots <= 0) return [];

  const availableSlots = new Set(
    Array.from({ length: extraSlots }, (_, index) => SOUNDMARK_CORE_PER_SONG + index),
  );
  const eligibleById = new Map(SOUNDMARKS
    .filter((soundmark) => soundmark.songId !== activeSongId && soundmark.progress <= eligibleProgress)
    .map((soundmark) => [soundmark.id, soundmark]));
  const selected = [];

  for (const [soundmarkId, slotIndex] of soundmarkSlotAssignments.entries()) {
    if (!availableSlots.has(slotIndex)) continue;

    const soundmark = eligibleById.get(soundmarkId);
    if (!soundmark) continue;

    selected.push(soundmark);
    availableSlots.delete(slotIndex);
  }

  if (availableSlots.size <= 0) return selected.sort(compareSoundmarkSlot);

  const selectedIds = new Set(selected.map((soundmark) => soundmark.id));
  const candidates = [...eligibleById.values()]
    .filter((soundmark) => !selectedIds.has(soundmark.id))
    .sort((a, b) => getSoundmarkEchoRank(a, activeSongId) - getSoundmarkEchoRank(b, activeSongId));

  for (const soundmark of candidates) {
    const slotIndex = Math.min(...availableSlots);
    soundmarkSlotAssignments.set(soundmark.id, slotIndex);
    selected.push(soundmark);
    availableSlots.delete(slotIndex);

    if (availableSlots.size <= 0) break;
  }

  return selected.sort(compareSoundmarkSlot);
}

function getSoundmarkEchoRank(soundmark, activeSongId) {
  const discoveryPenalty = discoveredSoundmarkIds.has(soundmark.id) ? 100000 : 0;
  const songDistance = Math.abs(SONGS.findIndex((song) => song.id === soundmark.songId)
    - SONGS.findIndex((song) => song.id === activeSongId));
  return soundmark.progress * 1000000
    + discoveryPenalty
    + songDistance * 12000
    + (hashString(`${activeSongId}-echo-${soundmark.id}`) % 10000);
}

function compareSoundmarkProgress(a, b) {
  if (a.progress !== b.progress) return a.progress - b.progress;
  return SOUNDMARKS.indexOf(a) - SOUNDMARKS.indexOf(b);
}

function compareSoundmarkSlot(a, b) {
  return getSoundmarkSlotIndex(a) - getSoundmarkSlotIndex(b);
}

function getSoundmarkSlotIndex(soundmark) {
  return soundmarkSlotAssignments.get(soundmark.id)
    ?? (SOUNDMARKS.indexOf(soundmark) % SOUNDMARK_SLOT_SYMBOLS.length);
}

function getSoundmarkDisplaySymbol(soundmark) {
  return SOUNDMARK_SLOT_SYMBOLS[getSoundmarkSlotIndex(soundmark) % SOUNDMARK_SLOT_SYMBOLS.length]
    ?? soundmark.symbol;
}

function updateSoundmarkSystem(progress, { immediate = false } = {}) {
  const clampedProgress = clamp(progress, 0, 1);
  applySoundmarkPalette(clampedProgress);

  if (!activeSong || !player.video?.duration) return;

  soundmarkLastProgress = clampedProgress;
  syncSoundmarkMarkers(getVisibleSoundmarks(clampedProgress), { immediate });
}

function resetSoundmarks() {
  soundmarkLastProgress = 0;
  soundmarkSlotAssignments.clear();
  resetSoundmarkMarkers();
  closeSoundmarkPanel({ immediate: true });
}

function resetSoundmarkMarkers() {
  clearSoundmarkSpawnQueue();
  soundmarkTargetIds = new Set();
  spawnedSoundmarkIds.clear();
  soundmarkPositions.clear();
  $("#soundmark-layer")?.replaceChildren();
  closeSoundmarkPanel({ immediate: true });
}

function syncSoundmarkMarkers(soundmarks, { immediate = false } = {}) {
  const layer = $("#soundmark-layer");
  if (!layer) return;

  const targetIds = new Set(soundmarks.map((soundmark) => soundmark.id));
  soundmarkTargetIds = targetIds;
  pruneSoundmarkSpawnQueue(targetIds);

  if (activeSoundmarkId && !targetIds.has(activeSoundmarkId)) {
    closeSoundmarkPanel({ immediate: true });
  }

  layer.querySelectorAll(".soundmark-pin").forEach((marker) => {
    const soundmarkId = marker.dataset.soundmarkId;
    if (targetIds.has(soundmarkId)) return;

    marker.remove();
    spawnedSoundmarkIds.delete(soundmarkId);
  });

  if (immediate) {
    clearSoundmarkSpawnQueue();
    const unspawnedSoundmarks = soundmarks.filter((soundmark) => !spawnedSoundmarkIds.has(soundmark.id));
    for (const soundmark of unspawnedSoundmarks) {
      spawnSoundmarkMarker(soundmark);
    }
    return;
  }

  const unspawnedSoundmarks = soundmarks.filter((soundmark) =>
    !spawnedSoundmarkIds.has(soundmark.id)
      && !pendingSoundmarkSpawnIds.has(soundmark.id),
  );

  enqueueSoundmarkSpawns(unspawnedSoundmarks);
}

function enqueueSoundmarkSpawns(soundmarks) {
  if (soundmarks.length <= 0) return;

  for (const soundmark of soundmarks) {
    getSoundmarkPosition(soundmark);
    soundmarkSpawnQueue.push(soundmark);
    pendingSoundmarkSpawnIds.add(soundmark.id);
  }

  runSoundmarkSpawnQueue({ immediate: true });
}

function runSoundmarkSpawnQueue({ immediate = false } = {}) {
  if (soundmarkSpawnTimer != null) return;

  if (immediate) {
    spawnNextQueuedSoundmark();
    return;
  }

  soundmarkSpawnTimer = setTimeout(spawnNextQueuedSoundmark, SOUNDMARK_SPAWN_STAGGER_MS);
}

function spawnNextQueuedSoundmark() {
  soundmarkSpawnTimer = null;

  while (soundmarkSpawnQueue.length > 0) {
    const soundmark = soundmarkSpawnQueue.shift();
    pendingSoundmarkSpawnIds.delete(soundmark.id);

    if (!soundmarkTargetIds.has(soundmark.id) || spawnedSoundmarkIds.has(soundmark.id)) continue;

    spawnSoundmarkMarker(soundmark);
    break;
  }

  if (soundmarkSpawnQueue.length > 0) runSoundmarkSpawnQueue();
}

function pruneSoundmarkSpawnQueue(targetIds) {
  if (soundmarkSpawnQueue.length <= 0) return;

  soundmarkSpawnQueue = soundmarkSpawnQueue.filter((soundmark) => targetIds.has(soundmark.id));
  pendingSoundmarkSpawnIds.clear();
  soundmarkSpawnQueue.forEach((soundmark) => pendingSoundmarkSpawnIds.add(soundmark.id));
}

function clearSoundmarkSpawnQueue() {
  if (soundmarkSpawnTimer != null) {
    clearTimeout(soundmarkSpawnTimer);
    soundmarkSpawnTimer = null;
  }

  soundmarkSpawnQueue = [];
  pendingSoundmarkSpawnIds.clear();
}

function spawnSoundmarkMarker(soundmark) {
  if (spawnedSoundmarkIds.has(soundmark.id)) return;

  const layer = $("#soundmark-layer");
  if (!layer) return;

  const localized = getLocalizedSoundmark(soundmark) ?? soundmark;
  const position = getSoundmarkPosition(soundmark);
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "soundmark-pin";
  marker.dataset.soundmarkId = soundmark.id;
  marker.dataset.songId = soundmark.songId;
  marker.dataset.slot = String(getSoundmarkSlotIndex(soundmark));
  marker.classList.toggle("visited", discoveredSoundmarkIds.has(soundmark.id));
  marker.style.left = `${position.x * 100}%`;
  marker.style.top = `${(1 - position.y) * 100}%`;
  marker.setAttribute("aria-label", t("soundmark.open", { title: localized.title }));
  marker.title = localized.title;

  const floatLayer = document.createElement("span");
  floatLayer.className = "soundmark-float";
  floatLayer.setAttribute("aria-hidden", "true");

  const symbol = document.createElement("span");
  symbol.className = "soundmark-symbol";
  symbol.textContent = getSoundmarkDisplaySymbol(soundmark);
  floatLayer.appendChild(symbol);

  const unreadIndicator = document.createElement("span");
  unreadIndicator.className = "soundmark-unread";
  floatLayer.appendChild(unreadIndicator);
  marker.appendChild(floatLayer);

  marker.addEventListener("click", (event) => {
    event.stopPropagation();
    lake.addRipple(position.x, position.y, 0.62);
    toggleSoundmarkPanel(soundmark);
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
  const existingAvoidZones = getExistingSoundmarkAvoidZones();
  const idealPosition = createSoundmarkPlacementCandidate(soundmark, seed, placementRect, 0);
  let bestCandidate = idealPosition;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < SOUNDMARK_PLACEMENT_CANDIDATE_COUNT; attempt += 1) {
    const candidate = createSoundmarkPlacementCandidate(soundmark, seed, placementRect, attempt);
    const score = getSoundmarkPlacementCandidateScore(candidate, idealPosition, forbiddenZones, existingAvoidZones);
    if (score > bestScore) {
      bestCandidate = candidate;
      bestScore = score;
    }
  }

  soundmarkPositions.set(soundmark.id, bestCandidate);
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

function getSoundmarkPlacementCandidateScore(candidate, idealPosition, forbiddenZones, existingAvoidZones) {
  const insideForbiddenZone = forbiddenZones.some((zone) => isInsideRect(candidate, zone.rect));
  const dx = candidate.x - idealPosition.x;
  const dy = candidate.y - idealPosition.y;
  const idealDistancePenalty = (dx * dx + dy * dy) * 80;
  const avoidScore = forbiddenZones.reduce((score, zone) => score + getRectAvoidScore(candidate, zone.rect), 0);
  const existingMarkerPenalty = existingAvoidZones.reduce(
    (penalty, zone) => penalty + getExistingMarkerAvoidPenalty(candidate, zone.rect),
    0,
  );
  return (insideForbiddenZone ? -100 : 100)
    + Math.min(avoidScore, 12) * 0.02
    - idealDistancePenalty
    - existingMarkerPenalty;
}

function getExistingMarkerAvoidPenalty(position, rect) {
  const outsideDx = Math.max(rect.left - position.x, 0, position.x - rect.right);
  const outsideDy = Math.max(rect.bottom - position.y, 0, position.y - rect.top);

  if (outsideDx > 0 || outsideDy > 0) {
    const width = Math.max(rect.right - rect.left, 0.001);
    const height = Math.max(rect.top - rect.bottom, 0.001);
    const distance = Math.hypot(outsideDx / width, outsideDy / height);
    return distance < 0.45 ? (1 - distance / 0.45) ** 2 * 5 : 0;
  }

  const halfWidth = Math.max((rect.right - rect.left) * 0.5, 0.001);
  const halfHeight = Math.max((rect.top - rect.bottom) * 0.5, 0.001);
  const centerX = (rect.left + rect.right) * 0.5;
  const centerY = (rect.bottom + rect.top) * 0.5;
  const dx = Math.abs(position.x - centerX) / halfWidth;
  const dy = Math.abs(position.y - centerY) / halfHeight;
  const centerPressure = Math.max(0, 1 - Math.max(dx, dy));
  return 28 + centerPressure * 24;
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
  const zones = [
    {
      id: "torii",
      label: "No marker: Torii",
      rect: expandSoundmarkRectForPin(toriiRect),
      displayRect: toriiRect,
    },
  ];

  if (activeSoundmarkId) {
    const panelRect = getSoundmarkPanelExclusionRect();
    zones.push({
      id: "panel",
      label: "No marker: Panel",
      rect: expandSoundmarkRectForPin(panelRect),
      displayRect: panelRect,
    });
  }

  return zones;
}

function getExistingSoundmarkAvoidZones() {
  const marginPx = getExistingSoundmarkAvoidMarginPx();
  const halfSize = getSoundmarkPinHalfSize(marginPx);
  return Array.from(soundmarkPositions.entries()).map(([id, position]) => ({
    id: `soundmark-${id}`,
    rect: {
      left: position.x - halfSize.x,
      right: position.x + halfSize.x,
      bottom: position.y - halfSize.y,
      top: position.y + halfSize.y,
    },
  }));
}

function getExistingSoundmarkAvoidMarginPx() {
  const appRect = $("#app")?.getBoundingClientRect();
  const appWidth = appRect?.width || window.innerWidth || 1;
  const appHeight = appRect?.height || window.innerHeight || 1;
  if (appHeight <= SOUNDMARK_EXISTING_AVOID_MOBILE_HEIGHT_PX) return 0;

  return clamp(
    Math.min(appWidth, appHeight) * 0.022,
    SOUNDMARK_EXISTING_AVOID_MIN_MARGIN_PX,
    SOUNDMARK_EXISTING_AVOID_MARGIN_PX,
  );
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

function getSoundmarkPinHalfSize(extraMarginPx = 0) {
  const appRect = $("#app")?.getBoundingClientRect();
  const appWidth = appRect?.width || window.innerWidth || 1;
  const appHeight = appRect?.height || window.innerHeight || 1;
  return {
    x: (SOUNDMARK_PIN_HALF_WIDTH_PX + extraMarginPx) / appWidth,
    y: (SOUNDMARK_PIN_HALF_HEIGHT_PX + extraMarginPx) / appHeight,
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

  overlay.querySelectorAll(".soundmark-placement-forbidden").forEach((element) => {
    element.hidden = true;
  });

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

function openSoundmarkPanel(soundmark, options = {}) {
  const { recordDiscovery = true } = options;
  const panel = $("#soundmark-panel");
  if (!panel) return;

  clearTimeout(soundmarkCloseTimer);
  if (recordDiscovery && !DEBUG_SOUNDMARKS) recordSoundmarkDiscovery(soundmark.id);
  activeSoundmarkId = soundmark.id;
  $("#app")?.classList.add("soundmark-panel-open");
  updateFullscreenControl();

  renderSoundmarkPanelContent(soundmark);
  markActiveSoundmark();

  panel.hidden = false;
  panel.dataset.phase = getLyricGuidePhaseLabel(soundmarkLastProgress);
  scheduleAnimationFrame(() => panel.classList.add("is-open"));
  scheduleAnimationFrame(updateSoundmarkPlacementOverlay);
}

function toggleSoundmarkPanel(soundmark) {
  if (isSoundmarkPanelOpenFor(soundmark.id)) {
    closeSoundmarkPanel();
    return;
  }

  openSoundmarkPanel(soundmark);
}

function isSoundmarkPanelOpenFor(soundmarkId) {
  const panel = $("#soundmark-panel");
  return Boolean(
    panel
      && !panel.hidden
      && panel.classList.contains("is-open")
      && activeSoundmarkId === soundmarkId,
  );
}

function renderSoundmarkPanelContent(soundmark) {
  const localized = getLocalizedSoundmark(soundmark);
  if (!localized) return;

  $("#soundmark-title").textContent = localized.title;
  $("#soundmark-body").textContent = localized.body;
  renderSoundmarkSource(localized);
}

function closeSoundmarkPanel(options = {}) {
  const { immediate = false } = options;
  const panel = $("#soundmark-panel");
  if (!panel) return;

  clearTimeout(soundmarkCloseTimer);
  activeSoundmarkId = null;
  $("#app")?.classList.remove("soundmark-panel-open");
  updateFullscreenControl();
  markActiveSoundmark();

  panel.classList.remove("is-open");
  if (immediate) {
    panel.hidden = true;
    return;
  }

  soundmarkCloseTimer = setTimeout(() => {
    if (!activeSoundmarkId) panel.hidden = true;
  }, 300);
  scheduleAnimationFrame(updateSoundmarkPlacementOverlay);
}

function updateNoteProgressToast(progress) {
  if (DEBUG_SOUNDMARKS || isProgressScrubbing || !activeSong) return;
  if (progress < NOTE_PROGRESS_SHOW_AT) return;
  if (noteProgressShownSongId === activeSong.id) return;

  noteProgressShownSongId = activeSong.id;
  showNoteProgressToast();
}

function showNoteProgressToast() {
  const toast = $("#note-progress-toast");
  if (!toast || !renderNoteProgressToast()) return;

  toast.hidden = false;
  scheduleAnimationFrame(() => toast.classList.add("is-visible"));

  clearTimeout(noteProgressToastTimer);
  noteProgressToastTimer = setTimeout(() => {
    hideNoteProgressToast();
  }, NOTE_PROGRESS_VISIBLE_MS);
}

function renderNoteProgressToast() {
  const toast = $("#note-progress-toast");
  const count = $("#note-progress-count");
  if (!toast || !count) return false;

  const total = SOUNDMARKS.length;
  const found = SOUNDMARKS.filter((soundmark) => discoveredSoundmarkIds.has(soundmark.id)).length;
  const progress = total > 0 ? clamp(found / total, 0, 1) : 0;

  count.textContent = `${found}/${total}`;
  toast.style.setProperty("--note-progress", `${(progress * 100).toFixed(1)}%`);
  return true;
}

function updateVisibleNoteProgressToast() {
  const toast = $("#note-progress-toast");
  if (!toast || toast.hidden || !toast.classList.contains("is-visible")) return;

  renderNoteProgressToast();
}

function hideNoteProgressToast() {
  const toast = $("#note-progress-toast");
  if (!toast) return;

  clearTimeout(noteProgressToastTimer);
  noteProgressToastTimer = null;
  toast.classList.remove("is-visible");
  setTimeout(() => {
    if (!toast.classList.contains("is-visible")) toast.hidden = true;
  }, 320);
}

function readDiscoveredSoundmarkIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SOUNDMARK_COLLECTION_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const validIds = new Set(SOUNDMARKS.map((soundmark) => soundmark.id));
    return parsed.filter((id) => validIds.has(id));
  } catch {
    return [];
  }
}

function recordSoundmarkDiscovery(soundmarkId) {
  if (!soundmarkId || discoveredSoundmarkIds.has(soundmarkId)) return false;

  discoveredSoundmarkIds.add(soundmarkId);
  try {
    localStorage.setItem(SOUNDMARK_COLLECTION_KEY, JSON.stringify([...discoveredSoundmarkIds].sort()));
  } catch {
    // Soundmark collection state is a visual enhancement, not required for playback.
  }

  document.querySelectorAll(".soundmark-pin").forEach((marker) => {
    marker.classList.toggle("visited", discoveredSoundmarkIds.has(marker.dataset.soundmarkId));
  });

  updateVisibleNoteProgressToast();
  return true;
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
  source.textContent = `${t("soundmark.sourcePrefix")} / ${soundmark.sourceLabel}`;
}

function markActiveSoundmark() {
  document.querySelectorAll(".soundmark-pin").forEach((marker) => {
    marker.classList.toggle("active", marker.dataset.soundmarkId === activeSoundmarkId);
  });
}

function applySoundmarkPalette(progress) {
  const palette = getSoundmarkPalette(progress);
  const targets = [
    $("#soundmark-layer"),
    $("#soundmark-panel"),
    $("#control-dock"),
    $("#note-progress-toast"),
    $("#onboarding"),
  ].filter(Boolean);

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
  effect.lang = "ja";
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

function easeInOutCubic(value) {
  const t = clamp(value, 0, 1);
  return t < 0.5
    ? 4 * t * t * t
    : 1 - ((-2 * t + 2) ** 3) / 2;
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
