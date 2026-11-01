import { LAB_CHAT } from './lab.constants';
import type { ChatPart } from '@repo/client/client';

export function labMediaLandscape({ name, sky, far, near, sun }: (typeof LAB_CHAT.media.landscapes)[number]): ChatPart {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640"><rect width="960" height="640" fill="${sky}"/><circle cx="700" cy="170" r="70" fill="${sun}"/><path d="M0 420C200 340 380 360 560 410S860 470 960 400V640H0Z" fill="${far}"/><path d="M0 500C220 450 420 520 620 490S880 450 960 500V640H0Z" fill="${near}"/></svg>`;

  return { type: 'file', mediaType: 'image/svg+xml', filename: name, url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` };
}

export function labMediaVoice(): string {
  const { sampleRate, audioSeconds } = LAB_CHAT.media;
  const samples = sampleRate * audioSeconds;
  const view = new DataView(new ArrayBuffer(44 + samples * 2));

  const labMediaWavText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  labMediaWavText(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  labMediaWavText(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  labMediaWavText(36, 'data');
  view.setUint32(40, samples * 2, true);

  const bytes = new Uint8Array(view.buffer);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return `data:audio/wav;base64,${btoa(binary)}`;
}

export function labMediaVideo(): Promise<ChatPart | null> {
  const { videoSeconds, videoFps, landscapes } = LAB_CHAT.media;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const scene = landscapes[3];

  if (!Object.hasOwn(globalThis, 'MediaRecorder') || !context) {
    return Promise.resolve(null);
  }

  canvas.width = 640;
  canvas.height = 360;

  const recorder = new MediaRecorder(canvas.captureStream(videoFps));
  const chunks: Blob[] = [];
  const startedAt = performance.now();

  return new Promise((resolve) => {
    recorder.ondataavailable = (event) => chunks.push(event.data);
    recorder.onstop = () => resolve({
      type: 'file',
      mediaType: recorder.mimeType.split(';', 1)[0] ?? 'video/webm',
      filename: 'walkthrough.webm',
      url: URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType })),
    });

    const labMediaVideoDraw = () => {
      const progress = (performance.now() - startedAt) / 1000 / videoSeconds;

      context.fillStyle = scene.sky;
      context.fillRect(0, 0, 640, 360);
      context.fillStyle = scene.sun;
      context.beginPath();
      context.arc(470, 90 + progress * 60, 36, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = scene.far;
      context.fillRect(0, 230, 640, 130);
      context.fillStyle = scene.near;
      context.fillRect(120 - progress * 80, 180, 120, 180);

      if (progress < 1) {
        requestAnimationFrame(labMediaVideoDraw);
      } else {
        recorder.stop();
      }
    };

    recorder.start();
    labMediaVideoDraw();
  });
}
