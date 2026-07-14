import {
  DEFAULT_NOTIFICATION_SOUND,
  getNotificationSoundUrl,
} from "@/lib/notifications/constants";
import type { NotificationSoundTone } from "@/types/notifications";

const NOTIFICATION_SOUND_VOLUME = 0.55;

const audioCache = new Map<NotificationSoundTone, HTMLAudioElement>();
let unlocked = false;
let unlockListenersAttached = false;

function getAudio(tone: NotificationSoundTone) {
  if (typeof window === "undefined") return null;

  let element = audioCache.get(tone);
  if (!element) {
    element = new Audio(getNotificationSoundUrl(tone));
    element.preload = "auto";
    element.volume = NOTIFICATION_SOUND_VOLUME;
    audioCache.set(tone, element);
  }

  return element;
}

function primeNotificationSound(tone: NotificationSoundTone = DEFAULT_NOTIFICATION_SOUND) {
  const element = getAudio(tone);
  if (!element || unlocked) return;

  void element
    .play()
    .then(() => {
      element.pause();
      element.currentTime = 0;
      unlocked = true;
    })
    .catch(() => {
      // Browser blocked autoplay until user interacts with the page.
    });
}

export function attachNotificationSoundUnlock() {
  if (unlockListenersAttached || typeof window === "undefined") return;
  unlockListenersAttached = true;

  const unlock = () => {
    primeNotificationSound();
  };

  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true, passive: true });
}

export function playNotificationSound(tone: NotificationSoundTone = DEFAULT_NOTIFICATION_SOUND) {
  const element = getAudio(tone);
  if (!element) return;

  element.currentTime = 0;
  void element.play().catch(() => {
    // Ignore autoplay restrictions; sound plays after the first user interaction.
  });
}

export function previewNotificationSound(tone: NotificationSoundTone) {
  playNotificationSound(tone);
}
