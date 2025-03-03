console.log("hahha");

let seshCounter = 0;

const giftIcons = [
    "icons/zzplant.png",
    "icons/alocasiaplant.png",
    "icons/calethea.png",
    "icons/fanplant.png", 
    "icons/firefly.png",
    "icons/peacelily.png",
    "icons/plants.png",
    "icons/worm.png", 
    "icons/snakesplant.png",
    "icons/snakeplant.png",
    "icons/ladybug.png",
    "icons/worm.png", 
    "icons/snail.png",
    "icons/blooming_onion.gif"
  ];

function getAvailableGiftIcons(garden) { // want to ensure that icons are unique
    return giftIcons.filter(icon => !garden.includes(icon));
}

function getRandomUniqueGiftIcon(garden) {
    const availableIcons = getAvailableGiftIcons(garden);
    if (availableIcons.length === 0) return null;  // no more unique icons available
    const index = Math.floor(Math.random() * availableIcons.length);
    return availableIcons[index];
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("derpy")
    const sessionNameInput = document.getElementById('session-name');
    const createSessionButton = document.getElementById('create-session');
    const sessionList = document.getElementById('session-list');
    const archiveDiv = document.getElementById('archive');
    const gardenDiv = document.getElementById('garden');
    const activeSessionName = document.getElementById('active-session-name');
    const activeSessionTimer = document.getElementById('active-session-timer');
  
    const startSessionButton = document.getElementById('start-session');
    const pauseSessionButton = document.getElementById('pause-session');
    const endSessionButton = document.getElementById('end-session');
    const deleteSessionButton = document.getElementById('delete-session');

    const blacklistInput = document.getElementById('blacklist-url');
    const addBlacklistButton = document.getElementById('add-blacklist');
    const blacklistSitesList = document.getElementById('blacklist-sites');
  
    // To-do list elements for session creation.
    const todoInput = document.getElementById('todo-input');
    const addTaskButton = document.getElementById('add-task');
    const todoList = document.getElementById('todo-list');
  
    let timerInterval = null;
    // Array to hold tasks for the new session.
    let newSessionTasks = [];

    function getBaseDomain(hostname) {
        const parts = hostname.split('.');
        if (parts.length > 2) {
            parts.shift();  // Remove subdomain (e.g., "www")
        }
        return parts.join('.');
    }
    chrome.storage.local.get('blacklist', (result) => {
        renderBlacklist(result.blacklist || []);
    });

    function renderBlacklist(blacklist) {
        blacklistSitesList.innerHTML = '';
        blacklist.forEach((site, index) => {
            const li = document.createElement('li');
            li.textContent = site;

            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.addEventListener('click', () => {
                blacklist.splice(index, 1);
                chrome.storage.local.set({ blacklist });
                renderBlacklist(blacklist);
            });

            li.appendChild(removeButton);
            blacklistSitesList.appendChild(li);
        });
    }
    addBlacklistButton.addEventListener('click', () => {
        const site = blacklistInput.value.trim();
        if (site) {
            // Normalize the URL to base domain
            let baseDomain;
            try {
                const url = new URL(site.startsWith('http') ? site : `https://${site}`);
                baseDomain = getBaseDomain(url.hostname);
            } catch (e) {
                alert('Invalid URL. Please enter a valid website.');
                return;
            }

            chrome.storage.local.get('blacklist', (result) => {
                let blacklist = result.blacklist || [];
                if (!blacklist.includes(baseDomain)) {
                    blacklist.push(baseDomain);
                    chrome.storage.local.set({ blacklist });
                    renderBlacklist(blacklist);
                    blacklistInput.value = '';  // Clear input field
                } else {
                    alert(`${baseDomain} is already on your blacklist.`);
                }
            });
        } else {
            alert('Please enter a valid URL.');
        }
    });
    
    // Update the active session display timer.
    function updateTimerUI() {
      chrome.storage.local.get("activeSession", (result) => {
        let activeSession = result.activeSession;
        if (activeSession) {
          activeSessionName.textContent = activeSession.name || "";
          let totalDuration = activeSession.duration || 0;
          if (activeSession.startTime) {
            const currentElapsed = Math.floor((Date.now() - activeSession.startTime) / 1000);
            totalDuration = (activeSession.accumulatedTime || 0) + currentElapsed;
          }
          activeSessionTimer.textContent = formatTime(totalDuration);
        } else {
          activeSessionName.textContent = "";
          activeSessionTimer.textContent = "";
        }
      });
    }
  
    // Helper: format seconds into hh:mm:ss.
    function formatTime(seconds) {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
  
    function pad(num) {
      return num.toString().padStart(2, '0');
    }
  
    // Add a new task to the to-do list for session creation.
    addTaskButton.addEventListener('click', () => {
      const taskText = todoInput.value.trim();
      if (!taskText) return;
  
      // Create a task object.
      const task = { text: taskText, done: false };
      newSessionTasks.push(task);
  
      // Render the task in the list.
      const li = document.createElement('li');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.addEventListener('change', () => {
        task.done = checkbox.checked;
      });
      li.appendChild(checkbox);
      li.appendChild(document.createTextNode(' ' + taskText));
      todoList.appendChild(li);
      todoInput.value = '';
    });
  
    // Create a new session.
    createSessionButton.addEventListener('click', () => {
      seshCounter++;
      const sessionName = sessionNameInput.value.trim();
      if (!sessionName) return;
  
      const newSession = {
        name: sessionName,
        tasks: newSessionTasks,    // Store the to-do list tasks
        startTime: null,           // Not started yet.
        accumulatedTime: 0,
        rewardCount: 0,
        duration: 0,
        ended: false,
        sessionID: seshCounter
      };
  
      chrome.storage.local.get(['sessions'], (result) => {
        let sessions = result.sessions || [];
        sessions.push(newSession);
        // Set the new session as active.
        chrome.storage.local.set({ sessions, activeSession: newSession }, () => {
          updateSessionList(sessions);
          updateArchiveList(sessions);
          updateActiveSessionUI();
          // Clear the to-do list for next time.
          newSessionTasks = [];
          todoList.innerHTML = '';
          sessionNameInput.value = '';
        });
      });
    });
  
    // Start or resume the active session.
    startSessionButton.addEventListener('click', () => {
      chrome.storage.local.get("activeSession", (result) => {
        let activeSession = result.activeSession;
        if (activeSession && !activeSession.startTime) {
          activeSession.startTime = Date.now();
          chrome.storage.local.get("sessions", (res) => {
            let sessions = res.sessions || [];
            const idx = sessions.findIndex(s => s.name === activeSession.name);
            if (idx !== -1) {
              sessions[idx] = activeSession;
              chrome.storage.local.set({ sessions });
            }
          });
          chrome.storage.local.set({ activeSession });
        }
      });
    });
  
    // Pause the active session.
    pauseSessionButton.addEventListener('click', () => {
      chrome.storage.local.get("activeSession", (result) => {
        let activeSession = result.activeSession;
        if (activeSession && activeSession.startTime) {
          const currentElapsed = Math.floor((Date.now() - activeSession.startTime) / 1000);
          activeSession.accumulatedTime = (activeSession.accumulatedTime || 0) + currentElapsed;
          activeSession.duration = activeSession.accumulatedTime;
          activeSession.startTime = null;
          chrome.storage.local.get("sessions", (res) => {
            let sessions = res.sessions || [];
            const idx = sessions.findIndex(s => s.name === activeSession.name);
            if (idx !== -1) {
              sessions[idx] = activeSession;
              chrome.storage.local.set({ sessions });
            }
          });
          chrome.storage.local.set({ activeSession });
        }
      });
    });
  
    // End the active session (award a plant reward and archive it).
    endSessionButton.addEventListener('click', () => {
      console.log("derp")
      chrome.storage.local.get(["activeSession", "sessions", "garden"], (result) => {
        let activeSession = result.activeSession;
        let sessions = result.sessions || [];
        let garden = result.garden || [];
        if (activeSession) {
            // If running, pause first.
          if (activeSession.startTime) {
            const currentElapsed = Math.floor((Date.now() - activeSession.startTime) / 1000);
            activeSession.accumulatedTime = (activeSession.accumulatedTime || 0) + currentElapsed;
            activeSession.duration = activeSession.accumulatedTime;
            activeSession.startTime = null;
          }
          const giftIcon = getRandomUniqueGiftIcon(garden);
          garden.push(giftIcon);
          activeSession.ended = true;
          const idx = sessions.findIndex(s => s.name === activeSession.name);
          if (idx !== -1) {
            sessions[idx] = activeSession;
          }
          chrome.storage.local.set({ sessions, garden, activeSession: null }, () => {
            updateSessionList(sessions);
            updateArchiveList(sessions);
            updateActiveSessionUI();
            updateGarden(garden);

            // Send a notification for ending a session.
          chrome.notifications.create("plantSessionEnd_" + Date.now(), {
            type: "basic",
            iconUrl: chrome.runtime.getURL(giftIcon),
            title: "Session Ended!",
            message: "You ended your session and earned a garden reward. Great work!"
            });
          });
        }
      });
    });
  
    // Delete the active session.
    deleteSessionButton.addEventListener('click', () => {
      chrome.storage.local.get(["activeSession", "sessions"], (result) => {
        let activeSession = result.activeSession;
        let sessions = result.sessions || [];
        if (activeSession) {
          chrome.storage.local.set({ activeSession: null });
        }
        sessions = sessions.filter(s => !activeSession || s.name !== activeSession.name);
        chrome.storage.local.set({ sessions }, () => {
          updateSessionList(sessions);
          updateArchiveList(sessions);
          updateActiveSessionUI();
        });
      });
    });
  
    // Update the list of previous sessions.
    // Only display sessions that are not active and not ended.
// Update the list of previous sessions.
// Only display sessions that are not active and not ended.
function updateSessionList(sessions) {
    chrome.storage.local.get("activeSession", (result) => {
      const activeSession = result.activeSession;
      sessionList.innerHTML = '';
      sessions.forEach((session, index) => {
        // Skip sessions that are active or ended.
        if ((activeSession && activeSession.name === session.name) || session.ended) return;
  
        const sessionElement = document.createElement('div');
        sessionElement.textContent = `${session.name} - ${formatTime(session.duration)}`;
  
        // Button to resume the session.
        const resumeButton = document.createElement('button');
        resumeButton.textContent = 'Resume';
        resumeButton.addEventListener('click', () => {
          session.startTime = Date.now();
          chrome.storage.local.set({ activeSession: session }, () => {
            chrome.storage.local.get("sessions", (res) => {
              let sessions = res.sessions || [];
              const idx = sessions.findIndex(s => s.name === session.name);
              if (idx !== -1) {
                sessions[idx] = session;
                chrome.storage.local.set({ sessions });
              }
              updateSessionList(sessions);
              updateArchiveList(sessions);
            });
            updateActiveSessionUI();
          });
        });
  
        // Button to delete the session.
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => {
          sessions.splice(index, 1);
          chrome.storage.local.set({ sessions }, () => {
            updateSessionList(sessions);
          });
        });
  
        sessionElement.appendChild(resumeButton);
        sessionElement.appendChild(deleteButton);
        sessionList.appendChild(sessionElement);
      });
    });
  }
  
  
    // Update the archive list.
    // Only display sessions that have been ended.
    function updateArchiveList(sessions) {
      archiveDiv.innerHTML = '';
      sessions.forEach((session, index) => {
        if (!session.ended) return;
  
        const sessionElement = document.createElement('div');
        sessionElement.textContent = `${session.name} - ${formatTime(session.duration)}`;
  
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => {
          sessions.splice(index, 1);
          chrome.storage.local.set({ sessions }, () => {
            updateArchiveList(sessions);
          });
        });
  
        sessionElement.appendChild(deleteButton);
        archiveDiv.appendChild(sessionElement);
      });
    }
  
    // Update the active session display.
    function updateActiveSessionUI() {
        chrome.storage.local.get("activeSession", (result) => {
          const activeSession = result.activeSession;
          const activeTasksList = document.getElementById("active-tasks");
          const tasksContainer = document.getElementById("active-tasks-container");
          activeTasksList.innerHTML = ''; // Clear existing tasks
      
          if (activeSession) {
            activeSessionName.textContent = activeSession.name;
            
            if (activeSession.tasks && activeSession.tasks.length > 0) {
              // Show the tasks container if tasks exist.
              tasksContainer.style.display = "block";
              activeSession.tasks.forEach((task, index) => {
                const li = document.createElement("li");
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = task.done;
                checkbox.addEventListener("change", () => {
                  task.done = checkbox.checked;
                  // Update active session storage.
                  chrome.storage.local.get("activeSession", (res) => {
                    let updatedSession = res.activeSession;
                    if (updatedSession && updatedSession.name === activeSession.name) {
                      updatedSession.tasks[index] = task;
                      chrome.storage.local.set({ activeSession: updatedSession });
                      // Also update the sessions array, if you maintain it.
                      chrome.storage.local.get("sessions", (res2) => {
                        let sessions = res2.sessions || [];
                        const idx = sessions.findIndex(s => s.name === activeSession.name);
                        if (idx !== -1) {
                          sessions[idx] = updatedSession;
                          chrome.storage.local.set({ sessions });
                        }
                      });
                    }
                  });
                });
                li.appendChild(checkbox);
                li.appendChild(document.createTextNode(" " + task.text));
                activeTasksList.appendChild(li);
              });
            } else {
              // Hide tasks container if no tasks exist.
              tasksContainer.style.display = "none";
            }
          } else {
            activeSessionName.textContent = "";
            activeSessionTimer.textContent = "";
            tasksContainer.style.display = "none";
          }
        });
      }
      
      
  
    // Update the garden display.
    function updateGarden(garden) {
        if (!gardenDiv) return;
        gardenDiv.innerHTML = '';
        garden.forEach(plant => {
          // If the plant string looks like an image file path, display it as an image.
          if (typeof plant === 'string' && (plant.endsWith('.png') || plant.endsWith('.jpg') || plant.endsWith('.jpeg') || plant.endsWith('.gif'))) {
            const img = document.createElement('img');
            img.src = plant;
            img.alt = "Plant";
            img.style.width = "32px";  // Adjust size as needed
            img.style.height = "32px";
            gardenDiv.appendChild(img);
          } else {
            // Otherwise, show the text.
            const plantElement = document.createElement('div');
            plantElement.textContent = plant;
            gardenDiv.appendChild(plantElement);
          }
        });
      }
      
  
    // Update the timer UI every second.
    timerInterval = setInterval(updateTimerUI, 1000);
  
    // Load initial state.
    chrome.storage.local.get(["sessions", "garden"], (result) => {
      let sessions = result.sessions || [];
      updateSessionList(sessions);
      updateArchiveList(sessions);
      updateGarden(result.garden || []);
      updateActiveSessionUI();
    });
  });
  
  