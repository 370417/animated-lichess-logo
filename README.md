# Animated Lichess logo

Code for animating the lichess.org logo in the style of a loading spinner.

## Usage

Made with vite + npm.

```bash
npm install
npm run dev
```

You can open src/inkscape/logo-inkscape.svg in Inkscape, and saved changes will be reflected in the site thanks to the dev server.
The expected format for that svg is loosely defined in src/inkscape/parse.ts.

## Font subsetting

```bash
pip install 'fonttools[woff]'
pyftsubset public/CrimsonPro-ExtraLight.woff2 --text-file=index.html --output-file=public/CrimsonPro-ExtraLight.subset.woff2 --flavor=woff2
```

-   Inkscape svg -> path data [done]
-   path data + number of flattening segments -> flattened point data [done]
-   flattened point data -> length data [done]
-   middle length data + frame data -> length progress data (segment + length ratio) [done]
-   length progress data + inner/outer length data -> inner/outer draw progress data (bezier curve index + t value) [done]
-   draw progress data for every frame -> animation data
-   draw progress data + path data -> animated path data
-   animated path data -> svg/canvas
