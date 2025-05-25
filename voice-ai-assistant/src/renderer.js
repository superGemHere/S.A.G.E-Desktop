const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const output = document.getElementById('output');

startBtn.addEventListener('click', () => {
  window.api.startRecognition();
  output.textContent = 'Listening...';
});

stopBtn.addEventListener('click', () => {
  window.api.stopRecognition();
  output.textContent = 'Stopped';
});

window.api.onRecognitionResult((text) => {
  output.textContent = `You said: ${text}`;
});
