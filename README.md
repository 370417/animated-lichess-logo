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
