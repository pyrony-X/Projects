// script.js - Leaderboard + 1v1 Battle modules
(function(){
  /* -----------------------------
     Leaderboard module (unchanged)
     ----------------------------- */
  const Leaderboard = (function(){
    const KEY = 'scoreboard:v1';
    let players = [];

    // DOM
    const nameIn = document.getElementById('name');
    const scoreIn = document.getElementById('score');
    const addBtn = document.getElementById('addBtn');
    const clearBtn = document.getElementById('clearBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importToggle = document.getElementById('importToggle');
    const importArea = document.getElementById('importArea');
    const importText = document.getElementById('importText');
    const importBtn = document.getElementById('importBtn');
    const cancelImport = document.getElementById('cancelImport');
    const tbody = document.querySelector('#board tbody');
    const emptyHint = document.getElementById('emptyHint');

    // Load from localStorage
    function load() {
      try {
        const raw = localStorage.getItem(KEY);
        players = raw ? JSON.parse(raw) : [];
      } catch(e) {
        console.error('Failed loading scoreboard', e);
        players = [];
      }
      render();
    }

    function save() {
      localStorage.setItem(KEY, JSON.stringify(players));
    }

    function render() {
      // sort by score desc then name
      players.sort((a,b) => b.score - a.score || a.name.localeCompare(b.name));
      tbody.innerHTML = '';
      if(players.length === 0){
        emptyHint.style.display = 'block';
      } else {
        emptyHint.style.display = 'none';
      }
      players.forEach((p, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="rank">${i+1}</td>
          <td class="player">${escapeHtml(p.name)}</td>
          <td class="score">${p.score}</td>
          <td class="row-actions">
            <button data-act="inc" data-name="${escapeAttr(p.name)}" class="small">+1</button>
            <button data-act="dec" data-name="${escapeAttr(p.name)}" class="small">-1</button>
            <button data-act="edit" data-name="${escapeAttr(p.name)}" class="small">Edit</button>
            <button data-act="del" data-name="${escapeAttr(p.name)}" class="small danger">Delete</button>
          </td>`;
        tbody.appendChild(tr);
      });
    }

    // helpers
    function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function escapeAttr(s){ return String(s).replace(/"/g,'&quot;'); }

    // add or update
    addBtn.addEventListener('click', () => {
      const name = nameIn.value.trim();
      const score = Number(scoreIn.value) || 0;
      if(!name) return alert('Enter a player name');
      const idx = players.findIndex(p => p.name === name);
      if(idx >= 0){
        players[idx].score = score;
      } else {
        players.push({name, score});
      }
      save();
      render();
      nameIn.value = ''; scoreIn.value = 0;
      nameIn.focus();
    });

    // table actions
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if(!btn) return;
      const act = btn.dataset.act;
      const name = btn.dataset.name;
      const idx = players.findIndex(p => p.name === name);
      if(idx === -1) return;
      if(act === 'inc') { players[idx].score = Number(players[idx].score) + 1; }
      if(act === 'dec') { players[idx].score = Number(players[idx].score) - 1; }
      if(act === 'edit') {
        nameIn.value = players[idx].name;
        scoreIn.value = players[idx].score;
        nameIn.focus();
      }
      if(act === 'del') {
        if(!confirm('Delete ' + name + '?')) return;
        players.splice(idx,1);
      }
      save();
      render();
    });

    clearBtn.addEventListener('click', () => {
      if(confirm('Clear all players?')) {
        players = [];
        save();
        render();
      }
    });

    exportBtn.addEventListener('click', () => {
      const data = JSON.stringify(players, null, 2);
      const blob = new Blob([data], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'scoreboard.json'; document.body.appendChild(a); a.click();
      a.remove(); URL.revokeObjectURL(url);
    });

    importToggle.addEventListener('click', () => {
      const isHidden = importArea.classList.toggle('hidden');
      importArea.setAttribute('aria-hidden', isHidden ? 'true' : 'false');
      if(!isHidden) importText.focus();
    });
    cancelImport.addEventListener('click', () => {
      importArea.classList.add('hidden');
      importArea.setAttribute('aria-hidden', 'true');
    });
    importBtn.addEventListener('click', () => {
      try {
        const arr = JSON.parse(importText.value);
        if(!Array.isArray(arr)) throw new Error('Expected array');
        // basic validation and normalize
        players = arr.map(x => ({ name: String(x.name), score: Number(x.score) || 0 }));
        save();
        render();
        importArea.classList.add('hidden');
        importArea.setAttribute('aria-hidden', 'true');
        importText.value = '';
      } catch(e) {
        alert('Invalid JSON: ' + e.message);
      }
    });

    // keyboard: Enter in name field adds
    nameIn.addEventListener('keydown', (e) => { if(e.key === 'Enter') addBtn.click(); });

    // initialize
    load();

    // expose minimal API for debugging (optional)
    return { load, save, get players(){ return players; } };
  })();


  /* -----------------------------
     Battle module (patched)
     ----------------------------- */
  const Battle = (function(){
    const STORAGE_KEY = 'scoreboard:1v1';
    const modeKey = 'scoreboard:mode';
    let state = {
      p1: { name: 'Player 1', score: 0 },
      p2: { name: 'Player 2', score: 0 },
      remaining: 90,
      running: false,
      intervalId: null
    };

    // DOM
    const battleSection = document.getElementById('battleSection');
    const bP1NameIn = document.getElementById('b_player1_name');
    const bP2NameIn = document.getElementById('b_player2_name');
    const bDisplayName1 = document.getElementById('b_display_name_1');
    const bDisplayName2 = document.getElementById('b_display_name_2');
    const bScore1 = document.getElementById('b_score_1');
    const bScore2 = document.getElementById('b_score_2');
    const bTimeDisplay = document.getElementById('b_time_display');
    const bMinutes = document.getElementById('b_minutes');
    const bSeconds = document.getElementById('b_seconds');
    const bStart = document.getElementById('b_start');
    const bPause = document.getElementById('b_pause');
    const bReset = document.getElementById('b_reset');
    const bWinnerOverlay = document.getElementById('b_winner_overlay');
    const bWinnerText = document.getElementById('b_winner_text');
    const bCloseWinner = document.getElementById('b_close_winner');
    const bPlayAgain = document.getElementById('b_play_again'); // optional, may be null

    // mode buttons (top-level)
    const modeLeaderboardBtn = document.getElementById('modeLeaderboard');
    const modeBattleBtn = document.getElementById('modeBattle');
    const leaderboardSection = document.getElementById('leaderboardSection');

    function init(){
      bindUI();
      load();
      hideWinner();    // ensure overlay hidden at start
      restoreMode();
    }

    function bindUI(){
      // name inputs -> update display and save
      if (bP1NameIn) bP1NameIn.addEventListener('input', () => {
        state.p1.name = bP1NameIn.value || 'Player 1';
        bDisplayName1.textContent = state.p1.name;
        save();
      });
      if (bP2NameIn) bP2NameIn.addEventListener('input', () => {
        state.p2.name = bP2NameIn.value || 'Player 2';
        bDisplayName2.textContent = state.p2.name;
        save();
      });

      // increment/decrement buttons (event delegation)
      if (battleSection) battleSection.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if(!btn) return;
        const act = btn.dataset.act;
        const p = btn.dataset.player;
        if(!act || !p) return;
        if(act === 'inc') changeScore(Number(p), +1);
        if(act === 'dec') changeScore(Number(p), -1);
      });

      // timer controls
      if (bStart) bStart.addEventListener('click', () => {
        // compute seconds from inputs
        const m = Math.max(0, Number(bMinutes.value) || 0);
        let s = Math.max(0, Number(bSeconds.value) || 0);
        if(s >= 60) s = 59;
        const total = m*60 + s;
        if(total <= 0){
          alert('Set a timer greater than 0 to start.');
          return;
        }
        state.remaining = total;
        startTimer();
        updateTimerControls();
        save();
      });

      if (bPause) bPause.addEventListener('click', () => {
        if(state.running) pauseTimer();
        else resumeTimer();
        updateTimerControls();
      });

      if (bReset) bReset.addEventListener('click', () => {
        if(!confirm('Reset battle (scores and timer)?')) return;
        resetBattle();
      });

      // winner overlay close / play again
      if (bCloseWinner) bCloseWinner.addEventListener('click', () => {
        hideWinner();
      });
      if (bPlayAgain) bPlayAgain.addEventListener('click', () => {
        // Reset scores and timer to current inputs, then start
        state.p1.score = 0;
        state.p2.score = 0;
        const m = Math.max(0, Number(bMinutes.value) || 0);
        let s = Math.max(0, Number(bSeconds.value) || 0);
        if(s >= 60) s = 59;
        state.remaining = m*60 + s;
        updateScores();
        save();
        hideWinner();
        startTimer();
      });

      // mode switching
      if (modeLeaderboardBtn) modeLeaderboardBtn.addEventListener('click', () => switchMode('leaderboard'));
      if (modeBattleBtn) modeBattleBtn.addEventListener('click', () => switchMode('battle'));
    }

    function changeScore(playerNumber, delta){
      if(playerNumber === 1) state.p1.score = Number(state.p1.score) + delta;
      if(playerNumber === 2) state.p2.score = Number(state.p2.score) + delta;
      flashScore(playerNumber);
      updateScores();
      save();
    }

    function flashScore(playerNumber){
      const el = playerNumber === 1 ? bScore1 : bScore2;
      if(!el) return;
      el.style.transform = 'scale(1.06)';
      setTimeout(()=> el.style.transform = '', 140);
    }

    function updateScores(){
      if(bScore1) bScore1.textContent = state.p1.score;
      if(bScore2) bScore2.textContent = state.p2.score;
    }

    function secondsToMMSS(sec){
      const m = Math.floor(sec/60);
      const s = sec % 60;
      return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    }

    function updateTimeDisplay(){
      if(!bTimeDisplay) return;
      bTimeDisplay.textContent = secondsToMMSS(state.remaining);
      // timer warning when low (<=10s)
      if(state.remaining <= 10){
        bTimeDisplay.style.color = '#ff6b6b';
      } else {
        bTimeDisplay.style.color = '';
      }
    }

    function startTimer(){
      if(state.intervalId) clearInterval(state.intervalId);
      state.running = true;
      updateTimeDisplay();
      state.intervalId = setInterval(() => {
        if(state.remaining <= 0){
          stopTimer();
          showWinnerByScore();
          return;
        }
        state.remaining -= 1;
        updateTimeDisplay();
      }, 1000);
      updateTimerControls();
    }

    function pauseTimer(){
      if(state.intervalId) clearInterval(state.intervalId);
      state.intervalId = null;
      state.running = false;
      updateTimerControls();
    }

    function resumeTimer(){
      if(state.running) return;
      state.running = true;
      state.intervalId = setInterval(() => {
        if(state.remaining <= 0){
          stopTimer();
          showWinnerByScore();
          return;
        }
        state.remaining -= 1;
        updateTimeDisplay();
      }, 1000);
      updateTimerControls();
    }

    function stopTimer(){
      if(state.intervalId) clearInterval(state.intervalId);
      state.intervalId = null;
      state.running = false;
      updateTimerControls();
    }

    function updateTimerControls(){
      if(!bStart || !bPause) return;
      if(state.running){
        bStart.disabled = true;
        bPause.disabled = false;
        bPause.textContent = 'Pause';
      } else {
        bStart.disabled = false;
        bPause.disabled = false;
        bPause.textContent = 'Resume';
      }
    }

    function resetBattle(){
      stopTimer();
      state.p1.score = 0;
      state.p2.score = 0;
      const m = Math.max(0, Number(bMinutes.value) || 0);
      let s = Math.max(0, Number(bSeconds.value) || 0);
      if(s >= 60) s = 59;
      state.remaining = m*60 + s;
      if(state.remaining <= 0) state.remaining = 0;
      updateScores();
      updateTimeDisplay();
      save();
      hideWinner();
    }

    function showWinnerByScore(){
      let winnerText = 'Tie';
      if(state.p1.score > state.p2.score) winnerText = state.p1.name + ' wins!';
      else if(state.p2.score > state.p1.score) winnerText = state.p2.name + ' wins!';
      else winnerText = "It's a tie!";
      if (bWinnerText) bWinnerText.textContent = winnerText;
      if (bWinnerOverlay) {
        bWinnerOverlay.classList.remove('hidden');
        bWinnerOverlay.setAttribute('aria-hidden', 'false');
      }
    }

    function hideWinner(){
      if (bWinnerOverlay) {
        bWinnerOverlay.classList.add('hidden');
        bWinnerOverlay.setAttribute('aria-hidden', 'true');
      }
    }

    // Mode switching & persistence
    function switchMode(mode){
      if(!battleSection || !leaderboardSection) return;
      if(mode === 'battle'){
        // show battle (dark styling is scoped to .battle-section in CSS)
        battleSection.classList.remove('hidden');
        battleSection.setAttribute('aria-hidden','false');
        leaderboardSection.classList.add('hidden');
        leaderboardSection.setAttribute('aria-hidden','true');
        // do NOT toggle document.body class - avoid making entire page dark
        if (modeBattleBtn) modeBattleBtn.classList.add('active');
        if (modeLeaderboardBtn) modeLeaderboardBtn.classList.remove('active');
        if (modeBattleBtn) modeBattleBtn.setAttribute('aria-selected','true');
        if (modeLeaderboardBtn) modeLeaderboardBtn.setAttribute('aria-selected','false');
        localStorage.setItem(modeKey, 'battle');
        hideWinner(); // ensure overlay hidden when entering battle mode
      } else {
        // show leaderboard
        battleSection.classList.add('hidden');
        battleSection.setAttribute('aria-hidden','true');
        leaderboardSection.classList.remove('hidden');
        leaderboardSection.setAttribute('aria-hidden','false');
        if (modeBattleBtn) modeBattleBtn.classList.remove('active');
        if (modeLeaderboardBtn) modeLeaderboardBtn.classList.add('active');
        if (modeBattleBtn) modeBattleBtn.setAttribute('aria-selected','false');
        if (modeLeaderboardBtn) modeLeaderboardBtn.setAttribute('aria-selected','true');
        localStorage.setItem(modeKey, 'leaderboard');
      }
    }

    function restoreMode(){
      const saved = localStorage.getItem('scoreboard:mode');
      if(saved === 'battle') switchMode('battle');
      else switchMode('leaderboard');
    }

    function save(){
      try {
        const toSave = {
          p1: state.p1,
          p2: state.p2,
          remaining: state.remaining,
          running: state.running
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch(e){
        console.error('Failed saving battle state', e);
      }
    }

    function load(){
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if(!raw) return;
        const obj = JSON.parse(raw);
        if(obj.p1) state.p1 = obj.p1;
        if(obj.p2) state.p2 = obj.p2;
        if(typeof obj.remaining === 'number') state.remaining = obj.remaining;
      } catch(e){
        console.error('Failed loading battle', e);
      }
      // apply to UI
      if (bP1NameIn) bP1NameIn.value = state.p1.name;
      if (bP2NameIn) bP2NameIn.value = state.p2.name;
      if (bDisplayName1) bDisplayName1.textContent = state.p1.name;
      if (bDisplayName2) bDisplayName2.textContent = state.p2.name;
      updateScores();
      updateTimeDisplay();
      updateTimerControls();
    }

    // public API
    return { init };
  })();

  // Initialize both modules when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    // Leaderboard module already self-initialized above (it called load).
    // Initialize Battle now
    Battle.init && Battle.init();
  });

})();