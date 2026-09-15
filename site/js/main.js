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
      p.innerHTML =
        '<span class="petal-sway"><span class="petal-tumble">' +
        '<svg viewBox="0 0 20 24" aria-hidden="true"><use href="#petal-' +
        (i % 3 === 0 ? 'b' : 'a') +
        '"></use></svg></span></span>';
      frag.appendChild(p);
    }
    layer.appendChild(frag);
  }

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
})();
