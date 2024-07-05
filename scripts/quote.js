document.addEventListener('DOMContentLoaded', function () {
    let quoteText;
  
    chrome.storage.sync.get('timerState', function (data) {
      quoteText = data.timerState.endSessionQuote;
      document.getElementById('quote-text').textContent = quoteText;
    });
  
    document.getElementById('quote-input').focus();
  
    document.getElementById('quote-input').addEventListener('input', function (e) {
      const userInput = e.target.value;
      if (userInput === quoteText) {
        chrome.runtime.sendMessage({ action: 'validateQuote', quote: userInput }, function (response) {
          alert(response.status);
          if (response.status === 'Session ended') {
            window.close();
          }
        });
      }
    });
  
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey && e.key === 'c') || (e.ctrlKey && e.key === 'v')) {
        e.preventDefault();
      }
    });
  });
  