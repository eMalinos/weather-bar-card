// Run: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { photoKey, compass, convertTemp, hour12, buildDays, particles, tempColor, level, toKmh, toHpa, isNightAt, iconFor, buildHours, photoOpacity } from '../dist/weather-bar-card.js';

test('photoKey maps HA conditions and picks the night variant for partlycloudy', () => {
  assert.equal(photoKey('sunny', 'above_horizon'), 'sunny');
  assert.equal(photoKey('partlycloudy', 'above_horizon'), 'partlycloudy');
  assert.equal(photoKey('partlycloudy', 'below_horizon'), 'partlycloudy-night');
  assert.equal(photoKey('windy-variant'), 'windy');
  assert.equal(photoKey('hail'), 'snowy-rainy');
  assert.equal(photoKey('lightning'), 'lightning-rainy');
  assert.equal(photoKey('unavailable'), 'cloudy');
});

test('compass converts bearing to localized 8-point direction', () => {
  assert.equal(compass(236.7, 'cs'), 'JZ');
  assert.equal(compass(0, 'en'), 'N');
  assert.equal(compass(45, 'cs-CZ'), 'SV');
  assert.equal(compass(359, 'cs'), 'S');
  assert.equal(compass(-90, 'en'), 'W');
  assert.equal(compass('SW', 'en'), 'SW');
  assert.equal(compass(undefined, 'en'), '');
});

test('convertTemp converts between units and passes through otherwise', () => {
  assert.equal(convertTemp(0, '°C', '°F'), 32);
  assert.equal(convertTemp(212, '°F', '°C'), 100);
  assert.equal(convertTemp(15, '°C', '°C'), 15);
  assert.equal(convertTemp(undefined, '°C', '°F'), undefined);
});

test('hour12 prefers the card setting, then the HA profile', () => {
  assert.equal(hour12('12', '24'), true);
  assert.equal(hour12('24', '12'), false);
  assert.equal(hour12('auto', '12'), true);
  assert.equal(hour12(undefined, '24'), false);
  assert.equal(hour12('auto', 'language'), undefined);
  assert.equal(typeof hour12('auto', 'system'), 'boolean');
});

test('buildDays skips today, limits count and converts units', () => {
  const now = new Date('2026-10-09T20:00:00');
  const fc = [
    { datetime: '2026-10-09T10:00:00', condition: 'rainy', temperature: 12.7, templow: 11.8, precipitation: 0.7 },
    { datetime: '2026-10-10T10:00:00', condition: 'rainy', temperature: 15, templow: 8.6 },
    { datetime: '2026-10-11T10:00:00', condition: 'rainy', temperature: 15.1, templow: 8.5 },
    { datetime: '2026-10-12T10:00:00', condition: 'cloudy', temperature: 15.5 },
    { datetime: '2026-10-13T10:00:00', condition: 'sunny', temperature: 16.2, templow: 5.5 },
  ];
  const { today, days } = buildDays(fc, 3, now);
  assert.equal(today.precipitation, 0.7);
  assert.equal(days.length, 3);
  assert.equal(days[0].date.getDate(), 10);
  assert.deepEqual([days[0].hi, days[0].lo], [15, 8.6]);
  assert.equal(days[2].lo, null);
  const f = buildDays(fc, 1, now, '°C', '°F').days[0];
  assert.equal(f.hi, 59);
});

test('buildDays tolerates missing data', () => {
  assert.deepEqual(buildDays(undefined, 5).days, []);
});

test('particles are deterministic and scale down in compact mode', () => {
  const a = particles({ rain: 46 }, false);
  assert.equal(a, particles({ rain: 46 }, false));
  assert.equal((a.match(/class="drop"/g) ?? []).length, 46);
  assert.equal((particles({ rain: 46 }, true).match(/class="drop"/g) ?? []).length, 23);
  assert.match(particles({ flash: true }, false), /class="flash"/);
  assert.equal(particles({}, false), '');
});

test('level picks the band below the first threshold', () => {
  assert.equal(level(0.5, [3, 6, 8, 11]), 0);
  assert.equal(level(3, [3, 6, 8, 11]), 1);
  assert.equal(level(12, [3, 6, 8, 11]), 4);
});

test('unit helpers convert wind to km/h and pressure to hPa', () => {
  assert.equal(toKmh(10, 'm/s'), 36);
  assert.equal(toKmh(18, 'km/h'), 18);
  assert.ok(Math.abs(toHpa(29.92, 'inHg') - 1013.2) < 0.1);
  assert.equal(toHpa(1013, 'hPa'), 1013);
});

test('isNightAt works with the sun up and down', () => {
  // sun up: next setting comes first
  const set = '2026-10-11T18:23:00', rise = '2026-10-12T07:22:00';
  assert.equal(isNightAt('2026-10-11T12:00:00', rise, set), false);
  assert.equal(isNightAt('2026-10-11T22:00:00', rise, set), true);
  assert.equal(isNightAt('2026-10-12T08:00:00', rise, set), false);
  // sun down: next rising comes first, next setting is tomorrow evening
  assert.equal(isNightAt('2026-10-12T03:00:00', '2026-10-12T07:22:00', '2026-10-12T18:21:00'), true);
  assert.equal(isNightAt('2026-10-12T12:00:00', '2026-10-12T07:22:00', '2026-10-12T18:21:00'), false);
  assert.equal(isNightAt('2026-10-12T12:00:00', undefined, undefined), false);
});

test('iconFor swaps day icons at night', () => {
  assert.equal(iconFor('partlycloudy', true), 'partly-cloudy-night');
  assert.equal(iconFor('sunny', true), 'clear-night');
  assert.equal(iconFor('sunny', false), 'clear-day');
  assert.equal(iconFor('weird', false), 'cloudy');
});

test('buildHours starts at the current hour and maps temps onto the curve band', () => {
  const now = new Date('2026-10-11T10:20:00');
  const fc = Array.from({ length: 30 }, (_, i) => ({ datetime: new Date(2026, 9, 11, 9 + i).toISOString(), condition: 'sunny', temperature: 10 + (i % 5), precipitation: i === 3 ? 0.6 : 0 }));
  const { hours, curve, width } = buildHours(fc, 24, now);
  assert.equal(hours.length, 24);
  assert.equal(hours[0].date.getHours(), 10);
  assert.equal(width, 24 * 52);
  assert.match(curve, /^M26\.0 /);
  for (const h of hours) assert.ok(h.y >= 8 && h.y <= 46);
  assert.equal(Math.min(...hours.map((h) => h.y)), 8);
  assert.deepEqual(buildHours(undefined).hours, []);
  assert.equal(buildHours([{ datetime: '2099-01-01T00:00:00', temperature: 50 }], 1, new Date('2098-12-31T23:30:00'), '°F', '°C').hours[0].temp, 10);
});

test('tempColor converts Fahrenheit before picking the colour', () => {
  assert.equal(tempColor(32, '°F'), tempColor(0));
  assert.equal(tempColor(-40), 'rgb(122,167,255)');
});

test('photoOpacity follows the soft fade and clamps', () => {
  assert.equal(photoOpacity(-1), 1);
  assert.equal(photoOpacity(0.3), 1);
  assert.ok(Math.abs(photoOpacity(0.675) - 0.6) < 1e-9);
  assert.equal(photoOpacity(1), 0);
  assert.equal(photoOpacity(2), 0);
});
