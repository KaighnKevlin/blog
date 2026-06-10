# OnlyKaighns photos

Drop image files here (e.g. `01.jpg`, `02.jpg`, …), then set the matching
`src` in `src/pages/onlykaighns.astro` (e.g. `src: '/onlykaighns/01.jpg'`).
Anything served from `/public` is available at the site root, so a file at
`public/onlykaighns/01.jpg` is reachable at `/onlykaighns/01.jpg`.

Tiles whose `src` is `null` render a styled placeholder, so the page works
before any real photos exist.
