chrome.storage.local.get(['activeSession'], (result) => {
    if (result.activeSession) {
      console.log("Productivity session in progress");
    }
  });
  