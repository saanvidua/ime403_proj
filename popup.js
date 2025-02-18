document.addEventListener('DOMContentLoaded', () => {
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
  
    // To-do list elements for session creation.
    const todoInput = document.getElementById('todo-input');
    const addTaskButton = document.getElementById('add-task');
    const todoList = document.getElementById('todo-list');
  
    let timerInterval = null;
    // Array to hold tasks for the new session.
    let newSessionTasks = [];
  
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
      const sessionName = sessionNameInput.value.trim();
      if (!sessionName) return;
  
      const newSession = {
        name: sessionName,
        tasks: newSessionTasks,    // Store the to-do list tasks
        startTime: null,           // Not started yet.
        accumulatedTime: 0,
        rewardCount: 0,
        duration: 0,
        ended: false
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
      chrome.storage.local.get(["activeSession", "sessions", "garden"], (result) => {
        let activeSession = result.activeSession;
        let sessions = result.sessions || [];
        let garden = result.garden || [];
        if (activeSession) {
          if (activeSession.startTime) {
            const currentElapsed = Math.floor((Date.now() - activeSession.startTime) / 1000);
            activeSession.accumulatedTime = (activeSession.accumulatedTime || 0) + currentElapsed;
            activeSession.duration = activeSession.accumulatedTime;
            activeSession.startTime = null;
          }
          garden.push("E"); // "E" signifies an ended session reward.
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
    function updateSessionList(sessions) {
      chrome.storage.local.get("activeSession", (result) => {
        const activeSession = result.activeSession;
        sessionList.innerHTML = '';
        sessions.forEach((session, index) => {
          if ((activeSession && activeSession.name === session.name) || session.ended) return;
  
          const sessionElement = document.createElement('div');
          sessionElement.textContent = `${session.name} - ${formatTime(session.duration)}`;
  
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
  
          const pauseButton = document.createElement('button');
          pauseButton.textContent = 'Pause';
          pauseButton.addEventListener('click', () => {
            if (session.startTime) {
              const currentElapsed = Math.floor((Date.now() - session.startTime) / 1000);
              session.accumulatedTime = (session.accumulatedTime || 0) + currentElapsed;
              session.duration = session.accumulatedTime;
              session.startTime = null;
              chrome.storage.local.get("activeSession", (result) => {
                const active = result.activeSession;
                if (active && active.name === session.name) {
                  chrome.storage.local.set({ activeSession: session });
                }
              });
              updateSessionList(sessions);
            }
          });
  
          sessionElement.appendChild(resumeButton);
          sessionElement.appendChild(pauseButton);
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
          activeTasksList.innerHTML = ''; // Clear existing tasks
      
          if (activeSession) {
            activeSessionName.textContent = activeSession.name;
            
            // Display tasks if available
            if (activeSession.tasks && activeSession.tasks.length > 0) {
              activeSession.tasks.forEach((task, index) => {
                const li = document.createElement("li");
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = task.done;
                
                // When the checkbox is toggled, update the task status.
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
            }
          } else {
            activeSessionName.textContent = "";
            activeSessionTimer.textContent = "";
          }
        });
      }
      
  
    // Update the garden display.
    function updateGarden(garden) {
      if (!gardenDiv) return;
      gardenDiv.innerHTML = '';
      garden.forEach(plant => {
        const plantElement = document.createElement('div');
        plantElement.textContent = plant;
        gardenDiv.appendChild(plantElement);
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
  
  