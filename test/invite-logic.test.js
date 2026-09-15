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

// 2027-04-11T12:00+09:00 is 2027-04-11T03:00:00Z. End is 2027-04-11T06:00:00Z.
const START = '2027-04-11T12:00:00+09:00';
const END = '2027-04-11T15:00:00+09:00';

test('countdown: whole days before', () => {
  assert.deepEqual(
    L.countdown('2027-04-09T03:00:00Z', START, END),
    { state: 'before', days: 2, hours: 0, minutes: 0 }
  );
});

test('countdown: mixed days, hours, minutes', () => {
  assert.deepEqual(
    L.countdown('2027-04-09T00:15:00Z', START, END),
    { state: 'before', days: 2, hours: 2, minutes: 45 }
  );
});

test('countdown: floors partial minutes', () => {
  assert.deepEqual(
    L.countdown('2027-04-09T02:59:30Z', START, END),
    { state: 'before', days: 2, hours: 0, minutes: 0 }
  );
});

test('countdown: one minute before', () => {
  assert.deepEqual(
    L.countdown('2027-04-11T02:59:00Z', START, END),
    { state: 'before', days: 0, hours: 0, minutes: 1 }
  );
});

test('countdown: exactly at start is today', () => {
  assert.equal(L.countdown('2027-04-11T03:00:00Z', START, END).state, 'today');
});

test('countdown: during the event is today', () => {
  assert.equal(L.countdown('2027-04-11T04:30:00Z', START, END).state, 'today');
});

test('countdown: exactly at end is still today', () => {
  assert.equal(L.countdown('2027-04-11T06:00:00Z', START, END).state, 'today');
});

test('countdown: after the end', () => {
  assert.deepEqual(
    L.countdown('2027-04-11T06:00:01Z', START, END),
    { state: 'after', days: 0, hours: 0, minutes: 0 }
  );
});

test('countdown: accepts Date objects', () => {
  const r = L.countdown(new Date('2027-04-09T03:00:00Z'), new Date(START), new Date(END));
  assert.equal(r.days, 2);
});
