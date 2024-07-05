console.log('Content script loaded');

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'updateOverlay') {
    console.log('Updating overlay, ' + request.timerState)
    updateOverlay(request.timerState);
  }
});

function updateOverlay(timerState) {
  var existingOverlay = document.getElementById('pomodoro-overlay');
  const existingTimer = document.getElementById('pomodoro-timer');
  const existingStyles = document.getElementById('pomodoro-styles');

  if (!existingStyles) {
    loadCSS();
  }

  if (timerState.currentState === 'Focus') {
    if (!existingOverlay) {
      const overlay = document.createElement('div');
      overlay.id = 'pomodoro-overlay';
      document.body.appendChild(overlay);
      existingOverlay = overlay;
    }
    existingOverlay.textContent = `You are distracted. Focus on your work. \r\n${formatTime(timerState.timeLeft)} left.`;
    if (!existingTimer) {
      const timerDisplay = document.createElement('div');
      timerDisplay.id = 'pomodoro-timer';
      document.body.appendChild(timerDisplay);
    }
    existingTimer.textContent = formatTime(timerState.timeLeft);

    existingTimer.classList.remove('pomodoro-red');
    if (timerState.timeLeft <= 0) {
      existingOverlay.textContent = 'Well done! Click to claim break';
      existingOverlay.style.cursor = 'pointer';
      existingOverlay.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'claimBreak' });
      });
      existingTimer.classList.add('pomodoro-green');
    } else {
        existingTimer.classList.remove('pomodoro-green');
    }
  } else if (timerState.currentState === 'Break') {
    if (existingOverlay) {
      existingOverlay.remove();
    }
    if (!existingTimer) {
      const timerDisplay = document.createElement('div');
      timerDisplay.id = 'pomodoro-timer';
      document.body.appendChild(timerDisplay);
    }
    existingTimer.textContent = `Break time: ${formatTime(timerState.breakTimeLeft)}`;
    existingTimer.classList.remove('pomodoro-green');
    if (timerState.breakTimeLeft < 5) {
        // add class to timerDisplay to flash red
        existingTimer.classList.add('pomodoro-red');
    } else {
        existingTimer.classList.remove('pomodoro-red');
    }
  } else {
    if (existingOverlay) {
      existingOverlay.remove();
    }
    if (existingTimer) {
      existingTimer.remove();
    }
  }

  function formatTime(seconds) {
    const aseconds = Math.abs(seconds)
    const minutes = Math.floor(aseconds / 60);
    const remainingSeconds = aseconds % 60;
    return `${seconds > 0 ? '' : '-'}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }
}

function loadCSS() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = chrome.runtime.getURL('styles/content.css');
  link.id = 'pomodoro-styles';
  document.head.appendChild(link);
  console.log('CSS loaded');
}
