// Unified watchlist API - lightweight, UI-preserving, robust behavior
(function () {
  function markButtonsAdded(title) {
    if (!title) return;
    document.querySelectorAll('.watchlist-btn').forEach(b => {
      if ((b.dataset.title || '').toString().trim() === title.toString().trim()) {
        b.textContent = 'Added'; b.disabled = true;
      }
    });
    const modalBtn = document.getElementById('add-to-watchlist');
    if (modalBtn && document.getElementById('movie-title')?.textContent.trim() === title) {
      modalBtn.textContent = 'Added'; modalBtn.disabled = true;
    }
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem('watchlist') || '[]';
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (e) { console.warn('local read err', e); return []; }
  }

  function ensureToastContainer() {
    if (document.getElementById('toast-container')) return;
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `#toast-container{position:fixed;right:20px;bottom:20px;z-index:99999;display:flex;flex-direction:column;gap:10px}
      .toast{min-width:160px;padding:8px 12px;border-radius:8px;color:#fff;opacity:0;transform:translateY(8px);transition:opacity .2s,transform .2s}
      .toast.show{opacity:1;transform:translateY(0)}
      .toast.success{background:linear-gradient(90deg,#28a745,#218838)}
      .toast.error{background:linear-gradient(90deg,#dc3545,#c82333)}
      .toast.info{background:linear-gradient(90deg,#17a2b8,#138496)}`;
    document.head.appendChild(style);
    const container = document.createElement('div'); container.id = 'toast-container'; document.body.appendChild(container);
  }
  function showToast(msg, type = 'info', timeout = 2500) {
    try {
      ensureToastContainer();
      const c = document.getElementById('toast-container');
      const t = document.createElement('div'); t.className = `toast ${type}`; t.textContent = msg; c.appendChild(t);
      requestAnimationFrame(() => t.classList.add('show'));
      setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); }, timeout);
    } catch (e) { try { alert(msg); } catch (_) { } }
  }

  window.loadLocalWatchlist = function () { return loadLocal(); };

  // --- ADD ---
  window.addToWatchlist = async function (movieTitle, posterUrl) {
    movieTitle = (movieTitle || '').toString().trim(); posterUrl = posterUrl || null;
    if (!movieTitle) { showToast('Missing title', 'error'); return; }

    // CHANGED: require an authenticated user for DB sync; otherwise, store locally with a clear message
    try {
      if (!window.supabase) throw new Error('Supabase client is not initialized. Ensure auth.js runs before this file.');
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      if (user) {
        const user_id = user.id;

        // CHANGED: use SELECT with throwOnError set by default (no silent catch)
        const { data: existing, error: exErr } = await supabase
          .from('watchlist')
          .select('id')
          .eq('user_id', user_id)
          .ilike('movie_title', movieTitle)  // case-insensitive dedupe
          .maybeSingle();

        if (exErr) {
          console.error('dup check error', exErr);
          showToast(`Server error (check): ${exErr.message || exErr}`, 'error', 4000);
          // do not fall back here—better to surface error than create dup locally
          return;
        }
        if (existing) { showToast('Already in your watchlist', 'info'); markButtonsAdded(movieTitle); return; }

        // CHANGED: use upsert to be idempotent with a unique index (see SQL below)
        const { error: insErr } = await supabase
          .from('watchlist')
          .upsert({ user_id, movie_title: movieTitle, poster_url: posterUrl }, { onConflict: 'user_id,movie_title' });

        if (insErr) {
          console.error('insert error', insErr);
          showToast(`Could not add (DB): ${insErr.message || insErr}`, 'error', 5000);
          return;
        }
        showToast('Added to watchlist', 'success'); markButtonsAdded(movieTitle); return;
      }
    } catch (e) {
      console.error('add supabase err', e);
      // fall through to local if not authenticated specifically
    }

    // local fallback (only when not signed-in)
    try {
      const list = loadLocal();
      const norm = movieTitle.toLowerCase();
      if (list.find(i => ((typeof i === 'string' ? i : (i.title || '')).toString().trim().toLowerCase()) === norm)) {
        showToast('Already in your watchlist', 'info'); markButtonsAdded(movieTitle); return;
      }
      list.push({ title: movieTitle, poster: posterUrl });
      localStorage.setItem('watchlist', JSON.stringify(list));
      showToast('Sign in to sync. Saved locally.', 'info');  // CHANGED: clearer message
      markButtonsAdded(movieTitle);
    } catch (e) {
      console.error('local add err', e); showToast('Could not add locally', 'error');
    }
  };

  // --- REMOVE ---
  window.removeFromWatchlist = async function (idOrTitle, sourceEl) {
    try {
      const { data: { user } = {} } = (window.supabase ? await supabase.auth.getUser() : { data: {} });
      const asNum = Number(idOrTitle);
      const isId = !isNaN(asNum) && String(idOrTitle).trim() !== '';

      if (user && isId && window.supabase) {
        const { error } = await supabase.from('watchlist').delete().eq('id', asNum).eq('user_id', user.id);
        if (error) {
          console.warn('supabase delete issue', error.message || error);
          showToast(`Could not remove (DB): ${error.message || error}`, 'error', 4000);
        }
      } else {
        // local remove by title
        const title = (idOrTitle || '').toString().trim();
        if (title) {
          const list = loadLocal();
          const filtered = list.filter(i => (i.title || '').toString().trim() !== title);
          localStorage.setItem('watchlist', JSON.stringify(filtered));
        }
      }

      // update UI
      try {
        if (sourceEl && sourceEl instanceof Element) {
          const card = sourceEl.closest('.movie-item'); if (card && card.parentNode) card.parentNode.removeChild(card);
          const container = document.getElementById('watchlist'); const empty = document.getElementById('empty-state');
          if (container && empty && container.children.length === 0) empty.style.display = 'block';
          showToast('Removed from watchlist', 'success');
          return true;
        }
      } catch (e) { console.warn('in-place remove failed', e); }

      if (typeof window.renderWatchlist === 'function') { window.renderWatchlist('watchlist', 'empty-state'); return true; }
      return true;
    } catch (e) { console.error('remove err', e); showToast('Remove failed', 'error'); return false; }
  };

  // --- RENDER ---
  let __renderInFlight = null;

  window.renderWatchlist = function (containerId = 'watchlist', emptyId = 'empty-state') {
    if (__renderInFlight) return __renderInFlight;
    __renderInFlight = (async () => {
      const container = document.getElementById(containerId); const empty = document.getElementById(emptyId);
      if (!container) return;
      container.innerHTML = '';
      if (empty) empty.style.display = 'none';

      try {
        if (window.supabase) {
          const { data: { user } = {}, error: uErr } = await supabase.auth.getUser();
          if (uErr) console.warn('getUser error', uErr);
          if (user) {
            const { data, error } = await supabase
              .from('watchlist')
              .select('*')
              .eq('user_id', user.id)
              .order('added_at', { ascending: false });

            if (error) {
              console.error('fetch watchlist error', error);
              showToast(`Could not load from DB: ${error.message || error}`, 'error', 4000);
            } else if (Array.isArray(data) && data.length) {
              const seen = new Set();
              data.forEach(row => {
                const key = (row.movie_title || '').toString().trim().toLowerCase();
                if (seen.has(key)) return; seen.add(key);

                const card = document.createElement('div'); card.className = 'movie-item'; card.dataset.rowId = row.id;
                const img = document.createElement('img'); img.src = row.poster_url || 'https://via.placeholder.com/300x450?text=No+Image'; img.alt = row.movie_title;
                const h3 = document.createElement('h3'); h3.textContent = row.movie_title;
                const actions = document.createElement('div'); actions.className = 'card-actions';
                const watchBtn = document.createElement('button'); watchBtn.className = 'btn'; watchBtn.textContent = 'Watch Now'; watchBtn.onclick = () => window.location.href = `movies.html?open=${encodeURIComponent(row.movie_title)}`;
                const removeBtn = document.createElement('button'); removeBtn.className = 'btn btn-outline'; removeBtn.textContent = 'Remove'; removeBtn.onclick = () => window.removeFromWatchlist(row.id, removeBtn);
                actions.appendChild(watchBtn); actions.appendChild(removeBtn);
                card.appendChild(img); card.appendChild(h3); card.appendChild(actions); container.appendChild(card);
              });
              return;
            }
          }
        }
      } catch (e) { console.warn('render server err', e); }

      // local fallback
      const local = loadLocal();
      const seen = new Set();
      if (!local || local.length === 0) { if (empty) empty.style.display = 'block'; return; }
      const unique = (local || []).reduce((acc, cur) => {
        const title = (typeof cur === 'string' ? cur : (cur.title || '')).toString().trim();
        const n = title.toLowerCase();
        if (!seen.has(n)) { seen.add(n); acc.push({ title, poster: typeof cur === 'string' ? null : cur.poster }); }
        return acc;
      }, []);
      if (!unique || unique.length === 0) { if (empty) empty.style.display = 'block'; return; }
      unique.forEach(item => {
        const card = document.createElement('div'); card.className = 'movie-item'; card.dataset.title = item.title;
        const img = document.createElement('img'); img.src = item.poster || 'https://via.placeholder.com/300x450?text=No+Image'; img.alt = item.title;
        const h3 = document.createElement('h3'); h3.textContent = item.title;
        const actions = document.createElement('div'); actions.className = 'card-actions';
        const watchBtn = document.createElement('button'); watchBtn.className = 'btn'; watchBtn.textContent = 'Watch Now'; watchBtn.onclick = () => window.location.href = `movies.html?open=${encodeURIComponent(item.title)}`;
        const removeBtn = document.createElement('button'); removeBtn.className = 'btn btn-outline'; removeBtn.textContent = 'Remove'; removeBtn.onclick = () => window.removeFromWatchlist(item.title, removeBtn);
        actions.appendChild(watchBtn); actions.appendChild(removeBtn); card.appendChild(img); card.appendChild(h3); card.appendChild(actions); container.appendChild(card);
      });
    })().finally(() => {
      __renderInFlight = null;
    });
    return __renderInFlight;
  };

  window.showToast = showToast;
})();
