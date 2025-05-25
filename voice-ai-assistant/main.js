const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const Mic = require('mic');

const DEEPGRAM_API_KEY = 'f9e132c288b1a7ac5e0899d4e2c3f833dd9555dd';

let mainWindow;
let micInstance = null;
let micInputStream = null;
let deepgramConnection = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 400,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('start-recognition', async () => {
  if (micInstance) {
    console.log('Already recording');
    return;
  }

  try {
    const deepgram = createClient(DEEPGRAM_API_KEY);

    deepgramConnection = deepgram.listen.live({
      model: 'nova-3',
      language: 'en',
      encoding: 'linear16',
      sample_rate: 16000,
      punctuate: true,
      smart_format: true
    });

    deepgramConnection.on(LiveTranscriptionEvents.Open, () => {
      console.log('🎙️ Deepgram connection opened');
    });

    deepgramConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel.alternatives[0]?.transcript;
      const isFinal = data.is_final;

      if (transcript && isFinal) {
        console.log('✅ Final Transcript:', transcript);
        mainWindow.webContents.send('recognition-result', transcript);
      } else if (transcript) {
        console.log('🟡 Interim:', transcript);
      }
    });

    deepgramConnection.on(LiveTranscriptionEvents.Error, (err) => {
      console.error('❌ Deepgram error:', err);
      mainWindow.webContents.send('recognition-result', '[Deepgram error]');
    });

    deepgramConnection.on(LiveTranscriptionEvents.Close, () => {
      console.log('🔇 Deepgram connection closed');
    });

    // Use top-level micInstance & micInputStream
    micInstance = Mic({
      rate: '16000',
      channels: '1',
      bitwidth: '16',
      encoding: 'signed-integer',
      endian: 'little',
      device: 'default',
      debug: false,
      exitOnSilence: 0 // Set to 0 to disable auto-exit if needed
    });

    micInputStream = micInstance.getAudioStream();

    micInputStream.on('data', (data) => {
      console.log('Audio chunk received:', data.length, 'bytes');
      if (deepgramConnection) {
        deepgramConnection.send(data);
      }
    });

    micInputStream.on('error', (err) => {
      console.error('Mic input stream error:', err);
    });

    micInputStream.on('startComplete', () => {
      console.log('🎤 Microphone recording started');
    });

    micInputStream.on('stopComplete', () => {
      console.log('🛑 Microphone recording stopped');
    });

    micInstance.start();

    return true;
  } catch (error) {
    console.error('Error in start-recognition:', error);
  }
});

ipcMain.handle('stop-recognition', () => {
  if (micInstance) {
    micInstance.stop();
    micInstance = null;
    micInputStream = null;
    console.log('🛑 Stopped microphone recording');
  }

  if (deepgramConnection) {
    deepgramConnection.finish();
    deepgramConnection = null;
    console.log('🔌 Closed Deepgram connection');
  }

  return true;
});
