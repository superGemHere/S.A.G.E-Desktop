const { Porcupine, BuiltinKeyword, getBuiltinKeywordPath } = require('@picovoice/porcupine-node');
const { PvRecorder } = require('@picovoice/pvrecorder-node');

// Replace with your actual AccessKey
const ACCESS_KEY = process.env.PORCUPINE_KEY;

async function run() {
  const keywordPath = getBuiltinKeywordPath(BuiltinKeyword.GRASSHOPPER);
  const porcupine = new Porcupine(ACCESS_KEY, [keywordPath], [0.5]);

  const recorder = new PvRecorder(porcupine.frameLength, -1); // -1 = default device

  recorder.start();
  console.log(`🎤 Listening for wake word: grasshopper`);
  console.log(`🟢 Say "grasshopper" to trigger detection.`);

  let interrupted = false;

  process.on('SIGINT', async () => {
    interrupted = true;
    console.log('\n🛑 Exiting...');
    recorder.stop();
    porcupine.release();
    recorder.release();
    process.exit();
  });

  while (!interrupted) {
    try {
      const pcm = await recorder.read();
      const result = porcupine.process(pcm);
      if (result >= 0) {
        console.log('✅ Wake word "grasshopper" detected!');
      }
    } catch (err) {
      console.error('❌ Error during detection:', err);
    }
  }
}

run();
