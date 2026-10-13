export const MAX_NARRATION_MP3_BYTES = 15 * 1024 * 1024;
export const MAX_NARRATION_WAV_BYTES = 30 * 1024 * 1024;
export const MAX_NARRATION_AUDIO_BYTES = MAX_NARRATION_WAV_BYTES;
export const MIN_NARRATION_AUDIO_BYTES = 512;

export type NarrationAudioFormat = {
  extension: 'mp3' | 'wav';
  mimeType: 'audio/mpeg' | 'audio/wav';
};

function validMp3Frame(bytes: Uint8Array, offset: number) {
  if (offset + 4 > bytes.length || bytes[offset] !== 0xff || (bytes[offset + 1] & 0xe0) !== 0xe0) return false;
  const version = (bytes[offset + 1] >> 3) & 0x03;
  const layer = (bytes[offset + 1] >> 1) & 0x03;
  const bitrate = (bytes[offset + 2] >> 4) & 0x0f;
  const sampleRate = (bytes[offset + 2] >> 2) & 0x03;
  return version !== 1 && layer !== 0 && bitrate !== 0 && bitrate !== 15 && sampleRate !== 3;
}

export function detectMp3(bytes: Uint8Array) {
  if (bytes.length < MIN_NARRATION_AUDIO_BYTES || bytes.length > MAX_NARRATION_MP3_BYTES) return false;
  let start = 0;
  if (bytes.length >= 10 && String.fromCharCode(...bytes.slice(0, 3)) === 'ID3') {
    if ([bytes[6], bytes[7], bytes[8], bytes[9]].some((value) => value > 0x7f)) return false;
    const tagSize = (bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9];
    start = 10 + tagSize + ((bytes[5] & 0x10) ? 10 : 0);
  }
  const end = Math.min(bytes.length - 4, start + 4096);
  for (let offset = start; offset <= end; offset += 1) if (validMp3Frame(bytes, offset)) return true;
  return false;
}

const ascii = (bytes: Uint8Array, offset: number, length: number) => String.fromCharCode(...bytes.slice(offset, offset + length));
const uint16le = (bytes: Uint8Array, offset: number) => bytes[offset] | (bytes[offset + 1] << 8);
const uint32le = (bytes: Uint8Array, offset: number) => (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;

export function detectWav(bytes: Uint8Array) {
  if (bytes.length < MIN_NARRATION_AUDIO_BYTES || bytes.length > MAX_NARRATION_WAV_BYTES) return false;
  if (ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WAVE') return false;
  const declaredSize = uint32le(bytes, 4) + 8;
  if (declaredSize > bytes.length || declaredSize < 44) return false;
  let offset = 12;
  let validFormat = false;
  let validAudioData = false;
  while (offset + 8 <= bytes.length) {
    const chunkName = ascii(bytes, offset, 4);
    const chunkSize = uint32le(bytes, offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkSize;
    if (chunkEnd > bytes.length) return false;
    if (chunkName === 'fmt ' && chunkSize >= 16) {
      const audioFormat = uint16le(bytes, chunkStart);
      const channels = uint16le(bytes, chunkStart + 2);
      const sampleRate = uint32le(bytes, chunkStart + 4);
      const bitsPerSample = uint16le(bytes, chunkStart + 14);
      validFormat = [1, 3, 0xfffe].includes(audioFormat)
        && channels >= 1 && channels <= 2
        && sampleRate >= 8000 && sampleRate <= 96000
        && [8, 16, 24, 32].includes(bitsPerSample);
    }
    if (chunkName === 'data' && chunkSize > 0) validAudioData = true;
    offset = chunkEnd + (chunkSize % 2);
  }
  return validFormat && validAudioData;
}

export function detectNarrationAudio(bytes: Uint8Array): NarrationAudioFormat | null {
  if (detectMp3(bytes)) return { extension: 'mp3', mimeType: 'audio/mpeg' };
  if (detectWav(bytes)) return { extension: 'wav', mimeType: 'audio/wav' };
  return null;
}
