const mic = require('mic');
const { Model, Recognizer } = require('vosk');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class WakeWordDetector extends EventEmitter {
  constructor() {
    super();
    const modelPath = path.join(__dirname, '../models/vosk-model-en-us-0.22-lgraph');
    if (!fs.existsSync(modelPath)) {
      throw new Error('Vosk model not found in ' + modelPath);
    }
    this.model = new Model(modelPath);
    this.recognizer = new Recognizer({ model: this.model, sampleRate: 16000 });
  }

  start() {
    this.micInstance = mic({
      rate: '16000',
      channels: '1',
      bitwidth: '16',
      encoding: 'signed-integer',
      endian: 'little',
      device: 'default',
  });

    const micInputStream = this.micInstance.getAudioStream();

    micInputStream.on('data', (data) => {
      console.log(`Received audio data: ${data.length} bytes`);
      if (this.recognizer.acceptWaveform(data)) {
        const result = this.recognizer.result();
        console.log('Final result:', result.text);
      } else {
        const partial = this.recognizer.partialResult();
        console.log('Partial result:', partial.partial);
      }
    });

    micInputStream.on('error', (err) => {
      console.error('Mic input stream error:', err);
    });

    this.micInstance.start();
  }

  stop() {
    if (this.micInstance) this.micInstance.stop();
    this.recognizer.free();
    this.model.free();
  }
}

module.exports = WakeWordDetector;
