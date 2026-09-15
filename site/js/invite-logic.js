/*
 * Pure functions for the invitation. No DOM, no globals, no clock.
 * Loaded as a classic script in the browser (window.InviteLogic) and
 * required from Node for tests.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.InviteLogic = api;
})(this, function () {
  'use strict';

  var MAX_NAME_LENGTH = 60;

  // C0 controls (0-31), DEL (127), and C1 controls (128-159).
  var CONTROL_CHARS = new RegExp(
    '[' +
      String.fromCharCode(0) + '-' + String.fromCharCode(31) +
      String.fromCharCode(127) + '-' + String.fromCharCode(159) +
    ']',
    'g'
  );

  /**
   * Read the guest name from a query string like "?to=Jane%20%26%20John".
   * Returns `fallback` when the parameter is missing or blank.
   */
  function getGuestName(search, fallback) {
    var params = new URLSearchParams(search || '');
    var raw = params.get('to');
    if (raw === null) return fallback;

    var cleaned = raw
      .replace(CONTROL_CHARS, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) return fallback;

    var chars = Array.from(cleaned);
    if (chars.length > MAX_NAME_LENGTH) {
      cleaned = chars.slice(0, MAX_NAME_LENGTH).join('').trim();
    }
    return cleaned;
  }

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

  return {
    getGuestName: getGuestName,
    countdown: countdown
  };
});
