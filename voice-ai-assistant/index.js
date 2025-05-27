const { Porcupine, BuiltinKeyword } = require('@picovoice/porcupine-node');
const mic = require('mic');

const accessKey = 'YOUR_PICOVOICE_ACCESS_KEY_HERE'; // Replace this with your real access key

(async () => {
  const porcupine = new Porcupine(
    accessKey,
    [BuiltinKeyword.GRASSHOPPER],
    [0.7] 
  );

  const micInstance = mic({
    rate: '16000',
    channels: '1',
    debug: true,
    device: 'default',
    encoding: 'signed-integer',
    bitwidth: 16,
    endian: 'little',
    fileType: 'raw'
  });

  const micInputStream = micInstance.getAudioStream();

  micInputStream.on('data', (data) => {
    const pcm = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
    if (pcm.length !== porcupine.frameLength) return;

    try {
      const keywordIndex = porcupine.process(pcm);
      if (keywordIndex >= 0) {
        console.log('🌱 Wake word "grasshopper" detected!');
      }
    } catch (err) {
      console.error('Error during Porcupine processing:', err);
    }
  });

  micInputStream.on('error', (err) => {
    console.error('Microphone error:', err);
  });

  micInstance.start();

  process.on('SIGINT', () => {
    console.log('Stopping...');
    micInstance.stop();
    porcupine.release();
    process.exit();
  });
})();
