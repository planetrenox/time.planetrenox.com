import { PRT } from 'ortus'
import { R, LAND } from './land.js'

const $ = s => document.getElementById(s)
const { sin, cos, asin, atan2, max, min, floor, abs, PI } = Math
const D = PI / 180, TAU = 2 * PI
const E = PRT.toUnixMs(0)
const UNITS = { ms: 'milliseconds', s: 'seconds', m: 'minutes', h: 'hours', d: 'days', w: 'weeks' }
const nf = new Intl.NumberFormat('en-US')
const num = n => nf.format(n).replace(/,/g, '<i>,</i>')
const pad = n => String(n).padStart(2, '0')
const dur = t => {
  const s = floor(t / 1e3), d = floor(s / 86400)
  return (d ? d + 'd ' : '') + [floor(s / 3600) % 24, floor(s / 60) % 60, s % 60].map(pad).join(':')
}
const SHORT = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
const LONG = { weekday: 'short', ...SHORT, second: '2-digit', timeZoneName: 'short' }
const loc = (t, o = SHORT) => new Date(t).toLocaleString(undefined, o)
const iso = t => new Date(t).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
const set = (id, h) => { const e = $(id); e.innerHTML != h && (e.innerHTML = h) }
const ll = (v, p, n) => abs(v).toFixed(1) + '°' + (v < 0 ? n : p)

// Low-precision solar ephemeris (~0.01°): declination + subsolar longitude, radians
const sun = t => {
  const d = t / 864e5 - 10957.5, g = (357.529 + .98560028 * d) * D, q = 280.459 + .98564736 * d
  const L = (q + 1.915 * sin(g) + .02 * sin(2 * g)) * D, e = (23.439 - 3.6e-7 * d) * D
  const ra = atan2(cos(e) * sin(L), cos(L)), gmst = (280.46061837 + 360.98564736629 * d) * D
  return { dec: asin(sin(e) * sin(L)), lon: (((ra - gmst) % TAU) + 3 * PI) % TAU - PI, L: ((L / D) % 360 + 360) % 360 }
}
// Next equinox/solstice: Newton-step the ecliptic longitude onto the next multiple of 90°
const SEASONS = ['March equinox', 'June solstice', 'September equinox', 'December solstice']
const season = now => {
  const q = floor(sun(now).L / 90 + 1e-9) + 1, g = q * 90 % 360
  let t = now
  for (let i = 0; i < 6; i++) t += (((g - sun(t).L) % 360 + 540) % 360 - 180 || 0) / .98565 * 864e5
  t < now && (t += 365.2422 * 864e5 / 4)
  return [SEASONS[q % 4], t]
}
const alt = (lat, lon, s) => asin(sin(lat) * sin(s.dec) + cos(lat) * cos(s.dec) * cos(lon - s.lon))

// Land mask: RLE rows, 90N → 90S
const mask = LAND.split(' ').map(r => {
  const a = new Uint8Array(360 * R)
  let i = 0, v = 0
  for (const n of r.split('.')) a.fill(v, i, i += parseInt(n, 36)), v ^= 1
  return a
})
const isLand = (lat, lon) => mask[min(180 * R - 1, max(0, floor((90 - lat) * R)))][floor((lon + 180) * R) % (360 * R)]

// Map
const LAT0 = 84, LAT1 = -58, NL = 16
const cv = $('map'), cx = cv.getContext('2d'), sunEl = $('sun'), tip = $('tip')
let W, H, dpr, dots = [], P
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)
const ramp = (st, t) => {
  const i = min(st.length - 2, floor(t * (st.length - 1)))
  return mix(st[i], st[i + 1], t * (st.length - 1) - i)
}
const rgba = c => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${c[3].toFixed(3)})`
const LANDC = [[34, 66, 160, .62], [44, 96, 215, .8], [70, 150, 255, .92], [150, 222, 255, 1]]
const SEAC = [[30, 60, 150, .1], [60, 130, 255, .2]]
const COL = [...Array(NL)].map((_, i) => rgba(ramp(SEAC, i / (NL - 1)))).concat([...Array(NL)].map((_, i) => rgba(ramp(LANDC, i / (NL - 1)))))
const smooth = (a, b, x) => (x = min(1, max(0, (x - a) / (b - a))), x * x * (3 - 2 * x))

const layout = () => {
  W = cv.clientWidth, H = cv.clientHeight, dpr = min(devicePixelRatio || 1, 2)
  cv.width = W * dpr, cv.height = H * dpr
  P = max(4.2, W / 200)
  const rh = P * .866
  dots = []
  for (let j = 0, y = rh / 2; y < H; y += rh, j++)
    for (let x = j & 1 ? P : P / 2; x < W; x += P) {
      const lat = LAT0 - y / H * (LAT0 - LAT1), lon = x / W * 360 - 180
      dots.push({ x, y, s: sin(lat * D), c: cos(lat * D), l: lon * D, k: isLand(lat, lon) })
    }
  draw()
}

const draw = () => {
  const s = sun(Date.now()), sd = sin(s.dec), cd = cos(s.dec)
  const sx = (s.lon / D + 180) / 360 * W, sy = (LAT0 - s.dec / D) / (LAT0 - LAT1) * H
  cx.setTransform(dpr, 0, 0, dpr, 0, 0)
  cx.clearRect(0, 0, W, H)
  for (const o of [-W, 0, W]) {
    const g = cx.createRadialGradient(sx + o, sy, 0, sx + o, sy, W * .32)
    g.addColorStop(0, 'rgba(60,140,255,.22)'), g.addColorStop(1, 'rgba(60,140,255,0)')
    cx.fillStyle = g, cx.fillRect(0, 0, W, H)
  }
  const B = [...Array(2 * NL)].map(() => new Path2D())
  for (const d of dots) {
    const a = d.s * sd + d.c * cd * cos(d.l - s.lon)
    const t = smooth(-.31, .1, a) * .7 + max(a, 0) * .3
    const b = d.k * NL + min(NL - 1, floor(t * NL)), r = d.k ? P * (.27 + .11 * t) : P * .2
    B[b].moveTo(d.x + r, d.y), B[b].arc(d.x, d.y, r, 0, TAU)
  }
  B.forEach((p, i) => (cx.fillStyle = COL[i], cx.fill(p)))
  sunEl.style.left = sx / W * 100 + '%', sunEl.style.top = sy / H * 100 + '%'
  sunEl.classList.toggle('r', sx / W > .85)
}

cv.addEventListener('pointermove', e => {
  const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height
  const lat = LAT0 - y * (LAT0 - LAT1), lon = x * 360 - 180, s = sun(Date.now())
  const a = alt(lat * D, lon * D, s) / D, st = ((12 + (lon - s.lon / D) / 15) % 24 + 24) % 24
  tip.hidden = false
  tip.style.left = x * 100 + '%', tip.style.top = y * 100 + '%'
  tip.classList.toggle('l', x > .7)
  tip.innerHTML = `<b>${ll(lat, 'N', 'S')} ${ll(lon, 'E', 'W')}</b>${a > 0 ? 'sun ' + a.toFixed(0) + '° up' : a > -18 ? 'twilight' : 'night'} · solar ${pad(floor(st))}:${pad(floor(st % 1 * 60))}`
})
cv.addEventListener('pointerleave', () => tip.hidden = true)
new ResizeObserver(layout).observe(cv)
setInterval(draw, 5e3)

// Unit cards
const KS = Object.keys(UNITS).slice(1)
$('units').innerHTML = KS.map(u => `<button class="unit" data-u="${u}"><span class="ul">${UNITS[u]}<em>${u == 'w' ? '<b id="wd"></b>' : ''}${u}</em></span><span class="uv" id="v${u}">–</span>${u == 'w' ? `<span class="pips">${'<i></i>'.repeat(7)}</span>` : `<span class="bar"><i id="b${u}"></i></span>`}<span class="un" id="n${u}"></span></button>`).join('')
const last = {}
const toast = m => { const t = $('toast'); t.textContent = m, t.hidden = false, clearTimeout(toast.t), toast.t = setTimeout(() => t.hidden = true, 1400) }
const copy = v => navigator.clipboard?.writeText(String(v)).then(() => toast('Copied ' + nf.format(v)))
document.addEventListener('click', e => {
  const u = e.target.closest('[data-u]')?.dataset.u
  u && copy(PRT.now(u))
})
$('ms').addEventListener('click', () => copy(PRT.now()))
$('npm').addEventListener('click', () => navigator.clipboard?.writeText('npm i ortus').then(() => toast('Copied npm i ortus')))

// Static bits
$('ep').textContent = loc(E, { weekday: 'short', ...SHORT, timeZoneName: 'short' })
const pips = [...document.querySelectorAll('.pips i')]

// Milestones: next round number per unit (2 significant digits), plus the trillion
const miles = now => {
  const m = new Map(), add = (u, n) => {
    const t = PRT.toUnixMs(n, u)
    t > now && m.set(t, [...(m.get(t) || []), `${num(n)} <em>${u}</em>`])
  }
  for (const u in UNITS) {
    const v = PRT.fromUnixMs(now, u), k = 10 ** max(1, floor(Math.log10(abs(v) || 1)) - 1)
    add(u, (floor(v / k) + 1) * k)
  }
  add('ms', 1e12), add('s', 1e9), add('d', 11111)
  return [...m].sort((a, b) => a[0] - b[0]).slice(0, 6)
}

const age = now => {
  const at = (y, mo) => { const d = new Date(E); d.setUTCFullYear(d.getUTCFullYear() + y, d.getUTCMonth() + mo); return +d }
  let y = 0, mo = 0
  while (at(y + 1, 0) <= now) y++
  while (at(y, mo + 1) <= now) mo++
  const r = now - at(y, mo)
  return `${y}y ${mo}mo ${floor(r / 864e5)}d ${dur(r % 864e5)}`
}

const slow = now => {
  set('loc', loc(now, { ...LONG, weekday: undefined }))
  set('utc', `${iso(now)} · Unix ${num(floor(now / 1e3))} s`)
  set('age', `${age(now)} ago · Unix ${num(E)} ms`)
  const s = sun(now), [sn, st] = season(now)
  set('ss', `${ll(s.dec / D, 'N', 'S')} ${ll(s.lon / D, 'E', 'W')}`)
  set('ssm', `${sn} in ${dur(st - now)}<br>≈ ${loc(st)}`)
  set('miles', miles(now).map(([t, l]) => `<li><span class="mv">${l.join(' <s>=</s> ')}</span><span class="mt">${loc(t)}</span><span class="mc">in ${dur(t - now)}</span></li>`).join(''))
}

// Main loop
let sec
const tick = () => {
  const now = Date.now()
  const ms = PRT.fromUnixMs(now)
  last.ms != ms && ($('ms').innerHTML = num(last.ms = ms))
  for (const u of KS) {
    const v = PRT.fromUnixMs(now, u), a = PRT.toUnixMs(v, u), b = PRT.toUnixMs(v + 1, u)
    last[u] != v && ($('v' + u).innerHTML = num(last[u] = v))
    const wd = floor((now - a) / 864e5)
    u == 'w' ? (pips.forEach((p, i, c) => (c = i < wd ? 'on' : i == wd ? 'cur' : '', p.className != c && (p.className = c))), set('wd', `day ${wd + 1}/7`))
      : $('b' + u).style.transform = `scaleX(${(now - a) / (b - a)})`
    set('n' + u, u == 's' ? `next in ${((b - now) / 1e3).toFixed(1)}s` : `next in ${dur(b - now)}`)
  }
  floor(now / 1e3) != sec && slow(now, sec = floor(now / 1e3))
  requestAnimationFrame(tick)
}
tick()

// Converter
$('pu').innerHTML = Object.entries(UNITS).map(([u, n]) => `<option value="${u}">${n}</option>`).join('')
const dl = rows => rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')
const err = e => `<dt>!</dt><dd class="err">${e.message}</dd>`
const toLocalInput = t => { const d = new Date(t - new Date(t).getTimezoneOffset() * 6e4); return d.toISOString().slice(0, 23) }
const conv = () => {
  const v = $('cin').value
  if (!v) return $('cout').innerHTML = ''
  try {
    const dt = new Date(v + ($('cz').checked ? 'Z' : ''))
    $('cout').innerHTML = dl(Object.keys(UNITS).map(u => [u, num(PRT.fromDate(dt, u))]))
  } catch (e) { $('cout').innerHTML = err(e) }
}
const pconv = () => {
  try {
    const n = Number($('pin').value.replace(/[\s,_]/g, '')), t = PRT.toUnixMs(n, $('pu').value)
    $('pout').innerHTML = dl([['UTC', iso(t)], ['local', loc(t, LONG)], ['unix', num(t) + ' ms']])
  } catch (e) { $('pout').innerHTML = err(e) }
}
$('cnow').onclick = () => ($('cin').value = $('cz').checked ? new Date().toISOString().slice(0, 23) : toLocalInput(Date.now()), conv())
$('cin').value = '1970-01-01T00:00:00.000' // Unix epoch, shows PRT going negative
$('cin').oninput = $('cz').onchange = conv
$('pin').oninput = $('pu').onchange = pconv
conv(), pconv()
