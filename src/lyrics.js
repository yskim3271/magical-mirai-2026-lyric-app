export function collectPhrases(video) {
  const phrases = [];
  let phrase = video?.firstPhrase ?? null;

  while (phrase) {
    phrases.push({
      startTime: phrase.startTime,
      endTime: phrase.endTime,
      text: phrase.text,
      ref: phrase,
    });
    phrase = phrase.next;
  }

  return phrases;
}

export function collectWords(video) {
  const words = [];
  let word = video?.firstWord ?? null;

  while (word) {
    words.push({
      startTime: word.startTime,
      endTime: word.endTime,
      text: word.text,
      pos: word.pos,
      language: word.language,
      parent: word.parent ?? null,
      ref: word,
    });
    word = word.next;
  }

  return words;
}

const DEPENDENT_POS = new Set(["S", "P", "M"]);
const NOUN_POS = "N";
const MODIFIER_POS = new Set(["V", "A", "R", "F"]);
const BACK_MARKS = new Set(["!", "！", "?", "？", ")", "）", "]", "］", "}", "｝", "」", "』", "'", "’", "、", ",", "。", "."]);
const FRONT_MARKS = new Set(["(", "（", "[", "［", "{", "｛", "「", "『", "'", "’"]);
const DEPENDENT_TEXT = new Set([
  "の",
  "に",
  "を",
  "が",
  "は",
  "へ",
  "と",
  "で",
  "や",
  "も",
  "か",
  "ね",
  "よ",
  "な",
  "さ",
  "ぞ",
  "ぜ",
  "ば",
  "なら",
  "から",
  "まで",
  "より",
  "だけ",
  "ほど",
  "くらい",
  "ぐらい",
  "しか",
  "でも",
  "ても",
  "て",
  "で",
  "た",
  "だ",
  "です",
  "ます",
  "まし",
  "ませ",
  "ない",
  "無い",
  "なく",
  "ぬ",
  "ん",
  "たい",
  "たく",
  "たち",
  "られ",
  "れる",
  "せる",
  "よう",
  "そう",
  "だろう",
  "でしょう",
  "ながら",
]);

export function buildLyricChunks(words, { findBeat, maxChars = 14 } = {}) {
  const chunks = [];
  let index = 0;

  while (index < words.length) {
    const first = words[index];
    if (!first?.text?.trim()) {
      index += 1;
      continue;
    }

    const chunkWords = [first];
    index += 1;

    while (index < words.length) {
      const next = words[index];
      if (!next?.text?.trim()) {
        index += 1;
        continue;
      }

      const nextText = next.text.trim();
      const joined = joinLyricText(chunkWords, next);
      const allowOverflowForMark = isBackMark(nextText) || isFrontMark(nextText);

      if (!allowOverflowForMark && visibleLength(joined) > maxChars) break;
      if (!shouldAttachWord(chunkWords, next, findBeat)) break;

      chunkWords.push(next);
      index += 1;
    }

    const last = chunkWords[chunkWords.length - 1];
    chunks.push({
      startTime: first.startTime,
      endTime: last.endTime,
      text: joinLyricText(chunkWords),
      pos: first.pos,
      language: first.language,
      parent: first.parent,
      words: chunkWords,
      ref: first.ref,
    });
  }

  return chunks;
}

function shouldAttachWord(chunkWords, next, findBeat) {
  const first = chunkWords[0];
  const last = chunkWords[chunkWords.length - 1];
  const text = next.text.trim();

  if (!sameParent(first, next) && !isBackMark(text)) return false;
  if (isBackMark(text)) return true;
  if (isFrontMark(last.text?.trim())) return true;
  if (isDependentWord(next)) return isCloseEnough(first, next, findBeat, 1);

  if (next.pos === NOUN_POS && isLinkingParticle(last) && chunkRootCount(chunkWords) < 2) {
    return isCloseEnough(first, next, findBeat, 1);
  }

  if (next.pos === NOUN_POS && canModifyFollowingNoun(chunkWords, last) && chunkRootCount(chunkWords) < 2) {
    return isCloseEnough(first, next, findBeat, 1);
  }

  if (last.pos === NOUN_POS && next.pos === NOUN_POS && sameParent(last, next) && last.language === next.language) {
    return chunkRootCount(chunkWords) < 2 && isCloseEnough(first, next, findBeat, 1);
  }

  return false;
}

function isDependentWord(word) {
  const text = word.text?.trim() ?? "";
  return DEPENDENT_POS.has(word.pos) || DEPENDENT_TEXT.has(text);
}

function isContentWord(word) {
  const text = word.text?.trim() ?? "";
  return Boolean(text) && !isDependentWord(word) && !isBackMark(text) && !isFrontMark(text);
}

function chunkRootCount(words) {
  return words.filter(isContentWord).length;
}

function isLinkingParticle(word) {
  const text = word?.text?.trim() ?? "";
  return text === "の" || text === "ノ";
}

function canModifyFollowingNoun(chunkWords, last) {
  if (!MODIFIER_POS.has(last.pos)) return false;
  if (chunkRootCount(chunkWords) === 0) return false;
  return !isBackMark(last.text?.trim()) && !isFrontMark(last.text?.trim());
}

function sameParent(a, b) {
  if (!a?.parent || !b?.parent) return true;
  return a.parent === b.parent;
}

function isCloseEnough(first, next, findBeat, maxMeasures) {
  const beatDistance = readBeatDistance(first.startTime, next.startTime, findBeat);
  if (beatDistance != null) return beatDistance <= maxMeasures;
  return next.startTime - first.startTime <= 850;
}

function readBeatDistance(firstTime, nextTime, findBeat) {
  if (typeof findBeat !== "function") return null;

  try {
    const firstBeat = findBeat(firstTime);
    const nextBeat = findBeat(nextTime);
    if (!firstBeat || !nextBeat) return null;

    const firstIndex = Number(firstBeat.index);
    const nextIndex = Number(nextBeat.index);
    const beatLength = Math.max(1, Number(firstBeat.length) || 1);
    if (!Number.isFinite(firstIndex) || !Number.isFinite(nextIndex)) return null;

    return (nextIndex - firstIndex) / beatLength;
  } catch {
    return null;
  }
}

function joinLyricText(words, extraWord = null) {
  const units = extraWord ? [...words, extraWord] : words;
  return units.reduce((text, word, index) => {
    const value = word.text?.trim() ?? "";
    if (!value) return text;
    if (index > 0 && shouldInsertSpace(units[index - 1], word)) return `${text} ${value}`;
    return `${text}${value}`;
  }, "");
}

function shouldInsertSpace(previous, current) {
  return previous?.language === "en" && current?.language === "en"
    && !isBackMark(current.text?.trim())
    && !isFrontMark(previous.text?.trim());
}

function isBackMark(text) {
  return BACK_MARKS.has(text);
}

function isFrontMark(text) {
  return FRONT_MARKS.has(text);
}

function visibleLength(text) {
  return [...text].length;
}

export function findActivePhrase(phrases, position) {
  return phrases.find((phrase) => phrase.startTime <= position && position < phrase.endTime) ?? null;
}

export function collectSegments(player) {
  const groups = player.data.songMap?.segments ?? [];
  return groups
    .flatMap((group) =>
      group.segments.map((segment) => ({
        chorus: group.chorus,
        startTime: segment.startTime,
        endTime: segment.endTime,
      })),
    )
    .sort((a, b) => a.startTime - b.startTime);
}

export function formatTime(ms) {
  if (ms == null || Number.isNaN(ms)) return "-";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}
