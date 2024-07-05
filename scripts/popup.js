document.addEventListener('DOMContentLoaded', function () {
    const startButton = document.getElementById('start-timer');
    const addSiteButton = document.getElementById('add-site');
    const claimBreakButton = document.getElementById('claim-break');
    const backToWorkButton = document.getElementById('back-to-work');
    const timerDisplay = document.getElementById('popup-timer');
    const sitesDropdown = document.getElementById('sites-dropdown');
  
    startButton.addEventListener('click', function () {
      handleSessionButton();
    });
  
    addSiteButton.addEventListener('click', function () {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const url = new URL(tabs[0].url);
        const domain = url.hostname;
        chrome.runtime.sendMessage({ action: 'addDistractionDomain', domain }, function (response) {
          alert(response.status);
        });
      });
    });
  
    claimBreakButton.addEventListener('click', function () {
      chrome.runtime.sendMessage({ action: 'claimBreak' }, function (response) {
        alert(response.status);
      });
    });
  
    backToWorkButton.addEventListener('click', function () {
      chrome.runtime.sendMessage({ action: 'backToWork' }, function (response) {
        alert(response.status);
      });
    });
  
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
      if (request.action === 'notify') {
        alert(request.message);
      } else if (request.action === 'updatePopupTimer') {
        console.log("Updating popup timer rec");
        updatePopupTimer(request.timerState);
        updateButtons(request.timerState.currentState);
      } else if (request.action === 'updateSitesDropdown') {
        updateSitesDropdown(request.sites);
      }
    });
  
    function updatePopupTimer(timerState) {
      console.log("Updating popup timer");
      timerDisplay.textContent = timerState.currentState;
      if (timerState.currentState === 'Focus') {
        timerDisplay.textContent = `Focus: ${formatTime(timerState.timeLeft)}`;
      } else if (timerState.currentState === 'Break') {
        timerDisplay.textContent = `Break: ${formatTime(timerState.breakTimeLeft)}`;
      }
    }
  
    function updateSitesDropdown(sites) {
      sitesDropdown.innerHTML = '';
      sites.forEach(site => {
        const option = document.createElement('option');
        option.value = site;
        option.textContent = site;
        sitesDropdown.appendChild(option);
      });
    }
  
    function updateButtons(currentState) {
      startButton.textContent = (currentState === 'Not Started' || !currentState) ? 'Start Session' : 'End Session';
      claimBreakButton.style.display = currentState === 'Focus' && timerState.timeLeft <= 0 ? 'block' : 'none';
      backToWorkButton.style.display = currentState === 'Break' ? 'block' : 'none';
    }
  
    function formatTime(seconds) {
      const minutes = Math.floor(Math.abs(seconds) / 60);
      const remainingSeconds = Math.abs(seconds) % 60;
      return `${seconds < 0 ? '-' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }
  
    function handleSessionButton() {
      const startButtonText = startButton.textContent;
      console.log("Start button text: ", startButtonText);
      if (startButtonText === 'Start Session') {
        chrome.runtime.sendMessage({ action: 'startWorkSession' }, function (response) {
          console.log("Sending message to start work session");
          alert(response.status);
        });
      } else {
        chrome.runtime.sendMessage({ action: 'endWorkSession' }, function (response) {
          console.log("Sending message to end work session");
          chrome.tabs.create({ url: 'quote.html' });
        });
      }
    }
  
    // Initial load of sites and timer state
    chrome.storage.sync.get(['distractionDomains', 'timerState'], function (data) {
      updateSitesDropdown(data.distractionDomains || []);
      updateButtons(data.timerState.currentState);
      updatePopupTimer(data.timerState);
    });
  });
  