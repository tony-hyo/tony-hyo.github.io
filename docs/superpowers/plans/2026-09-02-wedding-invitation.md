# Animated Wedding Invitation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, mobile-first wedding invitation: tap a sealed envelope, the card slides out, petals fall, and three buttons link to Withjoy, a calendar entry, and directions.

**Architecture:** One HTML page in `site/` with a stylesheet, a config file, a pure-logic module, and a small DOM glue script. The envelope opening is CSS transitions and keyframes toggled by a body class. Pure functions (guest name, countdown, calendar URL, ICS text) are unit-tested with Node's built-in test runner. A tiny Node script writes the static `.ics` file.

**Tech Stack:** HTML, CSS, vanilla JS (classic scripts, no modules), Node 22 for tests and the ICS generator, Google Fonts, headless Chrome for the preview image. Zero npm dependencies.

**Spec:** `docs/superpowers/specs/2026-09-02-wedding-invitation-design.md`

## Global Constraints

- Site must work when `site/index.html` is opened directly from disk (`file://`). No ES modules, no `fetch`, no cross-file `<use>` references.
- No npm dependencies. `package.json` holds scripts only. No `"type": "module"`.
- Only `site/` is deployed. Docs, scripts, and tests live outside it.
- **Never run git write commands.** The repository owner commits and pushes. Each task ends by leaving changes in the working tree with a suggested commit message.
- Palette tokens, exactly as the spec lists them: `--paper #F7F3EE`, `--card #FCFAF6`, `--ink #3B2A26`, `--ink-soft #7A6660`, `--blush #F5E4E8`, `--blush-deep #EBCBD4`, `--liner #E9A9BE`, `--blossom #E99BB4`, `--blossom-light #F4C6D3`, `--blossom-deep #D6608A`, `--branch #4A3228`.
- Fonts: Cormorant Garamond (300, 400, 500, italic 400) and Mrs Saint Delafield, from Google Fonts with `display=swap`.
- Guest name is inserted with `textContent` only. Never `innerHTML` with user-controlled text.
- Respect `prefers-reduced-motion: reduce`: no petals, no timed sequence.
- Placeholder content is `Tony & Jamie`, `2027-06-12T16:00:00-07:00`, `The Garden Pavilion, 123 Blossom Lane, Sacramento, CA 95814`, `https://withjoy.com/tony-and-jamie`, `https://tony-and-jamie.pages.dev`. README lists every place these appear.

---

## File map

| File | Responsibility |
|---|---|
| `package.json` | `npm test` and `npm run ics` scripts. Nothing else. |
| `site/js/config.js` | Machine-readable event values. Browser global `INVITE_CONFIG`, Node `module.exports`. |
| `site/js/invite-logic.js` | Pure functions. Browser global `InviteLogic`, Node `module.exports`. |
| `test/invite-logic.test.js` | Unit tests for every exported function. |
| `scripts/make-ics.js` | Writes `site/wedding.ics` from config. |
| `site/assets/blossom-branch.svg` | The branch artwork. Swappable. |
| `site/assets/favicon.svg` | One blossom. |
| `site/index.html` | Markup, meta tags, inline SVG symbols, all human text. |
| `site/css/styles.css` | Tokens, layout, envelope, card, details, petals, motion. |
| `site/js/main.js` | DOM glue: name, links, countdown, petals, envelope, scroll reveal. |
| `scripts/preview.html` + `site/assets/preview.png` | Link preview image source and output. |
| `README.md` | Editing, previewing, testing, deploying. |

---

### Task 1: Scaffold and config

**Files:**
- Create: `package.json`
- Create: `site/js/config.js`

**Interfaces:**
- Produces: `INVITE_CONFIG` object with keys `coupleNames`, `eventTitle`, `start`, `end`, `timeZone`, `venueName`, `venueAddress`, `mapUrl`, `rsvpUrl`, `siteUrl`, `calendarDescription`. All strings. `start` and `end` are ISO 8601 with a UTC offset.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "wedding-invitation",
  "version": "1.0.0",
  "private": true,
  "description": "Animated cherry blossom wedding invitation. Static site, no dependencies.",
  "scripts": {
    "test": "node --test",
    "ics": "node scripts/make-ics.js"
  }
}
```

- [ ] **Step 2: Create `site/js/config.js`**

```js
/*
 * Machine-readable event details.
 * Human-facing text (names on the card, the written date, venue lines) is
 * edited directly in site/index.html. Keep the date here and there in sync.
 *
 * After changing anything here, run `npm run ics` to regenerate wedding.ics.
 */
(function (root, factory) {
  var config = factory();
  if (typeof module === 'object' && module.exports) module.exports = config;
  else root.INVITE_CONFIG = config;
})(this, function () {
  return {
    coupleNames: 'Tony & Jamie',
    eventTitle: "Tony & Jamie's Wedding",

    // ISO 8601 with the venue's UTC offset. -07:00 is Pacific Daylight Time.
    start: '2027-06-12T16:00:00-07:00',
    end: '2027-06-12T23:00:00-07:00',
    timeZone: 'America/Los_Angeles',

    venueName: 'The Garden Pavilion',
    venueAddress: '123 Blossom Lane, Sacramento, CA 95814',
    // Optional. Paste a Google Maps share link to pin the exact place.
    // Leave empty to build a search link from the name and address.
    mapUrl: '',

    rsvpUrl: 'https://withjoy.com/tony-and-jamie',

    // The deployed address of this site, no trailing slash.
    siteUrl: 'https://tony-and-jamie.pages.dev',

    calendarDescription: 'Details and RSVP: https://withjoy.com/tony-and-jamie'
  };
});
```

- [ ] **Step 3: Verify Node can load it**

Run: `node -e "console.log(require('./site/js/config.js').eventTitle)"`
Expected: `Tony & Jamie's Wedding`

- [ ] **Step 4: Hand off for commit**

Do not commit. Suggested message for the owner: `chore: scaffold package.json and event config`

---

### Task 2: Guest name parsing

**Files:**
- Create: `site/js/invite-logic.js`
- Create: `test/invite-logic.test.js`

**Interfaces:**
- Produces: `InviteLogic.getGuestName(search: string | null, fallback: string): string`

- [ ] **Step 1: Write the failing tests**

Create `test/invite-logic.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../site/js/invite-logic.js');

const FALLBACK = 'Friends & Family';

test('getGuestName: decodes an encoded ampersand and spaces', () => {
  assert.equal(L.getGuestName('?to=Jane%20%26%20John', FALLBACK), 'Jane & John');
});

test('getGuestName: treats plus as a space', () => {
  assert.equal(L.getGuestName('?to=Jane+Doe', FALLBACK), 'Jane Doe');
});

test('getGuestName: falls back when the parameter is missing', () => {
  assert.equal(L.getGuestName('', FALLBACK), FALLBACK);
  assert.equal(L.getGuestName(null, FALLBACK), FALLBACK);
  assert.equal(L.getGuestName('?foo=bar', FALLBACK), FALLBACK);
});

test('getGuestName: falls back when the value is empty or whitespace', () => {
  assert.equal(L.getGuestName('?to=', FALLBACK), FALLBACK);
  assert.equal(L.getGuestName('?to=%20%20', FALLBACK), FALLBACK);
});

test('getGuestName: trims and collapses whitespace', () => {
  assert.equal(L.getGuestName('?to=%20%20Jane%20%20%20Doe%20', FALLBACK), 'Jane Doe');
});

test('getGuestName: replaces control characters with spaces', () => {
  assert.equal(L.getGuestName('?to=Jane%0ADoe%09Smith', FALLBACK), 'Jane Doe Smith');
});

test('getGuestName: caps length at 60 characters', () => {
  const long = 'A'.repeat(80);
  assert.equal(L.getGuestName('?to=' + long, FALLBACK).length, 60);
});

test('getGuestName: keeps non-ASCII names intact', () => {
  assert.equal(L.getGuestName('?to=Jos%C3%A9%20%26%20Zo%C3%AB', FALLBACK), 'José & Zoë');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../site/js/invite-logic.js'`

- [ ] **Step 3: Create `site/js/invite-logic.js` with `getGuestName`**

```js
/*
 * Pure functions for the invitation. No DOM, no globals, no clock.
 * Loaded as a classic script in the browser (window.InviteLogic) and
 * required from Node for tests and the ICS generator.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.InviteLogic = api;
})(this, function () {
  'use strict';

  var MAX_NAME_LENGTH = 60;

  /**
   * Read the guest name from a query string like "?to=Jane%20%26%20John".
   * Returns `fallback` when the parameter is missing or blank.
   */
  function getGuestName(search, fallback) {
    var params = new URLSearchParams(search || '');
    var raw = params.get('to');
    if (raw === null) return fallback;

    var cleaned = raw
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) return fallback;

    var chars = Array.from(cleaned);
    if (chars.length > MAX_NAME_LENGTH) {
      cleaned = chars.slice(0, MAX_NAME_LENGTH).join('').trim();
    }
    return cleaned;
  }

  return {
    getGuestName: getGuestName
  };
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: 8 passing, 0 failing.

- [ ] **Step 5: Hand off for commit**

Do not commit. Suggested message: `feat: parse guest name from the ?to= parameter`

---

### Task 3: Countdown

**Files:**
- Modify: `site/js/invite-logic.js`
- Modify: `test/invite-logic.test.js`

**Interfaces:**
- Produces: `InviteLogic.countdown(now, start, end): { state: 'before' | 'today' | 'after', days: number, hours: number, minutes: number }`. Inputs are `Date` objects or ISO strings. `'today'` covers `start` through `end` inclusive.

- [ ] **Step 1: Append the failing tests**

Append to `test/invite-logic.test.js`:

```js
// 2027-06-12T16:00-07:00 is 2027-06-12T23:00:00Z. End is 2027-06-13T06:00:00Z.
const START = '2027-06-12T16:00:00-07:00';
const END = '2027-06-12T23:00:00-07:00';

test('countdown: whole days before', () => {
  assert.deepEqual(
    L.countdown('2027-06-10T23:00:00Z', START, END),
    { state: 'before', days: 2, hours: 0, minutes: 0 }
  );
});

test('countdown: mixed days, hours, minutes', () => {
  assert.deepEqual(
    L.countdown('2027-06-10T20:15:00Z', START, END),
    { state: 'before', days: 2, hours: 2, minutes: 45 }
  );
});

test('countdown: floors partial minutes', () => {
  assert.deepEqual(
    L.countdown('2027-06-10T22:59:30Z', START, END),
    { state: 'before', days: 2, hours: 0, minutes: 0 }
  );
});

test('countdown: one minute before', () => {
  assert.deepEqual(
    L.countdown('2027-06-12T22:59:00Z', START, END),
    { state: 'before', days: 0, hours: 0, minutes: 1 }
  );
});

test('countdown: exactly at start is today', () => {
  assert.equal(L.countdown('2027-06-12T23:00:00Z', START, END).state, 'today');
});

test('countdown: during the event is today', () => {
  assert.equal(L.countdown('2027-06-13T02:00:00Z', START, END).state, 'today');
});

test('countdown: exactly at end is still today', () => {
  assert.equal(L.countdown('2027-06-13T06:00:00Z', START, END).state, 'today');
});

test('countdown: after the end', () => {
  assert.deepEqual(
    L.countdown('2027-06-13T06:00:01Z', START, END),
    { state: 'after', days: 0, hours: 0, minutes: 0 }
  );
});

test('countdown: accepts Date objects', () => {
  const r = L.countdown(new Date('2027-06-10T23:00:00Z'), new Date(START), new Date(END));
  assert.equal(r.days, 2);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: the new tests FAIL with `L.countdown is not a function`

- [ ] **Step 3: Add `countdown` to `site/js/invite-logic.js`**

Insert above the `return {` block:

```js
  var MINUTE = 60 * 1000;
  var HOUR = 60 * MINUTE;
  var DAY = 24 * HOUR;

  function toTime(value) {
    return value instanceof Date ? value.getTime() : new Date(value).getTime();
  }

  /**
   * Time remaining until `start`, as whole days/hours/minutes.
   * state: 'before' | 'today' (start..end inclusive) | 'after'
   */
  function countdown(now, start, end) {
    var t = toTime(now);
    var s = toTime(start);
    var e = toTime(end);

    if (t > e) return { state: 'after', days: 0, hours: 0, minutes: 0 };
    if (t >= s) return { state: 'today', days: 0, hours: 0, minutes: 0 };

    var remaining = s - t;
    return {
      state: 'before',
      days: Math.floor(remaining / DAY),
      hours: Math.floor((remaining % DAY) / HOUR),
      minutes: Math.floor((remaining % HOUR) / MINUTE)
    };
  }
```

And add `countdown: countdown` to the returned object.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: 17 passing, 0 failing.

- [ ] **Step 5: Hand off for commit**

Do not commit. Suggested message: `feat: countdown calculation`

---

### Task 4: Calendar URL, maps URL, UTC stamp

**Files:**
- Modify: `site/js/invite-logic.js`
- Modify: `test/invite-logic.test.js`

**Interfaces:**
- Produces:
  - `InviteLogic.toIcsUtc(date: Date | string): string` → `YYYYMMDDTHHMMSSZ`
  - `InviteLogic.locationString(config): string` → `"<venueName>, <venueAddress>"`
  - `InviteLogic.googleCalendarUrl(config): string`
  - `InviteLogic.mapsUrl(config): string`

- [ ] **Step 1: Append the failing tests**

Append to `test/invite-logic.test.js`:

```js
const CONFIG = {
  coupleNames: 'Tony & Jamie',
  eventTitle: "Tony & Jamie's Wedding",
  start: START,
  end: END,
  timeZone: 'America/Los_Angeles',
  venueName: 'The Garden Pavilion',
  venueAddress: '123 Blossom Lane, Sacramento, CA 95814',
  mapUrl: '',
  rsvpUrl: 'https://withjoy.com/tony-and-jamie',
  siteUrl: 'https://tony-and-jamie.pages.dev',
  calendarDescription: 'Details and RSVP: https://withjoy.com/tony-and-jamie'
};

test('toIcsUtc: formats a Date in UTC', () => {
  assert.equal(L.toIcsUtc(new Date(Date.UTC(2027, 5, 12, 23, 0, 0))), '20270612T230000Z');
});

test('toIcsUtc: accepts an offset ISO string', () => {
  assert.equal(L.toIcsUtc('2027-06-12T16:00:00-07:00'), '20270612T230000Z');
  assert.equal(L.toIcsUtc('2027-06-12T23:00:00-07:00'), '20270613T060000Z');
});

test('locationString: joins venue name and address', () => {
  assert.equal(L.locationString(CONFIG), 'The Garden Pavilion, 123 Blossom Lane, Sacramento, CA 95814');
});

test('locationString: skips a missing venue name', () => {
  assert.equal(L.locationString({ venueName: '', venueAddress: '1 Main St' }), '1 Main St');
});

test('googleCalendarUrl: builds a template link with UTC dates', () => {
  const url = new URL(L.googleCalendarUrl(CONFIG));
  assert.equal(url.origin + url.pathname, 'https://calendar.google.com/calendar/render');
  assert.equal(url.searchParams.get('action'), 'TEMPLATE');
  assert.equal(url.searchParams.get('text'), "Tony & Jamie's Wedding");
  assert.equal(url.searchParams.get('dates'), '20270612T230000Z/20270613T060000Z');
  assert.equal(url.searchParams.get('details'), 'Details and RSVP: https://withjoy.com/tony-and-jamie');
  assert.equal(url.searchParams.get('location'), 'The Garden Pavilion, 123 Blossom Lane, Sacramento, CA 95814');
  assert.equal(url.searchParams.get('ctz'), 'America/Los_Angeles');
});

test('googleCalendarUrl: omits ctz when no timezone is set', () => {
  const url = new URL(L.googleCalendarUrl(Object.assign({}, CONFIG, { timeZone: '' })));
  assert.equal(url.searchParams.has('ctz'), false);
});

test('mapsUrl: returns the override when set', () => {
  const cfg = Object.assign({}, CONFIG, { mapUrl: 'https://maps.app.goo.gl/abc123' });
  assert.equal(L.mapsUrl(cfg), 'https://maps.app.goo.gl/abc123');
});

test('mapsUrl: builds a search link from name and address', () => {
  assert.equal(
    L.mapsUrl(CONFIG),
    'https://www.google.com/maps/search/?api=1&query=The%20Garden%20Pavilion%2C%20123%20Blossom%20Lane%2C%20Sacramento%2C%20CA%2095814'
  );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: the new tests FAIL with `L.toIcsUtc is not a function` and similar.

- [ ] **Step 3: Add the functions to `site/js/invite-logic.js`**

Insert above the `return {` block:

```js
  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  /** "20270612T230000Z" for a Date or ISO string. */
  function toIcsUtc(value) {
    var d = value instanceof Date ? value : new Date(value);
    return (
      d.getUTCFullYear() +
      pad2(d.getUTCMonth() + 1) +
      pad2(d.getUTCDate()) +
      'T' +
      pad2(d.getUTCHours()) +
      pad2(d.getUTCMinutes()) +
      pad2(d.getUTCSeconds()) +
      'Z'
    );
  }

  function locationString(config) {
    return [config.venueName, config.venueAddress].filter(Boolean).join(', ');
  }

  function googleCalendarUrl(config) {
    var params = new URLSearchParams();
    params.set('action', 'TEMPLATE');
    params.set('text', config.eventTitle);
    params.set('dates', toIcsUtc(config.start) + '/' + toIcsUtc(config.end));
    params.set('details', config.calendarDescription || '');
    params.set('location', locationString(config));
    if (config.timeZone) params.set('ctz', config.timeZone);
    return 'https://calendar.google.com/calendar/render?' + params.toString();
  }

  function mapsUrl(config) {
    if (config.mapUrl) return config.mapUrl;
    return (
      'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(locationString(config))
    );
  }
```

Add to the returned object: `toIcsUtc`, `locationString`, `googleCalendarUrl`, `mapsUrl`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: 25 passing, 0 failing.

- [ ] **Step 5: Hand off for commit**

Do not commit. Suggested message: `feat: calendar and maps links`

---

### Task 5: ICS builder and generator script

**Files:**
- Modify: `site/js/invite-logic.js`
- Modify: `test/invite-logic.test.js`
- Create: `scripts/make-ics.js`
- Generate: `site/wedding.ics`

**Interfaces:**
- Consumes: `toIcsUtc`, `locationString` from Task 4; `INVITE_CONFIG` from Task 1.
- Produces: `InviteLogic.escapeIcsText(text): string`, `InviteLogic.foldIcsLine(line): string`, `InviteLogic.buildIcs(config, now: Date): string`.

- [ ] **Step 1: Append the failing tests**

Append to `test/invite-logic.test.js`:

```js
const NOW = new Date('2026-09-02T12:00:00Z');

test('escapeIcsText: escapes backslash, semicolon, comma, newline', () => {
  assert.equal(L.escapeIcsText('a\\b;c,d\ne\r\nf'), 'a\\\\b\\;c\\,d\\ne\\nf');
});

test('foldIcsLine: leaves short lines alone', () => {
  assert.equal(L.foldIcsLine('SUMMARY:Short'), 'SUMMARY:Short');
});

test('foldIcsLine: folds at 75 octets with a leading space', () => {
  const line = 'DESCRIPTION:' + 'x'.repeat(100);
  const folded = L.foldIcsLine(line);
  const parts = folded.split('\r\n');
  assert.equal(parts.length, 2);
  assert.equal(Buffer.byteLength(parts[0], 'utf8'), 75);
  assert.equal(parts[1][0], ' ');
  assert.equal(parts.join('').replace(/\r\n /g, ''), line.slice(0, 75) + ' ' + line.slice(75));
});

test('foldIcsLine: counts multibyte characters by octets', () => {
  const line = 'SUMMARY:' + 'é'.repeat(60); // 8 + 120 octets
  const parts = L.foldIcsLine(line).split('\r\n');
  parts.forEach((p) => assert.ok(Buffer.byteLength(p, 'utf8') <= 75, 'line over 75 octets'));
});

test('buildIcs: produces a valid single-event calendar', () => {
  const ics = L.buildIcs(CONFIG, NOW);
  const lines = ics.split('\r\n');
  assert.equal(lines[0], 'BEGIN:VCALENDAR');
  assert.equal(lines[1], 'VERSION:2.0');
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(ics.includes('\r\nMETHOD:PUBLISH\r\n'));
  assert.ok(ics.includes('\r\nBEGIN:VEVENT\r\n'));
  assert.ok(ics.includes('\r\nEND:VEVENT\r\n'));
  assert.ok(ics.includes('\r\nUID:wedding@tony-and-jamie.pages.dev\r\n'));
  assert.ok(ics.includes('\r\nDTSTAMP:20260902T120000Z\r\n'));
  assert.ok(ics.includes('\r\nDTSTART:20270612T230000Z\r\n'));
  assert.ok(ics.includes('\r\nDTEND:20270613T060000Z\r\n'));
  assert.ok(ics.includes("\r\nSUMMARY:Tony & Jamie's Wedding\r\n"));
  assert.ok(ics.includes('\r\nLOCATION:The Garden Pavilion\\, 123 Blossom Lane\\, Sacramento\\, CA 95814\r\n'));
  assert.ok(ics.includes('\r\nURL:https://withjoy.com/tony-and-jamie\r\n'));
});

test('buildIcs: uses CRLF only and keeps every line within 75 octets', () => {
  const ics = L.buildIcs(CONFIG, NOW);
  assert.equal(ics.includes('\n'), true);
  assert.equal(/[^\r]\n/.test(ics), false, 'found a bare LF');
  ics.split('\r\n').forEach((line) => {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75, 'line over 75 octets: ' + line);
  });
});

test('buildIcs: folds a long description and escapes it', () => {
  const cfg = Object.assign({}, CONFIG, {
    calendarDescription: 'Ceremony at 4pm; reception to follow, ' + 'details '.repeat(20)
  });
  const ics = L.buildIcs(cfg, NOW);
  const unfolded = ics.replace(/\r\n /g, '');
  assert.ok(unfolded.includes('DESCRIPTION:Ceremony at 4pm\\; reception to follow\\, details'));
});

test('buildIcs: falls back to a generic UID host when siteUrl is invalid', () => {
  const ics = L.buildIcs(Object.assign({}, CONFIG, { siteUrl: 'not a url' }), NOW);
  assert.ok(ics.includes('\r\nUID:wedding@invitation\r\n'));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: the new tests FAIL with `L.escapeIcsText is not a function` and similar.

- [ ] **Step 3: Add the ICS functions to `site/js/invite-logic.js`**

Insert above the `return {` block:

```js
  var ICS_MAX_OCTETS = 75;

  /** RFC 5545 3.3.11 text escaping. */
  function escapeIcsText(text) {
    return String(text)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r\n|\r|\n/g, '\\n');
  }

  function utf8Octets(ch) {
    var cp = ch.codePointAt(0);
    if (cp < 0x80) return 1;
    if (cp < 0x800) return 2;
    if (cp < 0x10000) return 3;
    return 4;
  }

  /** RFC 5545 3.1 line folding: CRLF followed by a single space. */
  function foldIcsLine(line) {
    var chars = Array.from(line);
    var out = '';
    var current = '';
    var octets = 0;
    for (var i = 0; i < chars.length; i++) {
      var n = utf8Octets(chars[i]);
      if (octets + n > ICS_MAX_OCTETS) {
        out += current + '\r\n ';
        current = '';
        octets = 1; // the leading space on the continuation line
      }
      current += chars[i];
      octets += n;
    }
    return out + current;
  }

  function uidHost(siteUrl) {
    try {
      var host = new URL(siteUrl).host;
      return host || 'invitation';
    } catch (e) {
      return 'invitation';
    }
  }

  /** A complete iCalendar document with one event. */
  function buildIcs(config, now) {
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Wedding Invitation//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:wedding@' + uidHost(config.siteUrl),
      'DTSTAMP:' + toIcsUtc(now || new Date()),
      'DTSTART:' + toIcsUtc(config.start),
      'DTEND:' + toIcsUtc(config.end),
      'SUMMARY:' + escapeIcsText(config.eventTitle),
      'DESCRIPTION:' + escapeIcsText(config.calendarDescription || ''),
      'LOCATION:' + escapeIcsText(locationString(config)),
      'URL:' + (config.rsvpUrl || config.siteUrl),
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    return lines.map(foldIcsLine).join('\r\n') + '\r\n';
  }
```

Add to the returned object: `escapeIcsText`, `foldIcsLine`, `buildIcs`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: 33 passing, 0 failing.

- [ ] **Step 5: Create `scripts/make-ics.js`**

```js
#!/usr/bin/env node
/* Writes site/wedding.ics from site/js/config.js. Run with `npm run ics`. */
const fs = require('fs');
const path = require('path');
const config = require('../site/js/config.js');
const { buildIcs } = require('../site/js/invite-logic.js');

const out = path.join(__dirname, '..', 'site', 'wedding.ics');
fs.writeFileSync(out, buildIcs(config, new Date()));
console.log('Wrote ' + path.relative(process.cwd(), out));
```

- [ ] **Step 6: Generate the file and inspect it**

Run: `npm run ics && cat site/wedding.ics`
Expected: `Wrote site/wedding.ics`, then a VCALENDAR block with DTSTART `20270612T230000Z`.

- [ ] **Step 7: Hand off for commit**

Do not commit. Suggested message: `feat: ICS builder and generated wedding.ics`

---

### Task 6: Blossom artwork and favicon

**Files:**
- Create: `site/assets/blossom-branch.svg`
- Create: `site/assets/favicon.svg`

**Interfaces:**
- Produces: a transparent 400x300 SVG referenced by `<img src="assets/blossom-branch.svg">`. A blossom favicon.

- [ ] **Step 1: Create `site/assets/blossom-branch.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <defs>
    <symbol id="b" viewBox="-12 -12 24 24">
      <g fill="currentColor">
        <path d="M0 0C-3.6-2.8-5.8-8.6 0-9.6 5.8-8.6 3.6-2.8 0 0Z"/>
        <path d="M0 0C-3.6-2.8-5.8-8.6 0-9.6 5.8-8.6 3.6-2.8 0 0Z" transform="rotate(72)"/>
        <path d="M0 0C-3.6-2.8-5.8-8.6 0-9.6 5.8-8.6 3.6-2.8 0 0Z" transform="rotate(144)"/>
        <path d="M0 0C-3.6-2.8-5.8-8.6 0-9.6 5.8-8.6 3.6-2.8 0 0Z" transform="rotate(216)"/>
        <path d="M0 0C-3.6-2.8-5.8-8.6 0-9.6 5.8-8.6 3.6-2.8 0 0Z" transform="rotate(288)"/>
      </g>
      <g stroke="#B8365E" stroke-width="0.6" stroke-linecap="round" fill="none">
        <path d="M0 0L2.4-3.4M0 0L-2.6-3.1M0 0L3.4 1.4M0 0L-3.3 1.8M0 0L0.4 3.9"/>
      </g>
      <circle r="1.5" fill="#B8365E"/>
    </symbol>
    <symbol id="bud" viewBox="-6 -6 12 12">
      <ellipse rx="3.1" ry="4.2" fill="currentColor"/>
      <path d="M-2.4 2.4Q0 5.6 2.4 2.4" fill="none" stroke="#4A3228" stroke-width="0.9" stroke-linecap="round"/>
    </symbol>
    <symbol id="p" viewBox="0 0 20 20">
      <path d="M10 1C15 4 19 9 10 19 1 9 5 4 10 1Z" fill="currentColor"/>
    </symbol>
  </defs>

  <!-- branches: drawn wide to thin for a tapered look -->
  <g fill="none" stroke="#4A3228" stroke-linecap="round" stroke-linejoin="round">
    <path d="M404 32C372 44 340 66 306 88" stroke-width="6"/>
    <path d="M306 88C278 104 246 120 214 132" stroke-width="4"/>
    <path d="M214 132C190 140 166 146 144 154" stroke-width="2.6"/>
    <path d="M144 154C130 158 118 164 108 172" stroke-width="1.6"/>

    <path d="M334 70C318 58 302 46 284 40" stroke-width="3"/>
    <path d="M284 40C272 36 262 32 250 26" stroke-width="1.8"/>

    <path d="M368 56C362 70 354 86 344 100" stroke-width="2.4"/>
    <path d="M344 100C340 106 336 112 330 118" stroke-width="1.4"/>

    <path d="M252 116C246 134 240 152 232 170" stroke-width="3"/>
    <path d="M232 170C226 186 220 200 210 214" stroke-width="1.8"/>
    <path d="M238 156C246 162 254 170 258 180" stroke-width="1.3"/>

    <path d="M200 136C194 128 188 120 180 112" stroke-width="1.5"/>
    <path d="M166 148C162 160 158 172 152 184" stroke-width="1.4"/>
  </g>

  <!-- blossoms -->
  <use href="#b" x="-14" y="-14" width="28" height="28" transform="translate(348 62) rotate(18)" color="#F4C6D3"/>
  <use href="#b" x="-16" y="-16" width="32" height="32" transform="translate(316 90) rotate(-12)" color="#E99BB4"/>
  <use href="#b" x="-12" y="-12" width="24" height="24" transform="translate(298 60) rotate(40)" color="#F4C6D3"/>
  <use href="#b" x="-11" y="-11" width="22" height="22" transform="translate(272 42) rotate(8)" color="#E99BB4"/>
  <use href="#b" x="-9" y="-9" width="18" height="18" transform="translate(254 26) rotate(-30)" color="#F4C6D3"/>
  <use href="#b" x="-13" y="-13" width="26" height="26" transform="translate(360 96) rotate(66)" color="#E99BB4"/>
  <use href="#b" x="-11" y="-11" width="22" height="22" transform="translate(334 114) rotate(-20)" color="#F4C6D3"/>
  <use href="#b" x="-15" y="-15" width="30" height="30" transform="translate(284 108) rotate(24)" color="#F4C6D3"/>
  <use href="#b" x="-13" y="-13" width="26" height="26" transform="translate(252 118) rotate(-8)" color="#E99BB4"/>
  <use href="#b" x="-12" y="-12" width="24" height="24" transform="translate(228 140) rotate(52)" color="#F4C6D3"/>
  <use href="#b" x="-14" y="-14" width="28" height="28" transform="translate(240 166) rotate(14)" color="#E99BB4"/>
  <use href="#b" x="-11" y="-11" width="22" height="22" transform="translate(222 192) rotate(-40)" color="#F4C6D3"/>
  <use href="#b" x="-9" y="-9" width="18" height="18" transform="translate(208 210) rotate(30)" color="#E99BB4"/>
  <use href="#b" x="-10" y="-10" width="20" height="20" transform="translate(186 120) rotate(-16)" color="#E99BB4"/>
  <use href="#b" x="-11" y="-11" width="22" height="22" transform="translate(170 160) rotate(70)" color="#F4C6D3"/>
  <use href="#b" x="-9" y="-9" width="18" height="18" transform="translate(154 180) rotate(12)" color="#E99BB4"/>
  <use href="#b" x="-11" y="-11" width="22" height="22" transform="translate(382 42) rotate(-24)" color="#F4C6D3"/>
  <use href="#b" x="-10" y="-10" width="20" height="20" transform="translate(392 72) rotate(48)" color="#E99BB4"/>
  <use href="#b" x="-8" y="-8" width="16" height="16" transform="translate(200 150) rotate(-60)" color="#F4C6D3"/>
  <use href="#b" x="-10" y="-10" width="20" height="20" transform="translate(300 124) rotate(36)" color="#E99BB4"/>
  <use href="#b" x="-9" y="-9" width="18" height="18" transform="translate(258 94) rotate(-48)" color="#F4C6D3"/>
  <use href="#b" x="-9" y="-9" width="18" height="18" transform="translate(120 166) rotate(20)" color="#F4C6D3"/>
  <use href="#b" x="-7" y="-7" width="14" height="14" transform="translate(108 176) rotate(-10)" color="#E99BB4"/>
  <use href="#b" x="-8" y="-8" width="16" height="16" transform="translate(258 182) rotate(58)" color="#F4C6D3"/>
  <use href="#b" x="-8" y="-8" width="16" height="16" transform="translate(330 120) rotate(-70)" color="#E99BB4"/>

  <!-- buds -->
  <use href="#bud" x="-6" y="-6" width="12" height="12" transform="translate(264 52) rotate(-30)" color="#D6608A"/>
  <use href="#bud" x="-6" y="-6" width="12" height="12" transform="translate(180 110) rotate(-50)" color="#D6608A"/>
  <use href="#bud" x="-6" y="-6" width="12" height="12" transform="translate(152 188) rotate(20)" color="#E99BB4"/>
  <use href="#bud" x="-6" y="-6" width="12" height="12" transform="translate(328 122) rotate(40)" color="#D6608A"/>
  <use href="#bud" x="-6" y="-6" width="12" height="12" transform="translate(210 216) rotate(30)" color="#E99BB4"/>
  <use href="#bud" x="-5" y="-5" width="10" height="10" transform="translate(248 28) rotate(-60)" color="#D6608A"/>

  <!-- loose petals -->
  <use href="#p" x="-6" y="-6" width="12" height="12" transform="translate(124 64) rotate(30)" color="#F4C6D3"/>
  <use href="#p" x="-5" y="-5" width="10" height="10" transform="translate(96 112) rotate(-40)" color="#E99BB4"/>
  <use href="#p" x="-6" y="-6" width="12" height="12" transform="translate(142 214) rotate(70)" color="#F4C6D3"/>
  <use href="#p" x="-5" y="-5" width="10" height="10" transform="translate(64 160) rotate(15)" color="#F4C6D3"/>
  <use href="#p" x="-6" y="-6" width="12" height="12" transform="translate(232 244) rotate(-25)" color="#E99BB4"/>
  <use href="#p" x="-5" y="-5" width="10" height="10" transform="translate(302 172) rotate(50)" color="#F4C6D3"/>
  <use href="#p" x="-5" y="-5" width="10" height="10" transform="translate(190 252) rotate(-70)" color="#F4C6D3"/>
  <use href="#p" x="-4" y="-4" width="8" height="8" transform="translate(160 90) rotate(45)" color="#E99BB4"/>
  <use href="#p" x="-4" y="-4" width="8" height="8" transform="translate(80 210) rotate(-15)" color="#F4C6D3"/>
</svg>
```

- [ ] **Step 2: Create `site/assets/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 24 24">
  <g fill="#E99BB4">
    <path d="M0 0C-3.6-2.8-5.8-8.6 0-9.6 5.8-8.6 3.6-2.8 0 0Z"/>
    <path d="M0 0C-3.6-2.8-5.8-8.6 0-9.6 5.8-8.6 3.6-2.8 0 0Z" transform="rotate(72)"/>
    <path d="M0 0C-3.6-2.8-5.8-8.6 0-9.6 5.8-8.6 3.6-2.8 0 0Z" transform="rotate(144)"/>
    <path d="M0 0C-3.6-2.8-5.8-8.6 0-9.6 5.8-8.6 3.6-2.8 0 0Z" transform="rotate(216)"/>
    <path d="M0 0C-3.6-2.8-5.8-8.6 0-9.6 5.8-8.6 3.6-2.8 0 0Z" transform="rotate(288)"/>
  </g>
  <circle r="1.8" fill="#B8365E"/>
</svg>
```

- [ ] **Step 3: Verify the artwork renders**

Open `site/assets/blossom-branch.svg` in Chrome, or render it headless:

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --disable-gpu --window-size=800,600 --screenshot="<scratch>\branch.png" "file:///C:/Users/TonyH/repos/WeddingSite/site/assets/blossom-branch.svg"
```

Expected: a brown branch entering from the right with pink blossoms, buds, and a few loose petals on a transparent background. Adjust coordinates if blossoms float away from the branch.

- [ ] **Step 4: Hand off for commit**

Do not commit. Suggested message: `feat: cherry blossom branch artwork and favicon`

---

### Task 7: Markup and stylesheet

**Files:**
- Create: `site/index.html`
- Create: `site/css/styles.css`

**Interfaces:**
- Consumes: `assets/blossom-branch.svg`, `assets/favicon.svg`, `wedding.ics`.
- Produces: DOM hooks used by Task 8: `body.is-closed`, `.envelope-scene`, `button.envelope`, `.card-mini`, `.env-flap`, `.env-seal`, `.tap-hint`, `article.card`, `h1.headline`, `[data-guest]` (two places), `[data-countdown]`, `.scroll-hint`, `section.details`, `[data-rsvp]`, `[data-directions]`, `[data-gcal]`, `.petals`, `#petal-shape`. Class hooks Task 8 toggles: `body.is-open`, `.petals.is-falling`, `.details.is-visible`.

- [ ] **Step 1: Create `site/index.html`**

```html
<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Tony &amp; Jamie · You're Invited</title>
  <meta name="description" content="Tony and Jamie are getting married on June 12, 2027. You're invited.">
  <meta name="theme-color" content="#F7F3EE">

  <!-- Link previews. Update the two absolute URLs after the first deploy. -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="Tony &amp; Jamie are getting married">
  <meta property="og:description" content="You're invited · Saturday, June 12, 2027 · The Garden Pavilion, Sacramento">
  <meta property="og:image" content="https://tony-and-jamie.pages.dev/assets/preview.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="https://tony-and-jamie.pages.dev/">
  <meta name="twitter:card" content="summary_large_image">

  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">

  <script>document.documentElement.className = document.documentElement.className.replace('no-js', 'js');</script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,400&family=Mrs+Saint+Delafield&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/styles.css">
</head>
<body class="is-closed">

  <!-- Shared SVG shapes. Referenced by id from this document only. -->
  <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
    <symbol id="petal-shape" viewBox="0 0 20 20">
      <path d="M10 1C15 4 19 9 10 19 1 9 5 4 10 1Z" fill="currentColor"/>
    </symbol>
    <symbol id="blossom-shape" viewBox="-12 -12 24 24">
      <g fill="currentColor">
        <path d="M0 0C-3.6-2.8-5.8-8.6 0-9.6 5.8-8.6 3.6-2.8 0 0Z"/>
        <path d="M0 0C-3.6-2.8-5.8-8.6 0-9.6 5.8-8.6 3.6-2.8 0 0Z" transform="rotate(72)"/>
        <path d="M0 0C-3.6-2.8-5.8-8.6 0-9.6 5.8-8.6 3.6-2.8 0 0Z" transform="rotate(144)"/>
        <path d="M0 0C-3.6-2.8-5.8-8.6 0-9.6 5.8-8.6 3.6-2.8 0 0Z" transform="rotate(216)"/>
        <path d="M0 0C-3.6-2.8-5.8-8.6 0-9.6 5.8-8.6 3.6-2.8 0 0Z" transform="rotate(288)"/>
      </g>
    </symbol>
  </svg>

  <div class="petals" aria-hidden="true"></div>

  <main>
    <section class="hero">

      <div class="envelope-scene">
        <button class="envelope" type="button" aria-label="Open invitation">
          <span class="env-back"></span>
          <span class="card-mini" aria-hidden="true">
            <img class="branch" src="assets/blossom-branch.svg" alt="">
            <span class="mini-names">Tony &amp; Jamie</span>
          </span>
          <span class="env-front"></span>
          <span class="env-flap"></span>
          <span class="env-seal">
            <svg viewBox="-12 -12 24 24" aria-hidden="true"><use href="#blossom-shape"></use></svg>
          </span>
          <span class="env-address" aria-hidden="true">
            <span class="env-to">To</span>
            <span class="env-name" data-guest>Friends &amp; Family</span>
          </span>
        </button>
        <p class="tap-hint">Tap to open</p>
      </div>

      <article class="card">
        <img class="branch" src="assets/blossom-branch.svg" alt="">

        <p class="greeting">Dear <span data-guest>Friends &amp; Family</span>,</p>

        <h1 class="headline">You are<br>invited</h1>
        <p class="script-line">to the wedding of</p>
        <p class="names">Tony <span class="amp">&amp;</span> Jamie</p>

        <p class="date-big">06 . 12 . 27</p>
        <p class="date-long">Saturday, June 12, 2027<br>Four o'clock in the afternoon</p>

        <p class="venue">The Garden Pavilion<br>123 Blossom Lane<br>Sacramento, California</p>

        <div class="countdown" data-countdown></div>

        <p class="script-line closing">Reception to follow</p>
      </article>

      <a class="scroll-hint" href="#details" aria-label="Scroll to details">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
      </a>
    </section>

    <section class="details" id="details">
      <p class="script-line">Join us</p>

      <a class="btn btn-primary" data-rsvp href="#">RSVP &amp; Details</a>
      <a class="btn" data-directions href="#" target="_blank" rel="noopener">Get Directions</a>

      <p class="label">Add to calendar</p>
      <div class="btn-row">
        <a class="btn" data-gcal href="#" target="_blank" rel="noopener">Google</a>
        <a class="btn" href="wedding.ics" download="wedding.ics">Apple / Outlook</a>
      </div>

      <p class="script-line closing">With love, Tony &amp; Jamie</p>
    </section>
  </main>

  <script src="js/config.js"></script>
  <script src="js/invite-logic.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `site/css/styles.css`**

```css
/* ==========================================================================
   Wedding invitation
   1. Tokens   2. Base   3. Hero and envelope   4. Card   5. Details
   6. Petals   7. Motion preferences
   ========================================================================== */

/* 1. Tokens ------------------------------------------------------------- */

:root {
  --paper: #F7F3EE;
  --card: #FCFAF6;
  --ink: #3B2A26;
  --ink-soft: #7A6660;
  --blush: #F5E4E8;
  --blush-deep: #EBCBD4;
  --liner: #E9A9BE;
  --blossom: #E99BB4;
  --blossom-light: #F4C6D3;
  --blossom-deep: #D6608A;
  --branch: #4A3228;

  --font-serif: 'Cormorant Garamond', 'Garamond', 'Times New Roman', serif;
  --font-script: 'Mrs Saint Delafield', 'Brush Script MT', cursive;

  --card-w: min(92vw, 440px);
  --env-w: min(88vw, 400px);
  --ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);
  --shadow-ink: 59, 42, 38;
}

/* 2. Base --------------------------------------------------------------- */

*, *::before, *::after { box-sizing: border-box; }

html {
  -webkit-text-size-adjust: 100%;
  background: var(--paper);
}

body {
  margin: 0;
  min-height: 100svh;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 18px;
  line-height: 1.5;
  overflow-x: hidden;
}

/* Scroll stays locked until the envelope has been opened. */
html.js body.is-closed {
  overflow: hidden;
  height: 100svh;
}

img { display: block; max-width: 100%; }

/* 3. Hero and envelope -------------------------------------------------- */

.hero {
  position: relative;
  min-height: 100svh;
  display: grid;
  place-items: center;
  padding: 2.5rem 0 4.5rem;
}

.envelope-scene {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2.2rem;
  background: var(--paper);
  transition:
    opacity 0.5s ease 1.2s,
    transform 0.5s ease 1.2s,
    visibility 0s linear 1.7s;
}

body.is-open .envelope-scene {
  opacity: 0;
  transform: translateY(24px);
  visibility: hidden;
}

html.no-js .envelope-scene { display: none; }

.envelope {
  position: relative;
  width: var(--env-w);
  aspect-ratio: 1.45;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
  perspective: 1200px;
  -webkit-tap-highlight-color: transparent;
}

.envelope:focus-visible {
  outline: 2px solid var(--blossom-deep);
  outline-offset: 12px;
  border-radius: 6px;
}

body.is-open .envelope { pointer-events: none; }

.env-back,
.env-front,
.env-flap,
.card-mini {
  position: absolute;
  display: block;
}

.env-back {
  inset: 0;
  z-index: 0;
  background: var(--blush-deep);
  border-radius: 6px;
  box-shadow: 0 30px 50px -25px rgba(var(--shadow-ink), 0.4);
}

.card-mini {
  z-index: 2;
  left: 6%;
  right: 6%;
  top: 8%;
  height: 84%;
  overflow: hidden;
  background: var(--card);
  border-radius: 3px;
  box-shadow: 0 6px 18px rgba(var(--shadow-ink), 0.12);
  transition: transform 0.8s var(--ease-out) 0.5s;
}

body.is-open .card-mini { transform: translateY(-72%); }

.card-mini .branch {
  position: absolute;
  top: -4%;
  right: -6%;
  width: 70%;
}

.mini-names {
  position: absolute;
  left: 8%;
  top: 10%;
  font-size: clamp(1.05rem, 5vw, 1.45rem);
  letter-spacing: 0.14em;
}

.env-front {
  inset: 0;
  z-index: 3;
  background: linear-gradient(180deg, var(--blush) 0%, #F0D9DE 100%);
  clip-path: polygon(0 0, 50% 52%, 100% 0, 100% 100%, 0 100%);
  border-radius: 6px;
}

/* Soft fold shading on the two side panels of the pocket. */
.env-front::before,
.env-front::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.4), rgba(0, 0, 0, 0.035));
  clip-path: polygon(0 0, 50% 52%, 0 100%);
}

.env-front::after {
  background: linear-gradient(to bottom left, rgba(255, 255, 255, 0.4), rgba(0, 0, 0, 0.035));
  clip-path: polygon(100% 0, 50% 52%, 100% 100%);
}

.env-flap {
  left: 0;
  right: 0;
  top: 0;
  height: 56%;
  z-index: 4;
  background: var(--blush);
  clip-path: polygon(0 0, 100% 0, 50% 100%);
  border-radius: 6px 6px 0 0;
  transform-origin: 50% 0;
  transform: rotateX(0deg);
}

body.is-open .env-flap { animation: flap-open 0.7s ease-in-out forwards; }

@keyframes flap-open {
  0%    { transform: rotateX(0deg);   z-index: 4; background: var(--blush); }
  49.9% {                             z-index: 4; background: var(--blush); }
  50%   { transform: rotateX(90deg);  z-index: 1; background: var(--liner); }
  100%  { transform: rotateX(180deg); z-index: 1; background: var(--liner); }
}

.env-seal {
  position: absolute;
  z-index: 5;
  left: 50%;
  top: 52%;
  width: 46px;
  height: 46px;
  margin: -23px 0 0 -23px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #E27AA0, var(--blossom-deep) 70%);
  box-shadow: 0 3px 8px rgba(var(--shadow-ink), 0.25);
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.env-seal svg {
  width: 26px;
  height: 26px;
  color: rgba(255, 255, 255, 0.92);
}

body.is-open .env-seal {
  opacity: 0;
  transform: scale(0.6);
}

.env-address {
  position: absolute;
  z-index: 5;
  left: 8%;
  right: 8%;
  top: 63%;
  text-align: center;
  line-height: 1.1;
  pointer-events: none;
}

.env-to {
  display: block;
  margin-bottom: 0.15rem;
  font-size: 0.62rem;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.env-name {
  display: block;
  overflow: hidden;
  font-family: var(--font-script);
  font-size: clamp(1.6rem, 7vw, 2.2rem);
  color: var(--ink);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tap-hint {
  margin: 0;
  font-size: 0.68rem;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  color: var(--ink-soft);
  animation: hint-pulse 2.4s ease-in-out infinite;
  transition: opacity 0.3s ease;
}

body.is-open .tap-hint {
  opacity: 0;
  animation: none;
}

@keyframes hint-pulse {
  0%, 100% { opacity: 0.45; }
  50%      { opacity: 1; }
}

/* 4. Card --------------------------------------------------------------- */

.card {
  position: relative;
  width: var(--card-w);
  padding: 3.25rem 2rem 2.5rem;
  overflow: hidden;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0) 40%),
    var(--card);
  border-radius: 2px;
  box-shadow:
    0 40px 70px -35px rgba(var(--shadow-ink), 0.35),
    0 2px 8px rgba(var(--shadow-ink), 0.06);
  opacity: 0;
  transform: scale(0.94);
  transition:
    opacity 0.7s ease 1.2s,
    transform 0.7s var(--ease-out) 1.2s;
}

body.is-open .card,
html.no-js .card {
  opacity: 1;
  transform: none;
}

.card > * {
  position: relative;
  z-index: 1;
}

.card .branch {
  position: absolute;
  z-index: 0;
  top: -8px;
  right: -12px;
  width: 64%;
  pointer-events: none;
  user-select: none;
}

.greeting {
  margin: 0 0 2.4rem;
  max-width: 58%;
  font-style: italic;
  font-size: 1.2rem;
}

.headline {
  margin: 0;
  font-weight: 400;
  font-size: clamp(1.35rem, 5.6vw, 1.7rem);
  letter-spacing: 0.3em;
  line-height: 1.4;
  text-transform: uppercase;
}

.script-line {
  margin: 0.35rem 0 0.4rem;
  font-family: var(--font-script);
  font-weight: 400;
  font-size: 2.1rem;
  line-height: 1;
}

.names {
  margin: 0.1rem 0 1.6rem;
  font-size: clamp(2rem, 8.5vw, 2.6rem);
  line-height: 1.15;
}

.names .amp {
  padding: 0 0.15em;
  font-family: var(--font-script);
  font-size: 0.85em;
  color: var(--blossom-deep);
}

.date-big {
  margin: 0;
  font-weight: 300;
  font-size: clamp(2.2rem, 9vw, 2.8rem);
  letter-spacing: 0.16em;
  line-height: 1.1;
}

.date-long,
.venue {
  margin: 0.5rem 0 0;
  font-size: 0.74rem;
  letter-spacing: 0.2em;
  line-height: 1.9;
  text-transform: uppercase;
}

.venue { margin-top: 1.5rem; }

.countdown {
  display: flex;
  gap: 1.6rem;
  margin: 1.9rem 0 1.4rem;
  min-height: 3rem;
}

.countdown .num {
  display: block;
  font-weight: 300;
  font-size: 1.9rem;
  line-height: 1;
}

.countdown .unit {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.6rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.countdown-note {
  font-style: italic;
  font-size: 1.15rem;
}

.card .closing {
  margin: 0.5rem 0 0;
  font-size: 2rem;
}

.scroll-hint {
  position: absolute;
  left: 50%;
  bottom: 1.25rem;
  width: 44px;
  height: 44px;
  margin-left: -22px;
  display: grid;
  place-items: center;
  color: var(--ink-soft);
  opacity: 0;
  transition: opacity 0.6s ease 2.4s;
}

.scroll-hint svg {
  width: 22px;
  height: 22px;
}

body.is-open .scroll-hint {
  opacity: 1;
  animation: bob 2s ease-in-out 2.4s infinite;
}

@keyframes bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(6px); }
}

/* 5. Details ------------------------------------------------------------ */

.details {
  width: var(--card-w);
  margin: 0 auto;
  padding: 0.5rem 0 4.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  text-align: center;
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.7s ease,
    transform 0.7s var(--ease-out);
}

.details.is-visible,
html.no-js .details {
  opacity: 1;
  transform: none;
}

.details .script-line {
  margin: 0 0 0.3rem;
  font-size: 2.4rem;
}

.details .label {
  margin: 0.8rem 0 -0.2rem;
  font-size: 0.66rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 0.8rem 1.2rem;
  border: 1px solid var(--ink);
  border-radius: 2px;
  color: var(--ink);
  font-size: 0.78rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  text-decoration: none;
  transition: background 0.2s ease, color 0.2s ease, transform 0.15s ease;
}

.btn:hover { background: var(--blush); }
.btn:active { transform: scale(0.98); }

.btn:focus-visible {
  outline: 2px solid var(--blossom-deep);
  outline-offset: 3px;
}

.btn-primary {
  background: var(--blossom-deep);
  border-color: var(--blossom-deep);
  color: #fff;
}

.btn-primary:hover { background: #C4507A; }

.btn-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem;
}

.details .closing {
  margin-top: 1.6rem;
  font-size: 2.1rem;
}

/* 6. Petals ------------------------------------------------------------- */

.petals {
  position: fixed;
  inset: 0;
  z-index: 30;
  overflow: hidden;
  pointer-events: none;
}

.petal {
  position: absolute;
  top: -10vh;
  left: var(--x, 50vw);
  width: var(--size, 14px);
  height: var(--size, 14px);
  opacity: 0;
}

.petal--light { color: var(--blossom-light); }
.petal--mid   { color: var(--blossom); }

.petal svg {
  display: block;
  width: 100%;
  height: 100%;
}

.petals.is-falling .petal {
  animation: petal-fall var(--fall, 12s) linear var(--delay, 0s) infinite;
}

.petals.is-falling .petal svg {
  animation: petal-sway calc(var(--fall, 12s) / 3) ease-in-out var(--delay, 0s) infinite alternate;
}

@keyframes petal-fall {
  0%   { transform: translateY(0);     opacity: 0; }
  8%   { opacity: 0.85; }
  90%  { opacity: 0.85; }
  100% { transform: translateY(120vh); opacity: 0; }
}

@keyframes petal-sway {
  from { transform: translateX(calc(var(--sway, 30px) * -1)) rotate(0deg); }
  to   { transform: translateX(var(--sway, 30px)) rotate(var(--spin, 360deg)); }
}

/* 7. Motion preferences ------------------------------------------------- */

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }

  .petals { display: none; }
}
```

- [ ] **Step 3: Check the closed state in a browser**

Open `site/index.html` in Chrome at a 390x844 viewport (DevTools device toolbar or a resized window).
Expected: cream page, blush envelope centered with a pink seal and "To / Friends & Family" on the front, a pulsing "TAP TO OPEN" hint beneath. No card visible. Page does not scroll.

- [ ] **Step 4: Check the open state by hand**

In DevTools, add class `is-open` to `<body>` and remove `is-closed`.
Expected: flap flips up showing the pink liner, mini card rises, envelope fades, card appears with the branch top-right, "Dear Friends & Family," headline, names, date, venue, an empty countdown row, and "Reception to follow". Scrolling reveals the details section only after Task 8 adds `is-visible`; for now add it by hand and confirm the buttons render.

- [ ] **Step 5: Hand off for commit**

Do not commit. Suggested message: `feat: invitation markup and stylesheet`

---

### Task 8: DOM glue script

**Files:**
- Create: `site/js/main.js`

**Interfaces:**
- Consumes: `window.INVITE_CONFIG` (Task 1), `window.InviteLogic` (Tasks 2 to 5), DOM hooks from Task 7.
- Produces: the working page.

- [ ] **Step 1: Create `site/js/main.js`**

```js
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
  setHref('[data-directions]', logic.mapsUrl(config));
  setHref('[data-gcal]', logic.googleCalendarUrl(config));

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
  if (petals && !reduceMotion) buildPetals(petals, 14);

  function buildPetals(layer, count) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var p = document.createElement('span');
      p.className = 'petal ' + (i % 2 ? 'petal--light' : 'petal--mid');
      p.style.setProperty('--x', rand(0, 100) + 'vw');
      p.style.setProperty('--size', rand(10, 18) + 'px');
      p.style.setProperty('--fall', rand(9, 16) + 's');
      p.style.setProperty('--delay', rand(0, 12) + 's');
      p.style.setProperty('--sway', rand(20, 60) + 'px');
      p.style.setProperty('--spin', rand(180, 540) + 'deg');
      p.innerHTML =
        '<svg viewBox="0 0 20 20" aria-hidden="true"><use href="#petal-shape"></use></svg>';
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
    body.classList.add('is-open');
    envelope.setAttribute('aria-expanded', 'true');
    // transitionend on the card's opacity marks the end of the sequence.
    // The timeout is a safety net in case the event never fires.
    setTimeout(finalize, reduceMotion ? 0 : 2500);
  }

  if (envelope) envelope.addEventListener('click', open);
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
```

- [ ] **Step 2: Verify in the browser**

Open `site/index.html?to=Jane%20%26%20John` in Chrome at 390x844.

Check, in order:
1. Envelope front reads "To / Jane & John".
2. Tap the envelope. Flap flips, mini card rises, envelope fades, card scales in. Total about two seconds.
3. Card reads "Dear Jane & John," and shows three countdown tiles with numbers.
4. Petals drift down after the card appears.
5. The page now scrolls. The details section fades up. The RSVP button links to the Withjoy URL. Get Directions opens Google Maps with the address. Google opens a prefilled calendar event. Apple / Outlook downloads `wedding.ics`.
6. Reload with no query string: envelope and card read "Friends & Family".
7. DevTools → Rendering → emulate `prefers-reduced-motion: reduce`, reload, tap: card appears instantly, no petals.
8. Keyboard: Tab to the envelope, press Enter. Same sequence. Focus lands on the headline afterwards.

- [ ] **Step 3: Run the unit tests once more**

Run: `npm test`
Expected: 33 passing.

- [ ] **Step 4: Hand off for commit**

Do not commit. Suggested message: `feat: envelope opening, countdown, petals, and links`

---

### Task 9: Preview image and README

**Files:**
- Create: `scripts/preview.html`
- Generate: `site/assets/preview.png`
- Create: `README.md`

**Interfaces:**
- Consumes: the palette and fonts from Task 7, the branch from Task 6.
- Produces: a 1200x630 PNG for `og:image`, and owner documentation.

- [ ] **Step 1: Create `scripts/preview.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Preview image source</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,400&family=Mrs+Saint+Delafield&display=swap" rel="stylesheet">
  <style>
    html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
    body {
      position: relative;
      background: #F7F3EE;
      color: #3B2A26;
      font-family: 'Cormorant Garamond', serif;
    }
    .branch {
      position: absolute;
      top: -40px;
      right: -30px;
      width: 720px;
    }
    .text {
      position: absolute;
      left: 96px;
      top: 150px;
    }
    .kicker {
      margin: 0;
      font-size: 26px;
      letter-spacing: 0.34em;
      text-transform: uppercase;
    }
    .script {
      margin: 6px 0 0;
      font-family: 'Mrs Saint Delafield', cursive;
      font-size: 64px;
      line-height: 1;
    }
    .names {
      margin: 8px 0 30px;
      font-size: 84px;
      line-height: 1.05;
    }
    .names .amp { font-family: 'Mrs Saint Delafield', cursive; color: #D6608A; font-size: 0.85em; }
    .date { margin: 0; font-weight: 300; font-size: 72px; letter-spacing: 0.16em; line-height: 1; }
    .small { margin: 14px 0 0; font-size: 20px; letter-spacing: 0.22em; text-transform: uppercase; }
  </style>
</head>
<body>
  <img class="branch" src="../site/assets/blossom-branch.svg" alt="">
  <div class="text">
    <p class="kicker">You are invited</p>
    <p class="script">to the wedding of</p>
    <p class="names">Tony <span class="amp">&amp;</span> Jamie</p>
    <p class="date">06 . 12 . 27</p>
    <p class="small">Saturday, June 12, 2027 · Sacramento, California</p>
  </div>
</body>
</html>
```

- [ ] **Step 2: Render it with headless Chrome**

Run from the repo root (PowerShell):

```
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --disable-gpu --hide-scrollbars --window-size=1200,630 --virtual-time-budget=6000 --screenshot="C:\Users\TonyH\repos\WeddingSite\site\assets\preview.png" "file:///C:/Users/TonyH/repos/WeddingSite/scripts/preview.html"
```

Expected: `site/assets/preview.png` exists, 1200x630, showing the names on the left and the branch on the right with the correct fonts. If the fonts fell back to a system serif, raise `--virtual-time-budget` and rerun.

- [ ] **Step 3: Create `README.md`**

```markdown
# Wedding Invitation

An animated cherry blossom wedding invitation. Static site, no build step,
no dependencies. Guests tap a sealed envelope, the card slides out, petals
fall, and buttons link to the RSVP site, a calendar entry, and directions.

## Preview locally

Double-click `site/index.html`, or open it in any browser. Fonts load from
Google Fonts, so the typography needs an internet connection. Everything
else works offline.

To preview a personalized link, add the name to the address bar:

```
file:///C:/Users/TonyH/repos/WeddingSite/site/index.html?to=Jane%20%26%20John
```

## Personalized links

Each guest gets the site URL with a `to` parameter:

```
https://YOUR-SITE.pages.dev/?to=Jane%20%26%20John%20Smith
```

Spreadsheet formula (Google Sheets and Excel), with the name in column A:

```
="https://YOUR-SITE.pages.dev/?to="&ENCODEURL(A2)
```

Without the parameter the invitation reads "Friends & Family".

## What to edit

| What | Where |
|---|---|
| Names, written date, venue lines, closing lines | `site/index.html` (search for `Tony`, `Jamie`, `June 12`, `Garden Pavilion`) |
| Page title, description, link preview text | `site/index.html` `<head>` |
| Event start and end time, timezone | `site/js/config.js` |
| Venue name and address for maps and calendar | `site/js/config.js` |
| RSVP link | `site/js/config.js` `rsvpUrl` |
| Deployed site address | `site/js/config.js` `siteUrl` and the two `og:` URLs in `site/index.html` |
| Colors and fonts | `site/css/styles.css`, the `:root` block |
| Animation timings | `site/css/styles.css`, search for `1.2s` and `flap-open` |

The date is written in two places: the human version in `index.html` and
the machine version in `config.js`. Change both.

After changing `config.js`, regenerate the calendar file:

```
npm run ics
```

## Swap the artwork

Replace `site/assets/blossom-branch.svg` with your own illustration. A
transparent PNG works too: change the two `src="assets/blossom-branch.svg"`
references in `site/index.html` and the one in `scripts/preview.html`.
The image is anchored top-right and sized to about 64% of the card width.

## Tests

```
npm test
```

Runs Node's built-in test runner against `site/js/invite-logic.js`.
Requires Node 18 or newer.

## Deploy to Cloudflare Pages

1. Push this repository to GitHub. It can be private.
2. In the Cloudflare dashboard open Workers & Pages, choose Create, then
   Pages, then Connect to Git, and pick the repository.
3. Framework preset: None. Build command: leave empty. Build output
   directory: `site`.
4. The project name becomes your address: `https://<name>.pages.dev`.
5. Put that address in `site/js/config.js` (`siteUrl`) and in the `og:image`
   and `og:url` tags in `site/index.html`, run `npm run ics`, and push again.

Direct upload alternative: on the Pages page choose Upload assets and drag
the `site` folder in.

Custom domain: in the Pages project open Custom domains, add the domain,
and follow the DNS prompt. Cloudflare provisions HTTPS automatically.

## Regenerate the link preview image

`site/assets/preview.png` is what iMessage, WhatsApp, and Slack show next
to a shared link. Rebuild it after changing names or the date:

```
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --disable-gpu --hide-scrollbars --window-size=1200,630 --virtual-time-budget=6000 --screenshot="C:\Users\TonyH\repos\WeddingSite\site\assets\preview.png" "file:///C:/Users/TonyH/repos/WeddingSite/scripts/preview.html"
```

## Layout

```
site/            the deployable folder
  index.html     markup and all visible text
  css/           styles
  js/            config, logic, DOM glue
  assets/        artwork, favicon, preview image
  wedding.ics    generated calendar file
scripts/         ICS generator and preview image source
test/            unit tests
docs/            design spec and implementation plan
```
```

- [ ] **Step 4: Final check**

Run: `npm test`
Expected: 33 passing.

Open `site/index.html?to=Jane%20%26%20John` once more and confirm the full sequence still works. Confirm `site/assets/preview.png` opens and looks right.

- [ ] **Step 5: Hand off for commit**

Do not commit. Suggested message: `docs: README and link preview image`

---

## Self-review

**Spec coverage.** Envelope flow, mini card, crossfade to the real card: Task 7 CSS and Task 8 JS. Guest name from `?to=` with fallback and safe insertion: Tasks 2 and 8. No music: nothing to do. Countdown, add-to-calendar, map link, Withjoy button: Tasks 3, 4, 5, 7, 8. Cherry blossom theme, palette, fonts, branch top-right, swappable artwork: Tasks 6 and 7. Petals: Tasks 7 and 8. Reduced motion: Task 7 media query and Task 8 flags. `file://` compatibility: classic scripts throughout, same-document `<use>`. Static `.ics`: Task 5. Link previews: Tasks 7 and 9. Cloudflare Pages deploy and the spreadsheet formula: Task 9 README. No-JS fallback: Task 7. Accessibility hooks (button, focus move, aria-hidden): Tasks 7 and 8.

**Placeholder scan.** Every code step contains the full file or the exact insertion. Placeholder wedding content is intentional and documented in Global Constraints and the README.

**Type consistency.** `getGuestName(search, fallback)`, `countdown(now, start, end)`, `toIcsUtc(value)`, `locationString(config)`, `googleCalendarUrl(config)`, `mapsUrl(config)`, `escapeIcsText(text)`, `foldIcsLine(line)`, `buildIcs(config, now)` are named identically in the tests, the module, the generator script, and `main.js`. DOM hooks in Task 7 match the selectors in Task 8: `[data-guest]`, `[data-rsvp]`, `[data-directions]`, `[data-gcal]`, `[data-countdown]`, `.envelope`, `.card`, `.headline`, `.details`, `.petals`, `#petal-shape`. Class toggles match: `is-open`, `is-closed`, `is-falling`, `is-visible`.
