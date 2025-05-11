/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type GetAudioContextOptions = AudioContextOptions & {
  id?: string;
};

const map: Map<string, AudioContext> = new Map();

export const audioContext: (
  options?: GetAudioContextOptions,
) => Promise<AudioContext | null> = (() => { // Modified return type
  let didInteractPromise: Promise<void> | null = null;

  if (typeof window !== 'undefined') {
    didInteractPromise = new Promise((res) => {
      window.addEventListener("pointerdown", () => res(), { once: true });
      window.addEventListener("keydown", () => res(), { once: true });
    });
  }

  return async (options?: GetAudioContextOptions): Promise<AudioContext | null> => { // Modified return type
    if (typeof window === 'undefined' || typeof Audio === 'undefined' || typeof AudioContext === 'undefined') {
      console.warn("AudioContext not available in this environment.");
      return null; // Return null if not in browser
    }

    try {
      const a = new Audio();
      a.src =
        "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
      await a.play().catch(() => { /* Autoplay might be blocked, ignore */ });
      if (options?.id && map.has(options.id)) {
        const ctx = map.get(options.id);
        if (ctx) {
          return ctx;
        }
      }
      const ctx = new AudioContext(options);
      if (options?.id) {
        map.set(options.id, ctx);
      }
      return ctx;
    } catch (e) {
      if (didInteractPromise) {
        await didInteractPromise;
      } else {
        // If didInteractPromise is null, it means we are not in a browser or it wasn't set up.
        // This path might not be reachable if the initial check for window fails.
        console.error("Interaction promise not available for AudioContext fallback.", e);
        return null;
      }
      // Try again after interaction
      if (options?.id && map.has(options.id)) {
        const ctx = map.get(options.id);
        if (ctx) {
          return ctx;
        }
      }
      const ctx = new AudioContext(options);
      if (options?.id) {
        map.set(options.id, ctx);
      }
      return ctx;
    }
  };
})();

export const blobToJSON = (blob: Blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        const json = JSON.parse(reader.result as string);
        resolve(json);
      } else {
        reject("oops");
      }
    };
    reader.readAsText(blob);
  });

export function base64ToArrayBuffer(base64: string) {
  var binaryString = atob(base64);
  var bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
