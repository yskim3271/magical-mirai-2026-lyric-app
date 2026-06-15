# Magical Mirai 2026 Lyric App

Magical Mirai 2026 Programming Contest용 리릭앱 프로젝트.
대상곡은 **こたえて 단일곡이 아니라, Magical Mirai 2026 악곡 콘테스트 수상작 6곡 전체**다.

현재 구현은 `湖のソナーレ` 테마에 맞춰, 하마나코 호수의 시간 변화와 수면 파문 위에 6곡의 가사를 표시하는 웹 리릭앱이다.
TextAlive의 phrase, word, beat, segment, vocal amplitude 데이터를 사용해 수면 가사, 하늘 가사 가이드, 파문, 반사 연출을 동기화한다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:5173 접속 후 곡을 선택한다.

## 동작 환경

- PC / 태블릿 / 스마트폰 가로 화면을 대상으로 한다.
- 앱 스테이지는 배경 에셋 비율인 `168:95`로 고정한다.
- 스마트폰 세로 화면에서는 재생 화면을 제공하지 않고 가로 회전 안내를 표시한다.

## 앱 토큰

TextAlive App API 사용을 위해 앱 토큰이 필요하다.
제출 전 [developer.textalive.jp/profile](https://developer.textalive.jp/profile/)에서 개발자 등록 후 본인 토큰을 사용한다.

## 대상곡

공식 페이지 기준, 대상곡은 『初音ミク「マジカルミライ 2026」楽曲コンテスト』 수상작 6곡이다.
앱은 아래 6곡을 모두 선택/재생할 수 있어야 한다.

| 곡 | 아티스트 | 곡 URL | 가사 URL | 고정 ID |
|---|---|---|---|---|
| こたえて | imie | `https://piapro.jp/t/6W2N/20251215164617` | `https://piapro.jp/t/9o24` | beat 4827293 / chord 2963754 / segment 3086261 / lyric 126519 / diff 28645 |
| アフター・ザ・カーテン | Rulmry | `https://piapro.jp/t/zoqO/20251214200738` | `https://piapro.jp/t/EVO2` | beat 4827294 / chord 2963755 / segment 3086262 / lyric 126591 / diff 28627 |
| シャッターチャンス | 夜未アガリ | `https://piapro.jp/t/PNpQ/20251209170719` | `https://piapro.jp/t/wyWv` | beat 4827295 / chord 2963756 / segment 3086263 / lyric 126542 / diff 28628 |
| 世界最後の音楽隊 | 夏山よつぎ×ど～ぱみん | `https://piapro.jp/t/B3yJ/20251215061727` | `https://piapro.jp/t/9U-6` | beat 4827296 / chord 2963757 / segment 3086264 / lyric 126594 / diff 28629 |
| トリツクロジー | 鶴三 | `https://piapro.jp/t/QBdL/20251215094303` | `https://piapro.jp/t/Nixq` | beat 4827297 / chord 2963758 / segment 3086265 / lyric 126593 / diff 28630 |
| TAKEOVER | Twinfield | `https://piapro.jp/t/E2i3/20251215092113` | `https://piapro.jp/t/zxWP` | beat 4827298 / chord 2963759 / segment 3086266 / lyric 126533 / diff 28631 |

출처:
- https://magicalmirai.com/2026/procon/
- https://developer.textalive.jp/events/magicalmirai2026/

## 참고 자료

- `reference/procon2026_lyrics.txt` — 대상곡 6곡 가사 원문
- `reference/mm2026_theme.md` — Magical Mirai 2026 테마 분석
- `reference/concept_brainstorm.md` — 전곡 대응 리릭앱 컨셉 메모
- `archive/` — 역대 수상작 분석과 참고 구현. 새 코드로 가져오지 않고 패턴만 참고한다.

## 콘테스트 제약 메모

- 정적 웹앱만 허용. 서버 사이드 코드 금지, Vite 빌드는 허용.
- 제출: 비공개 GitHub 저장소를 `magicalmirai-procon` 계정과 공유 + Google Form.
- 마감: 2026-06-29 12:00 JST.
- 마감 전까지 데모/티저 공개 금지.
- README에 동작 환경 명시 필요.
- TextAlive 미디어 배너(`#media`)는 라이선스 표기이므로 가리지 말 것.
