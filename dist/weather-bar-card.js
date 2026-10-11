/**
 * weather-bar-card — compact full-width weather bar for Home Assistant.
 * Photo of the current condition on the left fading into the bar colour,
 * forecast days (icon, weekday, day / night temperature), clock on the right.
 * Click opens a detail dialog (hourly curve, current details, 5 days).
 * Below `compact_width` px it collapses to a single small row without forecast.
 *
 * Photos and icons are loaded from the folder this file is served from (HACS: dist/).
 * Forecast icons: Meteocons by Bas Milius (MIT). Photos: CC0 / public domain, see CREDITS.json.
 * https://github.com/eMalinos/weather-bar-card
 */

const VERSION = '1.0.0';

// Folder of this module, e.g. /hacsfiles/weather-bar-card/ — photos and icons sit next to it.
const ASSET_BASE = new URL('./', import.meta.url).href;

// HA weather conditions -> photo key. Night variants are picked via the sun entity.
const PHOTO_FOR = {
  'clear-night': 'clear-night',
  'cloudy': 'cloudy',
  'exceptional': 'cloudy',
  'fog': 'fog',
  'hail': 'snowy-rainy',
  'lightning': 'lightning-rainy',
  'lightning-rainy': 'lightning-rainy',
  'partlycloudy': 'partlycloudy',
  'pouring': 'pouring',
  'rainy': 'rainy',
  'snowy': 'snowy',
  'snowy-rainy': 'snowy-rainy',
  'sunny': 'sunny',
  'windy': 'windy',
  'windy-variant': 'windy',
};

// Particle effects layered over the bar.
const FX_FOR = {
  'rainy': { rain: 46 },
  'pouring': { rain: 90, heavy: true },
  'lightning-rainy': { rain: 46, flash: true },
  'lightning': { flash: true },
  'hail': { rain: 30, snow: 18 },
  'snowy': { snow: 40 },
  'snowy-rainy': { rain: 26, snow: 22 },
};

// Bar colour per photo when `tint: photo`.
const TINT = {
  'sunny': '#1E3A72', 'clear-night': '#0E1828', 'partlycloudy': '#2C4260', 'partlycloudy-night': '#16171D',
  'cloudy': '#464A54', 'fog': '#4A3A30', 'rainy': '#2A2C2F', 'pouring': '#36404B',
  'lightning-rainy': '#1E1A2A', 'snowy': '#2E3236', 'snowy-rainy': '#455A74', 'windy': '#384652',
};

// Focal point of each photo (CSS background-position).
const FOCUS = {
  'sunny': '30% 38%', 'clear-night': '70% 35%', 'partlycloudy': '62% 40%', 'partlycloudy-night': '50% 45%',
  'cloudy': '50% 55%', 'fog': '50% 55%', 'rainy': '50% 50%', 'pouring': '55% 55%',
  'lightning-rainy': '57% 70%', 'snowy': '50% 50%', 'snowy-rainy': '50% 55%', 'windy': '50% 45%',
};

// HA condition -> Meteocons fill icon (same set as clock-weather-card).
const ICON_FOR = {
  'clear-night': 'clear-night', 'cloudy': 'cloudy', 'exceptional': 'not-available', 'fog': 'fog', 'hail': 'hail',
  'lightning': 'thunderstorms', 'lightning-rainy': 'thunderstorms-rain', 'partlycloudy': 'partly-cloudy-day',
  'pouring': 'rain', 'rainy': 'rain', 'snowy': 'snow', 'snowy-rainy': 'sleet', 'sunny': 'clear-day',
  'windy': 'wind', 'windy-variant': 'wind',
};

// Condition names are needed only when the card language differs from HA's (otherwise HA translates).
const I18N = {
  cs: {
    wind: 'Vítr', humidity: 'Vlhkost', compass: ['S', 'SV', 'V', 'JV', 'J', 'JZ', 'Z', 'SZ'],
    cond: { 'clear-night': 'Jasno', 'cloudy': 'Zataženo', 'exceptional': 'Výjimečné', 'fog': 'Mlha', 'hail': 'Krupobití', 'lightning': 'Bouřky', 'lightning-rainy': 'Bouřky s deštěm', 'partlycloudy': 'Polojasno', 'pouring': 'Liják', 'rainy': 'Déšť', 'snowy': 'Sněžení', 'snowy-rainy': 'Déšť se sněhem', 'sunny': 'Slunečno', 'windy': 'Větrno', 'windy-variant': 'Silný vítr' },
  },
  en: {
    wind: 'Wind', humidity: 'Humidity', compass: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
    cond: { 'clear-night': 'Clear', 'cloudy': 'Cloudy', 'exceptional': 'Exceptional', 'fog': 'Fog', 'hail': 'Hail', 'lightning': 'Lightning', 'lightning-rainy': 'Lightning, rainy', 'partlycloudy': 'Partly cloudy', 'pouring': 'Pouring', 'rainy': 'Rainy', 'snowy': 'Snowy', 'snowy-rainy': 'Snowy, rainy', 'sunny': 'Sunny', 'windy': 'Windy', 'windy-variant': 'Windy' },
  },
};

export function photoKey(condition, sunState) {
  const key = PHOTO_FOR[condition] ?? 'cloudy';
  return key === 'partlycloudy' && sunState === 'below_horizon' ? 'partlycloudy-night' : key;
}

export function compass(bearing, lang) {
  if (typeof bearing === 'string') return bearing;
  if (typeof bearing !== 'number' || Number.isNaN(bearing)) return '';
  const names = (I18N[String(lang).split('-')[0]] ?? I18N.en).compass;
  return names[Math.round((((bearing % 360) + 360) % 360) / 45) % 8];
}

export function convertTemp(t, from, to) {
  if (typeof t !== 'number' || from === to) return t;
  if (to === '°F') return t * 9 / 5 + 32;
  if (to === '°C') return (t - 32) * 5 / 9;
  return t;
}

// '12' / '24' from the card, else HA profile (language | system | 12 | 24). undefined = language default.
export function hour12(cardFormat, haFormat) {
  const f = cardFormat && cardFormat !== 'auto' ? String(cardFormat) : haFormat;
  if (f === '12') return true;
  if (f === '24') return false;
  if (f === 'system') return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12;
  return undefined;
}

// Share of the bar width the photo covers (desktop layout).
export const PHOTO_WIDTH = 0.52;

// Bar photo fade: [position across the photo width, opacity]. Gentle steps so the edge isn't visible.
export const PHOTO_FADE = [[0, 1], [0.45, 1], [0.6, 0.75], [0.75, 0.45], [0.88, 0.18], [1, 0]];

export function photoOpacity(x) {
  if (x <= 0) return 1;
  for (let i = 1; i < PHOTO_FADE.length; i++) {
    const [x1, o1] = PHOTO_FADE[i];
    if (x <= x1) {
      const [x0, o0] = PHOTO_FADE[i - 1];
      return o0 + (o1 - o0) * (x - x0) / (x1 - x0);
    }
  }
  return 0;
}

// Temperature -> colour, blue (frost) to red (heat). Fahrenheit converted first.
export function tempColor(t, unit = '°C') {
  const c = convertTemp(t, unit, '°C');
  const stops = [[-10, [122, 167, 255]], [0, [90, 200, 250]], [10, [99, 230, 190]], [18, [255, 214, 10]], [25, [255, 159, 10]], [32, [255, 69, 58]]];
  if (c <= stops[0][0]) return `rgb(${stops[0][1].join(',')})`;
  for (let i = 1; i < stops.length; i++) {
    const [t1, c1] = stops[i];
    if (c <= t1) {
      const [t0, c0] = stops[i - 1];
      const k = (c - t0) / (t1 - t0);
      return `rgb(${c0.map((v, j) => Math.round(v + (c1[j] - v) * k)).join(',')})`;
    }
  }
  return `rgb(${stops[stops.length - 1][1].join(',')})`;
}

// Daily forecast -> visible days (today skipped), temperatures converted to `toUnit`.
export function buildDays(forecast, count, now = new Date(), fromUnit = '°C', toUnit = fromUnit) {
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const items = (forecast ?? []).filter((f) => f && f.datetime && typeof f.temperature === 'number');
  const today = items.find((f) => sameDay(new Date(f.datetime), now)) ?? null;
  const days = items.filter((f) => new Date(f.datetime) > now && !sameDay(new Date(f.datetime), now)).slice(0, count)
    .map((f) => ({
      date: new Date(f.datetime), condition: f.condition,
      hi: convertTemp(f.temperature, fromUnit, toUnit), precipitation: f.precipitation,
      lo: typeof f.templow === 'number' ? convertTemp(f.templow, fromUnit, toUnit) : null,
    }));
  return { today, days };
}

// Deterministic particles so re-renders don't jump.
export function particles(fx, compact) {
  let s = 11;
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const out = [];
  const scale = compact ? 0.5 : 1;
  for (let i = 0; i < Math.round((fx.rain ?? 0) * scale); i++) {
    const d = (fx.heavy ? 0.45 : 0.7) + r() * 0.35;
    out.push(`<i class="drop${fx.heavy ? ' heavy' : ''}" style="left:${(r() * 106 - 3).toFixed(1)}%;animation-duration:${d.toFixed(2)}s;animation-delay:${(-r() * d).toFixed(2)}s"></i>`);
  }
  for (let i = 0; i < Math.round((fx.snow ?? 0) * scale); i++) {
    const z = 2.5 + r() * 3, d = 4 + r() * 4;
    out.push(`<i class="flake" style="left:${(r() * 100).toFixed(1)}%;width:${z.toFixed(1)}px;height:${z.toFixed(1)}px;animation-duration:${d.toFixed(1)}s;animation-delay:${(-r() * d).toFixed(1)}s"></i>`);
  }
  if (fx.flash) out.push('<i class="flash"></i>');
  return out.join('');
}

// ---------------------------------------------------------------------------
// Detail dialog (click on the bar): hero photo, 24 h hourly curve, current
// details, 5 forecast days on condition photos. Desktop = centred modal,
// narrow screens = bottom sheet. Design: canvas "HA Weather Bar", page v7.

const DETAIL_I18N = {
  cs: {
    updated: 'aktualizováno', hourly: 'Hodinová předpověď · 24 h', days: 'Předpověď na {n} dní', now: 'Teď',
    max: 'Max', min: 'Min', precipToday: 'srážek', noPrecip: 'bez srážek', close: 'Zavřít', more: 'Podrobnosti v HA',
    wind: 'Vítr', from: 'od', humidity: 'Vlhkost', dew: 'rosný bod', pressure: 'Tlak', uv: 'UV index', uvMax: 'max',
    cloud: 'Oblačnost', sun: 'Slunce', sunset: 'západ', sunrise: 'východ', data: 'Data',
    windLv: ['bezvětří', 'slabý', 'mírný', 'čerstvý', 'silný', 'bouřlivý'],
    pressLv: ['nízký', 'normální', 'vysoký'],
    uvLv: ['nízký', 'střední', 'vysoký', 'velmi vysoký', 'extrémní'],
    cloudLv: ['jasno', 'skoro jasno', 'polojasno', 'převážně oblačno', 'zataženo'],
  },
  en: {
    updated: 'updated', hourly: 'Hourly forecast · 24 h', days: '{n}-day forecast', now: 'Now',
    max: 'High', min: 'Low', precipToday: 'precipitation', noPrecip: 'no precipitation', close: 'Close', more: 'Details in HA',
    wind: 'Wind', from: 'from', humidity: 'Humidity', dew: 'dew point', pressure: 'Pressure', uv: 'UV index', uvMax: 'max',
    cloud: 'Cloud cover', sun: 'Sun', sunset: 'sunset', sunrise: 'sunrise', data: 'Data',
    windLv: ['calm', 'light', 'moderate', 'fresh', 'strong', 'gale'],
    pressLv: ['low', 'normal', 'high'],
    uvLv: ['low', 'moderate', 'high', 'very high', 'extreme'],
    cloudLv: ['clear', 'mostly clear', 'partly cloudy', 'mostly cloudy', 'overcast'],
  },
};

const TILE_ICON = {
  wind: 'M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8',
  humidity: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  pressure: 'M4 13a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 13l3.5-3.5M12 5V3',
  uv: 'M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  cloud: 'M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z',
  sun: 'M3 18h18M7 18a5 5 0 0 1 10 0M12 4v4M5.6 9.6l1.5 1.5M18.4 9.6l-1.5 1.5',
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Index of the first threshold the value is below (thresholds ascending), else the last level.
export function level(value, thresholds) {
  const i = thresholds.findIndex((t) => value < t);
  return i === -1 ? thresholds.length : i;
}

export function toKmh(speed, unit) {
  return speed * ({ 'm/s': 3.6, 'mph': 1.609344, 'kn': 1.852, 'ft/s': 1.09728 }[unit] ?? 1);
}

export function toHpa(p, unit) {
  return p * ({ 'inHg': 33.8639, 'mmHg': 1.33322, 'kPa': 10, 'Pa': 0.01, 'psi': 68.9476 }[unit] ?? 1);
}

// Is `t` between sunset and sunrise? Uses the sun entity's next_rising / next_setting.
export function isNightAt(t, nextRising, nextSetting) {
  const r = new Date(nextRising).getTime(), s = new Date(nextSetting).getTime(), x = new Date(t).getTime();
  if (Number.isNaN(r) || Number.isNaN(s)) return false;
  return s < r ? x >= s && x < r : x < r || x >= s;
}

// Icon name for a forecast slot; HA reports partlycloudy / sunny for night hours too.
export function iconFor(condition, night) {
  if (night && condition === 'partlycloudy') return 'partly-cloudy-night';
  if (night && condition === 'sunny') return 'clear-night';
  return ICON_FOR[condition] ?? 'cloudy';
}

// Hourly forecast -> next `count` slots from the current hour, with curve geometry (52 px per slot).
export function buildHours(forecast, count = 24, now = new Date(), fromUnit = '°C', toUnit = fromUnit) {
  const hourStart = new Date(now); hourStart.setMinutes(0, 0, 0);
  const items = (forecast ?? []).filter((f) => f && f.datetime && typeof f.temperature === 'number' && new Date(f.datetime) >= hourStart).slice(0, count)
    .map((f) => ({ date: new Date(f.datetime), condition: f.condition, temp: convertTemp(f.temperature, fromUnit, toUnit), precipitation: f.precipitation }));
  if (!items.length) return { hours: [], curve: '', area: '', width: 0 };
  const min = Math.min(...items.map((h) => h.temp)), span = Math.max(...items.map((h) => h.temp)) - min || 1;
  for (const [i, h] of items.entries()) { h.x = i * 52 + 26; h.y = 8 + (1 - (h.temp - min) / span) * 38; }
  const curve = items.map((h, i) => `${i ? 'L' : 'M'}${h.x.toFixed(1)} ${h.y.toFixed(1)}`).join(' ');
  const last = items[items.length - 1];
  return { hours: items, curve, area: `${curve} L${last.x} 60 L${items[0].x} 60 Z`, width: items.length * 52 };
}

const DETAIL_STYLE = `
:host { position: fixed; inset: 0; z-index: 9999; font-family: var(--ha-font-family-body, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif);
  -webkit-font-smoothing: antialiased; font-variant-numeric: tabular-nums; }
* { box-sizing: border-box; }
.scrim { position: absolute; inset: 0; background: var(--d-scrim); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
.modal { position: absolute; left: 50%; top: 40px; transform: translateX(-50%); width: min(880px, calc(100vw - 32px)); max-height: calc(100% - 64px);
  overflow-y: auto; overscroll-behavior: contain; border-radius: 28px; background: var(--d-surface); color: var(--d-fg);
  box-shadow: 0 40px 90px -30px rgba(0,0,0,.8), 0 0 0 1px var(--d-ring); scrollbar-width: none; }
.modal::-webkit-scrollbar { display: none; }
.sheet .modal { left: 0; right: 0; top: 44px; bottom: 0; transform: none; width: auto; max-height: none; border-radius: 28px 28px 0 0; }
.grab { position: sticky; top: 0; height: 0; z-index: 2; display: flex; justify-content: center; }
.grab i { margin-top: 7px; width: 38px; height: 5px; border-radius: 3px; background: rgba(255,255,255,.7); }
@keyframes wb-in { from { opacity: 0; } }
@keyframes wb-up { from { opacity: 0; transform: translate(-50%, 16px); } }
/* entry animation only on open, not on every re-render */
.anim .scrim { animation: wb-in .2s ease; }
.anim .modal { animation: wb-up .25s cubic-bezier(.2,.8,.2,1); }
.anim.sheet .modal { animation-name: wb-sheet; }
@media (prefers-reduced-motion: reduce) { .anim .scrim, .anim .modal, .anim.sheet .modal { animation: none; } }
@keyframes wb-sheet { from { transform: translateY(40px); opacity: 0; } }

.hero { position: relative; height: var(--d-hero-h); overflow: hidden; }
.hero .ph { position: absolute; inset: 0; background-size: cover; background-repeat: no-repeat; -webkit-mask-image: var(--d-mask); mask-image: var(--d-mask); }
.hero .sc { position: absolute; inset: 0; background: var(--d-hero-scrim); }
.hero .in { position: absolute; inset: 0; padding: var(--d-pad) var(--d-pad) var(--d-hero-pb); display: flex; flex-direction: column; color: #fff; text-shadow: 0 1px 12px rgba(0,0,0,.45); }
.top { display: flex; align-items: flex-start; gap: 12px; }
.loc { font-size: 13px; font-weight: 600; letter-spacing: .02em; }
.upd { font-size: 12px; color: rgba(255,255,255,.82); margin-top: 3px; }
.close { margin-left: auto; width: 36px; height: 36px; flex: none; border: 0; border-radius: 18px; padding: 0; cursor: pointer; color: #fff;
  background: rgba(0,0,0,.32); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; }
.close:hover { background: rgba(0,0,0,.5); }
.close:focus-visible, .more:focus-visible { outline: 2px solid #FF9A4D; outline-offset: 2px; }
.big { margin-top: auto; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.bt { font-size: var(--d-temp); font-weight: 200; line-height: .9; letter-spacing: -.045em; }
.bl { font-size: 19px; font-weight: 600; letter-spacing: -.01em; }
.bs { font-size: 13px; color: rgba(255,255,255,.86); }

.body { padding: 4px var(--d-pad) var(--d-pad); display: flex; flex-direction: column; gap: 14px; }
.box { border-radius: 20px; background: var(--d-tile); box-shadow: var(--d-tile-sh); }
.head { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--d-fg2); }
.scroll { overflow-x: auto; scrollbar-width: none; }
.scroll::-webkit-scrollbar { display: none; }
.hourly { padding: 14px 0 10px; }
.hourly .head { padding: 0 16px 6px; }
.hrow { position: relative; display: flex; padding: 0 8px; width: max-content; }
.hrow svg { position: absolute; left: 8px; top: 64px; pointer-events: none; }
.hc { width: 52px; flex: none; display: flex; flex-direction: column; align-items: center; }
.hc .t { font-size: 12px; height: 18px; line-height: 18px; font-weight: 500; color: var(--d-fg2); white-space: nowrap; }
.hc .t.now { font-weight: 700; color: var(--d-fg); }
.hc img { width: 40px; height: 40px; margin: 2px 0 4px; }
.band { position: relative; width: 100%; height: 60px; }
.dot { position: absolute; left: 50%; width: 7px; height: 7px; margin-left: -3.5px; border-radius: 4px; background: var(--d-dot); }
.v { position: absolute; left: 0; right: 0; text-align: center; font-size: 13px; font-weight: 600; }
.r { height: 16px; font-size: 10.5px; font-weight: 600; color: var(--d-blue); white-space: nowrap; }

.tiles { display: grid; grid-template-columns: repeat(var(--d-tiles), minmax(0, 1fr)); gap: 10px; }
.tile { min-width: 0; height: 116px; padding: 12px 14px; display: flex; flex-direction: column; gap: 3px; }
.tl { display: flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--d-fg2); white-space: nowrap; }
.tv { display: flex; align-items: center; gap: 6px; margin-top: 2px; font-size: 22px; font-weight: 600; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; }
.tv small { min-width: 0; overflow: hidden; text-overflow: ellipsis; font-size: 12.5px; font-weight: 500; color: var(--d-fg2); margin-left: -3px; letter-spacing: 0; }
.tv svg { flex: none; }
.ts { font-size: 11.5px; color: var(--d-fg2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tb { margin-top: auto; position: relative; height: 5px; border-radius: 3px; background: var(--d-track); }
.tb i { display: block; height: 100%; border-radius: 3px; }
.tb b { position: absolute; top: -3px; width: 11px; height: 11px; margin-left: -5.5px; border-radius: 6px; background: var(--d-marker); box-shadow: 0 0 0 2px var(--d-tile-solid); }
.sheet .tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); row-gap: 14px; column-gap: 10px; padding: 14px; border-radius: 20px; background: var(--d-tile); box-shadow: var(--d-tile-sh); }
.sheet .tile { height: auto; padding: 0; gap: 2px; background: none; box-shadow: none; }
.sheet .tl { font-size: 10px; letter-spacing: .05em; gap: 5px; }
.sheet .tv { font-size: 19px; gap: 4px; margin: 0; }
.sheet .tv small { font-size: 11.5px; margin-left: -2px; }
.sheet .ts { font-size: 11px; }
.sheet .tb { display: none; }

.dhead { padding: 0 4px; }
.days { display: grid; grid-template-columns: repeat(var(--d-days), minmax(0, 1fr)); gap: 10px; }
.dc { position: relative; min-width: 0; height: 216px; overflow: hidden; border-radius: 20px; color: #fff; background: #2C2C2E; box-shadow: var(--d-day-sh); }
.dc .ph { position: absolute; inset: 0; background-size: cover; background-repeat: no-repeat; }
.dc .sc { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.42) 0%, rgba(0,0,0,.08) 38%, rgba(0,0,0,.18) 58%, rgba(0,0,0,.68) 100%); }
.dc .in { position: absolute; inset: 0; padding: 14px; display: flex; flex-direction: column; }
.dc .hd { margin: -14px -14px 0; padding: 14px 14px 30px; background: linear-gradient(180deg, rgba(0,0,0,.62) 0%, rgba(0,0,0,.45) 55%, rgba(0,0,0,0) 100%); text-shadow: 0 1px 10px rgba(0,0,0,.5); }
.dn { font-size: 15px; font-weight: 700; letter-spacing: -.01em; }
.dd { font-size: 11.5px; color: rgba(255,255,255,.88); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dt { margin-top: auto; display: flex; align-items: baseline; gap: 6px; white-space: nowrap; text-shadow: 0 1px 2px rgba(0,0,0,.65), 0 2px 14px rgba(0,0,0,.6); }
.dt b { font-size: 26px; font-weight: 600; letter-spacing: -.03em; }
.dt span { font-size: 15px; color: rgba(255,255,255,.8); }
.pill { align-self: flex-start; margin-top: 8px; display: flex; align-items: center; gap: 5px; height: 22px; padding: 0 9px; border-radius: 11px; flex: none;
  background: rgba(0,0,0,.35); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); font-size: 11.5px; font-weight: 600; color: rgba(255,255,255,.85); white-space: nowrap; }
.pill.wet { background: rgba(10,132,255,.85); color: #fff; }
.sheet .days { display: flex; flex-direction: column; gap: 8px; }
.sheet .dc { height: 72px; border-radius: 18px; box-shadow: none; }
.sheet .dc .sc { background: linear-gradient(90deg, rgba(0,0,0,.6) 0%, rgba(0,0,0,.25) 50%, rgba(0,0,0,.55) 100%); }
.sheet .dc .in { flex-direction: row; align-items: center; gap: 10px; padding: 0 14px; }
.sheet .dc .hd { align-self: stretch; min-width: 0; margin: 0 0 0 -14px; padding: 0 40px 0 14px; display: flex; flex-direction: column; justify-content: center; gap: 2px;
  background: linear-gradient(90deg, rgba(0,0,0,.62) 0%, rgba(0,0,0,.45) 60%, rgba(0,0,0,0) 100%); }
.sheet .pill { margin: 0 0 0 auto; align-self: center; font-size: 11px; padding: 0 8px; }
.sheet .dt { margin: 0; flex: none; }
.sheet .dt b { font-size: 20px; letter-spacing: -.02em; }
.sheet .dt span { font-size: 14px; }

.foot { display: flex; align-items: center; gap: 12px; font-size: 11.5px; color: var(--d-fg2); padding: 2px 4px; }
.foot span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.more { margin-left: auto; flex: none; border: 0; background: none; padding: 6px; cursor: pointer; font: inherit; font-weight: 600; color: var(--d-link); }
`;

const DROP = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5s7 7.6 7 12.7a7 7 0 0 1-14 0C5 10.1 12 2.5 12 2.5z"/></svg>';

const DETAIL_THEME = {
  dark: {
    '--d-surface': '#1C1C1E', '--d-fg': '#F5F5F7', '--d-fg2': 'rgba(235,235,245,.62)', '--d-tile': 'linear-gradient(165deg, rgba(62,62,66,.55), rgba(36,36,38,.7))',
    '--d-tile-solid': '#2C2C2E', '--d-tile-sh': 'inset 0 1px 0 rgba(255,255,255,.1)', '--d-track': 'rgba(255,255,255,.12)', '--d-dot': '#2C2C2E',
    '--d-blue': '#64D2FF', '--d-link': '#FF9A4D', '--d-marker': '#FFFFFF', '--d-day-sh': '0 12px 28px -16px rgba(0,0,0,.7)',
    '--d-scrim': 'rgba(0,0,0,.55)', '--d-ring': 'rgba(255,255,255,.08)', '--d-mask': 'linear-gradient(180deg, #000 0%, #000 52%, rgba(0,0,0,.5) 78%, transparent 100%)',
    '--d-hero-scrim': 'linear-gradient(180deg, rgba(0,0,0,.42) 0%, rgba(0,0,0,.12) 40%, rgba(0,0,0,.28) 70%, transparent 100%)',
  },
  light: {
    '--d-surface': '#F2F2F7', '--d-fg': '#1C1C1E', '--d-fg2': 'rgba(60,60,67,.7)', '--d-tile': '#FFFFFF',
    '--d-tile-solid': '#FFFFFF', '--d-tile-sh': '0 1px 2px rgba(0,0,0,.04), 0 8px 24px -14px rgba(0,0,0,.18)', '--d-track': 'rgba(0,0,0,.08)', '--d-dot': '#FFFFFF',
    '--d-blue': '#0062CC', '--d-link': '#C2410C', '--d-marker': '#1C1C1E', '--d-day-sh': '0 10px 24px -16px rgba(0,0,0,.4)',
    '--d-scrim': 'rgba(30,30,35,.32)', '--d-ring': 'rgba(0,0,0,.06)',
    // Light surface: photo stays solid under the white text and fades out in small steps below it.
    '--d-mask': 'linear-gradient(180deg, #000 0%, #000 60%, rgba(0,0,0,.92) 66%, rgba(0,0,0,.78) 72%, rgba(0,0,0,.58) 78%, rgba(0,0,0,.38) 84%, rgba(0,0,0,.2) 90%, rgba(0,0,0,.07) 96%, transparent 100%)',
    '--d-hero-scrim': 'linear-gradient(180deg, rgba(0,0,0,.42) 0%, rgba(0,0,0,.12) 32%, rgba(0,0,0,.2) 50%, rgba(0,0,0,.12) 62%, rgba(0,0,0,.04) 74%, transparent 84%)',
  },
};

const STYLE = `
:host { display: block; }
ha-card { cursor: pointer; }
ha-card:focus-visible { outline: 2px solid #FF9A4D; outline-offset: 2px; }
ha-card { position: relative; overflow: hidden; border: none; color: var(--wb-fg); background: var(--wb-bg);
  border-radius: var(--wb-radius); box-shadow: var(--wb-shadow); transition: background .9s, color .9s;
  font-variant-numeric: tabular-nums; -webkit-font-smoothing: antialiased; }
.layer { position: absolute; inset: 0; pointer-events: none; }
.photo { position: absolute; top: 0; bottom: 0; left: 0; width: var(--wb-photo-w); background-size: cover; background-repeat: no-repeat;
  -webkit-mask-image: var(--wb-mask); mask-image: var(--wb-mask);
  opacity: 0; transition: opacity 1.1s cubic-bezier(.4,0,.2,1); }
.photo::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(0,0,0,.38), rgba(0,0,0,.18)); }
.photo.on { opacity: 1; }
.fx { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.drop { position: absolute; top: -26px; width: 1.2px; height: 13px; border-radius: 1px;
  background: linear-gradient(rgba(190,215,255,0), rgba(190,215,255,.55)); animation: wb-rain linear infinite; }
.drop.heavy { width: 1.6px; height: 18px; background: linear-gradient(rgba(190,215,255,0), rgba(190,215,255,.75)); }
.flake { position: absolute; top: -12px; border-radius: 50%; background: rgba(255,255,255,.9); animation: wb-snow linear infinite; }
.flash { position: absolute; inset: 0; background: #fff; opacity: 0; animation: wb-flash 6s ease-in-out infinite; }
@keyframes wb-rain { from { transform: translate3d(0,0,0) rotate(14deg); } to { transform: translate3d(-34px,240px,0) rotate(14deg); } }
@keyframes wb-snow { 0% { transform: translate3d(0,-10px,0); } 50% { transform: translate3d(10px,90px,0); } 100% { transform: translate3d(-6px,210px,0); } }
@keyframes wb-flash { 0%,88%,100% { opacity: 0; } 89% { opacity: .38; } 90.5% { opacity: .04; } 92% { opacity: .28; } 95% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .drop, .flake, .flash { animation: none; } .flash { display: none; } }

.row { position: relative; z-index: 1; display: flex; align-items: center; box-sizing: border-box; height: 76px; padding: 0 var(--wb-pad); }
.now { flex: none; display: flex; align-items: center; gap: 12px; width: var(--wb-now-w); padding-right: 48px; box-sizing: border-box;
  color: #fff; text-shadow: 0 1px 10px rgba(0,0,0,.55); }
.temp { font-weight: 600; font-size: 34px; line-height: 1; letter-spacing: -.035em; }
.label { font-weight: 600; font-size: 15px; letter-spacing: -.01em; white-space: nowrap; }
.sub { font-size: 12px; color: rgba(255,255,255,.86); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.txt { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.days { flex: 1; min-width: 0; display: flex; align-items: center; padding: 0 6px; }
.day { flex: 1 1 0; min-width: 0; display: flex; align-items: center; gap: 8px; padding: 0 10px; border-right: 1px solid var(--wb-sep); }
.day:last-child { border-right: 0; }
.day img { width: 44px; height: 44px; flex: none; margin: -6px -4px; filter: drop-shadow(0 1px 1.5px rgba(0,0,0,.28)) drop-shadow(0 3px 7px rgba(0,0,0,.22)); }
.dt { min-width: 0; display: flex; flex-direction: column; gap: 3px; white-space: nowrap; }
.dn { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
.dtemp { font-size: 12px; color: var(--wb-fg2); overflow: hidden; text-overflow: ellipsis; }
.dtemp b { font-weight: 600; color: var(--wb-fg); }
/* forecast day lying on the photo (light surface): light text */
.day.lt { --wb-fg: #FFFFFF; --wb-fg2: rgba(255,255,255,.86); color: #FFFFFF; text-shadow: 0 1px 2px rgba(0,0,0,.7), 0 1px 10px rgba(0,0,0,.65); border-right-color: rgba(255,255,255,.18); }
.clock { flex: none; padding-left: 22px; border-left: 1px solid var(--wb-line); height: 44px; display: flex; flex-direction: column; justify-content: center; align-items: flex-end; }
.time { font-weight: 300; font-size: 24px; line-height: 1; letter-spacing: -.02em; }
.date { font-size: 11.5px; color: var(--wb-fg2); margin-top: 4px; white-space: nowrap; }
.hidden { display: none !important; }

/* compact: one small row, no forecast */
ha-card.compact .row { height: 56px; padding: 0 16px; gap: 10px; }
ha-card.compact .now { width: auto; max-width: none; flex: 1; min-width: 0; padding: 0; gap: 10px; }
ha-card.compact .temp { font-size: 26px; }
ha-card.compact .label { font-size: 14px; }
ha-card.compact .sub { font-size: 11.5px; }
ha-card.compact .days { display: none; }
ha-card.compact .clock { border: 0; padding: 0; height: auto; }
ha-card.compact .time { font-size: 20px; }
ha-card.compact .date { font-size: 11px; margin-top: 3px; }
`;

class WeatherBarCard extends (globalThis.HTMLElement ?? class {}) {
  static getStubConfig(hass) {
    const entity = Object.keys(hass?.states ?? {}).find((id) => id.startsWith('weather.')) ?? 'weather.home';
    return { entity };
  }

  static getConfigForm() {
    return {
      schema: [
        { name: 'entity', required: true, selector: { entity: { domain: 'weather' } } },
        {
          type: 'grid', name: '', schema: [
            { name: 'theme', selector: { select: { mode: 'dropdown', options: ['auto', 'dark', 'light'] } } },
            { name: 'tint', selector: { select: { mode: 'dropdown', options: ['neutral', 'photo'] } } },
            { name: 'shape', selector: { select: { mode: 'dropdown', options: ['edge', 'floating'] } } },
            { name: 'forecast_days', selector: { number: { min: 0, max: 7, mode: 'box' } } },
            { name: 'compact_width', selector: { number: { min: 0, max: 2000, unit_of_measurement: 'px', mode: 'box' } } },
            { name: 'unit', selector: { select: { mode: 'dropdown', options: [
              { value: 'auto', label: 'Auto (entity)' }, { value: '°C', label: '°C' }, { value: '°F', label: '°F' }] } } },
            { name: 'time_format', selector: { select: { mode: 'dropdown', options: [
              { value: 'auto', label: 'Auto (HA profile)' }, { value: '24', label: '24 h' }, { value: '12', label: '12 h' }] } } },
            { name: 'language', selector: { select: { mode: 'dropdown', custom_value: true, options: [
              { value: 'auto', label: 'Auto (HA profile)' }, { value: 'browser', label: 'Browser' }, { value: 'cs', label: 'Čeština' }, { value: 'en', label: 'English' }] } } },
            { name: 'image_path', selector: { text: {} } },
          ],
        },
        { name: 'show_clock', selector: { boolean: {} } },
        { name: 'effects', selector: { boolean: {} } },
        { name: 'detail', selector: { boolean: {} } },
      ],
      computeLabel: (s) => ({
        entity: 'Weather entity', theme: 'Theme', tint: 'Bar colour', shape: 'Shape', forecast_days: 'Forecast days',
        compact_width: 'Compact below width', image_path: 'Photo folder', unit: 'Temperature unit', time_format: 'Clock', language: 'Language', show_clock: 'Show clock', effects: 'Rain / snow / lightning effects', detail: 'Open weather detail on click (off = HA more-info)',
      })[s.name],
    };
  }

  setConfig(config) {
    if (!config?.entity || !String(config.entity).startsWith('weather.')) {
      throw new Error('weather-bar-card: `entity` must be a weather.* entity');
    }
    const prev = this._config;
    this._config = {
      sun_entity: 'sun.sun', theme: 'auto', tint: 'neutral', shape: 'edge', forecast_days: 5, compact_width: 600,
      image_path: ASSET_BASE, images: {}, show_clock: true, effects: true,
      unit: 'auto', time_format: 'auto', language: 'auto', detail: true, ...config,
    };
    if (prev && prev.entity !== this._config.entity) { this._unsubscribe(); this._closeDetail(); }
    this._build();
    this._subscribe();
    // Re-fit layout for changed forecast_days / compact_width / show_clock.
    this._compact = undefined;
    this._fitDays = undefined;
    if (this.clientWidth) this._onResize(this.clientWidth);
    this._render(true);
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (!this._config) return;
    if (first) this._subscribe();
    const st = hass.states[this._config.entity];
    const sun = hass.states[this._config.sun_entity];
    const dark = hass.themes?.darkMode;
    if (st !== this._lastState || sun?.state !== this._lastSun || dark !== this._lastDark) {
      this._lastState = st; this._lastSun = sun?.state; this._lastDark = dark;
      this._render();
    }
  }

  getCardSize() { return this._compact ? 1 : 2; }

  getGridOptions() {
    return { columns: 12, rows: 'auto', min_columns: 6 };
  }

  connectedCallback() {
    this._subscribe();
    this._timer = setInterval(() => this._renderClock(), 15000);
    if (!this._ro && globalThis.ResizeObserver) {
      this._ro = new ResizeObserver((entries) => this._onResize(entries[0].contentRect.width));
    }
    this._ro?.observe(this);
  }

  disconnectedCallback() {
    // HA re-parents cards (e.g. masonry column change); keep the dialog unless the card is really gone.
    queueMicrotask(() => { if (!this.isConnected) this._closeDetail(); });
    clearInterval(this._timer);
    this._ro?.disconnect();
    this._unsubscribe();
  }

  _subscribe() {
    if (this._unsub || this._subscribing || !this._hass?.connection || !this._config || !this.isConnected) return;
    this._subscribing = true;
    const entity = this._config.entity;
    this._hass.connection.subscribeMessage((msg) => {
      if (entity !== this._config?.entity) return;
      this._forecast = msg.forecast ?? [];
      this._render();
    }, { type: 'weather/subscribe_forecast', forecast_type: 'daily', entity_id: entity })
      .then((unsub) => {
        this._subscribing = false;
        if (!this.isConnected || entity !== this._config?.entity) {
          unsub();
          this._subscribe(); // entity changed while connecting: subscribe the new one
          return;
        }
        this._unsub = unsub;
      })
      .catch((err) => {
        this._subscribing = false;
        console.warn('weather-bar-card: daily forecast unavailable', err);
      });
  }

  _unsubscribe() {
    this._unsub?.();
    this._unsub = undefined;
    this._forecast = undefined;
  }

  _onResize(width) {
    if (!width) return;
    const compact = width < this._config.compact_width;
    // Each forecast day needs ~165 px next to the now block (360 + padding) and clock (~170).
    const room = Math.floor((width - 416 - (this._config.show_clock ? 170 : 0)) / 165);
    const days = Math.max(0, Math.min(this._config.forecast_days, room));
    if (compact !== this._compact || days !== this._fitDays) {
      this._compact = compact; this._fitDays = days;
      this._render(true);
    }
    this._fitText();
  }

  // On a light surface, forecast days whose text starts over the photo switch to light text.
  _fitText() {
    if (!this._el || this._compact) return;
    const box = this._el.card.getBoundingClientRect();
    const photoW = this._photoLayers?.[this._shownPhoto]?.dataset.loaded ? box.width * PHOTO_WIDTH : 0;
    for (const day of this._el.days.children) {
      const textX = day.querySelector('.dt')?.getBoundingClientRect().left ?? day.getBoundingClientRect().left;
      day.classList.toggle('lt', !this._lightText && photoW > 0 && photoOpacity((textX - box.left) / photoW) > 0.35);
    }
  }

  _build() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `<style>${STYLE}</style>
      <ha-card tabindex="0" role="button">
        <div class="layer bg"></div>
        <div class="layer photos"></div>
        <div class="fx"></div>
        <div class="row">
          <div class="now"><span class="temp"></span><span class="txt"><span class="label"></span><span class="sub"></span></span></div>
          <div class="days"></div>
          <div class="clock"><span class="time"></span><span class="date"></span></div>
        </div>
      </ha-card>`;
    const q = (s) => this.shadowRoot.querySelector(s);
    q('ha-card').addEventListener('click', () => this._openDetail());
    q('ha-card').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._openDetail(); }
    });
    this._el = { card: q('ha-card'), photos: q('.photos'), fx: q('.fx'), temp: q('.temp'), label: q('.label'), sub: q('.sub'), days: q('.days'), clock: q('.clock'), time: q('.time'), date: q('.date') };
    this._photoLayers = {};
    this._shownPhoto = undefined;
    this._fxKey = undefined;
    this._daysKey = undefined;
  }

  _haLang() {
    return this._hass?.locale?.language ?? this._hass?.language ?? 'en';
  }

  _lang() {
    let l = this._config?.language;
    if (l === 'browser') l = globalThis.navigator?.language;
    if (!l || l === 'auto') return this._haLang();
    try {
      return Intl.getCanonicalLocales(l)[0]; // free-text option: a bad tag must not break the card
    } catch {
      return this._haLang();
    }
  }

  _render(force = false) {
    if (!this._el || !this._hass) return;
    const cfg = this._config;
    const st = this._hass.states[cfg.entity];
    const card = this._el.card;
    if (!st) {
      this._el.label.textContent = `${cfg.entity} not found`;
      this._el.temp.textContent = '';
      this._el.sub.textContent = '';
      return;
    }
    const lang = this._lang();
    const t = I18N[lang.split('-')[0]] ?? I18N.en;
    const sun = this._hass.states[cfg.sun_entity]?.state;
    const condition = st.state;
    const key = photoKey(condition, sun);
    const compact = !!this._compact;
    const edge = cfg.shape === 'edge';
    const darkSurface = cfg.theme === 'dark' || (cfg.theme === 'auto' && this._hass.themes?.darkMode !== false);
    // The compact pill always takes the photo tint so white text stays readable on light dashboards.
    const tinted = cfg.tint === 'photo' || compact;
    const lightText = tinted || darkSurface;

    card.classList.toggle('compact', compact);
    const s = card.style;
    s.setProperty('--wb-bg', tinted ? TINT[key] : darkSurface ? '#232427' : '#E9E9EE');
    s.setProperty('--wb-fg', lightText ? '#FFFFFF' : '#1A1A1A');
    s.setProperty('--wb-fg2', lightText ? 'rgba(255,255,255,.72)' : 'rgba(0,0,0,.62)');
    s.setProperty('--wb-line', lightText ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.15)');
    s.setProperty('--wb-sep', lightText ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.1)');
    s.setProperty('--wb-radius', edge && !compact ? '0px' : compact ? '18px' : 'var(--ha-card-border-radius, 22px)');
    s.setProperty('--wb-pad', edge ? '28px' : '24px');
    // Wide photo with a soft fade; forecast days lying on it get light text (_fitText).
    s.setProperty('--wb-now-w', 'min(360px, 46%)');
    s.setProperty('--wb-photo-w', compact ? '70%' : `${PHOTO_WIDTH * 100}%`);
    s.setProperty('--wb-mask', compact ? 'linear-gradient(90deg,#000 70%,transparent 100%)'
      : `linear-gradient(90deg,${PHOTO_FADE.map(([x, o]) => `rgba(0,0,0,${o}) ${x * 100}%`).join(',')})`);
    this._lightText = lightText;
    s.setProperty('--wb-shadow', edge && !compact ? 'none' : 'var(--ha-card-box-shadow, 0 14px 30px -16px rgba(0,0,0,.45))');

    this._renderPhoto(key);
    this._renderFx(condition, compact);

    // Current conditions
    const a = st.attributes;
    const nf = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 });
    const fromUnit = a.temperature_unit ?? '°C';
    const unit = cfg.unit === '°C' || cfg.unit === '°F' ? cfg.unit : fromUnit;
    const temp = convertTemp(a.temperature, fromUnit, unit);
    this._el.temp.textContent = typeof temp === 'number' ? `${nf.format(temp)}°` : '–';
    const haText = this._hass.formatEntityState?.(st)
      || this._hass.localize?.(`component.weather.entity_component._.state.${condition}`) || condition;
    this._el.label.textContent = lang === this._haLang() ? haText : t.cond?.[condition] ?? haText;
    const { today, days } = buildDays(this._forecast, compact ? 0 : this._fitDays ?? cfg.forecast_days, new Date(), fromUnit, unit);
    const parts = [];
    if (typeof a.wind_speed === 'number') parts.push(`${t.wind} ${nf.format(Math.round(a.wind_speed))} ${a.wind_speed_unit ?? ''} ${compass(a.wind_bearing, lang)}`.replace(/\s+/g, ' ').trim());
    if (typeof a.humidity === 'number') parts.push(`${t.humidity} ${nf.format(Math.round(a.humidity))} %`);
    if (!compact && typeof today?.precipitation === 'number' && today.precipitation > 0) parts.push(`${nf.format(today.precipitation)} ${a.precipitation_unit ?? 'mm'}`);
    this._el.sub.textContent = parts.join(' · ');

    // Forecast — rebuilt only when the data or visible count changes
    const daysKey = JSON.stringify(days.map((d) => [d.date.getTime(), d.condition, d.hi, d.lo])) + lang + unit;
    if (force || daysKey !== this._daysKey) {
      this._daysKey = daysKey;
      const dayFmt = new Intl.DateTimeFormat(lang, { weekday: 'long' });
      const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
      const deg = (v) => `${nf.format(v)} ${unit}`;
      const iconPath = cfg.icon_path ?? cfg.image_path.replace(/\/?$/, '/');
      this._el.days.innerHTML = days.map((d) => `
        <div class="day">
          <img src="${iconPath}${ICON_FOR[d.condition] ?? 'cloudy'}.svg" alt="">
          <span class="dt">
            <span class="dn">${cap(dayFmt.format(d.date))}</span>
            <span class="dtemp"><b>${deg(d.hi)}</b>${d.lo === null ? '' : ` / ${deg(d.lo)}`}</span>
          </span>
        </div>`).join('');
    }
    this._el.days.classList.toggle('hidden', compact || !days.length);
    requestAnimationFrame(() => this._fitText());
    this._el.clock.classList.toggle('hidden', !cfg.show_clock);
    this._el.card.setAttribute('aria-label', [this._el.temp.textContent, this._el.label.textContent].join(' '));
    this._renderClock();
    this._renderDetail();
  }

  _renderPhoto(key) {
    if (key === this._shownPhoto) return;
    const cfg = this._config;
    let layer = this._photoLayers[key];
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'photo';
      const url = cfg.images?.[key] ?? `${cfg.image_path.replace(/\/?$/, '/')}${key}.jpg`;
      layer.style.backgroundImage = `url("${url}")`;
      // light forecast text only once the photo is really there (_fitText)
      const img = new Image();
      img.onload = () => { layer.dataset.loaded = '1'; this._fitText(); };
      img.src = url;
      layer.style.backgroundPosition = FOCUS[key] ?? '50% 50%';
      this._el.photos.appendChild(layer);
      this._photoLayers[key] = layer;
      layer.getBoundingClientRect(); // commit opacity 0 so the fade-in transition runs
    }
    for (const [k, el] of Object.entries(this._photoLayers)) el.classList.toggle('on', k === key);
    this._shownPhoto = key;
  }

  _renderFx(condition, compact) {
    const fxKey = `${this._config.effects ? condition : ''}|${compact}`;
    if (fxKey === this._fxKey) return;
    this._fxKey = fxKey;
    this._el.fx.innerHTML = this._config.effects ? particles(FX_FOR[condition] ?? {}, compact) : '';
  }

  _condText(condition) {
    const lang = this._lang();
    const t = I18N[lang.split('-')[0]] ?? I18N.en;
    const ha = this._hass.localize?.(`component.weather.entity_component._.state.${condition}`);
    return (lang === this._haLang() ? ha || t.cond?.[condition] : t.cond?.[condition] || ha) || condition;
  }

  _moreInfo() {
    this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: this._config.entity } }));
  }

  _openDetail() {
    if (this._config.detail === false) return this._moreInfo();
    if (this._dlg || !this._hass) return;
    const host = document.createElement('div');
    host.attachShadow({ mode: 'open' });
    host.shadowRoot.addEventListener('click', (e) => {
      if (e.target.closest('.close') || e.target.classList.contains('scrim')) this._closeDetail();
      else if (e.target.closest('.more')) { this._closeDetail(); this._moreInfo(); }
    });
    this._onKey = (e) => {
      if (e.key === 'Escape') this._closeDetail();
      if (e.key !== 'Tab') return;
      // keep keyboard focus inside the dialog
      const root = this._dlg.shadowRoot;
      const items = [...root.querySelectorAll('button')];
      if (!items.length) return;
      e.preventDefault();
      const i = items.indexOf(root.activeElement);
      items[(i + (e.shiftKey ? -1 : 1) + items.length + (i < 0 && e.shiftKey ? 1 : 0)) % items.length].focus();
    };
    this._onWinResize = () => { if ((innerWidth < 700) !== this._dlgSheet) this._renderDetail(); };
    window.addEventListener('keydown', this._onKey);
    window.addEventListener('resize', this._onWinResize);
    this._dlg = host;
    document.body.appendChild(host);
    this._subscribeHourly();
    this._renderDetail();
    host.shadowRoot.querySelector('.close')?.focus({ preventScroll: true });
  }

  _closeDetail() {
    if (!this._dlg) return;
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('resize', this._onWinResize);
    this._dlg.remove();
    this._dlg = undefined;
    this._hourlyToken = undefined;
    this._unsubHourly?.();
    this._unsubHourly = undefined;
    this._hourly = undefined;
    if (this.isConnected) this._el?.card.focus({ preventScroll: true });
  }

  // Hourly forecast is only needed while the dialog is open.
  _subscribeHourly() {
    const token = {};
    this._hourlyToken = token;
    this._hass.connection?.subscribeMessage((msg) => {
      if (this._hourlyToken !== token) return;
      this._hourly = msg.forecast ?? [];
      this._renderDetail();
    }, { type: 'weather/subscribe_forecast', forecast_type: 'hourly', entity_id: this._config.entity })
      .then((unsub) => { if (this._hourlyToken === token) this._unsubHourly = unsub; else unsub(); })
      .catch((err) => console.warn('weather-bar-card: hourly forecast unavailable', err));
  }

  _renderDetail() {
    const host = this._dlg;
    const st = host && this._hass?.states[this._config.entity];
    if (!st) return;
    const cfg = this._config;
    const lang = this._lang();
    const base = lang.split('-')[0];
    const T = DETAIL_I18N[base] ?? DETAIL_I18N.en;
    const a = st.attributes;
    const now = new Date();
    const nf = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 });
    const fromUnit = a.temperature_unit ?? '°C';
    const unit = cfg.unit === '°C' || cfg.unit === '°F' ? cfg.unit : fromUnit;
    const deg = (v) => `${nf.format(v)}°`;
    const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
    const h12 = hour12(cfg.time_format, this._hass.locale?.time_format)
      ?? new Intl.DateTimeFormat(lang, { hour: 'numeric' }).resolvedOptions().hour12;
    const timeFmt = new Intl.DateTimeFormat(lang, { hour: h12 ? 'numeric' : '2-digit', minute: '2-digit', hour12: h12 });
    const hourFmt = new Intl.DateTimeFormat(lang, { hour: h12 ? 'numeric' : '2-digit', hour12: h12 });
    const sheet = innerWidth < 700;
    const dark = cfg.theme === 'dark' || (cfg.theme === 'auto' && this._hass.themes?.darkMode !== false);
    const sun = this._hass.states[cfg.sun_entity];
    const sa = sun?.attributes ?? {};
    const imgBase = cfg.image_path.replace(/\/?$/, '/');
    const iconPath = cfg.icon_path ?? imgBase;
    const photo = (k) => `background-image:url(&quot;${esc(cfg.images?.[k] ?? `${imgBase}${k}.jpg`)}&quot;);background-position:${FOCUS[k] ?? '50% 50%'}`;
    const punit = esc(a.precipitation_unit ?? 'mm');
    const clamp = (v) => Math.max(0, Math.min(100, v)).toFixed(1);

    const vars = {
      ...DETAIL_THEME[dark ? 'dark' : 'light'],
      '--d-pad': sheet ? '16px' : '24px', '--d-temp': sheet ? '64px' : '84px',
      '--d-hero-h': dark ? (sheet ? '232px' : '268px') : (sheet ? '290px' : '340px'),
      '--d-hero-pb': dark ? (sheet ? '16px' : '24px') : (sheet ? '98px' : '122px'),
    };

    // Hero
    const { today, days } = buildDays(this._forecast, 5, now, fromUnit, unit);
    const temp = convertTemp(a.temperature, fromUnit, unit);
    const heroSub = [];
    if (today) {
      heroSub.push(`${T.max} ${deg(convertTemp(today.temperature, fromUnit, unit))}`);
      if (typeof today.templow === 'number') heroSub.push(`${T.min} ${deg(convertTemp(today.templow, fromUnit, unit))}`);
      if (today.precipitation > 0) heroSub.push(`${nf.format(today.precipitation)} ${punit} ${T.precipToday}`);
    }
    const updated = new Date(st.last_updated ?? now);
    const hero = `
      <div class="hero"><div class="ph" style="${photo(photoKey(st.state, sun?.state))}"></div><div class="sc"></div>
        <div class="in">
          <div class="top">
            <div><div class="loc">${esc(cfg.name ?? a.friendly_name ?? cfg.entity)}</div>
              <div class="upd">${esc(cap(new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long' }).format(now)))} · ${T.updated} ${timeFmt.format(updated)}</div></div>
            <button class="close" aria-label="${T.close}"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
          </div>
          <div class="big"><div class="bt">${typeof temp === 'number' ? deg(temp) : '–'}</div>
            <div class="bl">${esc(this._condText(st.state))}</div><div class="bs">${heroSub.join(' · ')}</div></div>
        </div>
      </div>`;

    // Hourly
    const H = buildHours(this._hourly, 24, now, fromUnit, unit);
    const hourly = !H.hours.length ? '' : `
      <section class="box hourly">
        <div class="head"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${T.hourly}</div>
        <div class="scroll"><div class="hrow">
          <svg width="${H.width}" height="60" viewBox="0 0 ${H.width} 60" aria-hidden="true">
            <defs><linearGradient id="wbc" x1="0" y1="8" x2="0" y2="46" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFB340"/><stop offset=".55" stop-color="#63E6BE"/><stop offset="1" stop-color="#5AC8FA"/></linearGradient></defs>
            <path d="${H.area}" fill="url(#wbc)" opacity=".14"/><path d="${H.curve}" fill="none" stroke="url(#wbc)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
          </svg>
          ${H.hours.map((h, i) => `
          <div class="hc"><div class="t${i || h.date.getHours() !== now.getHours() ? '' : ' now'}">${i || h.date.getHours() !== now.getHours() ? hourFmt.format(h.date) : T.now}</div>
            <img src="${iconPath}${iconFor(h.condition, isNightAt(h.date, sa.next_rising, sa.next_setting))}.svg" alt="">
            <div class="band"><span class="dot" style="top:${(h.y - 3.5).toFixed(1)}px;box-shadow:0 0 0 2px ${tempColor(h.temp, unit)}"></span>
              <span class="v" style="top:${(h.y < 30 ? h.y + 8 : h.y - 24).toFixed(1)}px">${deg(h.temp)}</span></div>
            <div class="r">${h.precipitation > 0 ? `${nf.format(h.precipitation)} ${punit}` : ''}</div></div>`).join('')}
        </div></div>
      </section>`;

    // Current details
    const bar = (pct, bg) => `<span class="tb"><i style="width:${clamp(pct)}%;background:${bg}"></i></span>`;
    const mark = (pct, track) => `<span class="tb"${track ? ` style="background:${track}"` : ''}><b style="left:${clamp(pct)}%"></b></span>`;
    const tiles = [];
    if (typeof a.wind_speed === 'number') {
      const kmh = toKmh(a.wind_speed, a.wind_speed_unit);
      const dir = compass(a.wind_bearing, lang);
      const arrow = typeof a.wind_bearing === 'number'
        ? `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(${a.wind_bearing} 12 12)"><path d="M12 3v17M6.5 14.5L12 20l5.5-5.5" fill="none" stroke="#FFB340" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g></svg>` : '';
      tiles.push(['wind', T.wind, `${nf.format(Math.round(a.wind_speed))}<small>${esc(a.wind_speed_unit ?? '')}</small>${arrow}`,
        [dir && `${T.from} ${dir}`, T.windLv[level(kmh, [2, 12, 29, 50, 75])]].filter(Boolean).join(' · '), bar(kmh / 60 * 100, 'linear-gradient(90deg,#64D2FF,#5E5CE6)')]);
    }
    if (typeof a.humidity === 'number') {
      tiles.push(['humidity', T.humidity, `${nf.format(Math.round(a.humidity))}<small>%</small>`,
        typeof a.dew_point === 'number' ? `${T.dew} ${deg(convertTemp(a.dew_point, fromUnit, unit))}` : '', bar(a.humidity, 'linear-gradient(90deg,#5AC8FA,#0A84FF)')]);
    }
    if (typeof a.pressure === 'number') {
      const hpa = toHpa(a.pressure, a.pressure_unit);
      tiles.push(['pressure', T.pressure, `${new Intl.NumberFormat(lang, { maximumFractionDigits: 2, useGrouping: false }).format(a.pressure_unit === 'hPa' || !a.pressure_unit ? Math.round(a.pressure) : a.pressure)}<small>${esc(a.pressure_unit ?? 'hPa')}</small>`,
        T.pressLv[level(hpa, [1000, 1025])], mark((hpa - 970) / 80 * 100)]);
    }
    if (typeof a.uv_index === 'number') {
      tiles.push(['uv', T.uv, nf.format(a.uv_index),
        [T.uvLv[level(a.uv_index, [3, 6, 8, 11])], typeof today?.uv_index === 'number' && `${T.uvMax} ${nf.format(today.uv_index)}`].filter(Boolean).join(' · '),
        mark(a.uv_index / 11 * 100, 'linear-gradient(90deg,#34C759,#FFD60A 30%,#FF9F0A 55%,#FF453A 75%,#BF5AF2)')]);
    }
    if (typeof a.cloud_coverage === 'number') {
      tiles.push(['cloud', T.cloud, `${nf.format(Math.round(a.cloud_coverage))}<small>%</small>`,
        T.cloudLv[level(a.cloud_coverage, [13, 38, 63, 88])], bar(a.cloud_coverage, 'linear-gradient(90deg,#AEB4BF,#E5E5EA)')]);
    }
    if (sa.next_rising && sa.next_setting) {
      const rise = new Date(sa.next_rising), set = new Date(sa.next_setting);
      const up = sun.state === 'above_horizon';
      const dayStart = rise.getTime() - 864e5; // today's sunrise ≈ tomorrow's minus a day
      tiles.push(['sun', T.sun, `${timeFmt.format(up ? set : rise)}<small>${up ? T.sunset : T.sunrise}</small>`,
        `${up ? T.sunrise : T.sunset} ${timeFmt.format(up ? rise : set)}`,
        bar(up ? (now - dayStart) / (set - dayStart) * 100 : 0, 'linear-gradient(90deg,#FF9F0A,#FFD60A)')]);
    }
    vars['--d-tiles'] = String(Math.max(1, tiles.length));
    const tilesHtml = !tiles.length ? '' : `<div class="tiles">${tiles.map(([k, label, value, sub, viz]) => `
      <section class="tile box"><div class="tl"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${TILE_ICON[k]}"/></svg>${label}</div>
        <div class="tv">${value}</div><div class="ts">${sub}</div>${viz}</section>`).join('')}</div>`;

    // Forecast days on condition photos
    vars['--d-days'] = String(Math.max(1, days.length));
    const dayFmt = new Intl.DateTimeFormat(lang, { weekday: 'long' });
    const dateFmt = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'numeric' });
    const daysHtml = !days.length ? '' : `
      <div class="head dhead"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>${T.days.replace('{n}', days.length)}</div>
      <div class="days">${days.map((d) => {
        const wet = d.precipitation > 0;
        const head = `<div class="hd"><div class="dn">${esc(cap(dayFmt.format(d.date)))}</div><div class="dd">${esc(dateFmt.format(d.date))} · ${esc(this._condText(d.condition))}</div></div>`;
        const temps = `<div class="dt"><b>${deg(d.hi)}</b>${d.lo === null ? '' : `<span>${deg(d.lo)}</span>`}</div>`;
        const pill = `<div class="pill${wet ? ' wet' : ''}">${DROP}${wet ? `${nf.format(d.precipitation)} ${punit}` : T.noPrecip}</div>`;
        return `<div class="dc"><div class="ph" style="${photo(photoKey(d.condition, 'above_horizon'))}"></div><div class="sc"></div>
          <div class="in">${head}${sheet ? pill + temps : temps + pill}</div></div>`;
      }).join('')}</div>`;

    const root = host.shadowRoot;
    // The shell (scrim + modal) is built once per opening; updates only swap the modal content,
    // so the entry animation, scroll position and an in-progress click survive.
    if (!root.querySelector('.wrap')) {
      root.innerHTML = `<style>${DETAIL_STYLE}</style><div class="wrap anim"><div class="scrim"></div><div class="modal" role="dialog" aria-modal="true"></div></div>`;
    }
    const wrap = root.querySelector('.wrap');
    const modal = root.querySelector('.modal');
    const prev = { left: root.querySelector('.scroll')?.scrollLeft, focus: root.activeElement?.className };
    this._dlgSheet = sheet;
    wrap.classList.toggle('sheet', sheet);
    wrap.setAttribute('style', Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';'));
    modal.setAttribute('aria-label', this._condText(st.state));
    modal.innerHTML = `${sheet ? '<div class="grab"><i></i></div>' : ''}${hero}
      <div class="body">${hourly}${tilesHtml}${daysHtml}
        <div class="foot"><span>${a.attribution ? `${T.data}: ${esc(a.attribution)}` : ''}</span><button class="more">${T.more}</button></div>
      </div>`;
    if (prev.left && root.querySelector('.scroll')) root.querySelector('.scroll').scrollLeft = prev.left;
    if (prev.focus) root.querySelector(`.${prev.focus.split(' ')[0]}`)?.focus({ preventScroll: true });
  }

  _renderClock() {
    if (!this._el || !this._config?.show_clock) return;
    const lang = this._lang();
    const now = new Date();
    const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
    const h12 = hour12(this._config.time_format, this._hass?.locale?.time_format)
      ?? new Intl.DateTimeFormat(lang, { hour: 'numeric' }).resolvedOptions().hour12; // language default, so 12 h gets no leading zero
    this._el.time.textContent = new Intl.DateTimeFormat(lang, { hour: h12 ? 'numeric' : '2-digit', minute: '2-digit', hour12: h12 }).format(now);
    this._el.date.textContent = cap(new Intl.DateTimeFormat(lang, this._compact
      ? { weekday: 'short', day: 'numeric', month: 'numeric' }
      : { weekday: 'long', day: 'numeric', month: 'long' }).format(now));
  }
}

if (globalThis.customElements && !customElements.get('weather-bar-card')) {
  customElements.define('weather-bar-card', WeatherBarCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: 'weather-bar-card',
    name: 'Weather Bar',
    description: 'Full-width weather bar with condition photo, forecast and clock; click opens a weather detail.',
    preview: true,
  });
  console.info(`%c WEATHER-BAR-CARD %c ${VERSION} `, 'background:#232427;color:#fff', 'background:#FFB340;color:#000');
}

export { WeatherBarCard };
