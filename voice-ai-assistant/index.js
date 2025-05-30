"use strict";

const {
  Porcupine,
  BuiltinKeyword,
  getBuiltinKeywordPath,
} = require("@picovoice/porcupine-node");
const { PvRecorder } = require("@picovoice/pvrecorder-node");
const { Cheetah } = require("@picovoice/cheetah-node");
const { Orca } = require("@picovoice/orca-node");
const { PicoLLM } = require("@picovoice/picollm-node");
const Speaker = require("speaker");

const ACCESS_KEY = process.env.PORCUPINE_KEY || "IUtd0drU5wBHZ7wJQxU4fbyUK0QZ09tOZlKCXZ2Q0vk7O5XU8mOQlQ=="; // Replace this with your real Picovoice AccessKey
const ORCA_MODEL_PATH = "./models/orca_params_en_male.pv";
const PICOLLM_MODEL_PATH = "./models/phi2-487.pllm";
const sagePath= "./models/hey_sage.ppn"; // Path to your custom wake word model

const porcupine = new Porcupine(
  ACCESS_KEY,
  [sagePath],
  [0.5]
);

const frameLength = porcupine.frameLength;
const recorder = new PvRecorder(frameLength);
const cheetah = new Cheetah(ACCESS_KEY);
const orca = new Orca(ACCESS_KEY, { modelPath: ORCA_MODEL_PATH });
const picollm = new PicoLLM(ACCESS_KEY, PICOLLM_MODEL_PATH);

function playPcm(pcm) {
  const speaker = new Speaker({
    channels: 1,        
    bitDepth: 16,       
    sampleRate: 24000,  
  });

  // Convert typed array PCM to Buffer correctly
  const pcmBuffer = Buffer.from(pcm.buffer);

  speaker.write(pcmBuffer, () => {
    speaker.end();
  });
}

async function transcribeSpeech() {
  console.log("\n🎙️ Listening for your command...");

  let transcript = "";
  const silenceLimit = 5000;
  let lastSpeechTime = Date.now();

  while (true) {
    const pcm = await recorder.read();
    const { transcript: partial, isEndpoint } = cheetah.process(pcm);

    if (partial) {
      process.stdout.write(partial + " ");
      transcript += partial + " ";
      lastSpeechTime = Date.now();
    }

    if (isEndpoint || Date.now() - lastSpeechTime > silenceLimit) {
      break;
    }
  }

  const final = cheetah.flush();
  if (final) transcript += final;

  transcript = transcript.trim();
  console.log("\n📝 Transcription result:", transcript);
  return transcript;
}

// === AI Response & TTS ===
async function getLLMResponse(prompt) {
  const response = await picollm.generate(prompt);
  let message = response.completion;

  // I'm truncating the message to 2000 characters becuase Orca has 2000 character limit
  if (message.length > 2000) {
    message = message.slice(0, 2000);
  }

  console.log("🤖 AI Response:", message);

  const { pcm } = orca.synthesize(message);
  playPcm(pcm);

  return message;
}


async function main() {
  await recorder.start();
  console.log("🎧 Listening for wake word: 'Hey Sage'");

  try {
    while (true) {
      const pcm = await recorder.read();

      if (porcupine.process(pcm) >= 0) {
        console.log("\n✅ Wake word detected!");

        const transcript = await transcribeSpeech();

        if (!transcript) {
          console.log("No speech detected.");
          continue;
        }

        await getLLMResponse(transcript);

        console.log("\n🔄 Returning to wake word detection...");
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await recorder.release();
    porcupine.release();
    cheetah.release();
    orca.release();
    picollm.release();
  }
}

main();
