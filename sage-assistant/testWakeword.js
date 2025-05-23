const WakeWordDetector = require('./voice/wakeword');

const detector = new WakeWordDetector();

detector.on('wakeword', () => {
  console.log('Wake word detected! Starting transcription...');
  // Here you can trigger the next step
});

detector.start();
console.log('Listening for wake word...');
