import assert from 'node:assert/strict';
import { detectMp3, detectNarrationAudio, detectWav, MAX_NARRATION_MP3_BYTES, MAX_NARRATION_WAV_BYTES } from '../server/audioValidation.js';

const frame = Buffer.alloc(1024);
frame.set([0xff, 0xfb, 0x90, 0x64], 0);
assert.equal(detectMp3(frame), true, 'A valid MPEG-1 Layer III frame must be accepted.');

const tagged = Buffer.alloc(1100);
tagged.set(Buffer.from('ID3'), 0);
tagged.set([4, 0, 0, 0, 0, 0, 20], 3);
tagged.set([0xff, 0xfb, 0x90, 0x64], 30);
assert.equal(detectMp3(tagged), true, 'An ID3-tagged MP3 with a valid audio frame must be accepted.');
assert.equal(detectMp3(Buffer.alloc(1024, 0)), false, 'Renamed or empty files must be rejected.');
assert.equal(detectMp3(Buffer.from('not an mp3')), false, 'Tiny non-audio files must be rejected.');
assert.equal(detectMp3(Buffer.alloc(MAX_NARRATION_MP3_BYTES + 1)), false, 'Oversized files must be rejected.');

const wav = Buffer.alloc(1024);
wav.write('RIFF', 0, 'ascii');
wav.writeUInt32LE(wav.length - 8, 4);
wav.write('WAVE', 8, 'ascii');
wav.write('fmt ', 12, 'ascii');
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(24000, 24);
wav.writeUInt32LE(48000, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36, 'ascii');
wav.writeUInt32LE(wav.length - 44, 40);
assert.equal(detectWav(wav), true, 'A valid mono PCM WAV must be accepted.');
assert.deepEqual(detectNarrationAudio(wav), { extension: 'wav', mimeType: 'audio/wav' }, 'WAV format and MIME type must be detected from bytes.');
const malformedWav = Buffer.from(wav);
malformedWav.writeUInt32LE(malformedWav.length + 100, 40);
assert.equal(detectWav(malformedWav), false, 'A WAV with audio data outside the file must be rejected.');
assert.equal(detectWav(Buffer.alloc(MAX_NARRATION_WAV_BYTES + 1)), false, 'An oversized WAV must be rejected.');

console.log('Manual narration MP3 and WAV signature, structure and size checks passed.');
