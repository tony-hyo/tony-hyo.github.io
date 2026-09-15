/*
 * Machine-readable event details.
 * Human-facing text (names on the card, the written date, venue lines) is
 * edited directly in site/index.html. Keep the date here and there in sync.
 */
(function (root, factory) {
  var config = factory();
  if (typeof module === 'object' && module.exports) module.exports = config;
  else root.INVITE_CONFIG = config;
})(this, function () {
  return {
    // Ceremony start and end, ISO 8601 with the venue's UTC offset.
    // +09:00 is Korea Standard Time. Drives the countdown.
    // PLACEHOLDER TIME: noon to 3pm. Replace with the real ceremony time.
    start: '2027-04-11T12:00:00+09:00',
    end: '2027-04-11T15:00:00+09:00',

    // PLACEHOLDER. Replace with your Withjoy address.
    rsvpUrl: 'https://withjoy.com/tony-and-hyo'
  };
});
