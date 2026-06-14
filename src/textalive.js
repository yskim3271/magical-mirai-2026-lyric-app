import { Player } from "textalive-app-api";

const SAMPLE_APP_TOKEN = "1HJzpsZ11CfoUPrr";

export function createTextAlivePlayer(mediaElement) {
  return new Player({
    app: {
      token: import.meta.env.VITE_TEXTALIVE_APP_TOKEN || SAMPLE_APP_TOKEN,
    },
    mediaElement,
    mediaBannerPosition: "bottom right",
    vocalAmplitudeEnabled: true,
  });
}

export function loadSong(player, song) {
  player.createFromSongUrl(song.songUrl, {
    video: song.video,
  });
}
