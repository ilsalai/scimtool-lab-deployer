/* Nueve Vidas · sprites.
 * Cada especie se describe con colores y rasgos (SPECIES) y se dibuja en dos
 * poses de pixel art: sentada de frente (unidades y retratos) y caminando de
 * perfil (enemigos, con ciclo de cuatro cuadros). También viven aquí los
 * asientos de las unidades, los proyectiles y los objetos del escenario.
 * Todo se genera una vez y queda en caché como pequeños canvas. */
(function () {
  const TD = (globalThis.TD = globalThis.TD || {});
  const { Px, hex, tone, ramp, pack, hash2 } = TD.px;

  const SPECIES = {
    /* gatos */
    tabby:     { kind: 'cat', fur: '#e08a36', fur2: '#a2551a', belly: '#f7e0be', eye: '#7ad04e', pattern: 'tabby', label: 'gato atigrado' },
    black:     { kind: 'cat', fur: '#3a3a47', fur2: '#1f1f28', belly: '#f1f1ee', eye: '#f4cf52', pattern: 'tux', label: 'gato negro' },
    grey:      { kind: 'cat', fur: '#8f99ab', fur2: '#626c82', belly: '#e1e6ef', eye: '#86d6ff', pattern: 'plain', label: 'gato gris' },
    calico:    { kind: 'cat', fur: '#f3ead6', fur2: '#e08a3c', fur3: '#3d3d47', belly: '#fffaf0', eye: '#7ad04e', pattern: 'calico', label: 'gata calicó' },
    lynx:      { kind: 'cat', fur: '#c9a064', fur2: '#7a592e', belly: '#efe2c8', eye: '#f5a93c', pattern: 'spots', tufts: true, size: 1.16, shortTail: true, ruff: true, label: 'lince' },
    white:     { kind: 'cat', fur: '#f0ede6', fur2: '#c9c3b5', belly: '#ffffff', eye: '#62acff', pattern: 'plain', label: 'gato blanco' },
    siamese:   { kind: 'cat', fur: '#efe0c4', fur2: '#4e372b', belly: '#f8efe0', eye: '#62acff', pattern: 'points', size: 0.96, label: 'gato siamés' },
    alley:     { kind: 'cat', fur: '#907e6a', fur2: '#58483a', belly: '#d5c9b8', eye: '#cbdc3c', pattern: 'tabby', size: 0.9, label: 'gato callejero' },
    maine:     { kind: 'cat', fur: '#7a5532', fur2: '#432c19', belly: '#dfc9a9', eye: '#f5a93c', pattern: 'tabby', size: 1.34, fluffy: true, tufts: true, ruff: true, label: 'gato de pelo largo' },
    lynxqueen: { kind: 'cat', fur: '#d6ac62', fur2: '#82602c', belly: '#f4e8d0', eye: '#ffb640', pattern: 'spots', tufts: true, size: 1.55, shortTail: true, ruff: true, crown: true, cape: '#6b2d8b', label: 'reina lince' },
    bandit:    { kind: 'cat', fur: '#6f7480', fur2: '#2a2c36', belly: '#d9dbe2', eye: '#f4cf52', pattern: 'mask', size: 0.94, label: 'gato ratero' },
    /* roedores */
    mouse:     { kind: 'rodent', fur: '#a9a9b3', fur2: '#7c7c88', belly: '#e2e2e8', eye: '#1c1c22', ear: 'round', earSize: 1.25, tail: 'thin', size: 0.86, teeth: true, label: 'ratón' },
    rat:       { kind: 'rodent', fur: '#75645a', fur2: '#4c3e37', belly: '#ae9e90', eye: '#d23a3a', ear: 'round', earSize: 1, tail: 'thin', size: 1.05, teeth: true, label: 'rata' },
    squirrel:  { kind: 'rodent', fur: '#bb582a', fur2: '#833818', belly: '#f6e0c8', eye: '#1c1c22', ear: 'tuft', tail: 'bushy', size: 0.96, teeth: true, label: 'ardilla' },
    mole:      { kind: 'rodent', fur: '#4a3f52', fur2: '#2d2634', belly: '#665a6f', eye: '#111116', ear: 'none', tail: 'stub', size: 1.0, nose: '#f2a0b0', claws: true, label: 'topo' },
    capybara:  { kind: 'rodent', fur: '#916e47', fur2: '#5d452e', belly: '#bb9d76', eye: '#1c1c22', ear: 'small', tail: 'none', size: 1.5, blunt: true, label: 'capibara' },
    ratking:   { kind: 'rodent', fur: '#544850', fur2: '#2f282e', belly: '#8e8289', eye: '#ff4040', ear: 'round', earSize: 1, tail: 'thin', size: 1.5, crown: true, cape: '#8b1e2d', teeth: true, label: 'rey rata' },
    porcupine: { kind: 'rodent', fur: '#614f3d', fur2: '#30261b', belly: '#93806b', eye: '#1c1c22', ear: 'small', tail: 'stub', size: 1.1, quills: true, label: 'puercoespín' },
    marmot:    { kind: 'rodent', fur: '#ad8a5b', fur2: '#75573a', belly: '#dec7a2', eye: '#1c1c22', ear: 'small', tail: 'stub', size: 1.16, chubby: true, teeth: true, label: 'marmota' },
    hamster:   { kind: 'rodent', fur: '#ebb372', fur2: '#c08543', belly: '#fff3e0', eye: '#1c1c22', ear: 'round', earSize: 0.85, tail: 'none', size: 0.96, cheeks: true, label: 'hámster' },
    jerboa:    { kind: 'rodent', fur: '#dcb978', fur2: '#a3844a', belly: '#fff7e4', eye: '#1c1c22', ear: 'tall', tail: 'tuft', size: 0.9, label: 'jerbo' },
    chipmunk:  { kind: 'rodent', fur: '#c98a4a', fur2: '#4a2f1c', belly: '#f8ead2', eye: '#1c1c22', ear: 'round', earSize: 0.8, tail: 'bushy', size: 0.9, stripes: true, teeth: true, label: 'ardilla listada' },
  };
  // Los ladrones tienen una variante "con botín": el mismo animal con un saco a cuestas.
  SPECIES.bandit_loot = { ...SPECIES.bandit, sack: true };
  SPECIES.chipmunk_loot = { ...SPECIES.chipmunk, sack: true };

  const PINK = hex('#f0a9b4'), PINK2 = hex('#d68c99'), DARK = hex('#17131c'), WHITE = hex('#ffffff'), GOLD = hex('#f1c74c');
  const FLESH = '#d9aa9f', TAIL = hex('#cf9590'), TAIL2 = hex('#b47d7c');
  const WHISKER = pack(255, 255, 255, 150);

  /** Cola fina de roedor: una línea de un píxel por detrás del cuerpo, sin contorno. */
  function thinTail(p, x0, y0, cx, cy, x1, y1) {
    const n = Math.ceil((Math.abs(x1 - x0) + Math.abs(y1 - y0) + Math.abs(cx - x0)) * 1.5);
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      const x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
      p.under(x, y, TAIL); p.under(x, y + 1, TAIL2);
    }
  }

  /* ------------------------------------------------ sentado, de frente */
  /** f: { sway: -1|0|1, blink, attack, mouth } */
  function sit(look, f = {}) {
    const sp = SPECIES[look] || SPECIES.tabby;
    return sp.kind === 'cat' ? sitCat(sp, f) : sitRodent(sp, f);
  }

  function eyes(p, cx, y, gap, sp, blink, cat) {
    const iris = hex(sp.eye), big = cat && (sp.size || 1) >= 0.94;
    for (const s of [-1, 1]) {
      // columnas del ojo, de afuera hacia adentro (el eje de simetría pasa entre -1 y 0)
      const cols = s < 0
        ? (big ? [cx - gap - 2, cx - gap - 1, cx - gap] : [cx - gap - 1, cx - gap])
        : (big ? [cx + gap + 1, cx + gap, cx + gap - 1] : [cx + gap, cx + gap - 1]);
      const leftmost = s < 0 ? cols[0] : cols[cols.length - 1];
      if (blink) { for (const x of cols) p.set(x, y + 1, DARK); continue; }
      if (big) {
        // 3x3: iris con pupila vertical al centro y un brillo arriba a la izquierda
        for (let r = 0; r < 3; r++) for (const x of cols) p.set(x, y + r, r === 2 ? tone(iris, -0.25) : iris);
        for (let r = 0; r < 3; r++) p.set(cols[1], y + r, DARK);
        p.set(leftmost, y, WHITE);
      } else if (cat) {
        p.set(cols[0], y, iris); p.set(cols[0], y + 1, iris); p.set(cols[0], y + 2, tone(iris, -0.3));
        p.set(cols[1], y, DARK); p.set(cols[1], y + 1, DARK); p.set(cols[1], y + 2, DARK);
        p.set(leftmost, y, WHITE);
      } else {
        for (const x of cols) { p.set(x, y, iris); p.set(x, y + 1, iris); }
        p.set(leftmost, y, WHITE);
      }
    }
  }

  function crown(p, cx, y, w) {
    p.rect(cx - w, y - 2, w * 2, 3, GOLD);
    for (const dx of [-w, -1, w - 1]) { p.set(cx + dx, y - 3, GOLD); p.set(cx + dx, y - 4, GOLD); }
    p.set(cx, y - 3, GOLD); p.set(cx - 1, y - 5, tone(GOLD, 0.4)); p.set(cx - w, y - 5, tone(GOLD, 0.4)); p.set(cx + w - 1, y - 5, tone(GOLD, 0.4));
    p.set(cx - 1, y - 1, hex('#e5484d')); p.set(cx + 2, y - 1, hex('#4fa3e0')); p.set(cx - 4, y - 1, hex('#4fa3e0'));
    p.rect(cx - w, y, w * 2, 1, tone(GOLD, -0.35));
  }

  function sitCat(sp, f) {
    const k = sp.size || 1, R = Math.round;
    const p = new Px(72, 80).origin(36, 70);
    const fur = ramp(hex(sp.fur)), dark = hex(sp.fur2), darkR = ramp(dark), belly = ramp(hex(sp.belly));
    const pts = sp.pattern === 'points' || sp.pattern === 'mask';
    const atk = f.attack ? 1 : 0, sway = f.sway || 0;
    const by = -7 * k, hy = R(-15.5 * k) + atk, hx = 0;
    const tailCol = sp.pattern === 'points' ? darkR : fur;

    if (sp.cape) {
      const cape = ramp(hex(sp.cape));
      p.poly([[-7 * k, -13 * k], [7 * k, -13 * k], [11 * k + sway, 0], [-11 * k + sway, 0]], cape.m);
      p.poly([[-11 * k + sway, -2], [11 * k + sway, -2], [11 * k + sway, 0], [-11 * k + sway, 0]], GOLD);
    }
    // cola
    if (sp.shortTail) p.ellipse(7.5 * k, -3 * k, 2.4 * k, 2.4 * k, tailCol);
    else {
      const w = sp.fluffy ? 1.6 : 1;
      p.curve(5.5 * k, -3 * k, 13 * k + sway * 1.5, -2 * k, 11.5 * k + sway * 2.5, -13 * k, 2.0 * k * w, 1.6 * k * w, tailCol);
      if (sp.pattern === 'tabby') {
        for (const t of [0.5, 0.75]) {
          const u = 1 - t, x = u * u * 5.5 * k + 2 * u * t * (13 * k + sway * 1.5) + t * t * (11.5 * k + sway * 2.5), y = u * u * -3 * k + 2 * u * t * -2 * k + t * t * -13 * k;
          p.ellipse(x, y, 2.4 * k * w, 1.1, dark, { over: true });
        }
      }
      if (sp.pattern === 'calico') p.ellipse(11.5 * k + sway * 2.5, -12 * k, 2 * k, 2.4 * k, hex(sp.fur2), { over: true });
    }
    // cuerpo
    p.ellipse(0, by, 7 * k * (sp.fluffy ? 1.14 : 1), 7 * k, fur);
    if (sp.fluffy) { p.ellipse(-6.5 * k, by + 1, 2.6 * k, 5 * k, fur); p.ellipse(6.5 * k, by + 1, 2.6 * k, 5 * k, fur); }
    if (sp.pattern === 'tabby') {
      for (const s of [-1, 1]) { p.line(s * 6 * k, by - 3 * k, s * 4 * k, by - 1 * k, dark, true); p.line(s * 6.4 * k, by, s * 4.4 * k, by + 2 * k, dark, true); p.line(s * 6 * k, by + 3 * k, s * 4.4 * k, by + 4.6 * k, dark, true); }
    }
    if (sp.pattern === 'calico') { p.ellipse(4.5 * k, by - 2.5 * k, 3.4 * k, 3 * k, hex(sp.fur2), { over: true }); p.ellipse(-4.6 * k, by + 2.5 * k, 2.8 * k, 2.6 * k, hex(sp.fur3), { over: true }); }
    if (sp.pattern === 'spots') { for (const [x, y] of [[-5, -3], [5, -2.5], [-5.5, 1.5], [5.5, 2], [-3.6, 4.5], [4, 5]]) p.over(x * k, by + y * k, dark); }
    // pecho
    p.ellipse(0, by + 1.6 * k, 3.7 * k, 4.9 * k, belly, { hi: 0.7 });
    if (sp.ruff) p.poly([[-4 * k, by - 4.5 * k], [4 * k, by - 4.5 * k], [0, by - 0.5 * k]], belly.l1, true);
    // patas delanteras
    const paw = sp.pattern === 'tux' ? belly : pts ? darkR : fur;
    p.ellipse(-3 * k, -1.4, 2.3 * k, 1.7, paw, { sep: true }); p.ellipse(3 * k, -1.4, 2.3 * k, 1.7, paw, { sep: true });
    // orejas
    const earCol = pts ? dark : fur.m, earD = pts ? tone(dark, -0.2) : fur.d1;
    for (const s of [-1, 1]) {
      p.poly([[s * 7 * k + hx, hy - 1.5 * k], [s * 5.6 * k + hx, hy - 9.6 * k], [s * 1.2 * k + hx, hy - 4 * k]], earCol);
      p.poly([[s * 5.9 * k + hx, hy - 3.6 * k], [s * 5.3 * k + hx, hy - 7.6 * k], [s * 3 * k + hx, hy - 4.6 * k]], s < 0 ? PINK : PINK2);
      p.set(R(s * 5.6 * k + hx - (s > 0 ? 1 : 0)), R(hy - 9.6 * k), earD);
      if (sp.tufts) { p.line(s * 5.6 * k + hx - (s > 0 ? 1 : 0), hy - 9.6 * k, s * 6.6 * k + hx - (s > 0 ? 1 : 0), hy - 12.4 * k, dark); }
    }
    // cabeza
    p.ellipse(hx, hy, 7 * k, 6 * k, fur, { sep: true });
    if (sp.ruff) for (const s of [-1, 1]) p.poly([[s * 6 * k, hy + 0.5 * k], [s * 9.6 * k, hy + 3.4 * k], [s * 5 * k, hy + 4.6 * k]], belly.m);
    if (sp.pattern === 'tabby') {
      p.line(-2, hy - 5 * k, -2, hy - 3.2 * k, dark, true); p.line(1, hy - 5 * k, 1, hy - 3.2 * k, dark, true);
      p.line(-1, hy - 5.6 * k, -1, hy - 4 * k, dark, true); p.line(0, hy - 5.6 * k, 0, hy - 4 * k, dark, true);
      for (const s of [-1, 1]) { p.line(s * 6.6 * k, hy + 0.5 * k, s * 5 * k, hy + 1 * k, dark, true); p.line(s * 6.4 * k, hy + 2.4 * k, s * 5 * k, hy + 2.4 * k, dark, true); }
    }
    if (sp.pattern === 'calico') p.ellipse(-3.6 * k, hy - 2.6 * k, 4 * k, 3.6 * k, hex(sp.fur2), { over: true });
    if (sp.pattern === 'points') p.ellipse(hx, hy + 1.4 * k, 4.6 * k, 4 * k, darkR, { over: true, hi: 0.8 });
    if (sp.pattern === 'mask') p.ellipse(hx, hy - 0.6 * k, 6.6 * k, 2.2 * k, dark, { over: true });
    if (sp.pattern === 'spots') { p.over(-4 * k, hy - 3.6 * k, dark); p.over(3.6 * k, hy - 3.6 * k, dark); p.over(-1, hy - 5 * k, dark); p.over(0, hy - 5 * k, dark); }
    // hocico, nariz y boca
    const mz = sp.pattern === 'points' ? tone(dark, 0.25) : belly.l1;
    p.ellipse(hx, hy + 2.7 * k, 3 * k, 2 * k, mz, { over: true });
    const ny = R(hy + 1.3 * k);
    p.set(hx - 1, ny, PINK); p.set(hx, ny, PINK);
    p.set(hx - 1, ny + 1, DARK); p.set(hx, ny + 1, DARK);
    if (f.mouth) { p.rect(hx - 2, ny + 2, 4, 2, hex('#7a1f2e')); p.rect(hx - 1, ny + 3, 2, 1, PINK); }
    eyes(p, hx, R(hy - 1.6 * k), Math.max(2, R(2.6 * k)), sp, f.blink, true);
    if (sp.crown) crown(p, hx, R(hy - 5.6 * k), R(3.4 * k));
    if (sp.sack) { const sack = ramp(hex('#b89a6a')); p.ellipse(-8.5 * k, by + 1, 3.6 * k, 4.4 * k, sack); p.rect(R(-9.5 * k), R(by - 4.4 * k), 2, 2, tone(sack.m, -0.4)); }
    p.outline();
    for (const s of [-1, 1]) {
      const wx = s < 0 ? R(-7 * k) - 1 : R(7 * k);
      p.set(wx, ny, WHISKER); p.set(wx + s, ny - 1, WHISKER); p.set(wx + s * 2, ny - 1, WHISKER);
      p.set(wx, ny + 2, WHISKER); p.set(wx + s, ny + 2, WHISKER); p.set(wx + s * 2, ny + 3, WHISKER);
    }
    return p;
  }

  function sitRodent(sp, f) {
    const k = sp.size || 1, R = Math.round;
    const p = new Px(72, 80).origin(36, 70);
    const fur = ramp(hex(sp.fur)), dark = hex(sp.fur2), belly = ramp(hex(sp.belly));
    const atk = f.attack ? 1 : 0, sway = f.sway || 0;
    const bw = sp.chubby ? 7.2 : sp.blunt ? 7.6 : 6.2;
    const by = -6.5 * k, hy = R(-14 * k) + atk;
    const flesh = ramp(hex(FLESH));

    if (sp.cape) {
      const cape = ramp(hex(sp.cape));
      p.poly([[-6.5 * k, -12 * k], [6.5 * k, -12 * k], [10.5 * k + sway, 0], [-10.5 * k + sway, 0]], cape.m);
      p.poly([[-10.5 * k + sway, -2], [10.5 * k + sway, -2], [10.5 * k + sway, 0], [-10.5 * k + sway, 0]], GOLD);
    }
    // cola
    if (sp.tail === 'bushy') {
      p.ellipse(8.5 * k, -5 * k, 3.6 * k, 4.4 * k, fur);
      p.ellipse(10.5 * k + sway, -11.5 * k, 4.2 * k, 5 * k, fur);
      p.ellipse(8.5 * k + sway * 1.5, -18.5 * k, 4 * k, 4.4 * k, fur);
      p.ellipse(9 * k + sway * 1.5, -18 * k, 2 * k, 2.6 * k, belly.m, { over: true });
      p.ellipse(10.6 * k + sway, -11 * k, 1.6 * k, 3 * k, sp.stripes ? dark : belly.m, { over: true });
    } else if (sp.tail === 'tuft') {
      p.ellipse(13 * k + sway * 2, -14 * k, 1.8, 2.2, dark);
    } else if (sp.tail === 'stub') {
      p.ellipse(6.4 * k, -3 * k, 1.8 * k, 1.8 * k, fur);
    }
    // púas: un abanico alrededor de toda la silueta
    if (sp.quills) {
      const cream = hex('#e6d9be'), cy = -11 * k;
      for (let i = 0; i < 19; i++) {
        const a = Math.PI * 0.92 + (i / 18) * Math.PI * 1.16, len = (13.5 + (i % 3) * 1.8) * k;
        const c = i % 2 ? dark : cream, ca = Math.cos(a), sa = Math.sin(a);
        p.line(ca * 4 * k, cy + sa * 4 * k, ca * len, cy + sa * len, c);
        p.line(ca * 4 * k + 1, cy + sa * 4 * k, ca * (len - 3) + 1, cy + sa * (len - 3), c);
      }
    }
    // cuerpo
    p.ellipse(0, by, bw * k, 6.5 * k, fur);
    if (sp.stripes) { for (const s of [-1, 1]) { p.line(s * 4.6 * k, by - 4 * k, s * 5.6 * k, by + 3 * k, dark, true); p.line(s * 3.4 * k, by - 5 * k, s * 4.4 * k, by + 1 * k, belly.m, true); } }
    p.ellipse(0, by + 1.4 * k, 3.6 * k, 4.6 * k, belly, { hi: 0.7 });
    // pies
    p.ellipse(-3.2 * k, -1, 2 * k, 1.2, flesh, { sep: true }); p.ellipse(3.2 * k, -1, 2 * k, 1.2, flesh, { sep: true });
    // garras de topo
    if (sp.claws) { const cl = ramp(hex('#e3b3b0')); p.ellipse(-6.2 * k, by + 1.6, 2 * k, 2.6 * k, cl, { sep: true }); p.ellipse(6.2 * k, by + 1.6, 2 * k, 2.6 * k, cl, { sep: true }); }
    // orejas
    if (sp.ear === 'round') {
      const er = 3 * k * (sp.earSize || 1);
      for (const s of [-1, 1]) { p.ellipse(s * 5.6 * k, hy - 4.6 * k, er, er, fur); p.ellipse(s * 5.6 * k, hy - 4.4 * k, er * 0.55, er * 0.6, PINK, { over: true }); }
    } else if (sp.ear === 'tall') {
      for (const s of [-1, 1]) { p.ellipse(s * 4.4 * k, hy - 8 * k, 2.2 * k, 5 * k, fur); p.ellipse(s * 4.4 * k, hy - 7.6 * k, 1 * k, 3.6 * k, PINK, { over: true }); }
    } else if (sp.ear === 'small') {
      for (const s of [-1, 1]) p.ellipse(s * 4.8 * k, hy - 4.4 * k, 1.7 * k, 1.7 * k, fur.d1);
    } else if (sp.ear === 'tuft') {
      for (const s of [-1, 1]) {
        p.poly([[s * 6 * k, hy - 2.5 * k], [s * 5 * k, hy - 9 * k], [s * 1.6 * k, hy - 4 * k]], fur.m);
        p.poly([[s * 5.2 * k, hy - 4 * k], [s * 4.8 * k, hy - 7 * k], [s * 3 * k, hy - 4.6 * k]], PINK);
        p.line(s * 5 * k - (s > 0 ? 1 : 0), hy - 9 * k, s * 5.6 * k - (s > 0 ? 1 : 0), hy - 11 * k, dark);
      }
    }
    // cabeza
    p.ellipse(0, hy, (sp.blunt ? 6.4 : 6) * k, (sp.blunt ? 5.4 : 5) * k, fur, { sep: true });
    if (sp.chubby) p.ellipse(0, hy - 2.6 * k, 5 * k, 2.4 * k, dark, { over: true });
    if (sp.stripes) { for (const s of [-1, 1]) { p.line(s * 5.4 * k, hy - 1 * k, s * 2 * k, hy - 3.6 * k, dark, true); p.line(s * 5.6 * k, hy + 0.2 * k, s * 2.4 * k, hy - 2.4 * k, belly.m, true); } }
    if (sp.cheeks) { p.ellipse(-5 * k, hy + 2 * k, 3 * k, 2.6 * k, belly, { sep: true }); p.ellipse(5 * k, hy + 2 * k, 3 * k, 2.6 * k, belly, { sep: true }); }
    // hocico
    if (sp.blunt) { p.ellipse(0, hy + 2.6 * k, 4.4 * k, 2.8 * k, fur, { sep: true }); p.rect(-2, R(hy + 2 * k), 4, 2, dark); }
    else {
      p.ellipse(0, hy + 2.6 * k, 2.8 * k, 2.2 * k, belly.m, { over: true });
      const ny = R(hy + 1.6 * k), nose = hex(sp.nose || '#eb8a9a');
      p.set(-1, ny, nose); p.set(0, ny, nose);
      if (sp.claws) p.rect(-2, ny - 1, 4, 2, nose);
      if (sp.teeth) { p.set(-1, ny + 2, WHITE); p.set(0, ny + 2, WHITE); p.set(-1, ny + 1, DARK); p.set(0, ny + 1, DARK); }
      else { p.set(-1, ny + 1, DARK); p.set(0, ny + 1, DARK); }
      if (f.mouth) { p.rect(-2, ny + 1, 4, 3, hex('#7a1f2e')); p.set(-1, ny + 1, WHITE); p.set(0, ny + 1, WHITE); }
    }
    if (sp.claws) { p.set(-3, R(hy - 1 * k), DARK); p.set(2, R(hy - 1 * k), DARK); }
    else eyes(p, 0, R(hy - 1.6 * k), Math.max(2, R(2.8 * k)), sp, f.blink, false);
    // manitas al pecho
    if (!sp.claws && !sp.quills) { const hyy = R(by - 1 * k); p.set(-2, hyy, flesh.m); p.set(-3, hyy, flesh.d1); p.set(1, hyy, flesh.m); p.set(2, hyy, flesh.d1); }
    if (sp.crown) crown(p, 0, R(hy - 4.6 * k), R(3 * k));
    if (sp.sack) { const sack = ramp(hex('#b89a6a')); p.ellipse(-8 * k, by + 1, 3.4 * k, 4.2 * k, sack); p.rect(R(-9 * k), R(by - 4.2 * k), 2, 2, tone(sack.m, -0.4)); }
    p.outline();
    if (sp.tail === 'thin') thinTail(p, 5 * k, -2 * k, 13 * k + sway, -1 * k, 13 * k + sway * 2, -9 * k);
    if (sp.tail === 'tuft') thinTail(p, 5 * k, -2 * k, 13 * k + sway, -2 * k, 13 * k + sway * 2, -13 * k);
    const wy = R(hy + 2 * k);
    for (const s of [-1, 1]) {
      const wx = s < 0 ? R(-6 * k) - 1 : R(6 * k);
      p.set(wx, wy, WHISKER); p.set(wx + s, wy - 1, WHISKER); p.set(wx, wy + 2, WHISKER); p.set(wx + s, wy + 2, WHISKER);
    }
    return p;
  }

  /* --------------------------------------------- caminando, de perfil */
  /** frame: 0..3 (ciclo de pasos). Mira hacia la derecha; el renderizador lo voltea. */
  function walk(look, frame = 0) {
    const sp = SPECIES[look] || SPECIES.mouse;
    return sp.kind === 'cat' ? walkCat(sp, frame) : walkRodent(sp, frame);
  }

  // Desplazamiento de cada pata por cuadro: [delantera cercana, trasera cercana, delantera lejana, trasera lejana]
  const GAIT = [[2, -2, -2, 2], [0, 0, 0, 0], [-2, 2, 2, -2], [0, 0, 0, 0]];

  function walkCat(sp, fr) {
    const k = sp.size || 1, R = Math.round;
    const p = new Px(96, 72).origin(48, 62);
    const fur = ramp(hex(sp.fur)), dark = hex(sp.fur2), darkR = ramp(dark), belly = ramp(hex(sp.belly));
    const pts = sp.pattern === 'points';
    const g = GAIT[fr], bob = fr % 2 ? 1 : 0, wag = fr < 2 ? -1 : 1;
    const legH = 4.6 * k, by = -legH - 4 * k + bob;             // centro del cuerpo
    const bl = 8.2 * k, bh = (sp.fluffy ? 5.6 : 4.6) * k;
    const hx = 8.6 * k, hy = by - 3.6 * k;
    const legNear = sp.pattern === 'tux' ? belly : pts ? darkR : fur;
    const legFar = ramp(pts ? tone(dark, -0.2) : fur.d2);
    const tailCol = pts ? darkR : fur;

    if (sp.cape) {
      const cape = ramp(hex(sp.cape));
      p.poly([[4 * k, by - bh - 1], [-9 * k, by - bh], [-15 * k - wag, by + bh + 2], [-2 * k, by + bh]], cape.m);
      p.poly([[-15 * k - wag, by + bh], [-2 * k, by + bh - 1], [-2 * k, by + bh + 1], [-15 * k - wag, by + bh + 2]], GOLD);
    }
    // patas lejanas
    p.rect(R(4.6 * k + g[2]), R(by + 1), Math.max(2, R(1.9 * k)), R(-by - 1), legFar.m);
    p.rect(R(-6 * k + g[3]), R(by + 1), Math.max(2, R(1.9 * k)), R(-by - 1), legFar.m);
    // cola
    if (sp.shortTail) p.ellipse(-bl - 0.5 * k, by - 1.5 * k, 2.2 * k, 2 * k, tailCol);
    else {
      const w = sp.fluffy ? 1.7 : 1;
      p.curve(-bl + 1, by - 1 * k, -bl - 5 * k, by - 2 * k + wag, -bl - 5.5 * k, by - 9 * k - wag, 1.7 * k * w, 1.2 * k * w, tailCol);
      if (sp.pattern === 'tabby' || sp.pattern === 'mask') { p.ellipse(-bl - 4.4 * k, by - 3.4 * k, 2.2 * k * w, 1, dark, { over: true }); p.ellipse(-bl - 5.4 * k, by - 6.6 * k - wag, 2 * k * w, 1, dark, { over: true }); }
    }
    // cuerpo
    p.ellipse(0, by, bl, bh, fur);
    if (sp.fluffy) p.ellipse(-1 * k, by + 1.4 * k, bl * 0.9, bh * 0.9, fur);
    if (sp.pattern === 'tabby') for (const x of [-5, -2, 1, 4]) p.line(x * k, by - bh, x * k + 1, by - 0.5 * k, dark, true);
    if (sp.pattern === 'mask') for (const x of [-4, -1, 2]) p.line(x * k, by - bh, x * k, by - 1.5 * k, dark, true);
    if (sp.pattern === 'spots') for (const [x, y] of [[-5, -2], [-2, -3], [1, -2], [4, -3], [-3.6, 0], [2.4, 0.4], [-6, 1]]) p.over(x * k, by + y * k, dark);
    if (sp.pattern === 'calico') { p.ellipse(-3.6 * k, by - 1.6 * k, 3.4 * k, 2.6 * k, hex(sp.fur2), { over: true }); p.ellipse(3 * k, by - 0.6 * k, 2.6 * k, 2.4 * k, hex(sp.fur3), { over: true }); }
    if (sp.pattern === 'tux' || sp.pattern === 'plain' || sp.pattern === 'tabby' || sp.pattern === 'calico') p.ellipse(1 * k, by + bh * 0.72, bl * 0.72, bh * 0.36, belly.m, { over: true });
    // patas cercanas
    const lw = Math.max(2, R(2.1 * k));
    p.rect(R(5.2 * k + g[0]), R(by + 1), lw, R(-by - 1), legNear.m); p.rect(R(5.2 * k + g[0]), -2, lw + 1, 2, legNear.l1);
    p.rect(R(-5.2 * k + g[1]), R(by + 1), lw, R(-by - 1), legNear.m); p.rect(R(-5.2 * k + g[1]), -2, lw + 1, 2, legNear.l1);
    // orejas
    const earCol = pts ? dark : fur.m;
    p.poly([[hx + 0.6 * k, hy - 2.6 * k], [hx + 2.6 * k, hy - 7.6 * k], [hx + 4 * k, hy - 2.4 * k]], pts ? tone(dark, -0.2) : fur.d1);
    // cabeza
    p.ellipse(hx, hy, 4.9 * k, 4.3 * k, fur, { sep: true });
    p.poly([[hx - 3.4 * k, hy - 2 * k], [hx - 1.6 * k, hy - 7.8 * k], [hx + 1.4 * k, hy - 3 * k]], earCol);
    p.poly([[hx - 2.2 * k, hy - 3 * k], [hx - 1.5 * k, hy - 6 * k], [hx + 0.2 * k, hy - 3.4 * k]], PINK);
    if (sp.tufts) p.line(hx - 1.6 * k, hy - 7.8 * k, hx - 2.4 * k, hy - 10 * k, dark);
    if (sp.ruff) p.poly([[hx - 2 * k, hy + 1 * k], [hx - 1 * k, hy + 5.6 * k], [hx + 2 * k, hy + 3 * k]], belly.m);
    if (sp.pattern === 'tabby') { p.line(hx - 1 * k, hy - 3.6 * k, hx + 0.6 * k, hy - 2.4 * k, dark, true); p.line(hx - 2.6 * k, hy + 0.6 * k, hx - 1 * k, hy + 0.6 * k, dark, true); }
    if (pts) p.ellipse(hx + 2.4 * k, hy + 0.8 * k, 3 * k, 3 * k, darkR, { over: true, hi: 0.8 });
    if (sp.pattern === 'mask') p.ellipse(hx + 1.6 * k, hy - 0.8 * k, 3.6 * k, 1.6 * k, dark, { over: true });
    if (sp.pattern === 'calico') p.ellipse(hx - 1 * k, hy - 2 * k, 2.6 * k, 2.2 * k, hex(sp.fur2), { over: true });
    // hocico, nariz, ojo
    if (!pts) p.ellipse(hx + 3.4 * k, hy + 1.6 * k, 2 * k, 1.6 * k, belly.l1, { over: true });
    p.set(R(hx + 4.9 * k) - 1, R(hy + 0.8 * k), PINK);
    const ex = R(hx + 1.8 * k), ey = R(hy - 1.2 * k);
    p.set(ex, ey, hex(sp.eye)); p.set(ex + 1, ey, DARK); p.set(ex, ey + 1, tone(hex(sp.eye), -0.2)); p.set(ex + 1, ey + 1, DARK);
    if (sp.crown) crown(p, R(hx), R(hy - 4 * k), R(2.6 * k));
    if (sp.sack) { const sack = ramp(hex('#b89a6a')); p.ellipse(-2 * k, by - bh - 2 * k, 4 * k, 3.4 * k, sack, { sep: true }); p.rect(R(-1 * k), R(by - bh - 5.6 * k), 2, 2, tone(sack.m, -0.4)); }
    p.outline();
    const wx = R(hx + 4.9 * k), wy = R(hy + 1.6 * k);
    p.set(wx + 1, wy, WHISKER); p.set(wx + 2, wy - 1, WHISKER); p.set(wx + 1, wy + 1, WHISKER); p.set(wx + 2, wy + 2, WHISKER);
    return p;
  }

  function walkRodent(sp, fr) {
    const k = sp.size || 1, R = Math.round;
    const p = new Px(96, 72).origin(48, 62);
    const fur = ramp(hex(sp.fur)), dark = hex(sp.fur2), belly = ramp(hex(sp.belly));
    const flesh = ramp(hex(FLESH));
    const g = GAIT[fr], bob = fr % 2 ? 1 : 0, wag = fr < 2 ? -1 : 1;
    const legH = (sp.blunt ? 3.4 : 2.4) * k;
    const bl = (sp.blunt ? 8 : sp.chubby ? 7 : 6.4) * k, bh = (sp.blunt ? 5 : sp.chubby ? 4.6 : 4) * k;
    const by = -legH - bh + 1 + bob;
    const hx = bl * 0.92, hy = by - (sp.blunt ? 1.6 : 0.4) * k;
    const farLeg = fur.d2;

    if (sp.cape) {
      const cape = ramp(hex(sp.cape));
      p.poly([[3 * k, by - bh - 1], [-7 * k, by - bh], [-13 * k - wag, by + bh + 1], [-2 * k, by + bh - 1]], cape.m);
      p.poly([[-13 * k - wag, by + bh - 1], [-2 * k, by + bh - 2], [-2 * k, by + bh], [-13 * k - wag, by + bh + 1]], GOLD);
    }
    // patas lejanas
    const lw = Math.max(2, R(1.7 * k));
    p.rect(R(3.6 * k + g[2]), R(by + bh - 2), lw, R(-(by + bh - 2)), farLeg);
    p.rect(R(-4.6 * k + g[3]), R(by + bh - 2), lw, R(-(by + bh - 2)), farLeg);
    // cola
    if (sp.tail === 'bushy') {
      p.ellipse(-bl - 1 * k, by - 2 * k, 3.4 * k, 3.6 * k, fur);
      p.ellipse(-bl - 2.6 * k + wag * 0.5, by - 7.6 * k, 3.8 * k, 4.4 * k, fur);
      p.ellipse(-bl + 0.6 * k + wag, by - 12.4 * k, 3.6 * k, 3.4 * k, fur);
      p.ellipse(-bl - 2.4 * k + wag * 0.5, by - 7.4 * k, 1.4 * k, 3 * k, sp.stripes ? dark : belly.m, { over: true });
      p.ellipse(-bl + 0.8 * k + wag, by - 12 * k, 1.6 * k, 1.6 * k, belly.m, { over: true });
    } else if (sp.tail === 'tuft') {
      p.ellipse(-bl - 9 * k, by - 7 * k - wag, 1.8, 2.2, dark);
    } else if (sp.tail === 'stub') {
      p.ellipse(-bl, by, 1.8 * k, 1.6 * k, fur);
    }
    // púas
    if (sp.quills) {
      const cream = hex('#e6d9be');
      for (let i = 0; i < 13; i++) {
        const a = Math.PI * 0.72 + (i / 12) * Math.PI * 0.9, len = (9 + (i % 3) * 1.4) * k;
        p.line(Math.cos(a) * 4 * k - 1 * k, by - 1 * k + Math.sin(a) * -3 * k, Math.cos(a) * len - 1 * k, by - 1 * k - Math.abs(Math.sin(a)) * len * 0.9, i % 2 ? dark : cream);
      }
    }
    // cuerpo
    p.ellipse(0, by, bl, bh, fur);
    if (sp.stripes) { p.line(-bl * 0.7, by - bh * 0.45, bl * 0.5, by - bh * 0.55, dark, true); p.line(-bl * 0.7, by - bh * 0.2, bl * 0.5, by - bh * 0.3, belly.m, true); p.line(-bl * 0.7, by + 0.5, bl * 0.4, by, dark, true); }
    p.ellipse(0.6 * k, by + bh * 0.7, bl * 0.7, bh * 0.36, belly.m, { over: true });
    if (sp.chubby) p.ellipse(-1 * k, by - bh * 0.5, bl * 0.7, bh * 0.4, dark, { over: true });
    // patas cercanas
    p.rect(R(4.2 * k + g[0]), R(by + bh - 2), lw, R(-(by + bh - 2)), fur.d1); p.rect(R(4.2 * k + g[0]), -1, lw + 1, 1, flesh.m);
    p.rect(R(-4 * k + g[1]), R(by + bh - 2), lw, R(-(by + bh - 2)), fur.d1); p.rect(R(-4 * k + g[1]), -1, lw + 1, 1, flesh.m);
    // cabeza
    if (sp.blunt) {
      p.ellipse(hx, hy, 5.2 * k, 4.2 * k, fur, { sep: true });
      p.rect(R(hx + 3.4 * k), R(hy - 1.6 * k), R(2 * k), R(4 * k), fur.m);
      p.rect(R(hx + 4.4 * k), R(hy), 2, 2, dark);
    } else {
      p.ellipse(hx, hy, 4.2 * k, 3.5 * k, fur, { sep: true });
      p.poly([[hx + 2.6 * k, hy - 1.8 * k], [hx + 6.2 * k, hy + 0.6 * k], [hx + 2.6 * k, hy + 2.6 * k]], fur.m);
      p.ellipse(hx + 3.6 * k, hy + 1.8 * k, 2 * k, 1.2 * k, belly.m, { over: true });
    }
    if (sp.cheeks) p.ellipse(hx + 0.6 * k, hy + 1.8 * k, 2.8 * k, 2.2 * k, belly, { sep: true });
    if (sp.stripes) { p.line(hx - 2 * k, hy - 2 * k, hx + 3 * k, hy - 0.6 * k, dark, true); p.line(hx - 2 * k, hy - 1 * k, hx + 3 * k, hy + 0.4 * k, belly.m, true); }
    // oreja
    if (sp.ear === 'round') { const er = 2.6 * k * (sp.earSize || 1); p.ellipse(hx - 1.6 * k, hy - 3.4 * k, er, er, fur, { sep: true }); p.ellipse(hx - 1.4 * k, hy - 3.2 * k, er * 0.5, er * 0.55, PINK, { over: true }); }
    else if (sp.ear === 'tall') { p.ellipse(hx - 1.6 * k, hy - 6 * k, 1.8 * k, 4.4 * k, fur, { sep: true }); p.ellipse(hx - 1.4 * k, hy - 5.6 * k, 0.8 * k, 3 * k, PINK, { over: true }); }
    else if (sp.ear === 'small') p.ellipse(hx - 1.6 * k, hy - 3.2 * k, 1.4 * k, 1.4 * k, fur.d1, { sep: true });
    else if (sp.ear === 'tuft') { p.poly([[hx - 3 * k, hy - 2 * k], [hx - 1.4 * k, hy - 7 * k], [hx + 0.6 * k, hy - 2.6 * k]], fur.m); p.line(hx - 1.4 * k, hy - 7 * k, hx - 2 * k, hy - 8.6 * k, dark); }
    // nariz, ojo, dientes, garras
    const tipX = R(hx + (sp.blunt ? 5.2 : 6.2) * k) - 1;
    if (!sp.blunt) p.set(tipX, R(hy + 0.6 * k), hex(sp.nose || '#eb8a9a'));
    if (sp.claws) { p.rect(tipX - 1, R(hy), 2, 2, hex(sp.nose)); const cl = ramp(hex('#e3b3b0')); p.ellipse(hx + 2.4 * k + g[0] * 0.5, -1.4, 2.6 * k, 1.5, cl, { sep: true }); }
    const ex = R(hx + 1 * k), ey = R(hy - 1 * k);
    if (sp.claws) p.set(ex, ey, DARK);
    else { p.set(ex, ey, hex(sp.eye)); p.set(ex + 1, ey, hex(sp.eye)); p.set(ex, ey + 1, hex(sp.eye)); p.set(ex + 1, ey + 1, hex(sp.eye)); p.set(ex, ey, WHITE); }
    if (sp.teeth) p.set(tipX - 1, R(hy + 2.4 * k), WHITE);
    if (sp.crown) crown(p, R(hx - 0.4 * k), R(hy - 3.6 * k), R(2.4 * k));
    if (sp.sack) { const sack = ramp(hex('#b89a6a')); p.ellipse(-1.6 * k, by - bh - 1.8 * k, 3.8 * k, 3.2 * k, sack, { sep: true }); p.rect(R(-0.6 * k), R(by - bh - 5.2 * k), 2, 2, tone(sack.m, -0.4)); }
    p.outline();
    if (sp.tail === 'thin') thinTail(p, -bl + 1, by + 1 * k, -bl - 5 * k, by + 2 * k + wag * 1.5, -bl - 9 * k, by - 1 * k - wag * 1.5);
    if (sp.tail === 'tuft') thinTail(p, -bl + 1, by, -bl - 6 * k, by + 1 * k + wag, -bl - 9 * k, by - 6 * k - wag);
    p.set(tipX + 2, R(hy + 0.6 * k) - 1, WHISKER); p.set(tipX + 2, R(hy + 0.6 * k) + 1, WHISKER);
    return p;
  }

  /* ------------------------------------------------- asientos de unidad */
  /** Devuelve { px, seatX, seatY }: el lienzo y dónde se apoyan las patas de la unidad (relativo a su origen). */
  function base(kind, fr = 0) {
    const p = new Px(64, 56).origin(32, 44);
    const wood = ramp(hex('#8a6238')), woodD = ramp(hex('#5e4027')), stone = ramp(hex('#8b9299')), dirt = ramp(hex('#9b7a4b'));
    let seatX = 0, seatY = 0;
    switch (kind) {
      case 'post':
        p.rect(-3, -12, 6, 13, woodD.m); p.rect(-3, -12, 2, 13, woodD.l1); p.rect(2, -12, 1, 13, woodD.d1);
        p.rect(-3, -4, 6, 1, woodD.d1);
        p.ellipse(0, -13, 9, 3.2, wood); p.ellipse(0, -14, 7.4, 2, wood.l1, { over: true });
        seatY = -14; break;
      case 'rock':
        p.ellipse(0, -3, 11, 5, stone); p.ellipse(-2, -5, 7, 2.4, stone.l1, { over: true });
        p.set(7, -1, hex('#6ea15c')); p.set(8, -1, hex('#6ea15c')); p.set(8, -2, hex('#8fc46f'));
        seatY = -6; break;
      case 'stump':
        p.rect(-8, -6, 16, 6, woodD.m); p.rect(-8, -6, 3, 6, woodD.l1); p.rect(5, -6, 3, 6, woodD.d1);
        p.rect(-10, -1, 3, 2, woodD.m); p.rect(8, -1, 3, 2, woodD.d1);
        p.ellipse(0, -6, 8.4, 3, wood); p.ellipse(0, -6, 5.4, 1.8, wood.l1, { over: true }); p.ellipse(0, -6, 2.4, 0.9, wood.m, { over: true });
        seatY = -7; break;
      case 'mound':
        p.ellipse(0, -3, 12, 5, dirt); p.ellipse(-2, -4.6, 8, 2.4, dirt.l1, { over: true });
        for (const [x, y] of [[-10, -3], [9, -4], [-6, -7], [6, -7]]) { p.set(x, y, hex('#6f9a4c')); p.set(x, y - 1, hex('#8fc46f')); }
        seatY = -6; break;
      case 'tallrock':
        p.poly([[-9, 1], [-7, -11], [-1, -16], [6, -12], [9, 1]], stone.m);
        p.poly([[-7, -11], [-1, -16], [1, -9], [-4, 0], [-8, 0]], stone.l1);
        p.poly([[5, -11], [9, 1], [4, 1]], stone.d1);
        p.set(-6, -2, hex('#6ea15c')); p.set(-5, -2, hex('#6ea15c')); p.set(-5, -3, hex('#8fc46f'));
        seatY = -15; break;
      case 'catapult': {
        // bastidor a la derecha; el brazo cambia con el cuadro (0 en reposo, 1 disparado)
        p.rect(4, -3, 15, 3, woodD.m); p.rect(4, -3, 15, 1, woodD.l1);
        p.rect(10, -9, 2, 7, woodD.m);
        if (fr === 0) { p.line(11, -8, 18, -13, wood.m); p.line(11, -9, 18, -14, wood.l1); p.ellipse(18.5, -14.5, 2.4, 1.8, woodD); }
        else { p.line(11, -8, 6, -17, wood.m); p.line(12, -8, 7, -17, wood.l1); p.ellipse(6.5, -18, 2.4, 1.8, woodD); }
        p.ellipse(-7, -1.5, 8, 2.6, ramp(hex('#6d7a52')));
        seatX = -7; seatY = -3; break;
      }
      default:
        p.ellipse(0, -2, 10, 3.4, woodD); seatY = -4;
    }
    p.outline();
    return { px: p, seatX, seatY };
  }

  /* --------------------------------------------------------- proyectiles */
  function projectile(kind) {
    const p = new Px(16, 16).origin(8, 8);
    switch (kind) {
      case 'piedra': p.ellipse(0, 0, 2.2, 2.2, ramp(hex('#9aa0a6'))); break;
      case 'bellota': p.ellipse(0, 0.6, 2, 2.6, ramp(hex('#9a6532'))); p.rect(-2, -3, 4, 2, hex('#5a3a1b')); p.set(0, -4, hex('#5a3a1b')); break;
      case 'nuez': p.ellipse(0, 0, 2.8, 2.6, ramp(hex('#855630'))); p.line(-2, 0, 2, 0, hex('#4d2f17'), true); break;
      case 'dardo': p.rect(-5, 0, 9, 1, hex('#f5f1e6')); p.rect(3, -1, 2, 3, hex('#3b3b3b')); p.set(-5, -1, hex('#c9a46a')); p.set(-5, 1, hex('#c9a46a')); break;
      case 'sardina': p.ellipse(0, 0, 4.4, 1.9, ramp(hex('#b9c8d2'))); p.poly([[-4, 0], [-7, -3], [-7, 3]], hex('#8fa3b0')); p.set(2, -1, DARK); break;
      default: p.ellipse(0, 0, 2, 2, ramp(hex('#dddddd')));
    }
    p.outline(0.7);
    return p;
  }

  /* ------------------------------------------------ objetos del escenario */
  /** Árbol. `tint`: 'verde' | 'oliva' | 'dorado' | 'interior'. */
  function tree(seed, tint = 'verde') {
    const p = new Px(64, 80).origin(32, 70);
    const rnd = (i) => hash2(seed, i, 7);
    const greens = { verde: '#3f8f45', oliva: '#6f8a3c', dorado: '#8f9a3a', interior: '#3f7f5a', noche: '#2f6a58' }[tint] || '#3f8f45';
    const leaf = ramp(hex(greens)), bark = ramp(hex('#6b4a2e'));
    const s = 0.86 + rnd(1) * 0.3;
    p.rect(-3, -14, 6, 15, bark.m); p.rect(-3, -14, 2, 15, bark.l1); p.rect(2, -14, 1, 15, bark.d1);
    p.rect(-5, -1, 3, 2, bark.m); p.rect(3, -1, 3, 2, bark.d1); p.set(0, -6, bark.d2); p.set(-1, -9, bark.d2);
    const blobs = [[0, -27, 13, 11], [-8, -21, 9, 8], [8, -22, 9, 8], [-4, -34, 9, 8], [6, -32, 8, 7]];
    for (const [x, y, rx, ry] of blobs) p.ellipse(x * s + (rnd(x + 9) - 0.5) * 3, y * s - 4 + (rnd(y) - 0.5) * 2, rx * s, ry * s, leaf);
    // racimos de hojas: luces arriba a la izquierda, sombras abajo a la derecha
    for (let i = 0; i < 26; i++) {
      const a = rnd(i * 3 + 20) * Math.PI * 2, r = rnd(i * 3 + 21) * 12 * s;
      const x = Math.cos(a) * r, y = -29 * s + Math.sin(a) * r * 0.85;
      const lit = x + y * 1.2 < -34 * s + rnd(i) * 8;
      const c = lit ? leaf.l1 : (x - y * 0.2 > 4 ? leaf.d1 : leaf.l1);
      p.over(x, y, c); p.over(x + 1, y, c); if (lit) p.over(x, y - 1, leaf.l2);
    }
    if (tint === 'dorado') for (let i = 0; i < 6; i++) p.over((rnd(i + 60) - 0.5) * 22 * s, -29 * s + (rnd(i + 70) - 0.5) * 18 * s, hex('#e2a23a'));
    p.outline(0.66);
    return p;
  }

  function rubble(seed) {
    const p = new Px(64, 48).origin(32, 40);
    const rnd = (i) => hash2(seed, i, 11);
    const c1 = ramp(hex('#9a9da0')), c2 = ramp(hex('#7e8388'));
    p.poly([[-12, 0], [-13, -8], [-4, -11], [0, -4], [-2, 0]], c1.m); p.poly([[-13, -8], [-4, -11], [-5, -7], [-11, -5]], c1.l1);
    p.poly([[-1, 0], [1, -9 - rnd(1) * 3], [9, -7], [12, 0]], c2.m); p.poly([[1, -9 - rnd(1) * 3], [9, -7], [7, -4], [2, -6]], c2.l1); p.poly([[9, -7], [12, 0], [8, 0]], c2.d1);
    p.poly([[-6, 1], [-4, -4], [3, -3], [4, 1]], c1.d1); p.poly([[-4, -4], [3, -3], [2, -2], [-3, -2]], c1.m);
    p.line(-8, -10, -2, -17, hex('#7a4a2a')); p.line(4, -8, 7, -14, hex('#7a4a2a'));
    for (const [x, y] of [[-9, -2], [6, -2], [10, -1]]) { p.over(x, y, hex('#5f9a4e')); p.over(x + 1, y, hex('#7fbf5c')); }
    p.outline(0.66);
    return p;
  }

  function car(seed) {
    const p = new Px(80, 56).origin(40, 46);
    const rnd = (i) => hash2(seed, i, 13);
    const body = ramp(hex(['#a8482e', '#7b6a4c', '#4a6988', '#6a7a4a'][Math.floor(rnd(1) * 4)]));
    const glass = hex('#27414f'), tyre = hex('#22222a'), rust = hex('#7a3c18');
    // ruedas
    p.ellipse(-13, -2, 4, 3, ramp(tyre)); p.ellipse(13, -2, 4, 3, ramp(tyre));
    // carrocería
    p.poly([[-21, -3], [-21, -11], [-16, -14], [16, -14], [21, -11], [21, -3]], body.m);
    p.poly([[-21, -11], [-16, -14], [16, -14], [21, -11]], body.l1);
    p.rect(-21, -5, 42, 2, body.d1);
    // cabina
    p.poly([[-11, -14], [-8, -22], [9, -22], [13, -14]], body.m); p.poly([[-8, -22], [9, -22], [9, -21], [-8, -21]], body.l1);
    p.poly([[-9, -15], [-7, -20], [-1, -20], [-1, -15]], glass); p.poly([[1, -15], [1, -20], [8, -20], [11, -15]], glass);
    p.set(-6, -19, hex('#5f8aa0')); p.set(-5, -19, hex('#5f8aa0')); p.set(3, -19, hex('#5f8aa0'));
    p.rect(-21, -8, 3, 2, hex('#d9cf9a')); p.rect(18, -8, 3, 2, hex('#b0482e'));
    for (let i = 0; i < 9; i++) { const x = (rnd(i + 5) - 0.5) * 38, y = -4 - rnd(i + 30) * 9; p.over(x, y, rust); p.over(x + 1, y, rust); if (rnd(i) > 0.5) p.over(x, y - 1, tone(rust, 0.2)); }
    for (const [x, y] of [[-14, -14], [-2, -22], [10, -14], [17, -12]]) { p.over(x, y, hex('#5f9a4e')); p.over(x + 1, y, hex('#7fbf5c')); p.over(x, y + 1, hex('#5f9a4e')); }
    p.outline(0.66);
    return p;
  }

  function lamp(seed, lit = false) {
    const p = new Px(48, 80).origin(24, 72);
    const lean = hash2(seed, 3, 17) < 0.5 ? -1 : 1;
    const m = ramp(hex('#5d646b'));
    p.ellipse(0, -1, 4, 2, m);
    for (let i = 0; i < 44; i++) { const x = Math.round((i / 44) * 3 * lean); p.set(x, -2 - i, m.m); p.set(x - 1, -2 - i, m.l1); }
    const tx = 3 * lean;
    p.line(tx, -46, tx + 8 * lean, -49, m.m); p.line(tx, -47, tx + 8 * lean, -50, m.l1);
    p.ellipse(tx + 9 * lean, -47, 3.4, 2.2, ramp(hex(lit ? '#ffe9a6' : '#cfc8a8')));
    p.outline(0.66);
    return { px: p, lightX: tx + 9 * lean, lightY: -46 };
  }

  function antenna(seed) {
    const p = new Px(48, 80).origin(24, 72);
    const m = ramp(hex('#646b72'));
    p.rect(-3, -3, 6, 3, m.m);
    for (let i = 0; i < 46; i++) p.set(0, -3 - i, i % 6 < 3 ? m.m : m.l1);
    for (let j = 0; j < 3; j++) { const y = -44 + j * 8, w = 8 - j * 2; p.line(-w, y, w, y, m.m); p.set(-w, y - 1, m.l1); p.set(w, y - 1, m.l1); }
    p.set(0, -50, hex('#ff5a5a')); p.set(0, -51, hex('#ffb0b0'));
    p.outline(0.66);
    return { px: p, lightX: 0, lightY: -50 };
  }

  function pipe() {
    const p = new Px(56, 64).origin(28, 54);
    const m = ramp(hex('#6f777d')), d = ramp(hex('#4d5459'));
    p.rect(-8, -34, 16, 35, m.m); p.rect(-8, -34, 4, 35, m.l1); p.rect(5, -34, 3, 35, m.d1);
    p.rect(-10, -36, 20, 4, d.m); p.rect(-10, -36, 20, 1, d.l1); p.rect(-10, -4, 20, 4, d.m); p.rect(-10, -4, 20, 1, d.l1);
    p.ellipse(0, -20, 6, 6, ramp(hex('#a83a3a'))); p.ellipse(0, -20, 3, 3, m.d1); p.rect(-6, -21, 12, 2, hex('#7a2424')); p.rect(-1, -26, 2, 12, hex('#7a2424'));
    for (const y of [-30, -10]) { p.set(-6, y, d.d1); p.set(6, y, d.d1); }
    p.set(8, -12, hex('#5f9a8a')); p.set(8, -11, hex('#5f9a8a')); p.set(8, -9, hex('#5f9a8a'));
    p.outline(0.66);
    return p;
  }

  function chimney() {
    const p = new Px(56, 64).origin(28, 54);
    const b = ramp(hex('#96584a'));
    p.rect(-9, -30, 18, 31, b.m); p.rect(-9, -30, 4, 31, b.l1); p.rect(6, -30, 3, 31, b.d1);
    for (let y = -26; y < 1; y += 5) { p.rect(-9, y, 18, 1, b.d2); for (let x = -9 + ((y / 5) & 1 ? 4 : 0); x < 9; x += 8) p.rect(x, y - 4, 1, 4, b.d1); }
    p.rect(-11, -34, 22, 5, ramp(hex('#4a4a54')).m); p.rect(-11, -34, 22, 1, hex('#6d6d7a')); p.rect(-7, -35, 14, 2, hex('#1c1c22'));
    p.outline(0.66);
    return p;
  }

  /** Madriguera (entran roedores) o brecha en el muro (entran gatos). */
  function spawn(kind) {
    const p = new Px(72, 64).origin(36, 52);
    if (kind === 'burrow') {
      const dirt = ramp(hex('#8a6a46'));
      p.ellipse(0, -5, 15, 8, dirt); p.ellipse(-3, -8, 9, 3.4, dirt.l1, { over: true });
      p.ellipse(0, -4, 9, 5, hex('#140f0e')); p.ellipse(0, -2.4, 9, 3.6, hex('#2a1d18'), { over: true });
      for (const [x, y] of [[-13, -6], [12, -8], [-8, -12], [8, -12]]) { p.set(x, y, hex('#6f9a4c')); p.set(x, y - 1, hex('#8fc46f')); }
      for (const [x, y] of [[-16, 0], [14, 1], [17, -3]]) p.ellipse(x, y, 1.6, 1.2, dirt);
    } else {
      const st = ramp(hex('#7d8389'));
      p.poly([[-16, 1], [-16, -22], [-9, -27], [10, -26], [16, -20], [16, 1]], st.m);
      p.poly([[-16, -22], [-9, -27], [10, -26], [16, -20], [12, -19], [-12, -20]], st.l1);
      for (let y = -18; y < 0; y += 6) { p.line(-16, y, 16, y, st.d1, true); for (let x = -16 + ((y / 6) & 1 ? 5 : 0); x < 16; x += 10) p.line(x, y - 6, x, y, st.d1, true); }
      p.poly([[-8, 1], [-8, -11], [-4, -16], [4, -16], [8, -11], [8, 1]], hex('#0f0c12'));
      p.set(-4, -8, hex('#f4cf52')); p.set(-3, -8, hex('#f4cf52')); p.set(2, -8, hex('#f4cf52')); p.set(3, -8, hex('#f4cf52'));
      p.over(-13, -24, hex('#5f9a4e')); p.over(-12, -24, hex('#7fbf5c')); p.over(12, -21, hex('#5f9a4e'));
    }
    p.outline(0.66);
    return p;
  }

  /** La base: Despensa (gatos) o Granero (roedores), con el banderín del bando. */
  function exit(kind, flagColor) {
    const p = new Px(80, 80).origin(40, 66);
    const flag = ramp(hex(flagColor || '#f1a53c'));
    if (kind === 'despensa') {
      const wood = ramp(hex('#8b5a2b')), woodD = ramp(hex('#5a3a1b'));
      p.rect(-17, -28, 34, 29, wood.m);
      for (let x = -17; x < 17; x += 7) { p.rect(x, -28, 1, 29, wood.d1); p.rect(x + 1, -28, 1, 29, wood.l1); }
      p.rect(-19, -31, 38, 4, woodD.m); p.rect(-19, -31, 38, 1, woodD.l1); p.rect(-17, -1, 34, 2, woodD.m);
      p.poly([[-8, 1], [-8, -13], [-4, -18], [4, -18], [8, -13], [8, 1]], hex('#1d130c'));
      p.rect(-6, -10, 12, 1, hex('#3a2a1a'));
      const cans = ['#e5484d', '#4fa3e0', '#f1c74c', '#6fcf62'];
      for (let i = 0; i < 4; i++) {
        const x = -15 + i * 8, tin = ramp(hex('#c9d3d9'));
        p.rect(x, -39, 6, 8, tin.m); p.rect(x, -39, 2, 8, tin.l1); p.rect(x + 5, -39, 1, 8, tin.d1);
        p.rect(x, -37, 6, 3, hex(cans[i])); p.rect(x, -37, 2, 3, tone(hex(cans[i]), 0.3));
        p.rect(x, -40, 6, 1, tin.l2);
      }
      for (let i = 0; i < 2; i++) { const x = -7 + i * 8, tin = ramp(hex('#c9d3d9')); p.rect(x, -47, 6, 7, tin.m); p.rect(x, -47, 2, 7, tin.l1); p.rect(x, -45, 6, 3, hex(cans[(i + 2) % 4])); p.rect(x, -48, 6, 1, tin.l2); }
    } else {
      const dirt = ramp(hex('#9b7a4b')), wood = ramp(hex('#8b5a2b'));
      p.ellipse(0, -10, 21, 13, dirt); p.ellipse(-4, -16, 13, 5, dirt.l1, { over: true });
      for (let i = 0; i < 9; i++) { const x = -18 + i * 4.4, y = -19 + Math.abs(i - 4) * 1.6; p.set(x, y, hex('#6f9a4c')); p.set(x, y - 1, hex('#8fc46f')); p.set(x + 1, y, hex('#5f8a42')); }
      p.ellipse(0, -5, 8, 8, wood); p.rect(-8, -5, 16, 6, wood.m);
      p.ellipse(0, -5, 6, 6, hex('#1d130c')); p.rect(-6, -5, 12, 6, hex('#1d130c'));
      const sack = ramp(hex('#dcc6a0'));
      for (const [x, y] of [[-17, -3], [17, -3], [-13, -9]]) { p.ellipse(x, y, 5, 4.4, sack, { sep: true }); p.rect(Math.round(x) - 1, Math.round(y) - 6, 2, 2, tone(sack.m, -0.35)); p.over(x - 1, y + 1, sack.d1); p.over(x + 2, y, sack.d1); }
      for (let i = 0; i < 3; i++) { const x = 13 + i * 3; p.line(x, -8, x + 1, -24, hex('#c9b24a')); p.ellipse(x + 1, -25, 1.2, 2.6, ramp(hex('#e7d06a'))); }
    }
    // banderín
    p.rect(21, -40, 1, 41, hex('#3a2a1a')); p.rect(22, -40, 1, 41, hex('#5a4630'));
    p.poly([[23, -40], [34, -36], [23, -32]], flag.m); p.poly([[23, -40], [34, -36], [23, -37]], flag.l1);
    p.outline(0.66);
    return p;
  }

  /** Arbusto bajo. */
  function bush(seed, tint = 'verde') {
    const p = new Px(48, 40).origin(24, 34);
    const greens = { verde: '#3f8f45', oliva: '#6f8a3c', dorado: '#8f9a3a', interior: '#3f7f5a', noche: '#2f6a58' }[tint] || '#3f8f45';
    const leaf = ramp(hex(greens)), rnd = (i) => hash2(seed, i, 19);
    p.ellipse(-5, -5, 7, 5.5, leaf); p.ellipse(5, -6, 7.5, 6, leaf); p.ellipse(0, -10, 6.5, 5, leaf);
    for (let i = 0; i < 9; i++) { const x = (rnd(i) - 0.5) * 20, y = -7 + (rnd(i + 20) - 0.5) * 9; p.over(x, y, x + y < -6 ? leaf.l2 : leaf.d1); }
    if (rnd(40) < 0.5) for (let i = 0; i < 3; i++) p.over((rnd(i + 50) - 0.5) * 16, -8 + (rnd(i + 60) - 0.5) * 6, hex('#e8647a'));
    p.outline(0.66);
    return p;
  }

  /** Góndola de supermercado, con latas que nadie compró. */
  function shelf(seed) {
    const p = new Px(72, 64).origin(36, 54);
    const rnd = (i) => hash2(seed, i, 23);
    const metal = ramp(hex('#8d949b')), back = hex('#4c5258');
    p.rect(-22, -34, 44, 35, back);
    p.rect(-24, -36, 2, 37, metal.m); p.rect(22, -36, 2, 37, metal.d1); p.rect(-24, -36, 48, 2, metal.l1);
    const cols = ['#e5484d', '#4fa3e0', '#f1c74c', '#6fcf62', '#d9d9d9', '#c98a4a'];
    for (let row = 0; row < 3; row++) {
      const y = -25 + row * 11;
      p.rect(-22, y + 8, 44, 2, metal.m); p.rect(-22, y + 8, 44, 1, metal.l1);
      for (let i = 0; i < 7; i++) {
        if (rnd(row * 10 + i) < 0.3) continue; // hueco: ya se la llevaron
        const x = -21 + i * 6, c = hex(cols[Math.floor(rnd(row * 10 + i + 100) * cols.length)]);
        const tall = rnd(row * 10 + i + 200) < 0.4 ? 7 : 5;
        p.rect(x, y + 8 - tall, 5, tall, c); p.rect(x, y + 8 - tall, 2, tall, tone(c, 0.28)); p.rect(x, y + 8 - tall, 5, 1, hex('#e3ebf0'));
      }
    }
    for (const [x, y] of [[-22, -30], [-21, -22], [20, -34], [21, -27], [-23, -12]]) { p.set(x, y, hex('#5f9a4e')); p.set(x + 1, y + 1, hex('#7fbf5c')); p.set(x, y + 2, hex('#5f9a4e')); }
    p.outline(0.66);
    return p;
  }

  /** Cajas y palés del patio de carga. */
  function crate(seed) {
    const p = new Px(64, 56).origin(32, 46);
    const rnd = (i) => hash2(seed, i, 29);
    const wood = ramp(hex('#9a7446')), woodD = ramp(hex('#6e5030'));
    const box = (x, y, w, h, r) => {
      p.rect(x, y - h, w, h, r.m); p.rect(x, y - h, w, 2, r.l1); p.rect(x, y - h, 2, h, r.l1); p.rect(x + w - 2, y - h, 2, h, r.d1);
      p.line(x + 2, y - h + 2, x + w - 3, y - 2, r.d1, true); p.rect(x, y - 1, w, 1, r.d2);
    };
    box(-16, 0, 16, 14, wood); box(1, 0, 15, 12, woodD);
    if (rnd(1) < 0.7) box(-9, -13, 15, 12, rnd(2) < 0.5 ? wood : woodD);
    p.rect(-18, 0, 36, 2, hex('#5a4026'));
    p.outline(0.66);
    return p;
  }

  /** Sacos de grano apilados. */
  function sacks(seed) {
    const p = new Px(64, 56).origin(32, 46);
    const rnd = (i) => hash2(seed, i, 31);
    const sack = ramp(hex('#d6bf96')), sackB = ramp(hex('#bfa67a'));
    const one = (x, y, r) => { p.ellipse(x, y, 8, 5.4, r, { sep: true }); p.over(x - 3, y + 1, r.d1); p.over(x + 2, y - 1, r.d1); p.rect(Math.round(x) - 1, Math.round(y) - 7, 2, 2, tone(r.m, -0.4)); };
    one(-8, -5, sack); one(8, -5, sackB); one(0, -13, rnd(1) < 0.5 ? sack : sackB);
    if (rnd(2) < 0.5) one(-3, -21, sackB);
    for (let i = 0; i < 5; i++) p.set(-14 + i * 7 + Math.round(rnd(i + 5) * 3), 1, hex('#e2c56a'));
    p.outline(0.66);
    return p;
  }

  /** Montículo de tierra de un enemigo que excava. */
  function mound(fr) {
    const p = new Px(40, 32).origin(20, 26);
    const dirt = ramp(hex('#8a6a46'));
    p.ellipse(fr ? 1 : 0, -4, 9, 5, dirt); p.ellipse(-2 + (fr ? 1 : 0), -6, 5, 2, dirt.l1, { over: true });
    p.set(-7, -9 - fr, dirt.m); p.set(6, -10 + fr, dirt.d1); p.set(0, -11 - fr, dirt.l1);
    p.outline(0.6);
    return p;
  }

  /* ---------------------------------------------------------------- caché */
  const cache = new Map();
  function wrap(px) {
    return { px, cv: px.toCanvas(), w: px.w, h: px.h, ox: px.ox, oy: px.oy, masks: {} };
  }
  /** Devuelve el sprite (canvas + origen) pedido, generándolo la primera vez. */
  function get(key, make) {
    let s = cache.get(key);
    if (!s) { const made = make(); s = wrap(made.px || made); Object.assign(s, made.px ? made : {}); s.px = made.px || made; cache.set(key, s); }
    return s;
  }
  /** Silueta de un color del sprite (se usa para sombras, daño y tintes). */
  function mask(s, name, color) {
    if (!s.masks[name]) s.masks[name] = s.px.maskCanvas(color);
    return s.masks[name];
  }

  const S = {
    SPECIES, sit, walk, base, projectile, tree, bush, shelf, crate, sacks, rubble, car, lamp, antenna, pipe, chimney, spawn, exit, mound, get, mask,
    sitSprite: (look, f = {}) => get(`sit|${look}|${f.sway || 0}|${f.blink ? 1 : 0}|${f.attack ? 1 : 0}|${f.mouth ? 1 : 0}`, () => sit(look, f)),
    walkSprite: (look, fr) => get(`walk|${look}|${fr}`, () => walk(look, fr)),
    baseSprite: (kind, fr = 0) => get(`base|${kind}|${fr}`, () => base(kind, fr)),
    projSprite: (kind) => get(`proj|${kind}`, () => projectile(kind)),
  };
  TD.sprites = S;
})();
