const WORK_DURATION = 25 * 60; // 20 seconds for testing
const BREAK_DURATION = 5 * 60; // 10 seconds for testing

let timerState = {
  currentState: 'Not Started',
  timeLeft: WORK_DURATION,
  breakTimeLeft: BREAK_DURATION,
  intervalId: null,
  endSessionQuote: null
};

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.action) {
      case 'startWorkSession':
        if (timerState.currentState === 'Not Started') {
          startWorkSession();
        }
        sendResponse({ status: 'Work session started' });
        break;
  
      case 'endWorkSession':
        fetchRandomQuote().then(quote => {
          timerState.endSessionQuote = quote;
          chrome.storage.sync.set({ timerState }); // Save the quote in storage
          sendResponse({ status: 'Please type the following quote to end the session', quote });
        });
        break;
  
      case 'validateQuote':
        if (request.quote === timerState.endSessionQuote) {
          endSession();
          sendResponse({ status: 'Session ended. Good work, mate.' });
        } else {
          sendResponse({ status: 'There was an error -- is there a session ongoing?' });
        }
        break;
  
      case 'claimBreak':
        if (timerState.currentState === 'Focus' && timerState.timeLeft <= 0) {
          startBreak();
        }
        sendResponse({ status: 'Break claimed' });
        break;
  
      case 'addDistractionDomain':
        addDistractionDomain(request.domain);
        sendResponse({ status: 'Domain added' });
        break;
  
      case 'backToWork':
        if (timerState.currentState === 'Break') {
          startWorkSession();
        }
        sendResponse({ status: 'Back to work' });
        break;
  
      default:
        console.log('Unknown action: ', request.action);
        break;
    }
  });
  
  

chrome.tabs.onActivated.addListener(checkActiveTab);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    checkActiveTab();
  }
});

function startWorkSession() {
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
  }
  timerState.currentState = 'Focus';
  timerState.timeLeft = WORK_DURATION; // Reset work session time
  updateTimer();
  console.log(`Work session started for ${WORK_DURATION / 60} minutes.`);
  timerState.intervalId = setInterval(updateTime, 1000); // Update timer every second
}

function endSession() {
  clearInterval(timerState.intervalId);
  timerState.intervalId = null;
  timerState.currentState = 'Not Started';
  timerState.timeLeft = WORK_DURATION;
  timerState.breakTimeLeft = BREAK_DURATION;
  timerState.endSessionQuote = null;
  updateTimer();
  console.log("Session ended.");
}

function startBreak() {
  clearInterval(timerState.intervalId);
  timerState.currentState = 'Break';
  timerState.breakTimeLeft = BREAK_DURATION; // Reset break time
  updateTimer();
  console.log(`Break started for ${BREAK_DURATION} seconds.`);
  timerState.intervalId = setInterval(updateTime, 1000); // Update timer every second
}

function updateTime() {
  if (timerState.currentState === 'Focus') {
    timerState.timeLeft--;
  } else if (timerState.currentState === 'Break') {
    if (timerState.breakTimeLeft > 0) {
      timerState.breakTimeLeft--;
    } else {
      startWorkSession();
    }
  }
  updateTimer();
}

function addDistractionDomain(domain) {
  chrome.storage.sync.get({ distractionDomains: [] }, function (data) {
    const domains = data.distractionDomains;
    if (!domains.includes(domain)) {
      domains.push(domain);
      chrome.storage.sync.set({ distractionDomains: domains }, function() {
        console.log(`Domain ${domain} added to distraction list.`);
      });
    } else {
      console.log(`Domain ${domain} is already in the distraction list.`);
    }
  });
}

function updateTimer() {
  notifyContentScripts();
  notifyPopup();
}

function checkActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs.length > 0) {
      const activeTab = tabs[0];
      notifyContentScripts(activeTab.id);
    }
  });
}

function notifyContentScripts(tabId = null) {
  const currentTimerState = timerState;
  chrome.storage.sync.get('distractionDomains', function (data) {
    const domains = data.distractionDomains;
    domains.forEach(domain => {
      chrome.tabs.query({ url: `*://${domain}/*` }, function(tabs) {
        tabs.forEach(tab => {
          if (!tabId || tab.id === tabId) {
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['scripts/content.js']
            }, () => {
              console.log('Content script injected:', tab.id);
              chrome.tabs.sendMessage(tab.id, { action: 'updateOverlay', timerState: currentTimerState });
            });
          }
        });
      });
    });

    if (tabId) {
      chrome.tabs.get(tabId, function(tab) {
        if (tab && domains.some(domain => tab.url.includes(domain))) {
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['scripts/content.js']
          }, () => {
            console.log('Content script injected:', tabId);
            chrome.tabs.sendMessage(tabId, { action: 'updateOverlay', timerState: currentTimerState });
          });
        }
      });
    }
  });
}

function fetchRandomQuote() {
  return fetch('https://api.quotable.io/quotes/random?minLength=50&maxLength=100')
    .then(response => response.json())
    .then(data => data[0].content);
}

function notify(message) {
  chrome.runtime.sendMessage({ action: 'notify', message });
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
  if (changes.distractionDomains) {
    console.log("Distraction domains changed.");
    notifyContentScripts();
    notifyPopup();
  }
});

function notifyPopup() {
  chrome.runtime.sendMessage({ action: 'updatePopupTimer', timerState });
}

function init() {
  updateTimer();
}

init();
