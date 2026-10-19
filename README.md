# time.planetrenox.com

Live **PRT (Planet Renox Time)**, milliseconds since `1998-03-14T03:00:00.000Z`, in every [ortus](https://github.com/planetrenox/ortus) unit (`ms s m h d w`), over a dot map of Earth lit by the real-time sun.

Also on the page: PRT day/week progress, upcoming round-number milestones, next equinox/solstice, a subsolar marker with hover readout (lat/lon, sun altitude, solar time), a Date ⇄ PRT converter, and a live API explorer.

## API

Cloudflare Pages Functions in `functions/api/`, built on `ortus`. JSON responses carry every unit plus `unixMs` and `iso`; CORS is open.

| | |
|---|---|
| `GET /api` | Epoch, units, endpoint list |
| `GET /api/now` | Current PRT in every unit |
| `GET /api/now/{unit}` | Current PRT in one unit, plain text |
| `GET /api/from/{iso\|unixMs}` | PRT at a date, e.g. `/api/from/2010-06-01` |
| `GET /api/to/{n}/{unit?}` | Date at a PRT value, e.g. `/api/to/11111/d` |

```sh
curl https://time.planetrenox.com/api/now/d   # 10446
```

## Site

Static page, no build step. `ortus` loads from jsDelivr via an import map. Land dots come from Natural Earth 50m land, rasterized to a half-degree RLE mask in `land.js`.

```sh
npm i && npm run dev   # wrangler pages dev, serves the site and /api
```

Cloudflare Pages: no build command, output directory `/`.
