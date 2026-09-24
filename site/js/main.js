/*
 * DOM glue. Everything with logic lives in invite-logic.js and is tested.
 * This file only reads config, fills the page, and toggles classes.
 */
(function () {
  'use strict';

  var config = window.INVITE_CONFIG;
  var logic = window.InviteLogic;
  if (!config || !logic) return;

  var body = document.body;
  var reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Guest name --------------------------------------------------------- */

  var guest = logic.getGuestName(window.location.search, 'Friends & Family');
  eachNode('[data-guest]', function (el) {
    el.textContent = guest;
  });

  /* Links -------------------------------------------------------------- */

  setHref('[data-rsvp]', config.rsvpUrl);

  /* Countdown ---------------------------------------------------------- */

  var countdownEl = document.querySelector('[data-countdown]');

  function renderCountdown() {
    if (!countdownEl) return;
    var c = logic.countdown(new Date(), config.start, config.end);
    if (c.state === 'today') {
      countdownEl.innerHTML = '<span class="countdown-note">Today is the day</span>';
      return;
    }
    if (c.state === 'after') {
      countdownEl.innerHTML =
        '<span class="countdown-note">Thank you for celebrating with us</span>';
      return;
    }
    countdownEl.innerHTML =
      tile(c.days, 'day') + tile(c.hours, 'hour') + tile(c.minutes, 'minute');
  }

  function tile(n, unit) {
    var label = n === 1 ? unit : unit + 's';
    return (
      '<span class="tile"><span class="num">' + n + '</span>' +
      '<span class="unit">' + label + '</span></span>'
    );
  }

  function scheduleCountdown() {
    var untilNextMinute = 60000 - (Date.now() % 60000) + 50;
    setTimeout(function () {
      renderCountdown();
      scheduleCountdown();
    }, untilNextMinute);
  }

  renderCountdown();
  scheduleCountdown();
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) renderCountdown();
  });

  /* Petals ------------------------------------------------------------- */

  var petals = document.querySelector('.petals');
  if (petals && !reduceMotion) buildPetals(petals, 22);

  /*
   * Each petal gets its own size, speed, wind drift, sway and tumble so no
   * two move alike. Bigger petals read as closer, so they fall faster and
   * sit more opaque; small ones drift slowly in the distance.
   */
  function buildPetals(layer, count) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var size = rand(9, 22);
      var near = (size - 9) / 13; // 0 = far, 1 = near
      var p = document.createElement('span');
      p.className = 'petal';
      p.style.setProperty('--x', rand(-4, 100) + 'vw');
      p.style.setProperty('--size', size + 'px');
      p.style.setProperty('--fall', (17 - near * 7 + Math.random() * 3).toFixed(1) + 's');
      p.style.setProperty('--delay', (Math.random() * 14).toFixed(1) + 's');
      p.style.setProperty('--drift', rand(-8, 16) + 'vw');
      p.style.setProperty('--sway', rand(14, 44) + 'px');
      p.style.setProperty('--sway-t', (2.4 + Math.random() * 2.2).toFixed(1) + 's');
      p.style.setProperty('--tumble-t', (1.6 + Math.random() * 2).toFixed(1) + 's');
      p.style.setProperty('--rz', rand(-60, 60) + 'deg');
      p.style.setProperty('--alpha', (0.65 + near * 0.3).toFixed(2));
      // .petal-push has no CSS animation of its own, so a tap can nudge it
      // without disturbing the fall, sway and tumble animations inside.
      p.innerHTML =
        '<span class="petal-push"><span class="petal-sway"><span class="petal-tumble">' +
        '<svg viewBox="0 0 20 24" aria-hidden="true"><use href="#petal-' +
        (i % 3 === 0 ? 'b' : 'a') +
        '"></use></svg></span></span></span>';
      frag.appendChild(p);
    }
    layer.appendChild(frag);
  }

  /*
   * One-off petals for the opening burst and the tap puff. They are built
   * like the falling petals, in three independent layers:
   *   .burst-petal   one smooth path: a soft puff up and out that peaks,
   *                  then eases into a steady fall, fading near the end
   *   .petal-sway    the same side-to-side sway as the falling petals
   *   .petal-tumble  the same 3D tumble as the falling petals
   * Keeping the motions separate is what makes them glide rather than
   * start and stop. `spread` is the sideways reach and `lift` the height
   * of the puff, both in px.
   */
  var MAX_LOOSE_PETALS = 40;
  var loosePetals = 0;

  function loosePetal(x, y, spread, lift, delay) {
    if (!petals || !petals.animate || loosePetals >= MAX_LOOSE_PETALS) return;
    loosePetals++;
    var size = rand(10, 18);
    var el = document.createElement('span');
    el.className = 'burst-petal';
    el.style.width = size + 'px';
    el.style.height = Math.round(size * 1.2) + 'px';
    el.style.left = Math.round(x - size / 2) + 'px';
    el.style.top = Math.round(y - size / 2) + 'px';
    // Sway and tumble timings in the same ranges as the falling petals.
    var swayT = 2.4 + Math.random() * 2.2;
    var tumbleT = 1.6 + Math.random() * 2;
    el.style.setProperty('--sway', rand(12, 30) + 'px');
    el.style.setProperty('--sway-t', swayT.toFixed(1) + 's');
    el.style.setProperty('--sway-delay', (-Math.random() * swayT).toFixed(1) + 's');
    el.style.setProperty('--tumble-t', tumbleT.toFixed(1) + 's');
    el.style.setProperty('--tumble-delay', (-Math.random() * tumbleT).toFixed(1) + 's');
    el.style.setProperty('--rz', rand(-60, 60) + 'deg');
    el.innerHTML =
      '<span class="petal-sway"><span class="petal-tumble">' +
      '<svg viewBox="0 0 20 24" aria-hidden="true"><use href="#petal-' +
      (Math.random() < 0.35 ? 'b' : 'a') + '"></use></svg></span></span>';
    petals.appendChild(el);

    var dx = rand(-spread, spread);          // total sideways travel
    var up = rand(Math.round(lift * 0.55), lift);
    var fall = rand(240, 340);               // descent after the peak
    var alpha = (0.75 + Math.random() * 0.2).toFixed(2);
    var PEAK = 0.2;                          // share of the time spent rising

    var anim = el.animate(
      [
        // Rise: quick at first, slowing to a stop at the top of the puff.
        {
          offset: 0,
          transform: 'translate(0px, 0px) scale(0.6)',
          opacity: 0,
          easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)'
        },
        { offset: 0.08, opacity: alpha },
        // Fall: starts from rest at the peak and settles into a steady glide.
        {
          offset: PEAK,
          transform: 'translate(' + Math.round(dx * 0.35) + 'px, ' + -up + 'px) scale(1)',
          easing: 'cubic-bezier(0.4, 0, 0.75, 0.75)'
        },
        { offset: 0.85, opacity: alpha },
        {
          offset: 1,
          transform: 'translate(' + dx + 'px, ' + (fall - up) + 'px) scale(1)',
          opacity: 0
        }
      ],
      {
        duration: rand(3200, 4400),
        delay: delay || 0,
        easing: 'linear',
        fill: 'both'
      }
    );
    anim.onfinish = function () {
      el.remove();
      loosePetals--;
    };
  }

  // A light burst from the mouth of the envelope as the flap lifts.
  function openingBurst() {
    if (!envelope) return;
    var r = envelope.getBoundingClientRect();
    var x = r.left + r.width / 2;
    var y = r.top + r.height * 0.18;
    for (var i = 0; i < 12; i++) {
      loosePetal(x + rand(-r.width * 0.28, r.width * 0.28), y, 120, 190, rand(0, 260));
    }
  }

  /*
   * Tap to scatter: a small puff of petals where the guest taps, and any
   * falling petals nearby are blown away from the tap. The push is kept
   * (and adds up across taps) so petals don't spring back afterwards.
   */
  var GUST_RADIUS = 170;

  function gust(x, y) {
    for (var i = 0; i < 5; i++) loosePetal(x, y, 70, 80, rand(0, 120));

    if (!petals) return;
    Array.prototype.forEach.call(petals.querySelectorAll('.petal-push'), function (push) {
      var r = push.getBoundingClientRect();
      var dx = r.left + r.width / 2 - x;
      var dy = r.top + r.height / 2 - y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > GUST_RADIUS || !push.animate) return;
      var strength = 1 - dist / GUST_RADIUS;
      var ux = dist ? dx / dist : Math.random() - 0.5;
      var uy = dist ? dy / dist : -1;
      var fromX = Number(push.dataset.x || 0);
      var fromY = Number(push.dataset.y || 0);
      var toX = clamp(fromX + ux * 90 * strength, -220, 220);
      var toY = clamp(fromY + (uy * 90 - 25) * strength, -220, 220);
      var spin = Math.round((Math.random() < 0.5 ? -1 : 1) * 200 * strength);
      push.dataset.x = toX;
      push.dataset.y = toY;
      push.animate(
        [
          { transform: 'translate(' + fromX + 'px, ' + fromY + 'px) rotate(0deg)' },
          { transform: 'translate(' + toX + 'px, ' + toY + 'px) rotate(' + spin + 'deg)' }
        ],
        { duration: 1100, easing: 'cubic-bezier(0.15, 0.7, 0.3, 1)', fill: 'forwards' }
      );
    });
  }

  /* Guest name --------------------------------------------------------- */

  // Write the name on once the handwriting font is ready, so the reveal
  // never plays over the fallback font. The timeout covers slow networks.
  var nameWritten = false;

  function writeName() {
    if (nameWritten) return;
    nameWritten = true;
    eachNode('.env-name', function (el) { el.classList.add('is-written'); });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { setTimeout(writeName, 350); });
  }
  setTimeout(writeName, 2500);

  /* Envelope ----------------------------------------------------------- */

  var envelope = document.querySelector('.envelope');
  var card = document.querySelector('.card');
  var headline = document.querySelector('.headline');
  var opened = false;
  var finalized = false;

  function finalize() {
    if (finalized) return;
    finalized = true;
    body.classList.remove('is-closed');
    if (petals) petals.classList.add('is-falling');
    if (headline) {
      headline.setAttribute('tabindex', '-1');
      headline.focus({ preventScroll: true });
    }
  }

  function open() {
    if (opened) return;
    opened = true;
    // Remember a hover-tilted flap so the opening continues from that angle
    // even after the envelope stops receiving pointer events.
    if (envelope.matches && envelope.matches(':hover')) envelope.classList.add('was-hover');
    body.classList.add('is-open');
    envelope.setAttribute('aria-expanded', 'true');
    writeName();
    if (!reduceMotion) setTimeout(openingBurst, 380);
    // transitionend on the card's opacity marks the end of the sequence.
    // The timeout is a safety net in case the event never fires.
    setTimeout(finalize, reduceMotion ? 0 : 2500);
  }

  /*
   * Pointer handling covers mouse and touch alike:
   *   press and hold  -> preview (.is-pressed, same look as hover)
   *   drag upward     -> flap follows the finger; release past halfway opens
   *   tap             -> the click event opens as before
   * Keyboard activation still arrives as a plain click.
   */
  var PRESS_ANGLE = 26;    // degrees, matches the hover tilt
  var OPEN_ANGLE = 95;     // release beyond this and the envelope opens
  var MAX_ANGLE = 160;     // how far a drag can pull the flap
  var DRAG_SLOP = 8;       // px of movement before a press becomes a drag
  var DRAG_RANGE = 140;    // px of upward travel for the full angle range
  var pointerId = null;
  var startY = 0;
  var dragging = false;
  var dragAngle = 0;
  var handledByPointer = false;

  function onPointerDown(e) {
    if (opened || pointerId !== null) return;
    if (e.button !== undefined && e.button !== 0) return;
    pointerId = e.pointerId;
    startY = e.clientY;
    dragging = false;
    dragAngle = 0;
    handledByPointer = false;
    envelope.classList.add('is-pressed');
    try { envelope.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }

  function onPointerMove(e) {
    if (e.pointerId !== pointerId || opened) return;
    var dy = startY - e.clientY;
    if (!dragging && dy < DRAG_SLOP) return;
    dragging = true;
    var t = Math.max(0, Math.min(1, (dy - DRAG_SLOP) / DRAG_RANGE));
    dragAngle = PRESS_ANGLE + t * (MAX_ANGLE - PRESS_ANGLE);
    envelope.classList.add('is-dragging');
    envelope.classList.toggle('is-past', dragAngle >= 90);
    envelope.style.setProperty('--flap-angle', dragAngle.toFixed(1) + 'deg');
    envelope.style.setProperty('--drag', t.toFixed(3));
  }

  function onPointerEnd(e, cancelled) {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    envelope.classList.remove('is-dragging');

    if (dragging && !cancelled && dragAngle >= OPEN_ANGLE) {
      handledByPointer = true;
      envelope.classList.add('drag-opened');
      open();
      return;
    }

    if (dragging) handledByPointer = true; // a short drag is not a tap
    envelope.classList.remove('is-past');
    envelope.style.removeProperty('--flap-angle');
    envelope.style.removeProperty('--drag');
    // A tap's click arrives right after this; keep the pressed look until
    // then so the opening continues from the tilted flap.
    setTimeout(function () {
      if (!opened) envelope.classList.remove('is-pressed');
    }, 150);
  }

  function onClick() {
    if (handledByPointer) {
      handledByPointer = false;
      return;
    }
    open();
  }

  if (envelope) {
    envelope.addEventListener('click', onClick);
    if (window.PointerEvent) {
      envelope.addEventListener('pointerdown', onPointerDown);
      envelope.addEventListener('pointermove', onPointerMove);
      envelope.addEventListener('pointerup', function (e) { onPointerEnd(e, false); });
      envelope.addEventListener('pointercancel', function (e) { onPointerEnd(e, true); });
      envelope.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }
  }
  if (card) {
    card.addEventListener('transitionend', function (e) {
      if (e.target === card && e.propertyName === 'opacity') finalize();
    });
  }

  // Tap anywhere except links and buttons to scatter petals.
  document.addEventListener('click', function (e) {
    if (!finalized || reduceMotion) return;
    if (e.target.closest && e.target.closest('a, button')) return;
    gust(e.clientX, e.clientY);
  });

  /* Scroll reveal ------------------------------------------------------ */

  var details = document.querySelector('.details');
  if (details) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              details.classList.add('is-visible');
              io.disconnect();
            }
          });
        },
        { threshold: 0.15 }
      );
      io.observe(details);
    } else {
      details.classList.add('is-visible');
    }
  }

  /* Helpers ------------------------------------------------------------ */

  function eachNode(selector, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), fn);
  }

  function setHref(selector, url) {
    eachNode(selector, function (a) {
      a.setAttribute('href', url);
    });
  }

  function rand(min, max) {
    return Math.round(min + Math.random() * (max - min));
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }
})();
