import { PRT } from 'ortus'

const U = ['ms', 's', 'm', 'h', 'd', 'w']
const CORS = { 'access-control-allow-origin': '*' }
const LIVE = { ...CORS, 'cache-control': 'no-store' }
const FIXED = { ...CORS, 'cache-control': 'public, max-age=31536000, immutable' }
const json = (o, headers = LIVE, status = 200) => Response.json(o, { status, headers })
const at = t => ({ ...Object.fromEntries(U.map(u => [u, PRT.fromUnixMs(t, u)])), unixMs: t, iso: new Date(t).toISOString() })
const HELP = {
  name: 'PRT (Planet Renox Time)',
  epoch: new Date(PRT.toUnixMs(0)).toISOString(),
  units: U,
  endpoints: {
    '/api/now': 'current PRT in every unit',
    '/api/now/{unit}': 'current PRT in one unit, plain text',
    '/api/from/{iso|unixMs}': 'PRT at a date',
    '/api/to/{n}/{unit?}': 'date at a PRT value, unit defaults to ms',
  },
}

export const onRequestGet = ({ params: { path = [] } }) => {
  const [a, b, c, d] = path
  try {
    if (a == 'now' && !c) {
      const t = Date.now()
      return b ? new Response(PRT.fromUnixMs(t, b) + '\n', { headers: { ...LIVE, 'content-type': 'text/plain' } }) : json(at(t))
    }
    if (a == 'from' && b && !c) {
      const t = new Date(/^-?\d+$/.test(b) ? +b : decodeURIComponent(b))
      return PRT.fromDate(t), json(at(+t), FIXED)
    }
    if (a == 'to' && b && !d) return json(at(PRT.toUnixMs(Number(b), c)), FIXED)
  } catch (e) { return json({ error: e.message }, CORS, 400) }
  return json(HELP, CORS, a ? 404 : 200)
}
export const onRequestHead = onRequestGet
