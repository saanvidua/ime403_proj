chrome.runtime.onInstalled.addListener(() => {
    console.log("Evergreen Extension Installed");
  });
  
  // Function to update (or clear) the alarm based on session status.
  function updateAlarm() {
    chrome.storage.local.get("activeSession", (result) => {
      const activeSession = result.activeSession;
      if (activeSession && activeSession.startTime) {
        chrome.alarms.create("sessionTracker", { periodInMinutes: 1 });
      } else {
        chrome.alarms.clear("sessionTracker");
      }
    });
  }
  
  // Initialize alarm state on load.
  updateAlarm();
  
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "sessionTracker") {
      chrome.storage.local.get(["activeSession", "garden"], (result) => {
        let activeSession = result.activeSession;
        let garden = result.garden || [];
        if (activeSession && activeSession.startTime) {
          // Calculate elapsed time in seconds.
          const currentElapsed = Math.floor((Date.now() - activeSession.startTime) / 1000);
          const accumulated = activeSession.accumulatedTime || 0;
          const totalDuration = accumulated + currentElapsed;
          activeSession.duration = totalDuration;
  
          // Award plant for each full hour completed.
          const hoursCompleted = Math.floor(totalDuration / 3600);
          const currentRewards = activeSession.rewardCount || 0;
          if (hoursCompleted > currentRewards) {
            activeSession.rewardCount = hoursCompleted;
            // For now, add the letter "P" as a plant reward.
            garden.push("P");
            chrome.storage.local.set({ garden });
            console.log("Added a new plant for 1 hour of productivity!");
          }
          chrome.storage.local.set({ activeSession });
          console.log(`Updated session time: ${totalDuration} seconds`);
        }
      });
    }
  });
  
  // Listen for changes to activeSession to update the alarm.
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.activeSession) {
      updateAlarm();
    }
  });
  
  
  
