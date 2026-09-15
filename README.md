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
https://tony-hyo.github.io/?to=Jane%20%26%20John%20Smith
```

Spreadsheet formula (Google Sheets and Excel), with the name in column A:

```
="https://tony-hyo.github.io/?to="&ENCODEURL(A2)
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

The wax seal on the envelope is `site/assets/seal-v3.webp` with
`seal-v3.png` as the fallback, both 320 px versions of the v3 seal design.
The earlier `seal.webp` and `seal.png` (v2) are kept in the folder but not
referenced. To switch seals, change the two `assets/seal-v3.*` paths in
`site/index.html`. The full-size originals (`new seal.png`, `TH seal.png`)
are not referenced by the site and can be removed from `assets/`.

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

## Deploy to GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes the `site` folder
on every push to `master` or `main`. The site is at
`https://tony-hyo.github.io/`.

1. The GitHub repository is `tony-hyo/tony-hyo.github.io`. It must stay
   public: a free account only gets Pages on public repositories.
2. The remote URL carries the account name so git signs in as `tony-hyo`
   even though this machine also holds another GitHub login:

   ```
   git remote add origin https://tony-hyo@github.com/tony-hyo/tony-hyo.github.io.git
   git push -u origin master
   ```

3. In the repository open Settings, then Pages, and set Source to GitHub
   Actions. Each push then deploys in a minute or two; progress shows
   under the Actions tab.
4. If the address ever changes, update the `og:image` and `og:url` tags in
   `site/index.html`.

Custom domain: in the same Pages settings page add the domain and follow
the DNS prompt. GitHub provisions HTTPS; tick Enforce HTTPS once the
certificate is ready.

Alternative host, Cloudflare Pages: connect the repository under Workers &
Pages with framework preset None, no build command, and build output
directory `site`. The address becomes `https://<name>.pages.dev`; update
the two tags above to match.

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
