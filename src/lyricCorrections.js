const LYRIC_CORRECTIONS = {
  kotaete: {
    suppressWaterPhraseTexts: [
      "どれほどの苦しみも悲しみの向こうに",
      "きっと私の目指す私がいると信じ続けていた",
    ],
    suppressGuidePhraseTexts: [
      "どれほどの苦しみも悲しみの向こうに",
      "きっと私の目指す私がいると信じ続けていた",
    ],
    suppressWaterRanges: [
      { startTime: 65000, endTime: 65700 },
    ],
    guideLineBreaks: [
      {
        text: "そこに紛れているんだ",
        lines: ["そこに", "紛れているんだ"],
      },
      {
        text: "自分を重ねて聞いてた",
        lines: ["自分を重ねて", "聞いてた"],
      },
      {
        text: "この世界を果てまで探そうとも",
        lines: ["この世界を", "果てまで探そうとも"],
      },
      {
        text: "当てにならないようだ",
        lines: ["当てにならない", "ようだ"],
      },
      {
        text: "目の前の色の無い世界を",
        lines: ["目の前の", "色の無い世界を"],
      },
      {
        text: "自分なりにでも生きて",
        lines: ["自分なりにでも", "生きて"],
      },
      {
        text: "知らないふりして走り続けるよ",
        lines: ["知らないふりして", "走り続けるよ"],
      },
      {
        text: "期待してるよ後悔するよ",
        lines: ["期待してるよ", "後悔するよ"],
      },
      {
        text: "どこまでも平行線な声が叫んでいる",
        lines: ["どこまでも平行線な", "声が叫んでいる"],
      },
      {
        text: "僕があなたならば迷ってしまう",
        lines: ["僕があなたならば", "迷ってしまう"],
      },
    ],
    guideOnlyPhrases: [
      {
        key: "kotaete-backing-vocal-1",
        startTime: 52000,
        endTime: 59000,
        text: "（どれほどの苦しみも悲しみの向こうにきっと）",
        words: [
          { text: "（どれほどの苦しみも" },
          { text: "悲しみの向こうにきっと）" },
        ],
        variant: "backing",
      },
      {
        key: "kotaete-backing-vocal-2",
        startTime: 59000,
        endTime: 65000,
        text: "（私の目指す私がいると信じ続けていた）",
        words: [
          { text: "（私の目指す私が" },
          { text: "いると信じ続けていた）" },
        ],
        variant: "backing",
        alignEndTo: "latestOverlappingGuidePhrase",
      },
    ],
  },
  "after-the-curtain": {
    guideLineBreaks: [
      {
        text: "この日々の続きが息をしてる",
        lines: ["この日々の続きが", "息をしてる"],
      },
      {
        text: "この日々の続きがここにある",
        lines: ["この日々の続きが", "ここにある"],
      },
      {
        text: "ステージの端に光が滲むころ",
        lines: ["ステージの端に", "光が滲むころ"],
      },
      {
        text: "言葉より先に風が触れた",
        lines: ["言葉より先に", "風が触れた"],
      },
      {
        text: "終わりの文字を見届けながら",
        lines: ["終わりの文字を", "見届けながら"],
      },
      {
        text: "消えていくのではなく形を変えてどこかで揺れる",
        lines: ["消えていくのではなく", "形を変えてどこかで揺れる"],
      },
      {
        text: "残響のように続く日々",
        lines: ["残響のように", "続く日々"],
      },
      {
        text: "それが生きている証のようで",
        lines: ["それが生きている", "証のようで"],
      },
      {
        text: "コーヒーの湯気に揺れる朝がある",
        lines: ["コーヒーの湯気に", "揺れる朝がある"],
      },
      {
        text: "見えない場所で次の章が静かにほどけていく",
        lines: ["見えない場所で次の章が", "静かにほどけていく"],
      },
      {
        text: "寂しさのあとに残る余白と",
        lines: ["寂しさのあとに", "残る余白と"],
      },
      {
        text: "静かに息をしているだけ",
        lines: ["静かに", "息をしているだけ"],
      },
      {
        text: "夜の色は消えていくから",
        lines: ["夜の色は", "消えていくから"],
      },
      {
        text: "拍手が止んだあとにも",
        lines: ["拍手が止んだ", "あとにも"],
      },
      {
        text: "それが未来の形なんだ",
        lines: ["それが未来の", "形なんだ"],
      },
    ],
  },
  "shutter-chance": {
    guideLineBreaks: [
      {
        text: "ため息混じりの嫉妬もしょうがないね",
        lines: ["ため息混じりの嫉妬も", "しょうがないね"],
      },
      {
        text: "全て君を落とす1枚になるモラトリアム",
        lines: ["全て君を落とす", "1枚になるモラトリアム"],
      },
      {
        text: "どれも君を落とす1枚になるモラトリアム",
        lines: ["どれも君を落とす", "1枚になるモラトリアム"],
      },
      {
        text: "切り取り永遠に保存して♡",
        lines: ["切り取り", "永遠に保存して♡"],
      },
      {
        text: "切り取り永遠に残して♡",
        lines: ["切り取り", "永遠に残して♡"],
      },
      {
        text: "誰にも真似できない勝てっこない",
        lines: ["誰にも真似できない", "勝てっこない"],
      },
      {
        text: "誰もが追いつけない揺るがない",
        lines: ["誰もが追いつけない", "揺るがない"],
      },
      {
        text: "再現出来ないスナップ",
        lines: ["再現出来ない", "スナップ"],
      },
      {
        text: "再現出来ないストロボ",
        lines: ["再現出来ない", "ストロボ"],
      },
      {
        text: "もっとバッファにアーカイブして",
        lines: ["もっとバッファに", "アーカイブして"],
      },
      {
        text: "切り取ってフレームで閉じ込めて",
        lines: ["切り取って", "フレームで閉じ込めて"],
      },
      {
        text: "油断してつい照れちゃうのもしょうがないね",
        lines: ["油断してつい照れちゃうのも", "しょうがないね"],
      },
    ],
  },
  "last-band": {
    guideLineBreaks: [
      {
        text: "「この空には色なんてないよ」",
        lines: ["「この空には", "色なんてないよ」"],
      },
      {
        text: "私はヒカリの中で歌った",
        lines: ["私はヒカリの中で", "歌った"],
      },
      {
        text: "なんて空っぽなのでしょうか",
        lines: ["なんて", "空っぽなのでしょうか"],
      },
      {
        text: "少しだけデータスモッグの隙間から",
        lines: ["少しだけ", "データスモッグの隙間から"],
      },
      {
        text: "「涙には決まった形はないよ」",
        lines: ["「涙には", "決まった形はないよ」"],
      },
      {
        text: "あなたはもう何も言わなかった",
        lines: ["あなたはもう", "何も言わなかった"],
      },
      {
        text: "増えてゆくデータスモッグの隙間から",
        lines: ["増えてゆく", "データスモッグの隙間から"],
      },
      {
        text: "(僕らが描いた未来は)",
        lines: ["(僕らが描いた", "未来は)"],
      },
      {
        text: "またいつか何万年が経って",
        lines: ["またいつか", "何万年が経って"],
      },
      {
        text: "新しい文明が生まれたら",
        lines: ["新しい文明が", "生まれたら"],
      },
      {
        text: "あなたが託したコエが鳴る",
        lines: ["あなたが託した", "コエが鳴る"],
      },
    ],
  },
  toritsukurogy: {
    guideLineBreaks: [
      {
        text: "あなたに届いてしまうから",
        lines: ["あなたに届いて", "しまうから"],
      },
      {
        text: "取り憑くように無い性懲り",
        lines: ["取り憑くように", "無い性懲り"],
      },
      {
        text: "離れまいとしてしまう病理",
        lines: ["離れまいとして", "しまう病理"],
      },
      {
        text: "「卑怯な人」と笑って",
        lines: ["「卑怯な人」", "と笑って"],
      },
      {
        text: "とっても綺麗な丸にするの",
        lines: ["とっても綺麗な", "丸にするの"],
      },
      {
        text: "あってないようなものなのかな",
        lines: ["あってないような", "ものなのかな"],
      },
      {
        text: "愛されたら溶けてしまうのに",
        lines: ["愛されたら", "溶けてしまうのに"],
      },
      {
        text: "いつまでもいつまでも",
        lines: ["いつまでも", "いつまでも"],
      },
    ],
  },
  takeover: {
    guideLineBreaks: [
      {
        text: "このリアル掌返して皆テイクオーバー",
        lines: ["このリアル掌返して", "皆テイクオーバー"],
      },
      {
        text: "Clapto theBeat",
        lines: ["Clap to", "the Beat"],
      },
      {
        text: "Noise＆Hits",
        lines: ["Noise", "＆ Hits"],
      },
      {
        text: "Letthemburn, we'retheantidote.",
        lines: ["Let them burn,", "we're the antidote."],
      },
      {
        text: "Letthemburn, we'retheantidote",
        lines: ["Let them burn,", "we're the antidote"],
      },
      {
        text: "狂った日々召ませ口上Aha!",
        lines: ["狂った日々召ませ", "口上Aha!"],
      },
      {
        text: "感覚を道連れにして反響",
        lines: ["感覚を道連れにして", "反響"],
      },
      {
        text: "講釈垂れ繰り返して見て聴いて？",
        lines: ["講釈垂れ繰り返して", "見て聴いて？"],
      },
      {
        text: "キャパシティオーバー？（オーバー）",
        lines: ["キャパシティオーバー？", "（オーバー）"],
      },
      {
        text: "リブートしてこの日を塗り替えてみたい",
        lines: ["リブートしてこの日を", "塗り替えてみたい"],
      },
      {
        text: "誰かのエナジーになりたい",
        lines: ["誰かの", "エナジーになりたい"],
      },
      {
        text: "繰り返す言葉に乞うご期待",
        lines: ["繰り返す言葉に", "乞うご期待"],
      },
      {
        text: "光と影飲み込む君照らすCygnus",
        lines: ["光と影飲み込む", "君照らすCygnus"],
      },
      {
        text: "遠回りをしてもいいじゃない",
        lines: ["遠回りをしても", "いいじゃない"],
      },
      {
        text: "クルクル回るマセた登場Aha!",
        lines: ["クルクル回る", "マセた登場Aha!"],
      },
      {
        text: "どうにもならない言葉で責めるのこりゃ月旦",
        lines: ["どうにもならない言葉で", "責めるのこりゃ月旦"],
      },
      {
        text: "強弱無し繰り返して見て聴いて？",
        lines: ["強弱無し繰り返して", "見て聴いて？"],
      },
      {
        text: "月並みだよ幸せになりゃGetDown",
        lines: ["月並みだよ", "幸せになりゃGetDown"],
      },
      {
        text: "誰かのエナジーになるだろう",
        lines: ["誰かの", "エナジーになるだろう"],
      },
      {
        text: "LoveLove Love始まりの碧",
        lines: ["Love Love", "Love 始まりの碧"],
      },
      {
        text: "さあClap ClapClap",
        lines: ["さあClap", "Clap Clap"],
      },
      {
        text: "さあWrap WrapWrap",
        lines: ["さあWrap", "Wrap Wrap"],
      },
      {
        text: "敗色を蹴散らせ炎Aha!",
        lines: ["敗色を蹴散らせ", "炎Aha!"],
      },
    ],
  },
};

export function applyLyricCorrections(songId, { lyricChunks, guidePhrases }) {
  const correction = LYRIC_CORRECTIONS[songId];
  if (!correction) return { lyricChunks, guidePhrases };

  const suppressWaterTexts = createNormalizedSet(correction.suppressWaterPhraseTexts);
  const suppressGuideTexts = createNormalizedSet(correction.suppressGuidePhraseTexts);
  const guideLineBreaks = createGuideLineBreakMap(correction.guideLineBreaks);

  const retainedGuidePhrases = guidePhrases
    .filter((phrase) => !suppressGuideTexts.has(normalizeLyricText(phrase.text)))
    .map((phrase) => applyGuideLineBreak(phrase, guideLineBreaks));
  const guideOnlyPhrases = resolveGuideOnlyPhrases(correction.guideOnlyPhrases, retainedGuidePhrases);

  return {
    lyricChunks: lyricChunks.filter((chunk) =>
      !isSuppressedWaterChunk(chunk, suppressWaterTexts, correction.suppressWaterRanges),
    ),
    guidePhrases: [
      ...retainedGuidePhrases,
      ...guideOnlyPhrases,
    ].sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime),
  };
}

function applyGuideLineBreak(phrase, guideLineBreaks) {
  const lines = guideLineBreaks.get(normalizeLyricText(phrase.text));
  if (!lines) return phrase;

  return {
    ...phrase,
    guideLineTexts: lines,
  };
}

function createGuideLineBreakMap(values = []) {
  return new Map(values.map((entry) => [
    normalizeLyricText(entry.text),
    entry.lines.map((line) => String(line)),
  ]));
}

function resolveGuideOnlyPhrases(guideOnlyPhrases = [], guidePhrases) {
  return guideOnlyPhrases.map((phrase) => {
    if (phrase.alignEndTo !== "latestOverlappingGuidePhrase") return { ...phrase };

    const alignedEndTime = getLatestOverlappingGuidePhraseEndTime(phrase, guidePhrases);
    const { alignEndTo, ...resolvedPhrase } = phrase;
    return {
      ...resolvedPhrase,
      endTime: alignedEndTime ?? phrase.endTime,
    };
  });
}

function getLatestOverlappingGuidePhraseEndTime(targetPhrase, guidePhrases) {
  const overlaps = guidePhrases.filter((phrase) =>
    Number(phrase.startTime) < Number(targetPhrase.endTime)
      && Number(targetPhrase.startTime) < Number(phrase.endTime),
  );
  if (overlaps.length === 0) return null;

  return Math.max(...overlaps.map((phrase) => Number(phrase.endTime)));
}

function isSuppressedWaterChunk(chunk, suppressTexts, suppressRanges = []) {
  const phraseText = getChunkPhraseText(chunk);
  if (suppressTexts.has(normalizeLyricText(phraseText))) return true;

  return suppressRanges.some((range) =>
    range.startTime <= Number(chunk?.startTime)
      && Number(chunk?.startTime) <= range.endTime,
  );
}

function getChunkPhraseText(chunk) {
  if (chunk?.parent?.text) return chunk.parent.text;

  const parentWord = chunk?.words?.find((word) => word?.parent?.text);
  return parentWord?.parent?.text ?? "";
}

function createNormalizedSet(values = []) {
  return new Set(values.map(normalizeLyricText));
}

function normalizeLyricText(text) {
  return String(text ?? "").replace(/[\s\u3000]/g, "");
}
