(function(){
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

  // expose for debugging (optional)
  window.__scoreboard = { get players(){ return players; }, save, load };
})();