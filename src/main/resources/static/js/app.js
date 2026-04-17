if (!localStorage.getItem("userName")) {
    window.location.href = "index.html";
}

window.logoutUser = function() {
    localStorage.removeItem("userName");
    localStorage.clear();
    window.location.href = "index.html";
};

document.addEventListener('DOMContentLoaded', () => {
    // State
    let activeTask = null;
    let timerInterval = null;
    let secondsElapsed = 0;
    let isRunning = false;
    let reminderTimeout = null;
    const REMINDER_MS = 15 * 60 * 1000; // 15 minutes of inactivity shows reminder

    // Achievement Trackers
    let currentTotalFocusTime = 0;
    let currentStreakCount = 0;
    let currentCompletedTasks = 0;

    // Elements
    const statFocus = document.getElementById('stat-focus');
    const statScore = document.getElementById('stat-score');
    const statPoints = document.getElementById('stat-points');
    const statStreak = document.getElementById('stat-streak');
    
    const taskForm = document.getElementById('task-form');
    const taskTitle = document.getElementById('task-title');
    const taskEst = document.getElementById('task-est');
    const taskList = document.getElementById('task-list');
    
    const activeTaskTitle = document.getElementById('active-task-title');
    const timerDisplay = document.getElementById('timer-display');
    const btnStart = document.getElementById('btn-start');
    const btnStop = document.getElementById('btn-stop');

    const btnLogout = document.getElementById('logout-btn');

    // Reminder elements
    const reminderModal = document.getElementById('reminder-modal');
    const closeReminderBtn = document.getElementById('close-reminder');

    // Chart instances
    let weeklyChart = null;
    let pointsChart = null;

    // --- Core Initialization ---
    init();

    async function init() {
        const savedTask = localStorage.getItem("activeTaskData");
        if (savedTask) {
            try {
                activeTask = JSON.parse(savedTask);
                if (activeTaskTitle) activeTaskTitle.textContent = activeTask.title;
                updateButtons();
            } catch (e) {}
        }

        const greetingText = document.getElementById("greetingText");
        const motivationText = document.getElementById("motivationText");
        if (greetingText) {
            let name = localStorage.getItem("userName");

            if (!name || name === "undefined" || name === "null") {
                name = "";
            } else {
                name = name.trim();
            }

            const hour = new Date().getHours();
            let greeting = "";

            if (hour < 12) {
                greeting = "Good Morning";
            } else if (hour < 18) {
                greeting = "Good Afternoon";
            } else {
                greeting = "Good Evening";
            }

            document.getElementById("greetingText").innerText =
              name ? `${greeting}, ${name} 👋` : `${greeting} 👋`;

            if (motivationText) {
                const messages = [
                    "Stay consistent, success will follow 🔥",
                    "Small steps today, big results tomorrow 🚀",
                    "Focus on your goals 💪"
                ];
                motivationText.innerText = messages[Math.floor(Math.random() * messages.length)];
            }
        }

        const today = new Date().toISOString().split('T')[0];
        let lastDate = localStorage.getItem("lastActiveDate");

        if (lastDate !== today) {
            localStorage.setItem("todayFocusTime", "0");
            localStorage.setItem("todayPoints", "0");
            localStorage.setItem("focusScore", "0");
            localStorage.removeItem("dailyGoalAchieved");
            localStorage.removeItem("goalDone");
            localStorage.setItem("lastActiveDate", today);
        }

        await fetchStats(today);
        await fetchTasks(today);
        await fetchCharts();
        await fetchDailyReport();
        resetActivityTimer();
        
        updateProgressRing(0);

        // Event Listeners for Activity Timer
        window.addEventListener('mousemove', resetActivityTimer);
        window.addEventListener('keypress', resetActivityTimer);
        window.addEventListener('click', resetActivityTimer);
    }

    // --- Inactivity Reminder ---
    function resetActivityTimer() {
        if (reminderTimeout) clearTimeout(reminderTimeout);
        // If not running a session, remind user to study after 15 mins of inactivity
        if (!isRunning && reminderModal) {
            reminderTimeout = setTimeout(() => {
                reminderModal.classList.remove('hidden');
            }, REMINDER_MS);
        }
    }

    if (closeReminderBtn) {
        closeReminderBtn.addEventListener('click', () => {
            if (reminderModal) reminderModal.classList.add('hidden');
            resetActivityTimer();
        });
    }

    // --- Auth ---
    btnLogout.addEventListener('click', async () => {
        await fetch('/auth/logout', { method: 'POST' });
        window.location.href = '/';
    });

    // --- Stats & Charts ---
    async function fetchStats(date) {
        try {
            const res = await fetch(`/analytics/daily?date=${date}`);
            if (res.status === 401 || res.status === 403) {
                window.location.href = '/'; // Redirect if unauthorized
                return;
            }
            const data = await res.json();
            
            currentTotalFocusTime = data.total_focus_time || 0;
            
            if (statFocus) statFocus.textContent = `${data.total_focus_time} min`;
            if (statScore) statScore.textContent = `${Math.round(data.focus_score)}%`;
            updateFocusStatus(Math.round(data.focus_score));
            if (statPoints) statPoints.textContent = data.points_earned;
            
            currentStreakCount = data.streak || 0;
            
            if (statStreak) statStreak.textContent = `${currentStreakCount} days`;
            
            localStorage.setItem("streakCount", currentStreakCount);
            
            updateGoalProgress(data.total_focus_time);
            updateBadges(data.total_focus_time, data.points_earned);
            
            checkAllAchievements();
        } catch (e) {
            console.error('Error fetching stats', e);
        }
    }

    async function fetchCharts() {
        try {
            if (document.getElementById('chart-weekly')) {
                const weeklyRes = await fetch('/analytics/weekly');
                const weeklyData = await weeklyRes.json();
                updateEnhancedWeeklyReport(weeklyData);
                renderWeeklyChart([...weeklyData]);
            }

            if (document.getElementById('chart-points')) {
                const pointsRes = await fetch('/analytics/points');
                const pointsData = await pointsRes.json();
                renderPointsChart(pointsData);
            }
        } catch (e) {
            console.error('Error fetching charts', e);
        }
    }

    function renderWeeklyChart(data) {
        const ctx = document.getElementById('chart-weekly').getContext('2d');
        if (weeklyChart) weeklyChart.destroy();
        
        // Data comes desc from backend, reverse it to show chronologically
        data.reverse();
        
        weeklyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.date),
                datasets: [{
                    label: 'Focus Time (min)',
                    data: data.map(d => d.total_focus_time),
                    backgroundColor: [
                        "rgba(99,102,241,0.7)",
                        "rgba(59,130,246,0.7)"
                    ],
                    borderRadius: 10,
                    barThickness: 30
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        backgroundColor: "#111827",
                        titleColor: "#fff",
                        bodyColor: "#d1d5db",
                        padding: 10,
                        cornerRadius: 8
                    },
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false }
                    },
                    y: {
                        grid: { color: "rgba(0,0,0,0.05)" }
                    }
                }
            }
        });
    }

    function renderPointsChart(data) {
        const ctx = document.getElementById('chart-points').getContext('2d');
        if (pointsChart) pointsChart.destroy();
        
        let allPointsData = JSON.parse(localStorage.getItem("dailyPointsData")) || {};
        let dates = Object.keys(allPointsData);
        dates.sort((a, b) => new Date(a) - new Date(b));
        let points = dates.map(date => allPointsData[date]);

        pointsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Total Points',
                    data: points,
                    borderColor: "#6366f1",
                    backgroundColor: "rgba(99,102,241,0.1)",
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: "#4f46e5",
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        backgroundColor: "#111827",
                        titleColor: "#fff",
                        bodyColor: "#d1d5db",
                        padding: 10,
                        cornerRadius: 8
                    },
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: "rgba(0,0,0,0.05)" }
                    }
                }
            }
        });
    }

    // --- Tasks ---
    async function fetchTasks(date) {
        try {
            const res = await fetch(`/tasks?date=${date}`);
            const tasks = await res.json();
            
            currentCompletedTasks = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'Completed').length;
            
            renderTasks(tasks);
            checkAllAchievements();
        } catch (e) {
            console.error('Error fetching tasks', e);
        }
    }

    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                title: taskTitle.value,
                estimatedTime: parseInt(taskEst.value),
                date: new Date().toISOString().split('T')[0]
            };

            const res = await fetch('/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                taskTitle.value = '';
                taskEst.value = '';
                await fetchTasks(payload.date);
            }
        });
    }

    function renderTasks(tasks) {
        const activeContainer = document.getElementById("activeTasks");
        const completedContainer = document.getElementById("completedTasks");
        const legacyList = document.getElementById("task-list");
        
        if (activeContainer) activeContainer.innerHTML = '';
        if (completedContainer) completedContainer.innerHTML = '';
        if (legacyList) legacyList.innerHTML = '';

        if (tasks.length === 0) {
            const emptyHtml = `
                <div class="text-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <p class="text-gray-400 text-lg">🚀 No active tasks</p>
                    <p class="text-gray-500 text-sm mt-1">Start by creating a new task</p>
                </div>
            `;
            if (activeContainer) activeContainer.innerHTML = emptyHtml;
            if (legacyList) legacyList.innerHTML = emptyHtml;
            if (completedContainer) completedContainer.innerHTML = `
                <div class="text-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <p class="text-gray-400 text-lg">🎉 Nothing completed yet</p>
                </div>
            `;
            return;
        }

        tasks.forEach(task => {
            let isCompleted = task.status === 'COMPLETED' || task.status === 'Completed';
            let progressPct = task.estimatedTime ? (task.totalTimeSpent / task.estimatedTime) * 100 : 0;
            
            if (task.estimatedTime && task.totalTimeSpent >= task.estimatedTime) {
                isCompleted = true;
            }
            if (progressPct > 100) progressPct = 100;

            const div = document.createElement('div');

            if (isCompleted) {
                div.className = "task-item bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col";
                
                const topRow = document.createElement('div');
                topRow.className = "flex justify-between items-center";
                
                const leftDiv = document.createElement('div');
                leftDiv.className = "flex flex-col";
                
                const titleSpan = document.createElement('span');
                titleSpan.className = "font-bold text-gray-800";
                titleSpan.innerHTML = task.title;
                
                const succText = document.createElement('span');
                succText.className = "text-sm text-green-600 mt-1";
                succText.innerHTML = `Estimated: ${task.estimatedTime || 0} min <br> Actual: ${task.totalTimeSpent || 0} min`;
                
                leftDiv.appendChild(titleSpan);
                leftDiv.appendChild(succText);
                
                const tickIcon = document.createElement('span');
                tickIcon.className = "text-green-500 text-xl font-bold";
                tickIcon.innerText = "✔";
                
                topRow.appendChild(leftDiv);
                topRow.appendChild(tickIcon);
                
                const bottomRow = document.createElement('div');
                bottomRow.className = "flex justify-end mt-2";

                const delBtn = document.createElement('button');
                delBtn.className = "text-gray-400 hover:text-red-500 text-sm";
                delBtn.textContent = "Delete";
                delBtn.onclick = async (e) => {
                    e.stopPropagation();
                    if(confirm('Delete this task?')) {
                        await fetch(`/tasks/${task.id}`, { method: 'DELETE' });
                        fetchTasks(task.date);
                    }
                };
                
                bottomRow.appendChild(delBtn);
                
                div.appendChild(topRow);
                div.appendChild(bottomRow);

                if (completedContainer) completedContainer.appendChild(div);
                else if (legacyList) legacyList.appendChild(div);

            } else {
                div.className = `task-item bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500 ${activeTask && activeTask.id === task.id ? 'ring-2 ring-blue-400 selected-task' : 'border border-gray-100'} cursor-pointer`;
                
                // TOP ROW
                const topDiv = document.createElement('div');
                topDiv.className = "flex justify-between items-center mb-1";
                
                const titleSpan = document.createElement('span');
                titleSpan.className = "font-bold text-gray-800 text-base";
                titleSpan.innerHTML = task.title;
                
                const estText = document.createElement('span');
                estText.className = "text-sm text-gray-500 mt-1";
                estText.innerHTML = `Estimated: ${task.estimatedTime || 0} min <br> Actual: ${task.totalTimeSpent || 0} min`;
                
                topDiv.appendChild(titleSpan);
                topDiv.appendChild(estText);
                
                // PROGRESS BAR
                const barBg = document.createElement('div');
                barBg.className = "w-full bg-gray-200 h-2 rounded mt-3 overflow-hidden";
                const barFill = document.createElement('div');
                barFill.className = "bg-blue-500 h-2 rounded transition-all duration-500";
                barFill.style.width = `${progressPct}%`;
                barBg.appendChild(barFill);
                
                // BOTTOM ROW
                const bottomDiv = document.createElement('div');
                bottomDiv.className = "flex justify-between items-center mt-3";
                
                const progressText = document.createElement('span');
                progressText.className = "text-sm text-gray-500 font-medium";
                progressText.innerText = `${Math.round(progressPct)}%`;
                
                const delBtn = document.createElement('button');
                delBtn.className = "text-gray-400 hover:text-red-500 text-sm";
                delBtn.textContent = "Delete";
                delBtn.onclick = async (e) => {
                    e.stopPropagation();
                    if(confirm('Delete this task?')) {
                        await fetch(`/tasks/${task.id}`, { method: 'DELETE' });
                        if(activeTask && activeTask.id === task.id) selectTask(null);
                        fetchTasks(task.date);
                    }
                };
                
                bottomDiv.appendChild(progressText);
                bottomDiv.appendChild(delBtn);
                
                div.appendChild(topDiv);
                div.appendChild(barBg);
                div.appendChild(bottomDiv);

                div.addEventListener('click', () => {
                    if (!isRunning) {
                        document.querySelectorAll(".task-item").forEach(t => t.classList.remove("selected-task", "ring-2", "ring-blue-400"));
                        div.classList.add("selected-task", "ring-2", "ring-blue-400");
                        selectTask(task);
                    }
                });

                if (activeContainer) activeContainer.appendChild(div);
                else if (legacyList) legacyList.appendChild(div);
            }
        });
        
        if (activeContainer && activeContainer.children.length === 0) {
            activeContainer.innerHTML = `
                <div class="text-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <p class="text-gray-400 text-lg">🚀 No active tasks</p>
                    <p class="text-gray-500 text-sm mt-1">Start by creating a new task</p>
                </div>`;
        }
        if (completedContainer && completedContainer.children.length === 0) {
            completedContainer.innerHTML = `
                <div class="text-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <p class="text-gray-400 text-lg">🎉 Nothing completed yet</p>
                </div>`;
        }
    }

    function selectTask(task) {
        activeTask = task;
        if (task) {
            localStorage.setItem("activeTaskData", JSON.stringify(task));
            if (activeTaskTitle) activeTaskTitle.textContent = task.title;
            // update UI highlights by re-rendering
            fetchTasks(task.date);
            if (timerDisplay) timerDisplay.textContent = "00:00:00";
            secondsElapsed = 0;
            updateButtons();
            
            const progressPct = task.estimatedTime ? Math.min(100, (task.totalTimeSpent / task.estimatedTime) * 100) : 0;
            updateProgressRing(progressPct);
        } else {
            localStorage.removeItem("activeTaskData");
            if (activeTaskTitle) activeTaskTitle.textContent = "No task selected";
            if (timerDisplay) timerDisplay.textContent = "00:00:00";
            secondsElapsed = 0;
            updateButtons();
            updateProgressRing(0);
        }
    }

    // --- Timer UI ---
    function updateButtons() {
        if (!btnStart || !btnStop) return;
        
        if (!activeTask) {
            btnStart.disabled = true;
            btnStop.disabled = true;
            return;
        }
        if (activeTask.status === 'COMPLETED' || activeTask.status === 'Completed') {
            btnStart.disabled = true;
            btnStop.disabled = true;
            return;
        }

        if (isRunning) {
            btnStart.disabled = true;
            btnStop.disabled = false;
        } else {
            btnStart.disabled = false;
            btnStop.disabled = true;
        }
    }

    function formatTime(totalSeconds) {
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    if (btnStart) btnStart.addEventListener('click', async () => {
        if (!activeTask) return;
        
        try {
            const res = await fetch('/sessions/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId: activeTask.id })
            });

            if (res.ok) {
                isRunning = true;
                updateButtons();
                resetActivityTimer();
                
                // SMART FOCUS MODE ACTIVATION
                const isFocusMode = localStorage.getItem("focusMode") === "true";
                if (isFocusMode && document.getElementById("focusModeScreen")) {
                    document.getElementById("focusModeScreen").classList.remove("hidden");
                    document.body.style.background = "white";
                    let taskName = "Focus Session";
                    if (document.querySelector(".selected-task")) {
                        taskName = document.querySelector(".selected-task").innerText.split("\n")[0];
                    } else if (activeTaskTitle) {
                        taskName = activeTaskTitle.innerText;
                    }
                    if (document.getElementById("focusTaskName")) document.getElementById("focusTaskName").innerText = taskName;
                }

                timerInterval = setInterval(() => {
                    secondsElapsed++;
                    if (timerDisplay) timerDisplay.textContent = formatTime(secondsElapsed);
                    
                    // SMART FOCUS MODE TIMER SYNC
                    const focusTimer = document.getElementById("focusTimer");
                    if (focusTimer && document.getElementById("focusModeScreen") && !document.getElementById("focusModeScreen").classList.contains("hidden")) {
                        if (timerDisplay) focusTimer.innerText = timerDisplay.textContent;
                    }
                    
                    if (btnStop) {
                        if (secondsElapsed < 60) {
                            btnStop.disabled = true;
                        } else {
                            btnStop.disabled = false;
                        }
                    }
                    
                    if (activeTask && activeTask.estimatedTime) {
                        const totalSecsExpected = activeTask.estimatedTime * 60;
                        const previousTotalSecs = activeTask.totalTimeSpent * 60;
                        const totalProgressSecs = previousTotalSecs + secondsElapsed;
                        let progressPct = (totalProgressSecs / totalSecsExpected) * 100;
                        if (progressPct > 100) progressPct = 100;
                        updateProgressRing(progressPct);
                    }
                }, 1000);
            } else {
                alert('Could not start session.');
            }
        } catch (e) {
            console.error(e);
        }
    });



    if (btnStop) btnStop.addEventListener('click', async () => {
        if (!isRunning || !activeTask) return;
        
        clearInterval(timerInterval);
        isRunning = false;
        updateButtons();
        resetActivityTimer();

        let actualMinutes = Math.floor(secondsElapsed / 60);

        let totalProgressSecs = (activeTask.totalTimeSpent * 60) + secondsElapsed;
        let totalSecsExpected = activeTask.estimatedTime ? activeTask.estimatedTime * 60 : 0;
        let completed = totalSecsExpected > 0 && totalProgressSecs >= totalSecsExpected;

        if (completed) {
            showCompletionPopup();
        } else {
            console.log("Studied:", actualMinutes, "min");
        }

        const currentTaskId = activeTask.id;
        const prevTimeSpent = activeTask.totalTimeSpent || 0;
        selectTask(null);

        try {
            const res = await fetch('/sessions/end', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId: currentTaskId })
            });

            if (res.ok) {
                let pointsEarned = actualMinutes >= 30 ? 100 : (actualMinutes > 0 ? 10 : 0);
                
                let today = new Date().toISOString().split("T")[0];
                let existingData = JSON.parse(localStorage.getItem("dailyPointsData")) || {};
                existingData[today] = (existingData[today] || 0) + pointsEarned;
                localStorage.setItem("dailyPointsData", JSON.stringify(existingData));

                updateStreak();
                await fetchStats(today);
                const tasksRes = await fetch(`/tasks?date=${today}`);
                const tasks = await tasksRes.json();
                
                const updatedTask = tasks.find(t => t.id === currentTaskId);
                if (updatedTask) {
                    updatedTask.totalTimeSpent = prevTimeSpent + actualMinutes;
                    if (completed) {
                        updatedTask.status = "COMPLETED";
                    }
                }

                renderTasks(tasks);
                await fetchCharts();
                await fetchDailyReport();
                checkDailyGoalAchieved();
            }
        } catch (e) {
            console.error(e);
        }
    });

    function showCompletionPopup() {
        let popup = document.createElement("div");

        popup.style.position = "fixed";
        popup.style.top = "0";
        popup.style.left = "0";
        popup.style.width = "100%";
        popup.style.height = "100%";
        popup.style.background = "rgba(0,0,0,0.4)";
        popup.style.display = "flex";
        popup.style.alignItems = "center";
        popup.style.justifyContent = "center";
        popup.style.zIndex = "9999";

        popup.innerHTML = `
            <div style="
                background:white;
                padding:25px;
                border-radius:15px;
                text-align:center;
                width:280px;
                box-shadow:0 10px 30px rgba(0,0,0,0.2);
            ">
                <h2 style="color:#4f46e5;">🎉 Session Complete!</h2>
                <p>Were you distracted?</p>

                <button id="distractedYesBtn"
                    style="margin:10px; padding:8px 15px; background:#ef4444; color:white; border:none; border-radius:8px;">
                    YES
                </button>

                <button id="distractedNoBtn" onclick="handleNo(this)"
                    style="margin:10px; padding:8px 15px; background:#10b981; color:white; border:none; border-radius:8px;">
                    NO
                </button>
            </div>
        `;

        document.body.appendChild(popup);
    }

    //-----------------------------------
    // ADD SAFETY EVENT LISTENER
    //-----------------------------------
    document.addEventListener("click", function (e) {
      if (e.target && e.target.innerText === "YES") {
        
        // Remove completion popup
        let parentOverlay = e.target.closest("div");
        if (parentOverlay && parentOverlay.parentElement) {
            parentOverlay.parentElement.remove();
        }

        //-----------------------------------
        // RUN POPUP
        //-----------------------------------
        localStorage.setItem("lastSessionNoDistraction", "false");
        showFocusSuggestionPopup();
      }
    });

    window.handleNo = function(btn) {
        document.body.removeChild(btn.closest("div").parentElement);
    };

    function showFocusSuggestionPopup() {
      console.log("Focus popup triggered");

      let popup = document.createElement("div");

      popup.style.position = "fixed";
      popup.style.inset = "0";
      popup.style.background = "rgba(0,0,0,0.4)";
      popup.style.display = "flex";
      popup.style.alignItems = "center";
      popup.style.justifyContent = "center";
      popup.style.zIndex = "9999";

      popup.innerHTML = `
        <div style="
          background:white;
          padding:25px;
          border-radius:16px;
          text-align:center;
          width:300px;
          box-shadow:0 10px 30px rgba(0,0,0,0.2);
        ">
          <h2 style="color:#ef4444;">⚠ You got distracted</h2>
          <p>Turn ON Focus Mode to stay concentrated</p>

          <div style="margin-top:15px;">
            <button id="enableFocus"
              style="margin-right:10px;padding:8px 16px;background:#4f46e5;color:white;border:none;border-radius:8px;">
              Enable Focus Mode
            </button>

            <button id="cancelFocus"
              style="padding:8px 16px;border:1px solid #ccc;border-radius:8px;">
              Skip
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(popup);

      //-----------------------------------
      // BUTTON EVENTS
      //-----------------------------------
      document.getElementById("enableFocus").onclick = function () {
        //-----------------------------------
        // TURN ON FOCUS MODE
        //-----------------------------------
        localStorage.setItem("focusMode", "true");

        //-----------------------------------
        // OPTIONAL: AUTO CHECKBOX SYNC
        //-----------------------------------
        let checkbox = document.getElementById("focusModeCheckbox");
        if (!checkbox) {
            checkbox = document.getElementById("focusModeToggle"); // Handling existing toggle id too
        }
        if (checkbox) checkbox.checked = true;

        //-----------------------------------
        // CLOSE POPUP
        //-----------------------------------
        popup.remove();
      };

      document.getElementById("cancelFocus").onclick = function () {
        popup.remove();
      };
    }

    function checkDailyGoalAchieved() {
        let totalTime = parseInt(localStorage.getItem("todayFocusTime") || "0");
        
        // Fallback to fetchStats value if local storage hasn't updated yet to preserve existing compatibility
        if (totalTime === 0 && currentTotalFocusTime > 0) {
            totalTime = currentTotalFocusTime; 
        }

        let dailyGoal = parseInt(localStorage.getItem("dailyGoal") || "0");
        let goalDone = localStorage.getItem("goalDone");

        if (totalTime >= dailyGoal && !goalDone && dailyGoal > 0) {
            showGoalPopup();
            localStorage.setItem("goalDone", "true");
        }
    }

    function startFocusMode() {
        let overlay = document.createElement("div");
        overlay.id = "focusMode";

        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100%";
        overlay.style.height = "100%";
        overlay.style.background = "white";
        overlay.style.display = "flex";
        overlay.style.flexDirection = "column";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.zIndex = "10000";

        overlay.innerHTML = `
            <h2>Deep Work Mode Activated 🚀</h2>
            <div id="focusTimer" style="font-size:30px;">00:00</div>
            <button onclick="exitFocusMode()">Exit</button>
        `;

        document.body.appendChild(overlay);

        let fs = 0;
        let fInterval = setInterval(() => {
            fs++;
            let m = Math.floor(fs / 60);
            let s = fs % 60;
            let el = document.getElementById("focusTimer");
            if (el) {
                el.innerText = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            } else {
                clearInterval(fInterval);
            }
        }, 1000);
    }

    window.exitFocusMode = function() {
        let el = document.getElementById("focusMode");
        if (el) el.remove();
    };

});

// ===== REMINDER FEATURE (SAFE ADD) =====

let reminderTimeout2 = null;

const reminderBtn = document.getElementById("setReminderBtn");

if (reminderBtn) {
    reminderBtn.addEventListener("click", () => {
        const time = document.getElementById("reminderTime").value;

        if (!time) {
            alert("Please select time");
            return;
        }

        localStorage.setItem("reminderTime", time);

        document.getElementById("reminderStatus").innerText =
            "Reminder set for " + time;

        scheduleReminder(time);
    });
}

function scheduleReminder(time) {
    if (reminderTimeout2) clearTimeout(reminderTimeout2);

    const now = new Date();
    const [hours, minutes] = time.split(":");

    const reminderDate = new Date();
    reminderDate.setHours(hours, minutes, 0, 0);

    if (reminderDate < now) {
        reminderDate.setDate(reminderDate.getDate() + 1);
    }

    const delay = reminderDate - now;

    reminderTimeout2 = setTimeout(() => {
        showReminderPopup();
    }, delay);
}

function showReminderPopup() {
    const popup = document.getElementById("reminderPopup");
    if (!popup) return;

    popup.classList.remove("hidden");

    setTimeout(() => {
        popup.classList.add("hidden");
    }, 5000);
}

window.addEventListener("load", () => {
    const savedTime = localStorage.getItem("reminderTime");

    if (savedTime) {
        const status = document.getElementById("reminderStatus");
        if (status) {
            status.innerText = "Reminder set for " + savedTime;
        }

        scheduleReminder(savedTime);
    }
    
    // Feature 2: Daily Goal Initialization
    const dailyGoalInput = document.getElementById("dailyGoal");
    if (dailyGoalInput) {
        const savedGoal = localStorage.getItem("dailyGoal");
        if (savedGoal) dailyGoalInput.value = savedGoal;
        
        dailyGoalInput.addEventListener("input", (e) => {
            localStorage.setItem("dailyGoal", e.target.value);
            const statFocus = document.getElementById("stat-focus");
            const totalMinutesStr = statFocus ? statFocus.textContent.replace(" min", "") : "0";
            updateGoalProgress(parseInt(totalMinutesStr) || 0);
        });
    }
});

// Feature 1: Progress Ring
function updateProgressRing(progressPct) {
    const ring = document.getElementById("progressRing");
    if (ring) {
        const radius = 90;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (progressPct / 100) * circumference;
        ring.style.strokeDashoffset = offset;
    }
}

// Feature 2: Goal Progress
function updateGoalProgress(totalMinutes) {
    const goal = localStorage.getItem("dailyGoal") || 0;
    const display = document.getElementById("goalDisplay");
    if (display) {
        display.innerText = "Goal: " + totalMinutes + " / " + goal + " min";
    }
    
    // UI Progress Bar Update
    const progressEl = document.getElementById("goalProgress");
    if (progressEl && goal > 0) {
        let pct = (totalMinutes / goal) * 100;
        if (pct > 100) pct = 100;
        progressEl.style.width = pct + "%";
    }
    
    checkDailyGoalCompletion(totalMinutes);
}

// Smart Feature 1: Focus Status
function updateFocusStatus(score) {
    let status = "";
    if (score >= 80) status = "🟢 Deep Focus";
    else if (score >= 50) status = "🟡 Medium Focus";
    else status = "🔴 Low Focus";

    const el = document.getElementById("focusStatus");
    if (el) el.innerText = status;
}

// Smart Feature 2: Smart Reminder
let smartReminderLastActivity = Date.now();
document.addEventListener("click", () => {
    smartReminderLastActivity = Date.now();
});

setInterval(() => {
    if (Date.now() - smartReminderLastActivity > 3600000) {
        alert("⏰ Time to study!");
        smartReminderLastActivity = Date.now(); // reset to avoid spam
    }
}, 60000);

// Smart Feature 3: Distraction Tracker
function markDistracted(val) {
    console.log("Distracted:", val);
    
    let history = JSON.parse(localStorage.getItem("distractionData")) || [];
    history.push({
        date: new Date().toISOString().split("T")[0],
        distracted: val
    });
    localStorage.setItem("distractionData", JSON.stringify(history));
    
    const box = document.getElementById("distractionBox");
    if (box) box.classList.add("hidden");

    // NEW LOGIC
    if (val === true) {
        const useFocus = confirm("⚠️ You got distracted.\nDo you want to enable Focus Mode for better concentration?");
        if (useFocus) {
            localStorage.setItem("focusMode", true);
            const focusToggle = document.getElementById("focusModeToggle");
            if (focusToggle) focusToggle.checked = true;
        }
    }
}

// SMART FOCUS MODE INITIALIZATION
window.addEventListener("load", () => {
    const focusToggle = document.getElementById("focusModeToggle");
    if (focusToggle) {
        focusToggle.addEventListener("change", () => {
            localStorage.setItem("focusMode", focusToggle.checked);
        });
        focusToggle.checked = localStorage.getItem("focusMode") === "true";
    }

    const exitFocusBtn = document.getElementById("exitFocusMode");
    if (exitFocusBtn) {
        exitFocusBtn.addEventListener("click", () => {
            document.getElementById("focusModeScreen").classList.add("hidden");
            document.body.style.background = "";
        });
    }
});

// Smart Feature 4: Daily Goal Completion
window.showGoalPopup = function() {
    const popup = document.getElementById("goalPopup");
    if (popup) {
        popup.classList.remove("hidden");
    }
}

window.closeGoalPopup = function() {
    const popup = document.getElementById("goalPopup");
    if (popup) {
        popup.classList.add("hidden");
    }
}

function checkDailyGoalCompletion(totalMinutes) {
    // Moved logic to checkDailyGoalAchieved
    updateGoalProgress(totalMinutes);
}

// Smart Feature 5: Enhanced Weekly Report
function updateEnhancedWeeklyReport(data) {
    let total = 0;
    let bestDay = { day: "-", time: 0 };
    let scoreSum = 0;
    let streak = 0;

    data.forEach(d => {
        total += d.total_focus_time;
        scoreSum += d.focus_score;

        if (d.total_focus_time > bestDay.time) {
            bestDay = { day: d.date, time: d.total_focus_time };
        }

        if (d.total_focus_time >= 1) {
            streak++;
        }
    });

    const elTotal = document.getElementById("weeklyTotal");
    if (elTotal) elTotal.innerText = total + " min";

    const elBest = document.getElementById("weeklyBest");
    if (elBest) elBest.innerText = bestDay.time > 0 ? `${bestDay.day} (${bestDay.time}m)` : "-";

    const elAvg = document.getElementById("weeklyAvg");
    if (elAvg && data.length > 0) elAvg.innerText = Math.round(scoreSum / data.length) + "%";

    const elStreak = document.getElementById("weeklyStreak");
    if (elStreak) elStreak.innerText = streak + " / 7";
}

// Smart Feature 7: Daily Performance Report
async function fetchDailyReport() {
    try {
        const res = await fetch('/analytics/daily-report');
        if (res.ok) {
            const data = await res.json();
            renderDailyReport(data);
        }
    } catch(e) {
        console.error("Error fetching daily report", e);
    }
}

function renderDailyReport(data) {
    const content = document.getElementById("dailyReportContent");
    if (!content) return;

    if (!data.totalFocusTime || data.totalFocusTime === 0) {
        content.innerHTML = 'No study sessions today 😴 Start focusing!';
        return;
    }

    let html = `<p>Total Focus Time: <b>${data.totalFocusTime} min</b></p>`;
    
    if (data.topTask && data.topTask.title) {
        html += `<p class="mt-2 text-green-600 font-semibold">
🏆 Most Focused: ${data.topTask.title} (${data.topTask.time} min • ${data.topTask.percentage}%)
</p>`;
        
        let pct = data.topTask.percentage;
        let msg = "";
        if (pct > 50) msg = "🔥 Amazing focus on one subject!";
        else if (pct >= 30) msg = "👍 Balanced focus today!";
        else msg = "📊 Try to focus more on one task.";
        
        html += `<p class="mt-2 text-sm italic font-medium text-indigo-500">${msg}</p>`;
    }
    
    if (data.otherTasks && data.otherTasks.length > 0) {
        html += `<p class="mt-2 text-gray-600">
Other Subjects:
</p>
<ul class="text-sm mt-1">`;
        data.otherTasks.forEach(t => {
            html += `<li>${t.title} — ${t.time} min</li>`;
        });
        html += `</ul>`;
    }
    
    content.innerHTML = html;
}

// Smart Feature 6: Achievement Badges
function checkAllAchievements() {
    checkBadges();
}

function getBadges() {
  return JSON.parse(localStorage.getItem("badges")) || [];
}

function saveBadges(badges) {
  localStorage.setItem("badges", JSON.stringify(badges));
}

function unlockBadge(id, title, reason) {
  let badges = getBadges();

  // prevent duplicate
  if (badges.some(b => b.id === id)) return;

  let newBadge = {
    id,
    title,
    reason,
    date: new Date().toISOString()
  };

  badges.push(newBadge);
  saveBadges(badges);

  showAchievementPopup(title, reason);
}

function checkBadges() {
  /* TOTAL POINTS (FIXED) */
  let totalPoints = 0;

  let allPoints =
    JSON.parse(localStorage.getItem("dailyPointsData")) || {};

  Object.values(allPoints).forEach(p => {
    totalPoints += Number(p) || 0;
  });

  /* STREAK */
  let streak =
    parseInt(localStorage.getItem("streak")) || parseInt(localStorage.getItem("streakCount")) || 0;

  /* TASKS */
  let completedTasks =
    parseInt(localStorage.getItem("completedTasks")) || (typeof currentCompletedTasks !== 'undefined' ? currentCompletedTasks : 0);

  /* STUDY TIME */
  let todayStudyMinutes =
    parseInt(localStorage.getItem("todayFocusTime")) || (typeof currentTotalFocusTime !== 'undefined' ? currentTotalFocusTime : 0);

  /* DISTRACTION */
  let noDistraction =
    localStorage.getItem("lastSessionNoDistraction") === "true";

  /* DAILY GOAL */
  let goalDone =
    localStorage.getItem("dailyGoalAchieved") === "true" || localStorage.getItem("goalDone") === "true";


  if (totalPoints >= 100)
    unlockBadge("points_100", "100 Points 🎉", "You reached 100 points");

  if (totalPoints >= 500)
    unlockBadge("points_500", "500 Points 💯", "You reached 500 points");

  if (streak >= 3)
    unlockBadge("streak_3", "3 Day Streak 🔥", "3 days consistency");

  if (streak >= 7)
    unlockBadge("streak_7", "7 Day Streak ⚡", "7 days consistency");

  if (todayStudyMinutes >= 120)
    unlockBadge("2hr", "2 Hour Grind 💪", "Studied 2 hours");

  if (todayStudyMinutes >= 80)
    unlockBadge("80min", "80 Minute Focus 🔥", "Studied 80 minutes");

  if (completedTasks >= 1)
    unlockBadge("first_task", "First Task ✔", "Completed first task");

  if (goalDone)
    unlockBadge("goal", "Daily Goal 🎯", "Goal completed");

  if (noDistraction)
    unlockBadge("nodistraction", "No Distraction 🚫", "Focused session");
}

function showAchievementPopup(title, reason) {
  let popup = document.createElement("div");

  popup.style.position = "fixed";
  popup.style.inset = "0";
  popup.style.background = "rgba(0,0,0,0.4)";
  popup.style.display = "flex";
  popup.style.alignItems = "center";
  popup.style.justifyContent = "center";
  popup.style.zIndex = "9999";

  popup.innerHTML = `
    <div style="
      background:white;
      padding:25px;
      border-radius:16px;
      text-align:center;
      width:300px;
      box-shadow:0 10px 30px rgba(0,0,0,0.2);
    ">
      <h2 style="color:#4f46e5;">🏆 Achievement Unlocked</h2>
      <h3>${title}</h3>
      <p>${reason}</p>
      <button onclick="this.closest('div').parentElement.remove()"
        style="margin-top:15px;padding:8px 16px;background:#4f46e5;color:white;border:none;border-radius:8px;">
        OK
      </button>
    </div>
  `;

  document.body.appendChild(popup);
}

function loadBadges() {
  let badges = getBadges();

  let container =
    document.getElementById("badgeContainer");

  if (!container) return;

  if (badges.length === 0) {
    container.innerHTML = "No achievements yet";
    return;
  }

  container.innerHTML = badges.map(b => `
    <div class="badge-card">
      <h4>${b.title}</h4>
      <p>${b.reason}</p>
    </div>
  `).join("");
}

window.addEventListener("load", () => {
  setTimeout(() => {
    checkBadges();
    loadBadges();
  }, 300);
  
  let data = JSON.parse(localStorage.getItem("dailyPointsData")) || {};
  let dates = Object.keys(data);
  dates.sort((a, b) => new Date(a) - new Date(b));
  let points = dates.map(d => data[d]);

  if (typeof pointsChart !== 'undefined' && pointsChart) {
      pointsChart.data.labels = dates;
      pointsChart.data.datasets[0].data = points;
      pointsChart.update();
  }
});
