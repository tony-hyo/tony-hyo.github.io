# Wedding Invitation

An animated cherry blossom save-the-date. Static site, no build step, no
dependencies. Guests tap a sealed envelope, the card slides out, petals
fall, and a button links to the Withjoy site for everything else.

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

Without the parameter the envelope reads "Friends & Family". Names are
trimmed, capped at 60 characters, and inserted as plain text, so nothing in
a link can inject markup.

## What to edit

| What | Where |
|---|---|
| Names, written date, time, venue lines, closing lines | `site/index.html` (search for `Hyo`, `April 11`, `Ramada`, `noon`) |
| Page title, description, link preview text | `site/index.html` `<head>` |
| Ceremony start and end time (drives the countdown) | `site/js/config.js` |
| RSVP link | `site/js/config.js` `rsvpUrl` |
| Deployed site address | the `og:image` and `og:url` tags in `site/index.html` |
| Colors and fonts | `site/css/styles.css`, the `:root` block |
| Animation timings | `site/css/styles.css`, search for `1.2s` and `flap-open` |

Placeholders still in place: the ceremony time (noon to 3pm) and the
Withjoy URL. Both are marked `PLACEHOLDER` in `site/js/config.js`.

The date is written in two places: the human version in `index.html` and
the machine version in `config.js`. Change both.

## Artwork

The card is a 5 x 7 sheet and `site/assets/blossoms.webp` (with
`blossoms.png` as a fallback for old browsers) is a transparent image of
the same 5 x 7 proportion that covers the whole card. It was composited
from the cherry blossom PNG placed twice, exactly as in the original
Canva design. To replace it, export a new transparent image at a 5:7
ratio (1400 x 1960 works well) and overwrite both files. The earlier
hand-drawn `blossom-branch.svg` is no longer used and can be deleted.

The wax seal on the envelope is `site/assets/seal.webp` with `seal.png` as
the fallback, both 320 px versions of the original `new seal.png`. The
originals (`new seal.png` and the earlier `TH seal.png`) are not referenced
by the site and can be removed from `assets/`.

Text on the card is sized in `cqw` units (percent of the card width), so
it keeps the same proportions on every screen. Positions live in the
`4. Card` section of `site/css/styles.css`.

Fonts match the original design: Cormorant Garamond Light for the large
words and the date and Bellefair for the small tracked capitals, both from
Google Fonts, and BD Script for the handwriting, served from
`site/assets/fonts/` as a WOFF file. BD Script is a licensed font; keep the
license that came with it alongside the site.

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
5. Put that address in the `og:image` and `og:url` tags in
   `site/index.html` and push again.

Direct upload alternative: on the Pages page choose Upload assets and drag
the `site` folder in.

Custom domain: in the Pages project open Custom domains, add the domain,
and follow the DNS prompt. Cloudflare provisions HTTPS automatically.

## Regenerate the link preview image

`site/assets/preview.jpg` is what iMessage, WhatsApp, and KakaoTalk show
next to a shared link. Rebuild it after changing names or the date:

```
npm run preview
```

This renders `scripts/preview.html` with the Chrome installed on this
machine. If Chrome lives somewhere else, set `CHROME_PATH` to the
`chrome.exe` first.

## Layout

```
site/            the deployable folder
  index.html     markup and all visible text
  css/           styles
  js/            config, logic, DOM glue
  assets/        artwork, seal, favicon, preview image
scripts/         preview image source and renderer
test/            unit tests
docs/            design spec and implementation plan
```
