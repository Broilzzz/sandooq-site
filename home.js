// Home page animations. Everything here is decoration: the page reads the
// same without it, and visitors who ask for less motion get still pictures.
(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);

  // ── Small helpers ──────────────────────────────────────────────────────
  const CH = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789+/';
  const cipher = (n) => Array.from({ length: n }, () => CH[(Math.random() * CH.length) | 0]).join('');

  /** Turns the text of [el] into [to], letter by letter, through random characters. */
  function scramble(el, to, dur) {
    const from = Array.from(el.textContent);
    const target = Array.from(to);
    const n = Math.max(from.length, target.length);
    return new Promise((done) => {
      const t0 = performance.now();
      const frame = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        let out = '';
        for (let i = 0; i < n; i++) {
          const start = 0.3 * (i / n);
          const settle = 0.35 + 0.65 * (i / n);
          if (p < start) out += from[i] ?? '';
          else if (p < settle) out += (target[i] ?? from[i]) === ' ' ? ' ' : CH[(Math.random() * CH.length) | 0];
          else out += target[i] ?? '';
        }
        el.textContent = out;
        if (p < 1) requestAnimationFrame(frame);
        else { el.textContent = to; done(); }
      };
      requestAnimationFrame(frame);
    });
  }

  /** Runs a Web Animation, keeps its end state as inline style, and resolves when done. */
  function play(el, frames, opts) {
    const a = el.animate(frames, Object.assign({ fill: 'forwards' }, opts));
    return a.finished.then(() => {
      try { a.commitStyles(); } catch (_) { /* element hidden */ }
      a.cancel();
    }, () => {});
  }

  /** A pausable clock: waits only count while [isOn()] is true. */
  function makeGate(isOn) {
    let waiters = [];
    const check = () => {
      if (!isOn()) return;
      const w = waiters; waiters = [];
      w.forEach((r) => r());
    };
    const ready = () => (isOn() ? Promise.resolve() : new Promise((r) => waiters.push(r)));
    const wait = async (ms) => {
      await ready();
      await new Promise((r) => setTimeout(r, ms));
      await ready();
    };
    return { check, ready, wait };
  }

  function watch(el, onChange) {
    if (!('IntersectionObserver' in window)) { onChange(true); return; }
    new IntersectionObserver((es) => es.forEach((e) => onChange(e.isIntersecting)), { threshold: 0.2 }).observe(el);
  }

  // ── Reveal on scroll ───────────────────────────────────────────────────
  const reveals = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el) => io.observe(el));
  }

  // ── The vault scene ────────────────────────────────────────────────────
  const box = document.querySelector('.scene-box');
  const stage = $('stage');
  if (box && stage) {
    const fit = () => stage.style.setProperty('--s', box.clientWidth / 540);
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(box); else addEventListener('resize', fit);
  }

  const docs = [
    { type: 'PASSPORT', tag: 'IND', c: '#24406B', labels: ['Name', 'Number', 'Expires'], vals: ['Amma K.', 'P 4821907', '12 Apr 2031'], who: "Amma's passport" },
    { type: 'AADHAAR', tag: 'IND', c: '#A86F0E', labels: ['Name', 'Number', 'Born'], vals: ['Ravi Menon', '4821 9073 5512', '04 Jun 1987'], who: "Ravi's Aadhaar card" },
    { type: 'EMIRATES ID', tag: 'UAE', c: '#1D7A3A', labels: ['Name', 'ID number', 'Expires'], vals: ['Fatima S.', '784-1990-4821907-1', '03 Feb 2028'], who: "Fatima's Emirates ID" },
  ];
  const lines = [
    (d) => `You scan ${d.who}.`,
    () => 'Your phone reads the name, number and date. Nothing is sent anywhere.',
    () => "Every detail is encrypted with the vault's key, right on your phone.",
    () => "Locked in the vault. Only your family's phones hold the key.",
  ];

  const doc = $('doc'), door = $('door'), dial = $('dial'), glow = $('glow'), interior = $('interior'), led = $('led');
  if (doc && door) {
    const scan = doc.querySelector('.scanline');
    const noise = doc.querySelector('.noise');
    const lock = doc.querySelector('.doc-lock');
    const bolts = door.querySelectorAll('.bolt');
    const fields = [0, 1, 2].map((i) => $('f' + i));
    const labels = [0, 1, 2].map((i) => $('l' + i));
    const steps = Array.from(document.querySelectorAll('#steps li'));
    const line = $('scene-line');

    let onScreen = false;
    const gate = makeGate(() => onScreen && !document.hidden);
    watch(document.querySelector('.scene'), (v) => { onScreen = v; gate.check(); });
    document.addEventListener('visibilitychange', gate.check);

    function addMini(color, instant) {
      const m = document.createElement('div');
      m.className = 'mini';
      m.style.setProperty('--c', color);
      m.innerHTML = '<i></i><u></u><b></b><b></b><b></b>';
      interior.appendChild(m);
      const all = Array.from(interior.querySelectorAll('.mini'));
      while (all.length > 3) all.shift().remove();
      const tilt = [0, -6, 5];
      all.reverse().forEach((el, k) => {
        if (instant) el.style.transition = 'none';
        el.style.transform = `translate(${-12 * k}px, ${-14 * k}px) rotate(${tilt[k]}deg)`;
        el.style.filter = `brightness(${1 - 0.14 * k})`;
      });
    }

    function setStep(i, ms, d) {
      steps.forEach((li, k) => { li.classList.toggle('done', k < i); li.classList.remove('on'); li.style.removeProperty('--d'); });
      if (i >= 0 && i < steps.length) {
        void steps[i].offsetWidth;
        steps[i].style.setProperty('--d', ms + 'ms');
        requestAnimationFrame(() => requestAnimationFrame(() => steps[i].classList.add('on')));
      }
      if (line) {
        line.style.opacity = 0;
        setTimeout(() => { line.textContent = i >= 0 ? lines[i](d) : ' '; line.style.opacity = 1; }, 200);
      }
    }

    function loadDoc(d) {
      doc.classList.remove('sealed');
      doc.style.setProperty('--c', d.c);
      $('doc-type').textContent = d.type;
      $('doc-tag').textContent = d.tag;
      d.vals.forEach((v, i) => { fields[i].textContent = v; labels[i].textContent = d.labels[i]; });
      noise.style.opacity = 0;
      lock.style.transform = 'scale(0)';
      doc.style.opacity = 0;
      doc.style.transform = 'translate(220px, -40px) rotate(10deg)';
    }

    function lockedStill() {
      loadDoc(docs[0]);
      door.style.transform = 'rotateY(0deg)';
      bolts.forEach((b) => (b.style.transform = 'translateX(14px)'));
      led.classList.add('on');
      addMini('#3D6FB6', true); addMini('#A86F0E', true); addMini('#24406B', true);
      steps.forEach((li) => li.classList.add('done'));
      line.textContent = lines[3]();
    }

    async function cycle(d) {
      loadDoc(d);
      await gate.ready();

      // 1. Scan
      setStep(0, 1800, d);
      await play(doc, [
        { opacity: 0, transform: 'translate(220px, -40px) rotate(10deg)' },
        { opacity: 1, transform: 'translate(0, 0) rotate(-3deg)' },
      ], { duration: 950, easing: 'cubic-bezier(.2,.9,.3,1.12)' });
      await play(scan, [{ top: '-6px', opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: 1, offset: .9 }, { top: '140px', opacity: 0 }], { duration: 950, easing: 'ease-in-out' });

      // 2. Read on the phone
      setStep(1, 1500, d);
      for (const f of fields) { f.parentElement.classList.add('hl'); await gate.wait(380); }
      await gate.wait(380);
      fields.forEach((f) => f.parentElement.classList.remove('hl'));

      // 3. Encrypt
      setStep(2, 1500, d);
      doc.classList.add('sealed');
      play(noise, [{ opacity: 0 }, { opacity: 1 }], { duration: 700 });
      await Promise.all(fields.map((f, i) => scramble(f, cipher(Math.max(10, f.textContent.length + 2)), 900 + i * 120)));
      await play(lock, [{ transform: 'scale(0)' }, { transform: 'scale(1.18)', offset: .7 }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
      await gate.wait(500);

      // 4. Into the vault, door shut, locked
      setStep(3, 2400, d);
      await play(doc, [
        { transform: 'translate(0, 0) rotate(-3deg)' },
        { transform: 'translate(0, -14px) rotate(-1deg) scale(.96)', offset: .25 },
        { transform: 'translate(0, 214px) scale(.62)' },
      ], { duration: 950, easing: 'cubic-bezier(.45,0,.2,1)' });
      await play(door, [
        { transform: 'rotateY(-102deg)' },
        { transform: 'rotateY(3deg)', offset: .86 },
        { transform: 'rotateY(0deg)' },
      ], { duration: 1000, easing: 'cubic-bezier(.55,0,.3,1)' });
      addMini(d.c);
      doc.style.opacity = 0;
      await Promise.all(Array.from(bolts).map((b) => play(b, [{ transform: 'translateX(0)' }, { transform: 'translateX(14px)' }], { duration: 260, easing: 'cubic-bezier(.3,0,.2,1)' })));
      await play(dial, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(380deg)', offset: .8 }, { transform: 'rotate(360deg)' }], { duration: 900, easing: 'cubic-bezier(.5,0,.3,1)' });
      led.classList.add('on');
      play(glow, [
        { opacity: 1, boxShadow: '0 0 0 0 rgba(47,179,164,.6)' },
        { opacity: 0, boxShadow: '0 0 0 30px rgba(47,179,164,0)' },
      ], { duration: 1100, easing: 'ease-out' });
      await gate.wait(2800);

      // Open up again for the next one
      setStep(-1);
      led.classList.remove('on');
      await play(dial, [{ transform: 'rotate(360deg)' }, { transform: 'rotate(0deg)' }], { duration: 600, easing: 'ease-in-out' });
      await Promise.all(Array.from(bolts).map((b) => play(b, [{ transform: 'translateX(14px)' }, { transform: 'translateX(0)' }], { duration: 220 })));
      await play(door, [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-102deg)' }], { duration: 850, easing: 'cubic-bezier(.4,0,.2,1)' });
      await gate.wait(350);
    }

    if (reduce || !doc.animate) {
      lockedStill();
    } else {
      addMini('#3D6FB6', true); addMini('#5C5C66', true);
      (async () => {
        for (let i = 0; ; i = (i + 1) % docs.length) await cycle(docs[i]);
      })();
    }
  }

  // ── Phone vs server ────────────────────────────────────────────────────
  const view = $('view'), bPhone = $('v-phone'), bServer = $('v-server');
  if (view && bPhone && bServer) {
    const encs = Array.from(view.querySelectorAll('[data-plain]'));
    let server = false, auto = !reduce, busy = false;
    async function show(toServer) {
      if (toServer === server || busy) return;
      busy = true; server = toServer;
      bPhone.setAttribute('aria-pressed', String(!toServer));
      bServer.setAttribute('aria-pressed', String(toServer));
      view.classList.toggle('server', toServer);
      if (toServer) encs.forEach((el) => el.classList.add('enc'));
      const dur = reduce ? 1 : 750;
      await Promise.all(encs.map((el) => scramble(el, toServer ? cipher(Math.max(14, el.dataset.plain.length + 6)) : el.dataset.plain, dur)));
      if (!toServer) encs.forEach((el) => el.classList.remove('enc'));
      busy = false;
    }
    bPhone.addEventListener('click', () => { auto = false; show(false); });
    bServer.addEventListener('click', () => { auto = false; show(true); });

    let seen = false;
    const gate = makeGate(() => seen && !document.hidden);
    watch(view, (v) => { seen = v; gate.check(); });
    document.addEventListener('visibilitychange', gate.check);
    (async () => {
      await gate.wait(1200);
      while (auto) {
        await show(!server);
        await gate.wait(server ? 3600 : 2600);
      }
    })();
  }

  // ── Voice search demo ──────────────────────────────────────────────────
  const voice = $('voice');
  if (voice) {
    const asks = [
      { lang: 'മലയാളം', code: 'ml', said: 'അമ്മയുടെ പാസ്പോർട്ട്', title: 'Amma · Passport', sub: 'Expires Apr 2031', th: 'PASS', c: '#24406B' },
      { lang: 'हिन्दी', code: 'hi', said: 'पापा का आधार कार्ड', title: 'Papa · Aadhaar', sub: 'Found in its text', th: 'UID', c: '#A86F0E' },
      { lang: 'العربية', code: 'ar', said: 'الهوية الإماراتية لفاطمة', title: 'Fatima · Emirates ID', sub: 'Expires Feb 2028', th: 'EID', c: '#1D7A3A' },
      { lang: 'தமிழ்', code: 'ta', said: 'அப்பாவின் பான் கார்டு', title: 'Appa · PAN card', sub: 'Folder: Appa', th: 'PAN', c: '#3D6FB6' },
      { lang: 'ಕನ್ನಡ', code: 'kn', said: 'ಅಜ್ಜಿಯ ಆಧಾರ್', title: 'Ajji · Aadhaar', sub: 'Folder: Ajji', th: 'UID', c: '#A86F0E' },
      { lang: 'English', code: 'en', said: "Ravi's Iqama", title: 'Ravi · Iqama', sub: 'Expires Sep 2027', th: 'IQAMA', c: '#5C5C66' },
    ];
    const said = $('v-said'), chip = $('v-lang'), found = $('v-found');
    const seg = 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
    const graphemes = (s) => (seg ? Array.from(seg.segment(s), (x) => x.segment) : Array.from(s));

    const setAsk = (a) => {
      chip.textContent = a.lang;
      said.lang = a.code;
      said.dir = a.code === 'ar' ? 'rtl' : 'ltr';
      $('v-title').textContent = a.title;
      $('v-sub').textContent = a.sub;
      $('v-th').textContent = a.th;
      found.style.setProperty('--c', a.c);
    };

    if (reduce) {
      setAsk(asks[0]);
      said.textContent = asks[0].said;
      voice.classList.add('found-in');
    } else {
      let seen = false;
      const gate = makeGate(() => seen && !document.hidden);
      watch(voice, (v) => { seen = v; gate.check(); });
      document.addEventListener('visibilitychange', gate.check);
      const caret = '<span class="caret"></span>';
      (async () => {
        for (let i = 0; ; i = (i + 1) % asks.length) {
          const a = asks[i];
          setAsk(a);
          said.innerHTML = caret;
          voice.classList.add('listening');
          await gate.wait(800);
          let typed = '';
          for (const g of graphemes(a.said)) {
            typed += g;
            said.textContent = typed;
            said.insertAdjacentHTML('beforeend', caret);
            await gate.wait(65);
          }
          await gate.wait(400);
          said.textContent = typed;
          voice.classList.remove('listening');
          voice.classList.add('found-in');
          await gate.wait(2600);
          voice.classList.remove('found-in');
          await gate.wait(450);
        }
      })();
    }
  }

  // ── Key diagram ────────────────────────────────────────────────────────
  const keys = $('keys');
  if (keys && keys.pauseAnimations) {
    if (reduce) keys.pauseAnimations();
    else watch(keys, (v) => (v ? keys.unpauseAnimations() : keys.pauseAnimations()));
  }
})();
