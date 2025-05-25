const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  startRecognition: () => ipcRenderer.invoke('start-recognition'),
  stopRecognition: () => ipcRenderer.invoke('stop-recognition'),
  onRecognitionResult: (callback) => ipcRenderer.on('recognition-result', (_, text) => callback(text)),
});
