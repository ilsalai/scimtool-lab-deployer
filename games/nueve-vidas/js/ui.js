/* Nueve Vidas · interfaz: pantallas, HUD, tienda, panel de unidad y controles. */
(function () {
  const TD = (globalThis.TD = globalThis.TD || {});
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const ICONS = {
    paw: '<svg viewBox="0 0 24 24"><circle cx="6.5" cy="8.5" r="2.3"/><circle cx="11" cy="5.5" r="2.3"/><circle cx="16" cy="6.5" r="2.3"/><circle cx="19.5" cy="11" r="2.1"/><path d="M12.5 10.5c-3.6 0-6.8 3.3-6.8 6.2 0 1.9 1.5 3.3 3.4 3.3 1.2 0 2.1-.6 3.4-.6s2.2.6 3.4.6c1.9 0 3.4-1.4 3.4-3.3 0-2.9-3.2-6.2-6.8-6.2z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7L12 17.3 5.8 21l1.6-7L2 9.3l7.1-.7z"/></svg>',
    can: '<svg viewBox="0 0 24 24"><path d="M5 5.5C5 4.1 8.1 3 12 3s7 1.1 7 2.5v13c0 1.4-3.1 2.5-7 2.5s-7-1.1-7-2.5z"/><ellipse cx="12" cy="5.5" rx="7" ry="2.5" fill="rgba(255,255,255,.35)"/></svg>',
    seed: '<svg viewBox="0 0 24 24"><path d="M12 3c4 3 7 7.5 7 11a7 7 0 0 1-14 0c0-3.5 3-8 7-11z"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><path d="M7 10V8a5 5 0 0 1 10 0v2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zm2 0h6V8a3 3 0 0 0-6 0z"/></svg>',
  };
  const ROLE_LABEL = { basic: 'Tirador', melee: 'Cuerpo a cuerpo', control: 'Control', splash: 'Daño en área', sniper: 'Francotirador' };
  const CHRON_ICON = { born: '✦', death: '✕', ninth: '☠', win: '★', war: '♛', wheel: '↻' };

  class UI {
    constructor() {
      this.campaign = new TD.Campaign();
      this.dev = /[?&]dev(=|&|$)/.test(location.search);
      this.campaign.dev = this.dev;
      this.game = null; this.renderer = null; this.level = null;
      this.placing = null; this.selected = null; this.hover = null;
      this.speed = 1; this.screen = null; this.lastTs = 0; this.livesAtLevelStart = 9;
      this._cans = null; this._lives = null; this._wave = null;
      this.canvas = $('#game');
      this.bind();
      this.setFactionClass(this.campaign.exists ? this.campaign.data.faction : 'gatos');
      const m = location.search.match(/[?&]nivel=([\w-]+)/);
      const direct = m && TD.levels.find((l) => l.id === m[1] || String(l.order) === m[1]);
      if (direct) this.jumpTo(direct); else this.showMenu();
      requestAnimationFrame((ts) => this.loop(ts));
    }

    /** Acceso directo para diseñar niveles: index.html?nivel=<id> */
    jumpTo(level) {
      if (!this.campaign.exists) this.campaign.newGame();
      if (this.campaign.data.faction !== level.faction) {
        this.campaign.data.faction = level.faction;
        this.campaign.data.character = this.campaign.makeCharacter(level.faction);
        this.campaign.save();
      }
      this.showIntro(level);
    }

    setFactionClass(f) { document.getElementById('app').className = 'faction-' + f; }

    /* ---------------------------------------------------------- eventos */
    bind() {
      const cv = this.canvas;
      cv.addEventListener('pointermove', (e) => {
        if (!this.renderer) return;
        const p = this.renderer.pointFromEvent(e);
        const m = this.game.map;
        this.hover = p.c >= 0 && p.r >= 0 && p.c < m.cols && p.r < m.rows ? { c: p.c, r: p.r } : null;
      });
      cv.addEventListener('pointerleave', () => { this.hover = null; });
      cv.addEventListener('pointerdown', (e) => {
        if (!this.game || this.screen) return;
        TD.audio.unlock();
        if (e.button === 2) { this.cancelPlacing(); return; }
        const p = this.renderer.pointFromEvent(e);
        this.hover = { c: p.c, r: p.r };
        this.clickTile(p.c, p.r);
      });
      cv.addEventListener('contextmenu', (e) => e.preventDefault());
      document.addEventListener('pointerdown', () => TD.audio.unlock(), { capture: true });
      window.addEventListener('resize', () => this.fitCanvas());
      document.addEventListener('keydown', (e) => this.onKey(e));

      $('#btn-menu').addEventListener('click', () => this.togglePause());
      $('#btn-pause').addEventListener('click', () => this.togglePause());
      $('#btn-sound').addEventListener('click', () => this.refreshSoundButton(TD.audio.toggle()));
      this.refreshSoundButton(TD.audio.enabled);
      for (const b of document.querySelectorAll('#speed button')) b.addEventListener('click', () => this.setSpeed(Number(b.dataset.speed)));
      $('#btn-wave').addEventListener('click', () => this.startWave());
      $('#btn-upgrade').addEventListener('click', () => { if (!this.selected || !this.game.upgrade(this.selected)) TD.audio.play('error'); });
      $('#btn-sell').addEventListener('click', () => { if (this.selected) this.game.sell(this.selected); });
      $('#tp-targeting').addEventListener('change', (e) => { if (this.selected) this.selected.targeting = e.target.value; });
      $('#overlay').addEventListener('click', (e) => {
        const b = e.target.closest('[data-action]');
        if (!b) return;
        TD.audio.unlock(); TD.audio.play('click');
        this.action(b.dataset.action, b.dataset);
      });
    }

    onKey(e) {
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      const k = e.key;
      if (k === 'Escape') {
        if (this.screen === 'pause') { this.hideOverlay(); return; }
        if (this.screen) return;
        if (this.placing || this.selected) { this.cancelPlacing(); this.select(null); } else if (this.game) this.togglePause();
        return;
      }
      if (!this.game || this.screen) return;
      if (/^[1-9]$/.test(k)) {
        const def = this.game.availableTowers.find((t) => t.hotkey === k) || this.game.availableTowers[Number(k) - 1];
        if (def) this.setPlacing(this.placing === def ? null : def);
      } else if (k === ' ') { e.preventDefault(); this.startWave(); }
      else if (k === 'p' || k === 'P') this.togglePause();
      else if (k === 'm' || k === 'M') this.refreshSoundButton(TD.audio.toggle());
      else if (k === 'u' || k === 'U') { if (this.selected && !this.game.upgrade(this.selected)) TD.audio.play('error'); }
      else if (k === 'x' || k === 'X' || k === 'Delete') { if (this.selected) this.game.sell(this.selected); }
      else if (k === '+' || k === '=') this.setSpeed(Math.min(3, this.speed + 1));
      else if (k === '-') this.setSpeed(Math.max(1, this.speed - 1));
    }

    action(name, data) {
      switch (name) {
        case 'new-game': { const r = this.campaign.newGame(); this.setFactionClass('gatos'); this.showBorn({ character: r.character, text: r.text, first: true }); break; }
        case 'confirm-reset': this.showConfirmReset(); break;
        case 'reset': this.campaign.reset(); this.game = null; this.renderer = null; this.showMenu(); break;
        case 'menu': this.showMenu(); break;
        case 'levels': this.showLevels(); break;
        case 'chronicle': this.showChronicle(); break;
        case 'help': this.showHelp(); break;
        case 'intro': { const lv = TD.levels.find((l) => l.id === data.level); if (lv) this.showIntro(lv); break; }
        case 'play': { const lv = TD.levels.find((l) => l.id === data.level); if (lv) this.startLevel(lv); break; }
        case 'resume': this.hideOverlay(); break;
        case 'restart': if (this.level) this.startLevel(this.level); break;
        case 'quit': this.game = null; this.renderer = null; this.showLevels(); break;
        case 'wheel': {
          const info = this.campaign.turnWheel(data.reason || 'death');
          this.game = null; this.renderer = null;
          TD.audio.play('wheel');
          this.showBorn(info);
          break;
        }
        case 'war': this.showWar(); break;
        case 'switch-dev': {
          const f = this.campaign.faction.enemy;
          this.campaign.data.faction = f;
          this.campaign.data.character = this.campaign.makeCharacter(f);
          this.campaign.data.lives = 9;
          this.campaign.save();
          this.showLevels();
          break;
        }
        default: break;
      }
    }

    /* -------------------------------------------------------- pantallas */
    setScreen(name, html) {
      this.screen = name;
      const ov = $('#overlay');
      ov.classList.remove('hidden');
      ov.innerHTML = `<section class="screen screen-${name}">${html}</section>`;
      ov.scrollTop = 0;
      this.paintAll(ov);
      return ov.firstElementChild;
    }
    hideOverlay() { this.screen = null; const ov = $('#overlay'); ov.classList.add('hidden'); ov.innerHTML = ''; }

    paintAll(root = document) {
      for (const cv of root.querySelectorAll('canvas.avatar[data-look]')) {
        const scale = Number(cv.dataset.scale) || 1;
        if (cv.dataset.pose === 'walk') TD.art.paintWalker(cv, cv.dataset.look, { scale });
        else TD.art.paintPortrait(cv, cv.dataset.look, { base: cv.dataset.base || null, scale });
      }
    }

    livesHTML(n, f) {
      const icon = f.id === 'gatos' ? ICONS.paw : ICONS.star;
      let s = '';
      for (let i = 0; i < 9; i++) s += `<span class="life ${i < n ? '' : 'lost'}">${icon}</span>`;
      return s;
    }

    characterCard(big = false) {
      const ch = this.campaign.character, f = this.campaign.faction, lives = this.campaign.lives;
      return `<div class="char-card ${big ? 'big' : ''}">
        <canvas class="avatar" width="${big ? 150 : 80}" height="${big ? 150 : 80}" data-look="${ch.look}" data-scale="1.05"></canvas>
        <div class="char-text">
          <div class="char-name">${esc(ch.name)}</div>
          <div class="char-sub">${esc(ch.article)} ${esc(ch.label)} · ${esc(f.clan)}</div>
          <div class="lives">${this.livesHTML(lives, f)}</div>
          <div class="char-sub">${lives} ${lives === 1 ? f.livesWord : f.livesPlural} · encarnación ${this.campaign.data.incarnation}</div>
        </div></div>`;
    }

    showMenu() {
      const c = this.campaign;
      // Si se cerró el juego con la novena perdida, la Rueda tiene que girar antes de seguir.
      if (c.exists && c.lives <= 0) return this.showWheel();
      const body = c.exists
        ? `${this.characterCard()}
          <div class="btn-row">
            <button class="btn primary big" data-action="levels">Continuar</button>
            <button class="btn" data-action="chronicle">Crónica</button>
            <button class="btn" data-action="help">Cómo se juega</button>
            <button class="btn ghost" data-action="confirm-reset">Nueva partida</button>
          </div>`
        : `<p class="lead">Hace diez mil estaciones los Bípedos desaparecieron. Quedaron sus ruinas, sus latas que no se pudren y una guerra muy vieja: la de los gatos y los roedores.</p>
          <div class="btn-row">
            <button class="btn primary big" data-action="new-game">Empezar · tu primera vida</button>
            <button class="btn" data-action="help">Cómo se juega</button>
          </div>`;
      this.setScreen('menu', `
        <div class="menu-head">
          <div class="title-row">
            <canvas class="avatar" width="110" height="110" data-look="tabby" data-base="post"></canvas>
            <div><h1 class="title">NUEVE VIDAS</h1><p class="tagline">Gatos contra roedores en una tierra que evolucionó sin humanos</p></div>
            <canvas class="avatar" width="110" height="110" data-look="squirrel" data-base="stump"></canvas>
          </div>
        </div>
        ${body}
        <p class="footnote">Un gato tiene nueve vidas. Un roedor, nueve milagros. Cuando se acaban, la Rueda gira y despiertas del otro lado.</p>`);
    }

    showConfirmReset() {
      this.setScreen('confirm', `<h2>¿Empezar de cero?</h2><p class="lead">Se borra la Crónica, el personaje actual y el progreso de los dos bandos. La Rueda no recuerda nada.</p>
        <div class="btn-row"><button class="btn danger" data-action="reset">Sí, borrar todo</button><button class="btn" data-action="menu">No, volver</button></div>`);
    }

    showLevels() {
      const c = this.campaign;
      if (!c.exists) return this.showMenu();
      if (c.lives <= 0) return this.showWheel();
      const f = c.faction;
      this.setFactionClass(f.id);
      const levels = TD.levelsOf(f.id);
      const cards = levels.map((lv, i) => {
        const prog = c.levelProgress(lv), unlocked = c.isUnlocked(lv);
        const stars = prog ? `<span class="stars" title="Mejor resultado">${'★'.repeat(prog.stars)}<span class="dim">${'★'.repeat(3 - prog.stars)}</span></span>` : '';
        const paws = Array.from({ length: 5 }, (_, k) => `<span class="${k < (lv.difficulty || 1) ? 'on' : ''}">${ICONS.paw}</span>`).join('');
        return `<button class="level-card ${unlocked ? '' : 'locked'} ${prog ? 'won' : ''}" ${unlocked ? `data-action="intro" data-level="${lv.id}"` : 'disabled'}>
          <div class="lc-num">${i + 1}</div>
          <div class="lc-body">
            <div class="lc-name">${esc(lv.name)}</div>
            <div class="lc-sub">${esc(lv.subtitle || '')}</div>
            <div class="lc-meta"><span class="paws" title="Dificultad">${paws}</span>${stars}${unlocked ? '' : `<span class="lock">${ICONS.lock}</span>`}</div>
          </div></button>`;
      }).join('');
      this.setScreen('levels', `
        <div class="screen-head"><div><div class="kicker">${esc(f.campaignTitle)}</div><h2>Campaña de los ${esc(f.unitsWord.toLowerCase())}</h2></div><button class="btn ghost" data-action="menu">Menú</button></div>
        ${this.characterCard()}
        <div class="level-grid">${cards}</div>
        ${levels.length ? '' : '<p class="hint">Este bando todavía no tiene niveles. Crea uno en js/levels/ (mira _plantilla.js).</p>'}
        <p class="hint">${cap(f.livesPlural)} que no se recuperan entre niveles: cada enemigo que llega a ${esc(f.base)} gasta una. A la novena, la Rueda gira.</p>
        ${this.dev ? '<div class="btn-row"><button class="btn ghost" data-action="switch-dev">[dev] Cambiar de bando</button></div>' : ''}`);
    }

    showIntro(lv) {
      const f = TD.factions[lv.faction], c = this.campaign;
      this.setFactionClass(lv.faction);
      const units = (lv.towers || TD.towerOrder.filter((id) => TD.towers[id].faction === lv.faction)).map((id) => TD.towers[id]).filter(Boolean)
        .map((t) => `<div class="unit-chip" title="${esc(t.desc)}"><canvas class="avatar" width="52" height="52" data-look="${t.look}" data-base="${t.base}"></canvas><span>${esc(t.name)}</span></div>`).join('');
      const ids = [...new Set(lv.waves.flatMap((w) => (Array.isArray(w) ? w : w.groups).map((g) => g.enemy)))];
      const enemies = ids.map((id) => TD.enemies[id]).filter(Boolean)
        .map((e) => `<div class="unit-chip" title="${esc(e.desc)}"><canvas class="avatar" width="52" height="52" data-look="${e.look}" data-pose="walk"></canvas><span>${esc(e.name)}</span></div>`).join('');
      this.setScreen('intro', `
        <div class="kicker">${esc(lv.subtitle || '')}</div>
        <h2>${esc(lv.name)}</h2>
        <p class="lead">${esc(lv.intro || '')}</p>
        <div class="two-col">
          <div><h4>Tus ${esc(f.unitsWord.toLowerCase())}</h4><div class="chips">${units}</div></div>
          <div><h4>Qué viene</h4><div class="chips">${enemies}</div></div>
        </div>
        <p class="hint">${lv.waves.length} oleadas · ${c.lives} ${c.lives === 1 ? f.livesWord : f.livesPlural} en juego · empiezas con ${lv.startCans ?? 150} ${f.currency}</p>
        <div class="btn-row"><button class="btn primary big" data-action="play" data-level="${lv.id}">¡A defender!</button><button class="btn ghost" data-action="levels">Volver</button></div>`);
    }

    showPause() {
      this.setScreen('pause', `<h2>Pausa</h2>${this.characterCard()}
        <div class="btn-row"><button class="btn primary big" data-action="resume">Continuar</button><button class="btn" data-action="restart">Reiniciar nivel</button><button class="btn ghost" data-action="quit">Salir a los niveles</button></div>
        <p class="hint">${cap(this.campaign.faction.livesPlural)} perdidas no vuelven al reiniciar: son del personaje, no del nivel.</p>
        <p class="hint">Atajos: 1-5 elegir unidad · clic colocar · clic derecho o Esc cancelar · Espacio enviar oleada · P pausa · U mejorar · X vender · M sonido · + / − velocidad</p>`);
    }

    showResult(res) {
      const g = this.game, f = this.campaign.faction, lv = this.level;
      const lost = this.livesAtLevelStart - g.lives;
      const next = this.campaign.nextLevel(lv);
      const stars = `${'★'.repeat(res.stars)}<span class="dim">${'★'.repeat(3 - res.stars)}</span>`;
      const buttons = res.firstWar
        ? '<button class="btn primary big" data-action="war">Continuar</button>'
        : `${next ? `<button class="btn primary big" data-action="intro" data-level="${next.id}">Siguiente nivel</button>` : ''}
           <button class="btn" data-action="intro" data-level="${lv.id}">Repetir</button>
           <button class="btn ghost" data-action="levels">Niveles</button>`;
      const lostWord = lost === 1 ? `${f.livesWord} ${f.lostVerb}` : `${f.livesPlural} ${f.lostVerb}s`;
      this.setScreen('result', `
        <div class="kicker">${esc(cap(f.baseShort))} defendida</div>
        <h2>¡Victoria en ${esc(lv.name)}!</h2>
        <div class="stars-big">${stars}</div>
        <div class="stats-grid">
          <div><b>${lost}</b><span>${lostWord}</span></div>
          <div><b>${g.stats.kills}</b><span>bajas</span></div>
          <div><b>${g.stats.earned}</b><span>${esc(f.currency)} ganadas</span></div>
          <div><b>${g.towers.length}</b><span>${esc(f.unitsWord.toLowerCase())} en el campo</span></div>
        </div>
        ${this.characterCard()}
        <div class="btn-row">${buttons}</div>`);
    }

    showWheel() {
      const f = this.campaign.faction, ch = this.campaign.character;
      const last = [...this.campaign.data.chronicle].reverse().find((e) => e.kind === 'ninth');
      const text = last ? last.text : f.ninth(ch.name, this.level ? this.level.name : 'la batalla');
      const enemy = TD.factions[f.enemy];
      this.setScreen('wheel', `
        <h1 class="title small">LA RUEDA GIRA</h1>
        <div class="char-card big faded">
          <canvas class="avatar" width="150" height="150" data-look="${ch.look}" data-scale="1.05"></canvas>
          <div class="char-text"><div class="char-name">${esc(ch.name)}</div><div class="char-sub">${esc(ch.article)} ${esc(ch.label)} · ${esc(f.clan)}</div><div class="lives">${this.livesHTML(0, f)}</div></div>
        </div>
        <p class="lead">${esc(text)}</p>
        <p class="hint">Los ${esc(enemy.unitsWord.toLowerCase())} ganan esta guerra. Tu siguiente vida es del otro bando.</p>
        <div class="btn-row"><button class="btn primary big" data-action="wheel" data-reason="death">Despertar</button></div>`);
    }

    showBorn(info) {
      const ch = info.character, f = TD.factions[ch.faction];
      this.setFactionClass(ch.faction);
      this.setScreen('born', `
        <div class="kicker">${info.first ? 'Tu primera vida' : `Encarnación ${this.campaign.data.incarnation}`}</div>
        <h2>${esc(ch.name)}</h2>
        <div class="char-card big">
          <canvas class="avatar" width="160" height="160" data-look="${ch.look}" data-scale="1.05"></canvas>
          <div class="char-text"><div class="char-sub">${esc(ch.article)} ${esc(ch.label)} · ${esc(f.clan)}</div><div class="lives">${this.livesHTML(9, f)}</div><div class="char-sub">9 ${f.livesPlural}</div></div>
        </div>
        <p class="lead">${esc(info.text)}</p>
        <div class="btn-row"><button class="btn primary big" data-action="levels">Continuar</button></div>`);
    }

    showWar() {
      const f = this.campaign.faction, ch = this.campaign.character;
      this.setScreen('war', `
        <div class="kicker">${esc(f.campaignTitle)}</div>
        <h2>${esc(cap(f.clan))} gana la guerra</h2>
        ${this.characterCard(true)}
        <p class="lead">${esc(f.warWon(ch.name))}</p>
        <div class="btn-row"><button class="btn primary big" data-action="levels">Seguir con ${esc(ch.name)}</button><button class="btn" data-action="wheel" data-reason="choice">Dejar que la Rueda gire</button></div>`);
    }

    showChronicle() {
      const c = this.campaign;
      if (!c.exists) return this.showMenu();
      let html = '', inc = null;
      for (const e of c.data.chronicle) {
        if (e.incarnation !== inc) {
          inc = e.incarnation;
          const f = TD.factions[e.faction] || c.faction;
          html += `<h4 class="chron-inc">Encarnación ${inc} · ${esc(f.unitsWord)}</h4>`;
        }
        html += `<div class="chron-entry ${e.kind}"><span class="chron-ico">${CHRON_ICON[e.kind] || '·'}</span><span>${esc(e.text)}</span></div>`;
      }
      this.setScreen('chronicle', `
        <div class="screen-head"><h2>Crónica de la Rueda</h2><button class="btn ghost" data-action="menu">Volver</button></div>
        <div class="chronicle">${html || '<p class="hint">Todavía no hay nada escrito.</p>'}</div>`);
    }

    showHelp() {
      this.setScreen('help', `
        <div class="screen-head"><h2>Cómo se juega</h2><button class="btn ghost" data-action="menu">Volver</button></div>
        <div class="help">
          <p><b>Defiende la base.</b> Los enemigos entran por las madrigueras y siguen el camino hasta tu Despensa (si eres gato) o tu Granero (si eres roedor). Coloca unidades en las casillas libres junto al camino para detenerlos.</p>
          <p><b>Nueve oportunidades.</b> Un gato tiene nueve vidas; un roedor, nueve escapes milagrosos. Cada enemigo que llega a la base gasta una, y no se recuperan entre niveles. A la novena, la Rueda gira: el otro bando gana la guerra y despiertas como un personaje nuevo... del otro lado, con nueve oportunidades frescas.</p>
          <p><b>Economía.</b> Cada baja deja latas (o semillas). Completar una oleada da un bono, y adelantar la siguiente antes de que termine la cuenta regresiva da uno extra.</p>
          <p><b>Unidades.</b> Cada bando tiene cinco: un tirador barato, un luchador cuerpo a cuerpo que detecta enemigos ocultos y rompe armaduras, uno de control que frena en área, uno de daño en área contra enjambres y un francotirador que ignora cualquier pellejo. Se mejoran dos veces y se pueden vender por el 70 %.</p>
          <p><b>Prioridad.</b> Al seleccionar una unidad puedes elegir a quién apunta: al más adelantado, al más atrasado, al más fuerte o al más cercano.</p>
          <p><b>Atajos.</b> 1-5 elegir unidad · clic colocar · clic derecho o Esc cancelar · Espacio enviar oleada · P pausa · U mejorar · X vender · M sonido · + / − velocidad.</p>
        </div>`);
    }

    /* -------------------------------------------------------- la partida */
    startLevel(level) {
      this.level = level;
      this.setFactionClass(level.faction);
      this.game = new TD.Game(level, { onEvent: (t, p, g) => this.handleEvent(t, p, g), lives: this.campaign.lives });
      this.renderer = new TD.Renderer(this.canvas, this.game);
      this.placing = null; this.selected = null; this.hover = null;
      this.livesAtLevelStart = this.game.lives;
      this._cans = null; this._lives = null; this._wave = null;
      this.setSpeed(1);
      $('#toasts').innerHTML = '';
      $('#hud-level').textContent = level.name;
      $('#hud-name').textContent = this.campaign.character.name;
      $('#stat-cans').title = cap(this.game.faction.currency);
      $('#cans-icon').innerHTML = ICONS[this.game.faction.currencyIcon] || ICONS.can;
      TD.art.paintPortrait($('#hud-avatar'), this.campaign.character.look, { scale: 1.1 });
      this.buildShop();
      this.refreshTowerPanel();
      this.refreshWavePanel();
      this.updateHUD();
      this.hideOverlay();
      this.fitCanvas();
      this.canvas.style.cursor = 'crosshair';
    }

    fitCanvas() {
      if (!this.renderer) return;
      const wrap = $('#canvas-wrap');
      const w = wrap.clientWidth - 16, h = wrap.clientHeight - 16;
      this.renderer.fit(Math.max(200, w), h > 160 ? h : 1e9);
    }

    togglePause() {
      if (!this.game) return;
      if (this.screen === 'pause') { this.hideOverlay(); return; }
      if (this.screen) return;
      if (this.game.finished) return;
      this.showPause();
    }

    setSpeed(n) {
      this.speed = n;
      for (const b of document.querySelectorAll('#speed button')) b.classList.toggle('active', Number(b.dataset.speed) === n);
    }
    refreshSoundButton(on) { const b = $('#btn-sound'); b.textContent = on ? '♪ Sonido' : '♪ Silencio'; b.classList.toggle('off', !on); }

    setPlacing(def) {
      this.placing = def || null;
      if (def) this.select(null);
      this.refreshShop();
      this.canvas.style.cursor = def ? 'copy' : 'crosshair';
    }
    cancelPlacing() { this.setPlacing(null); }
    select(t) { this.selected = t || null; this.refreshTowerPanel(); }

    clickTile(c, r) {
      const g = this.game;
      if (g.finished) return;
      if (this.placing) {
        const reason = g.buildReason(this.placing, c, r);
        if (reason) { TD.audio.play('error'); this.toast(reason, 'small', 1500); return; }
        g.build(this.placing, c, r);
        this.setPlacing(null);
        return;
      }
      this.select(g.towerAt(c, r));
    }

    startWave() {
      if (!this.game || this.screen) return;
      if (this.game.startNextWave(true)) this.refreshWavePanel();
    }

    /* ------------------------------------------------------------ tienda */
    buildShop() {
      const f = this.game.faction;
      $('#shop-title').textContent = f.unitsWord;
      const wrap = $('#shop-cards');
      wrap.innerHTML = '';
      for (const def of this.game.availableTowers) {
        const card = document.createElement('button');
        card.className = 'card';
        card.dataset.id = def.id;
        card.title = def.desc;
        card.innerHTML = `<canvas class="avatar" width="60" height="60" data-look="${def.look}" data-base="${def.base}"></canvas>
          <div class="card-body"><div class="card-name">${esc(def.name)}</div><div class="card-role">${ROLE_LABEL[def.role] || ''}</div>
          <div class="card-cost">${ICONS[f.currencyIcon] || ICONS.can}<span>${def.cost}</span></div></div><span class="hotkey">${def.hotkey || ''}</span>`;
        card.addEventListener('click', () => { TD.audio.unlock(); this.setPlacing(this.placing === def ? null : def); });
        wrap.appendChild(card);
      }
      this.paintAll(wrap);
      this.refreshShop();
    }
    refreshShop() {
      if (!this.game) return;
      for (const card of $('#shop-cards').children) {
        const def = TD.towers[card.dataset.id];
        card.classList.toggle('disabled', this.game.cans < def.cost);
        card.classList.toggle('active', this.placing === def);
      }
    }

    /* ---------------------------------------------------- panel de unidad */
    refreshTowerPanel() {
      const panel = $('#tower-panel'), t = this.selected;
      if (!t || !this.game || !this.game.towers.includes(t)) { panel.classList.add('hidden'); return; }
      panel.classList.remove('hidden');
      const st = t.stats;
      $('#tp-name').textContent = t.name;
      $('#tp-type').textContent = `${t.def.name} · nivel ${t.level + 1} de ${t.maxLevel + 1} · ${ROLE_LABEL[t.def.role] || ''}`;
      TD.art.paintPortrait($('#tp-avatar'), t.def.look, { base: t.def.base });
      const nx = t.canUpgrade ? t.def.levels[t.level + 1] : null;
      const f1 = TD.util.fmt1;
      const rows = [
        ['Daño', st.damage, nx && nx.damage],
        ['Alcance', `${f1(st.range)} casillas`, nx && `${f1(nx.range)} casillas`],
        ['Cadencia', `${f1(st.rate)}/s`, nx && `${f1(nx.rate)}/s`],
      ];
      if (st.splash) rows.push(['Área', `${f1(st.splash)} casillas`, nx && `${f1(nx.splash)} casillas`]);
      if (st.slow) rows.push(['Frena', `${Math.round(st.slow * 100)} % · ${f1(st.slowDuration)} s`, nx && `${Math.round(nx.slow * 100)} % · ${f1(nx.slowDuration)} s`]);
      if (t.def.pierce) rows.push(['Especial', 'Ignora la armadura']);
      if (t.def.detectsHidden) rows.push(['Especial', 'Detecta ocultos']);
      $('#tp-stats').innerHTML = rows.map(([k, v, n]) => `<div class="tp-row"><span>${k}</span><b>${v}${n != null && String(n) !== String(v) ? ` <i class="next">→ ${n}</i>` : ''}</b></div>`).join('');
      $('#tp-targeting').value = t.targeting;
      const up = $('#btn-upgrade');
      up.textContent = t.canUpgrade ? `Mejorar · ${t.upgradeCost}` : 'Nivel máximo';
      up.disabled = !t.canUpgrade || this.game.cans < t.upgradeCost;
      $('#btn-sell').textContent = `Vender · +${t.sellValue}`;
      $('#tp-record').textContent = `${t.kills} bajas · ${Math.round(t.damageDealt)} de daño`;
    }

    /* ------------------------------------------------------- panel oleada */
    refreshWavePanel() {
      const g = this.game;
      if (!g) return;
      const nxt = g.nextWave, cur = g.waves[g.waveIndex];
      const show = nxt || cur;
      $('#wave-title').textContent = nxt
        ? (g.state === 'build' ? `Primera oleada de ${g.totalWaves}` : `Próxima oleada: ${nxt.index + 1} de ${g.totalWaves}`)
        : `Última oleada (${g.totalWaves} de ${g.totalWaves})`;
      const counts = {};
      for (const grp of show.groups) counts[grp.enemy] = (counts[grp.enemy] || 0) + grp.count;
      const prev = $('#wave-preview');
      prev.innerHTML = Object.entries(counts).map(([id, n]) => {
        const e = TD.enemies[id];
        return `<div class="pv" title="${esc(e.name)}: ${esc(e.desc)}"><canvas class="avatar" width="40" height="40" data-look="${e.look}" data-pose="walk"></canvas><b>×${n}</b></div>`;
      }).join('');
      this.paintAll(prev);
      $('#wave-text').textContent = show.text || '';
      this.refreshCountdown();
    }

    refreshCountdown() {
      const g = this.game;
      if (!g) return;
      const btn = $('#btn-wave'), fill = $('#countdown-fill');
      let label, disabled = false, width = '0%';
      if (g.state === 'build') label = 'Iniciar la primera oleada';
      else if (g.state === 'countdown') { label = `¡Enviar ya! +${Math.ceil(g.countdown)} ${g.faction.currency}`; width = `${(g.countdown / g.countdownTotal) * 100}%`; }
      else if (g.state === 'wave') { label = g.nextWave ? 'Oleada en curso…' : '¡Última oleada! Resiste.'; disabled = true; width = '100%'; }
      else { label = g.state === 'victory' ? 'Victoria' : 'Fin'; disabled = true; }
      if (btn.textContent !== label) btn.textContent = label;
      if (btn.disabled !== disabled) btn.disabled = disabled;
      if (fill.style.width !== width) fill.style.width = width;
    }

    updateHUD() {
      const g = this.game;
      if (!g) return;
      if (this._cans !== g.cans) { this._cans = g.cans; $('#hud-cans').textContent = g.cans; this.refreshShop(); if (this.selected) { const up = $('#btn-upgrade'); up.disabled = !this.selected.canUpgrade || g.cans < this.selected.upgradeCost; } }
      const wave = `${g.currentWaveNumber}/${g.totalWaves}`;
      if (this._wave !== wave) { this._wave = wave; $('#hud-wave').textContent = wave; }
      if (this._lives !== g.lives) { this._lives = g.lives; $('#hud-lives').innerHTML = this.livesHTML(g.lives, g.faction); }
      if (this.selected && this.game.towers.includes(this.selected)) $('#tp-record').textContent = `${this.selected.kills} bajas · ${Math.round(this.selected.damageDealt)} de daño`;
      this.refreshCountdown();
    }

    toast(text, kind = 'small', ms) {
      const box = $('#toasts');
      const t = document.createElement('div');
      t.className = `toast ${kind}`;
      t.textContent = text;
      box.appendChild(t);
      while (box.children.length > 3) box.removeChild(box.firstChild);
      const life = ms || (kind === 'death' ? 5500 : kind === 'wave' ? 4000 : 2200);
      setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 350); }, life);
    }

    /* ------------------------------------------------- eventos del juego */
    handleEvent(type, payload, game) {
      if (game !== this.game) return;
      const au = TD.audio;
      switch (type) {
        case 'build': au.play('build'); this.refreshShop(); break;
        case 'upgrade': au.play('upgrade'); this.refreshTowerPanel(); break;
        case 'sell': au.play('sell'); this.select(null); break;
        case 'shoot': au.play('shoot'); break;
        case 'lob': au.play('lob'); break;
        case 'splash': au.play('splash'); break;
        case 'pounce': au.play('pounce'); break;
        case 'pulse': au.play('pulse'); break;
        case 'kill': au.play('kill'); break;
        case 'summon': au.play('summon'); break;
        case 'bonus': au.play('bonus'); break;
        case 'waveStart': au.play('wave'); if (payload.text) this.toast(payload.text, 'wave'); this.refreshWavePanel(); break;
        case 'waveClear': this.toast(`Oleada ${payload.wave.index + 1} completa: +${payload.bonus} ${game.faction.currency}`, 'small'); this.refreshWavePanel(); break;
        case 'leak': this.onLeak(payload); break;
        case 'victory': this.onVictory(); break;
        case 'defeat': this.onDefeat(); break;
        default: break;
      }
    }

    onLeak({ lost }) {
      TD.audio.play('leak');
      const f = this.campaign.faction;
      const entries = this.campaign.loseLives(lost, this.level.name);
      for (const en of entries) {
        if (en.ninth) continue; // la novena tiene pantalla propia
        this.toast(`${cap(f.livesWord)} ${en.k} de 9 ${f.lostVerb}: «${en.text}»`, 'death');
      }
    }

    onVictory() {
      TD.audio.play('victory');
      const g = this.game;
      this.cancelPlacing();
      const lost = this.livesAtLevelStart - g.lives;
      this.campaign.setLives(g.lives);
      const res = this.campaign.completeLevel(this.level, lost);
      setTimeout(() => { if (this.game === g) this.showResult(res); }, 1300);
    }

    onDefeat() {
      TD.audio.play('defeat');
      const g = this.game;
      this.cancelPlacing(); this.select(null);
      setTimeout(() => { if (this.game === g) this.showWheel(); }, 1800);
    }

    /* ------------------------------------------------------------- bucle */
    loop(ts) {
      requestAnimationFrame((t) => this.loop(t));
      const dt = Math.min(0.05, Math.max(0, (ts - this.lastTs) / 1000) || 0);
      this.lastTs = ts;
      if (!this.game || !this.renderer) return;
      if (!this.screen) for (let i = 0; i < this.speed; i++) this.game.update(dt);
      this.renderer.draw(dt * (this.screen ? 0 : this.speed), { hover: this.hover, placing: this.placing, selected: this.selected });
      this.updateHUD();
    }
  }

  TD.UI = UI;
})();
