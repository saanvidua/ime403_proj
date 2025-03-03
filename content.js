chrome.storage.local.get(['activeSession'], (result) => {
    if (result.activeSession) {
      console.log("Productivity session in progress");
    }
  });

console.log('Checking blacklist for:', window.location.hostname);

chrome.storage.local.get(['blacklist', 'garden'], (result) => {
    const blacklist = result.blacklist || [];
    const garden = result.garden || [];

    const currentHost = window.location.hostname;
    const baseDomain = getBaseDomain(currentHost);

    console.log(`Checking site: ${currentHost}, Base domain: ${baseDomain}`);

    if (blacklist.includes(baseDomain)) {
        console.log(`This site (${baseDomain}) is blacklisted`);

        if (garden.length > 0) {
            const randomIndex = Math.floor(Math.random() * garden.length);
            const removedPlant = garden.splice(randomIndex, 1)[0];
            chrome.storage.local.set({ garden }, () => {
                alert(`You visited a blacklisted site! One of your plants (${removedPlant}) was removed.`);
            });
        } else {
            alert('This site is blacklisted. Stay focused!');
        }
    }
});

function getBaseDomain(hostname) {
    const parts = hostname.split('.');
    if (parts.length > 2) {
        parts.shift();
    }
    return parts.join('.');
}
