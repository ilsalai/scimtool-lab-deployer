/* Nueve Vidas · arte procedural.
 * No hay imágenes: cada gato y cada roedor se dibuja con formas sobre el canvas.
 * Una "especie" (SPECIES) describe colores y rasgos; la misma especie puede
 * dibujarse sentada de frente (unidades, retratos) o caminando vista desde
 * arriba (enemigos). Así cualquier animal puede ser defensor o atacante. */
(function () {
  const TD = (globalThis.TD = globalThis.TD || {});
  const TAU = Math.PI * 2;

  const SPECIES = {
    /* gatos */
    tabby:     { kind: 'cat', fur: '#e3923d', fur2: '#b3661f', belly: '#f6dcb8', eye: '#79c24a', pattern: 'tabby', label: 'gato atigrado' },
    black:     { kind: 'cat', fur: '#2b2b34', fur2: '#17171d', belly: '#f2f2f2', eye: '#f1c74c', pattern: 'tux', label: 'gato negro' },
    grey:      { kind: 'cat', fur: '#8e97a8', fur2: '#6b7384', belly: '#d8dde8', eye: '#8fd3ff', pattern: 'plain', label: 'gato gris' },
    calico:    { kind: 'cat', fur: '#f1e6cf', fur2: '#e08a3c', fur3: '#3a3a40', belly: '#fff8ec', eye: '#79c24a', pattern: 'calico', label: 'gata calicó' },
    lynx:      { kind: 'cat', fur: '#c9a46a', fur2: '#8a6b3a', belly: '#eadfc6', eye: '#f1a53c', pattern: 'spots', tufts: true, size: 1.15, shortTail: true, label: 'lince' },
    white:     { kind: 'cat', fur: '#f4f1ea', fur2: '#d9d3c6', belly: '#ffffff', eye: '#5fa8ff', pattern: 'plain', label: 'gato blanco' },
    siamese:   { kind: 'cat', fur: '#efe0c6', fur2: '#4a3328', belly: '#f8efe0', eye: '#5fa8ff', pattern: 'points', label: 'gato siamés' },
    alley:     { kind: 'cat', fur: '#8c7b68', fur2: '#5e4f41', belly: '#cfc3b3', eye: '#c5d63a', pattern: 'tabby', size: 0.9, label: 'gato callejero' },
    maine:     { kind: 'cat', fur: '#6e4b2e', fur2: '#3f2a18', belly: '#d8c2a4', eye: '#f1a53c', pattern: 'tabby', size: 1.4, fluffy: true, tufts: true, label: 'gato de pelo largo' },
    lynxqueen: { kind: 'cat', fur: '#d2a964', fur2: '#8a6b3a', belly: '#f0e4cc', eye: '#ffb13b', pattern: 'spots', tufts: true, size: 1.55, shortTail: true, crown: true, cape: '#6b2d8b', label: 'reina lince' },
    /* roedores */
    mouse:     { kind: 'rodent', fur: '#a9a9b0', fur2: '#85858d', belly: '#dadadf', eye: '#1a1a1a', ear: 'round', earSize: 1.3, tail: 'thin', size: 0.85, teeth: true, label: 'ratón' },
    rat:       { kind: 'rodent', fur: '#6f5f52', fur2: '#4e4138', belly: '#a8998a', eye: '#c62828', ear: 'round', earSize: 1.0, tail: 'thin', size: 1.05, teeth: true, label: 'rata' },
    squirrel:  { kind: 'rodent', fur: '#b5562a', fur2: '#8a3d1a', belly: '#f3dcc3', eye: '#1a1a1a', ear: 'tuft', earSize: 0.9, tail: 'bushy', size: 0.95, teeth: true, label: 'ardilla' },
    mole:      { kind: 'rodent', fur: '#3b3340', fur2: '#2a2430', belly: '#5a4f60', eye: '#111111', ear: 'none', tail: 'stub', size: 1.0, nose: '#f2a0b0', claws: true, label: 'topo' },
    capybara:  { kind: 'rodent', fur: '#8a6a46', fur2: '#5f4730', belly: '#b79a73', eye: '#1a1a1a', ear: 'small', tail: 'none', size: 1.6, blunt: true, label: 'capibara' },
    ratking:   { kind: 'rodent', fur: '#4b4248', fur2: '#2d272c', belly: '#8a7e85', eye: '#ff3b3b', ear: 'round', tail: 'thin', size: 1.5, crown: true, cape: '#8b1e2d', teeth: true, label: 'rey rata' },
    porcupine: { kind: 'rodent', fur: '#5a4a3a', fur2: '#2e2419', belly: '#8c7a66', eye: '#1a1a1a', ear: 'small', tail: 'stub', size: 1.15, quills: true, label: 'puercoespín' },
    marmot:    { kind: 'rodent', fur: '#a8865a', fur2: '#7a5d3a', belly: '#d9c19c', eye: '#1a1a1a', ear: 'small', tail: 'stub', size: 1.2, chubby: true, teeth: true, label: 'marmota' },
    hamster:   { kind: 'rodent', fur: '#e9b270', fur2: '#c58a44', belly: '#fff1dc', eye: '#1a1a1a', ear: 'round', earSize: 0.9, tail: 'none', size: 0.95, cheeks: true, label: 'hámster' },
    jerboa:    { kind: 'rodent', fur: '#d9b87a', fur2: '#a98a50', belly: '#fff5e0', eye: '#1a1a1a', ear: 'round', earSize: 1.7, tail: 'tuft', size: 0.85, label: 'jerbo' },
  };

  /* ------------------------------------------------------------ helpers */
  function ellipse(ctx, x, y, rx, ry, fill) {
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU);
    if (fill) ctx.fillStyle = fill;
    ctx.fill();
  }
  function circle(ctx, x, y, r, fill) {
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, TAU);
    if (fill) ctx.fillStyle = fill;
    ctx.fill();
  }
  function poly(ctx, pts, fill) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) ctx.fillStyle = fill;
    ctx.fill();
  }
  function line(ctx, x1, y1, x2, y2, color, w) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    if (color) ctx.strokeStyle = color;
    if (w) ctx.lineWidth = w;
    ctx.stroke();
  }
  function crown(ctx, x, y, w, h) {
    poly(ctx, [[x - w, y], [x - w, y - h * 0.6], [x - w * 0.5, y - h * 0.2], [x, y - h], [x + w * 0.5, y - h * 0.2], [x + w, y - h * 0.6], [x + w, y]], '#f1c74c');
    circle(ctx, x, y - h * 0.9, 1.3, '#e5484d');
    circle(ctx, x - w * 0.9, y - h * 0.55, 1.1, '#4fa3e0');
    circle(ctx, x + w * 0.9, y - h * 0.55, 1.1, '#4fa3e0');
  }

  /* -------------------------------------------------- sentado, de frente */
  /** Dibuja la especie sentada mirando al jugador. Origen: entre las patas.
   *  o: { t, seed, facing (1|-1), anim (1→0 al atacar), scale, mouthOpen } */
  function drawSit(ctx, look, o = {}) {
    const sp = SPECIES[look] || SPECIES.tabby;
    const s = (sp.size || 1) * (o.scale || 1);
    const t = o.t || 0, seed = o.seed || 0, anim = o.anim || 0;
    const cat = sp.kind === 'cat';
    ctx.save();
    ctx.scale(s * (o.facing || 1), s);
    ctx.translate(anim * 4, anim * 2);
    ctx.scale(1 + anim * 0.08, 1 - anim * 0.08);
    ctx.lineCap = 'round';

    const sway = Math.sin(t * 2.2 + seed) * 5;
    const headR = cat ? 9 : 8;
    const headY = cat ? -22 : -20;
    const bodyRx = 11 * (sp.chubby ? 1.15 : 1);

    // Capa (jefes)
    if (sp.cape) {
      poly(ctx, [[-10, -14], [10, -14], [15 + sway * 0.3, 4], [-15 - sway * 0.3, 4]], sp.cape);
    }
    // Cola (detrás del cuerpo)
    if (sp.tail === 'bushy') {
      circle(ctx, 12, -8, 6, sp.fur); circle(ctx, 16 + sway * 0.4, -18, 7, sp.fur); circle(ctx, 14 + sway * 0.8, -29, 7.5, sp.fur);
      circle(ctx, 15 + sway * 0.8, -29, 4, sp.belly);
    } else if (sp.tail === 'thin') {
      ctx.strokeStyle = sp.kind === 'rodent' ? '#d9a3a3' : sp.fur; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(9, -3); ctx.quadraticCurveTo(22 + sway, -2, 24 + sway, -14); ctx.stroke();
    } else if (sp.tail === 'tuft') {
      ctx.strokeStyle = sp.fur2; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(9, -3); ctx.quadraticCurveTo(24 + sway, -2, 26 + sway, -18); ctx.stroke();
      circle(ctx, 26 + sway, -19, 3, sp.fur2);
    } else if (sp.tail === 'stub' || sp.shortTail) {
      circle(ctx, 11, -6, 3, sp.fur);
    } else if (cat) {
      ctx.strokeStyle = sp.pattern === 'points' ? sp.fur2 : sp.fur; ctx.lineWidth = sp.fluffy ? 6 : 4;
      ctx.beginPath(); ctx.moveTo(9, -4); ctx.quadraticCurveTo(21 + sway, -4, 19 + sway, -20); ctx.stroke();
      if (sp.pattern === 'tabby') {
        ctx.strokeStyle = sp.fur2; ctx.lineWidth = 1.5;
        line(ctx, 17 + sway, -12, 21 + sway, -11); line(ctx, 18 + sway, -16, 22 + sway, -15);
      }
    }
    // Púas (puercoespín)
    if (sp.quills) {
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 13; i++) {
        const a = Math.PI + (i / 12) * Math.PI;
        const r0 = 9, r1 = 17 + (i % 3) * 2;
        ctx.strokeStyle = i % 2 ? sp.fur2 : '#d8cbb3';
        line(ctx, Math.cos(a) * r0, -10 + Math.sin(a) * r0 * 0.9, Math.cos(a) * r1, -10 + Math.sin(a) * r1 * 0.9);
      }
    }
    // Cuerpo
    ellipse(ctx, 0, -9, bodyRx, 10, sp.fur);
    if (sp.fluffy) { ellipse(ctx, -9, -8, 4, 7, sp.fur); ellipse(ctx, 9, -8, 4, 7, sp.fur); }
    if (sp.pattern === 'tabby') {
      ctx.strokeStyle = sp.fur2; ctx.lineWidth = 1.6;
      line(ctx, -9, -13, -6, -8); line(ctx, 9, -13, 6, -8); line(ctx, -8, -5, -5, -1); line(ctx, 8, -5, 5, -1);
    }
    if (sp.pattern === 'calico') { ellipse(ctx, 7, -12, 5, 4.5, sp.fur2); ellipse(ctx, -6, -4, 4, 3.5, sp.fur3); }
    if (sp.pattern === 'spots') { for (let i = 0; i < 6; i++) circle(ctx, -8 + (i % 3) * 8, -14 + Math.floor(i / 3) * 7, 1.5, sp.fur2); }
    // Pecho / panza
    ellipse(ctx, 0, -6, 6, 6.5, sp.belly);
    // Patas delanteras
    const paws = sp.pattern === 'tux' ? sp.belly : sp.pattern === 'points' ? sp.fur2 : sp.fur;
    ellipse(ctx, -5, -1, 3.6, 2.4, paws); ellipse(ctx, 5, -1, 3.6, 2.4, paws);
    if (sp.claws) { ellipse(ctx, -5, -1, 4.2, 2.8, sp.nose); ellipse(ctx, 5, -1, 4.2, 2.8, sp.nose); }

    // Orejas (detrás de la cabeza)
    const earColor = sp.pattern === 'points' ? sp.fur2 : sp.fur;
    if (cat || sp.ear === 'tuft') {
      poly(ctx, [[-8, headY - 5], [-10.5, headY - 15], [-2, headY - 8]], earColor);
      poly(ctx, [[8, headY - 5], [10.5, headY - 15], [2, headY - 8]], earColor);
      poly(ctx, [[-7.5, headY - 6], [-9, headY - 12], [-3.5, headY - 8]], '#e9a7b3');
      poly(ctx, [[7.5, headY - 6], [9, headY - 12], [3.5, headY - 8]], '#e9a7b3');
      if (sp.tufts) { ctx.strokeStyle = sp.fur2; ctx.lineWidth = 1.5; line(ctx, -10.5, headY - 15, -12, headY - 19); line(ctx, 10.5, headY - 15, 12, headY - 19); }
    } else if (sp.ear === 'round') {
      const er = 4.2 * (sp.earSize || 1);
      circle(ctx, -8, headY - 6, er, sp.fur); circle(ctx, 8, headY - 6, er, sp.fur);
      circle(ctx, -8, headY - 6, er * 0.6, '#e9a7b3'); circle(ctx, 8, headY - 6, er * 0.6, '#e9a7b3');
    } else if (sp.ear === 'small') {
      circle(ctx, -7, headY - 6, 2.6, sp.fur); circle(ctx, 7, headY - 6, 2.6, sp.fur);
    }
    // Cabeza
    circle(ctx, 0, headY, headR, sp.fur);
    if (sp.pattern === 'tabby') {
      ctx.strokeStyle = sp.fur2; ctx.lineWidth = 1.4;
      line(ctx, 0, headY - 8, 0, headY - 4); line(ctx, -3, headY - 8, -2.2, headY - 4.5); line(ctx, 3, headY - 8, 2.2, headY - 4.5);
    }
    if (sp.pattern === 'calico') ellipse(ctx, -5, headY - 4, 4.5, 4, sp.fur2);
    if (sp.pattern === 'points') ellipse(ctx, 0, headY + 2, 6.5, 5, sp.fur2);
    if (sp.pattern === 'spots') { circle(ctx, -5, headY - 4, 1.2, sp.fur2); circle(ctx, 5, headY - 4, 1.2, sp.fur2); }
    if (sp.tufts && cat) { // mejillas del lince
      poly(ctx, [[-9, headY + 2], [-14, headY + 6], [-7, headY + 7]], sp.belly);
      poly(ctx, [[9, headY + 2], [14, headY + 6], [7, headY + 7]], sp.belly);
    }
    // Cara
    if (cat) {
      ellipse(ctx, 0, headY + 4, 5.5, 3.8, sp.pattern === 'points' ? '#d9c4a5' : sp.belly);
      poly(ctx, [[-1.6, headY + 2], [1.6, headY + 2], [0, headY + 3.6]], '#e38a9a');
      ctx.strokeStyle = 'rgba(40,30,30,0.6)'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(0, headY + 3.6); ctx.lineTo(0, headY + 5); ctx.moveTo(-2.2, headY + 6); ctx.quadraticCurveTo(0, headY + 7.2, 2.2, headY + 6); ctx.stroke();
    } else {
      if (sp.blunt) { ellipse(ctx, 0, headY + 4, 7, 4.5, sp.fur); ellipse(ctx, 0, headY + 5.5, 5, 2.5, sp.fur2); }
      else circle(ctx, 0, headY + 4, 4.5, sp.fur);
      if (sp.cheeks) { circle(ctx, -7, headY + 3, 4.2, sp.belly); circle(ctx, 7, headY + 3, 4.2, sp.belly); }
      circle(ctx, 0, headY + 6.3, 1.9, sp.nose || '#e38a9a');
      if (sp.teeth) { ctx.fillStyle = '#fffaf0'; ctx.fillRect(-1.8, headY + 7.6, 1.5, 2.4); ctx.fillRect(0.3, headY + 7.6, 1.5, 2.4); }
    }
    // Bigotes
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 0.8;
    for (const sgn of [-1, 1]) {
      line(ctx, sgn * 4, headY + 3, sgn * 13, headY + 1.5); line(ctx, sgn * 4, headY + 4.5, sgn * 13, headY + 5.5);
    }
    // Ojos (parpadeo)
    const blink = ((t * 0.37 + seed) % 3.7) < 0.1 ? 0.15 : 1;
    if (cat) {
      ellipse(ctx, -3.6, headY - 1, 2.3, 2.7 * blink, sp.eye); ellipse(ctx, 3.6, headY - 1, 2.3, 2.7 * blink, sp.eye);
      ellipse(ctx, -3.6, headY - 1, 0.8, 2.2 * blink, '#111'); ellipse(ctx, 3.6, headY - 1, 0.8, 2.2 * blink, '#111');
      circle(ctx, -4.3, headY - 2, 0.6, 'rgba(255,255,255,0.9)'); circle(ctx, 2.9, headY - 2, 0.6, 'rgba(255,255,255,0.9)');
    } else {
      circle(ctx, -3.2, headY - 0.5, 1.7 * blink, sp.eye); circle(ctx, 3.2, headY - 0.5, 1.7 * blink, sp.eye);
      circle(ctx, -3.7, headY - 1.1, 0.6, 'rgba(255,255,255,0.9)'); circle(ctx, 2.7, headY - 1.1, 0.6, 'rgba(255,255,255,0.9)');
    }
    // Boca abierta (maullido / silbido)
    if (o.mouthOpen) ellipse(ctx, 0, headY + 6.5, 2.4, 2.4 + 1.2 * o.mouthOpen, '#c94f62');
    // Corona
    if (sp.crown) crown(ctx, 0, headY - headR + 1, 6, 7);
    ctx.restore();
  }

  /* --------------------------------------------- caminando, desde arriba */
  /** Dibuja la especie caminando vista desde arriba. Origen: centro del cuerpo.
   *  o: { t, seed, angle (dirección), scale, flash (0..1) } */
  function drawWalk(ctx, look, o = {}) {
    const sp = SPECIES[look] || SPECIES.mouse;
    const s = (sp.size || 1) * (o.scale || 1);
    const t = o.t || 0, seed = o.seed || 0;
    const cat = sp.kind === 'cat';
    const bodyL = cat ? 12 : 10, bodyW = cat ? 7.5 : 6.2;
    const step = Math.sin(t * (cat ? 9 : 14) + seed);
    const wig = Math.sin(t * 6 + seed);
    ctx.save();
    ctx.rotate((o.angle || 0) + step * 0.04);
    ctx.scale(s, s);
    ctx.lineCap = 'round';
    const hx = bodyL + (cat ? 4 : 3.5);
    const headR = cat ? 6.5 : 5.5;

    // Capa (jefes)
    if (sp.cape) poly(ctx, [[-bodyL * 0.5, -bodyW], [-bodyL * 0.5, bodyW], [-bodyL * 2.1, wig * 3]], sp.cape);
    // Cola
    if (sp.tail === 'bushy') {
      circle(ctx, -bodyL - 2, 0, 5, sp.fur); circle(ctx, -bodyL - 8, -3 + wig, 6, sp.fur); circle(ctx, -bodyL - 13, -9 + wig * 2, 6.5, sp.fur);
      circle(ctx, -bodyL - 13, -9 + wig * 2, 3, sp.belly);
    } else if (sp.tail === 'thin' || sp.tail === 'tuft') {
      ctx.strokeStyle = sp.tail === 'tuft' ? sp.fur2 : '#d9a3a3'; ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.moveTo(-bodyL + 2, 0); ctx.quadraticCurveTo(-bodyL - 8, wig * 4, -bodyL - 16, -wig * 4); ctx.stroke();
      if (sp.tail === 'tuft') circle(ctx, -bodyL - 16, -wig * 4, 2.6, sp.fur2);
    } else if (sp.tail === 'stub') {
      circle(ctx, -bodyL + 1, 0, 2.2, sp.fur);
    } else if (cat && sp.shortTail) {
      circle(ctx, -bodyL + 1, 0, 2.8, sp.fur);
    } else if (cat) {
      ctx.strokeStyle = sp.pattern === 'points' ? sp.fur2 : sp.fur; ctx.lineWidth = sp.fluffy ? 6 : 3.2;
      ctx.beginPath(); ctx.moveTo(-bodyL + 2, 0); ctx.quadraticCurveTo(-bodyL - 8, wig * 3, -bodyL - 15, 6 * wig); ctx.stroke();
    }
    // Patas
    const legColor = sp.pattern === 'tux' ? sp.belly : sp.pattern === 'points' ? sp.fur2 : sp.fur2;
    const lx = bodyL * 0.55, ly = bodyW + 1.2, a = step * 2.6;
    ellipse(ctx, lx + a, -ly, 3, 2, legColor); ellipse(ctx, -lx - a, -ly, 3, 2, legColor);
    ellipse(ctx, lx - a, ly, 3, 2, legColor); ellipse(ctx, -lx + a, ly, 3, 2, legColor);
    // Púas
    if (sp.quills) {
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 16; i++) {
        const ang = Math.PI * 0.35 + (i / 15) * Math.PI * 1.3;
        const x0 = Math.cos(ang) * bodyL * 0.8, y0 = Math.sin(ang) * bodyW * 0.8;
        ctx.strokeStyle = i % 2 ? sp.fur2 : '#d8cbb3';
        line(ctx, x0, y0, x0 + Math.cos(ang) * (7 + (i % 3) * 2), y0 + Math.sin(ang) * (7 + (i % 3) * 2));
      }
    }
    // Cuerpo
    ellipse(ctx, 0, 0, bodyL, bodyW, sp.fur);
    if (sp.fluffy) ellipse(ctx, -2, 0, bodyL * 0.8, bodyW * 1.25, sp.fur);
    if (sp.pattern === 'tabby') {
      ctx.strokeStyle = sp.fur2; ctx.lineWidth = 2;
      for (let k = -1; k <= 1; k++) line(ctx, k * 5 - 1, -bodyW + 1.5, k * 5 + 1.5, bodyW - 1.5);
    }
    if (sp.pattern === 'spots') { for (let i = 0; i < 5; i++) circle(ctx, -7 + i * 3.5, (i % 2 ? 2.5 : -2.5), 1.3, sp.fur2); }
    if (sp.pattern === 'calico') { ellipse(ctx, 3, -2.5, 4, 3, sp.fur2); ellipse(ctx, -5, 2.5, 3.5, 2.5, sp.fur3); }
    if (sp.pattern === 'tux') ellipse(ctx, 2, 0, 3.5, 2.5, sp.belly);
    if (sp.chubby || sp.blunt) ellipse(ctx, -1, 0, bodyL * 0.6, bodyW * 0.55, sp.fur2);
    // Orejas
    const earColor = sp.pattern === 'points' ? sp.fur2 : sp.fur;
    if (cat || sp.ear === 'tuft') {
      poly(ctx, [[hx - 3, -headR + 1], [hx - 7, -headR - 5], [hx + 1, -headR - 1]], earColor);
      poly(ctx, [[hx - 3, headR - 1], [hx - 7, headR + 5], [hx + 1, headR + 1]], earColor);
      poly(ctx, [[hx - 3.5, -headR + 1], [hx - 6, -headR - 3], [hx - 1, -headR - 0.5]], '#e9a7b3');
      poly(ctx, [[hx - 3.5, headR - 1], [hx - 6, headR + 3], [hx - 1, headR + 0.5]], '#e9a7b3');
    } else if (sp.ear === 'round') {
      const er = 3 * (sp.earSize || 1);
      circle(ctx, hx - 2, -headR - 0.5, er, sp.fur); circle(ctx, hx - 2, headR + 0.5, er, sp.fur);
      circle(ctx, hx - 2, -headR - 0.5, er * 0.55, '#e9a7b3'); circle(ctx, hx - 2, headR + 0.5, er * 0.55, '#e9a7b3');
    } else if (sp.ear === 'small') {
      circle(ctx, hx - 2, -headR, 2, sp.fur); circle(ctx, hx - 2, headR, 2, sp.fur);
    }
    // Cabeza
    if (sp.blunt) ellipse(ctx, hx, 0, headR * 1.3, headR, sp.fur);
    else circle(ctx, hx, 0, headR, sp.fur);
    if (sp.pattern === 'points') ellipse(ctx, hx + 2, 0, 4, 3.5, sp.fur2);
    if (sp.pattern === 'tabby') { ctx.strokeStyle = sp.fur2; ctx.lineWidth = 1.3; line(ctx, hx - 3, -2, hx + 1, -2); line(ctx, hx - 3, 2, hx + 1, 2); }
    if (sp.cheeks) { circle(ctx, hx - 1, -headR + 1, 3.2, sp.belly); circle(ctx, hx - 1, headR - 1, 3.2, sp.belly); }
    if (sp.claws) { ellipse(ctx, hx + 3, -headR, 3, 2, sp.nose); ellipse(ctx, hx + 3, headR, 3, 2, sp.nose); }
    // Ojos y nariz
    if (cat) {
      ellipse(ctx, hx + 2, -headR * 0.5, 1.8, 1.3, sp.eye); ellipse(ctx, hx + 2, headR * 0.5, 1.8, 1.3, sp.eye);
      circle(ctx, hx + 2.5, -headR * 0.5, 0.6, '#111'); circle(ctx, hx + 2.5, headR * 0.5, 0.6, '#111');
    } else {
      circle(ctx, hx + 1.5, -headR * 0.55, 1.2, sp.eye); circle(ctx, hx + 1.5, headR * 0.55, 1.2, sp.eye);
    }
    circle(ctx, hx + headR * (sp.blunt ? 1.3 : 1) - 0.5, 0, cat ? 1.3 : 1.6, sp.nose || '#e38a9a');
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 0.7;
    line(ctx, hx + headR - 2, -1, hx + headR + 5, -5); line(ctx, hx + headR - 2, 1, hx + headR + 5, 5);
    if (sp.crown) crown(ctx, hx - 1, 0 + 4, 4, 6);
    // Destello al recibir daño
    if (o.flash) {
      ctx.globalAlpha = o.flash * 0.7;
      ellipse(ctx, 2, 0, bodyL + headR + 2, bodyW + 2, '#ffffff');
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /* ---------------------------------------------------- bases de unidad */
  /** Dibuja el asiento de la unidad. Origen: centro de la casilla.
   *  Devuelve {x, y, scale} de dónde sentar al animal. */
  function drawBase(ctx, base, o = {}) {
    const anim = o.anim || 0;
    switch (base) {
      case 'post':
        ctx.fillStyle = '#5e4027'; ctx.fillRect(-4.5, -6, 9, 24);
        ctx.fillStyle = '#4a3220'; ctx.fillRect(-4.5, 10, 9, 8);
        ellipse(ctx, 0, -6, 13, 5, '#8a6238'); ellipse(ctx, 0, -7, 11, 3.5, '#a67a48');
        return { x: 0, y: -8, scale: 1 };
      case 'rock':
        ellipse(ctx, 0, 9, 15, 8, '#7d8388'); ellipse(ctx, -2, 7, 11, 5, '#98a0a6');
        circle(ctx, 9, 11, 2, '#6ea15c');
        return { x: 0, y: 7, scale: 1 };
      case 'stump':
        ellipse(ctx, 0, 11, 13, 6, '#5e4027');
        ellipse(ctx, 0, 8, 13, 7, '#7b5635'); ellipse(ctx, 0, 8, 9, 4.8, '#9a7148'); ellipse(ctx, 0, 8, 5, 2.6, '#7b5635');
        return { x: 0, y: 6, scale: 1 };
      case 'mound':
        ellipse(ctx, 0, 10, 15, 7.5, '#7c5e35'); ellipse(ctx, 0, 8, 14, 6.5, '#9b7a4b');
        ctx.strokeStyle = '#6f9a4c'; ctx.lineWidth = 1.5;
        line(ctx, -12, 6, -14, 1); line(ctx, 12, 6, 14, 2); line(ctx, -9, 11, -11, 7);
        return { x: 0, y: 6, scale: 1 };
      case 'tallrock':
        poly(ctx, [[-13, 16], [-10, -4], [0, -11], [10, -4], [13, 16]], '#6f757b');
        poly(ctx, [[-9, 14], [-7, -2], [0, -8], [4, 0], [3, 14]], '#8d949a');
        circle(ctx, -9, 12, 2.2, '#6ea15c');
        return { x: 0, y: -6, scale: 0.95 };
      case 'catapult': {
        ctx.fillStyle = '#5e4027'; ctx.fillRect(4, 8, 16, 4);
        ctx.fillStyle = '#4a3220'; ctx.fillRect(10, 2, 3, 10);
        const ang = -1.1 + anim * 0.9;
        ctx.save(); ctx.translate(11.5, 4); ctx.rotate(ang);
        ctx.fillStyle = '#8a6238'; ctx.fillRect(-1.5, -16, 3, 18);
        circle(ctx, 0, -16, 3.5, '#6b4a2b');
        ctx.restore();
        return { x: -7, y: 8, scale: 0.9 };
      }
      case 'log':
        ellipse(ctx, 0, 10, 16, 6, '#5e4027'); ellipse(ctx, 0, 8, 16, 6, '#7b5635'); ellipse(ctx, 13, 8, 3, 5, '#9a7148');
        return { x: 0, y: 5, scale: 1 };
      default:
        ellipse(ctx, 0, 9, 14, 6, 'rgba(0,0,0,0.25)');
        return { x: 0, y: 6, scale: 1 };
    }
  }

  /* --------------------------------------------------------- proyectiles */
  function drawProjectile(ctx, kind, o = {}) {
    const t = o.t || 0;
    switch (kind) {
      case 'piedra': circle(ctx, 0, 0, 3.2, '#8d8d8d'); circle(ctx, -1, -1, 1.2, '#b9b9b9'); break;
      case 'bellota': ellipse(ctx, 0, 1, 3.2, 4, '#8b5a2b'); ellipse(ctx, 0, -2.5, 3.6, 2, '#5a3a1b'); line(ctx, 0, -4, 0, -6, '#5a3a1b', 1.2); break;
      case 'nuez': circle(ctx, 0, 0, 4.2, '#7a4f2a'); line(ctx, -3, 0, 3, 0, '#5a3a1b', 1); circle(ctx, -1.5, -1.5, 1.2, '#a87a4e'); break;
      case 'dardo':
        ctx.save(); ctx.rotate(o.angle || 0);
        line(ctx, -7, 0, 6, 0, '#f5f1e6', 2.2); poly(ctx, [[5, -2], [9, 0], [5, 2]], '#3b3b3b'); line(ctx, -7, -2, -4, 0, '#c9a46a', 1.5);
        ctx.restore(); break;
      case 'sardina':
        ctx.save(); ctx.rotate(t * 9);
        ellipse(ctx, 0, 0, 7, 3, '#c9d3d9'); poly(ctx, [[-6, 0], [-10, -3], [-10, 3]], '#9fb0ba'); circle(ctx, 4, -0.8, 0.9, '#222');
        ctx.restore(); break;
      default: circle(ctx, 0, 0, 3, '#ddd');
    }
  }

  /* ------------------------------------------------------------- retrato */
  /** Dibuja la especie (sentada, con base opcional) centrada en un canvas pequeño. */
  function paintPortrait(canvas, look, { base = null, scale = 1, t = 0 } = {}) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const sp = SPECIES[look] || SPECIES.tabby;
    const k = (w / 64) * scale / Math.max(1, (sp.size || 1) * 0.85);
    ctx.save();
    ctx.translate(w / 2, h * 0.78);
    ctx.scale(k, k);
    let seat = { x: 0, y: 0, scale: 1 };
    if (base) { ctx.save(); ctx.translate(0, -8); seat = drawBase(ctx, base, {}); ctx.restore(); seat.y -= 8; }
    ctx.translate(seat.x, seat.y);
    drawSit(ctx, look, { t, seed: 1, scale: seat.scale });
    ctx.restore();
  }

  /** Dibuja la especie caminando (vista desde arriba, mirando a la derecha) en un canvas pequeño. */
  function paintWalker(canvas, look, { scale = 1 } = {}) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const sp = SPECIES[look] || SPECIES.mouse;
    const k = (w / 48) * scale / Math.max(1, (sp.size || 1) * 0.9);
    ctx.save(); ctx.translate(w / 2 - 2 * k, h / 2); ctx.scale(k, k);
    drawWalk(ctx, look, { t: 0.3, seed: 1, angle: 0 });
    ctx.restore();
  }

  TD.art = { SPECIES, drawSit, drawWalk, drawBase, drawProjectile, paintPortrait, paintWalker, ellipse, circle, poly, line };
})();
