# time.planetrenox.com

Live **PRT (Planet Renox Time)**, milliseconds since `1998-03-14T03:00:00.000Z`, in every [ortus](https://github.com/planetrenox/ortus) unit (`ms s m h d w`), over a dot map of Earth lit by the real-time sun.

Also on the page: PRT day/week progress, upcoming round-number milestones, next equinox/solstice, a subsolar marker with hover readout (lat/lon, sun altitude, solar time), and a Date ⇄ PRT converter.

Static site, no build step. `ortus` loads from jsDelivr via an import map. Land dots come from Natural Earth 50m land, rasterized to a half-degree RLE mask in `land.js`.

```sh
python3 -m http.server   # then open http://localhost:8000
```

Cloudflare Pages: no build command, output directory `/`.
