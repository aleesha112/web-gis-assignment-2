// ParkFinder GIS - frontend (Leaflet + Express API)
const API = location.port === '3000' ? '/api/parks' : 'http://localhost:3000/api/parks';

const TYPES = {
  'Park': { color: '#1f9d62' },
  'Playground': { color: '#f08a24' },
  'Walking Track': { color: '#2b7bd6' },
  'Sports Ground': { color: '#8e4fd1' },
};

// Simple line icons (no emoji) for a cleaner look
const ICON_PATHS = {
  'Park': '<path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/><path d="M12 22v-3"/>',
  'Playground': '<path d="M4 4h16"/><path d="M4 4 3 21"/><path d="m20 4 1 17"/><path d="M9 4v10"/><path d="M15 4v10"/><path d="M7.5 14h3"/><path d="M13.5 14h3"/>',
  'Walking Track': '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  'Sports Ground': '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
};
const icon = (type, size = 18) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[type] || ICON_PATHS.Park}</svg>`;

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const typeOf = (name) => TYPES[name] || TYPES.Park;

let parks = [];
const markers = {};
const hidden = new Set();
let pick = null;
let firstLoad = true;

// ---------- Map and base maps ----------
const map = L.map('map', { zoomControl: false, maxZoom: 19 }).setView([33.66, 73.05], 11);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.control.scale({ position: 'bottomright', imperial: false }).addTo(map);

const BASEMAPS = {
  osm: {
    label: 'Street', swatch: 'linear-gradient(135deg,#ece4d3,#b7d6a0)',
    layer: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }),
  },
  satellite: {
    label: 'Satellite', swatch: 'linear-gradient(135deg,#2d4a38,#7b8c55)',
    layer: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19, attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
    }),
  },
  terrain: {
    label: 'Terrain', swatch: 'linear-gradient(135deg,#d9e6c6,#bba98b)',
    layer: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, maxNativeZoom: 17, attribution: '&copy; OpenStreetMap contributors, SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    }),
  },
};
let currentBase = 'osm';
BASEMAPS.osm.layer.addTo(map);

$('basemaps').innerHTML = Object.entries(BASEMAPS).map(([key, b]) =>
  `<button type="button" class="bm ${key === currentBase ? 'active' : ''}" data-key="${key}"><i style="--sw:${b.swatch}"></i><span>${b.label}</span></button>`
).join('');

$('basemaps').addEventListener('click', (e) => {
  const btn = e.target.closest('.bm');
  if (!btn || btn.dataset.key === currentBase) return;
  map.removeLayer(BASEMAPS[currentBase].layer);
  currentBase = btn.dataset.key;
  BASEMAPS[currentBase].layer.addTo(map);
  document.querySelectorAll('.bm').forEach((b) => b.classList.toggle('active', b.dataset.key === currentBase));
});

const layer = L.layerGroup().addTo(map);

// Floating map legend
$('maplegend').innerHTML = '<h4>Legend</h4>' + Object.entries(TYPES).map(([name, t]) =>
  `<div class="ml-row"><i style="background:${t.color}">${icon(name, 11)}</i>${name}</div>`
).join('');

// ---------- UI helpers ----------
function toast(msg, type) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'show ' + (type || '');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.className = ''), 3000);
}

function formMsg(text, type) {
  $('form-message').textContent = text;
  $('form-message').className = type || '';
}

function setTab(name) {
  $('tabs').dataset.active = name;
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === name));
  $('map').classList.toggle('picking', name === 'manage');
}
document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function countTo(el, to) {
  const from = Number(el.dataset.v || 0);
  el.dataset.v = to;
  if (reduceMotion || from === to) { el.textContent = to; return; }
  const start = performance.now();
  const step = (now) => {
    const k = Math.min((now - start) / 600, 1);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------- Data ----------
function query() {
  const p = new URLSearchParams();
  [['search', 'f-search'], ['city', 'f-city'], ['facility_type', 'f-type'], ['condition', 'f-condition']]
    .forEach(([key, id]) => { const v = $(id).value.trim(); if (v) p.set(key, v); });
  return p.toString() ? `${API}?${p}` : API;
}

async function load(fit) {
  try {
    const res = await fetch(query());
    if (!res.ok) throw new Error('Server returned ' + res.status);
    const data = await res.json();
    parks = data.features.map((f) => ({ ...f.properties, lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }));
    render(true);
    if (fit) fitToData();
  } catch (err) {
    $('list').innerHTML = '<div class="empty">Could not load data. Is the server running?</div>';
    console.error(err);
  }
}

const visible = () => parks.filter((p) => !hidden.has(p.facility_type));

function fitToData() {
  const pts = visible().map((p) => [p.lat, p.lng]);
  if (!pts.length) return;
  if (firstLoad) {
    map.fitBounds(L.latLngBounds(pts), { padding: [70, 70], maxZoom: 15 });
    firstLoad = false;
  } else if (pts.length === 1) {
    map.flyTo(pts[0], 15, { duration: 0.9 });
  } else {
    map.flyToBounds(L.latLngBounds(pts), { padding: [70, 70], maxZoom: 15, duration: 0.9 });
  }
}

// ---------- Rendering ----------
function render(animate) {
  layer.clearLayers();
  Object.keys(markers).forEach((k) => delete markers[k]);
  const list = visible();

  list.forEach((p, i) => {
    const t = typeOf(p.facility_type);
    const html = `<span style="--c:${t.color};--d:${Math.min(i, 24) * 25}ms">${icon(p.facility_type, 15)}</span>`;
    const m = L.marker([p.lat, p.lng], {
      icon: L.divIcon({ className: 'pin' + (animate ? ' anim' : ''), html, iconSize: [30, 30] }),
      title: p.name,
    }).addTo(layer);
    m.bindPopup(popupHtml(p), { minWidth: 270, maxWidth: 300 });
    m.on('popupopen', () => m.getElement() && m.getElement().classList.add('active'));
    m.on('popupclose', () => m.getElement() && m.getElement().classList.remove('active'));
    markers[p.id] = m;
  });

  countTo($('st-shown'), list.length);
  countTo($('st-free'), list.filter((p) => Number(p.entry_fee) === 0).length);
  countTo($('st-good'), list.filter((p) => p.condition === 'Good').length);

  $('list').innerHTML = list.length ? list.map((p, i) => {
    const t = typeOf(p.facility_type);
    return `
    <div class="card" style="animation-delay:${Math.min(i, 12) * 40}ms" onclick="focusPark(${Number(p.id)})">
      <div class="ico" style="background:${t.color}1f;color:${t.color}">${icon(p.facility_type, 20)}</div>
      <div><h3>${esc(p.name)}</h3><p>${esc(p.facility_type)} · ${esc(p.area || p.city)}</p></div>
      <span class="tag ${esc(p.condition)}">${esc(p.condition)}</span>
    </div>`;
  }).join('') : '<div class="empty">No facilities match your filters.</div>';

  renderLegend();
}

function renderLegend() {
  $('legend-items').innerHTML = Object.entries(TYPES).map(([name, t]) => {
    const n = parks.filter((p) => p.facility_type === name).length;
    return `<button type="button" class="lg-item ${hidden.has(name) ? 'off' : ''}" data-type="${esc(name)}" style="--c:${t.color}">
      <span class="lg-ico">${icon(name, 16)}</span>
      <span class="lg-txt"><b>${esc(name)}</b><small>${n} ${n === 1 ? 'place' : 'places'}</small></span>
    </button>`;
  }).join('');
}

$('legend-items').addEventListener('click', (e) => {
  const btn = e.target.closest('.lg-item');
  if (!btn) return;
  const type = btn.dataset.type;
  hidden.has(type) ? hidden.delete(type) : hidden.add(type);
  render(false);
});

function popupHtml(p) {
  const t = typeOf(p.facility_type);
  const fee = Number(p.entry_fee) === 0 ? 'Free' : 'PKR ' + esc(p.entry_fee);
  return `<div class="pop" style="--c:${t.color}">
    <div class="pop-head">
      <div class="pop-ico">${icon(p.facility_type, 20)}</div>
      <div><h3>${esc(p.name)}</h3><small>${esc(p.facility_type)} · ${esc(p.city)}</small></div>
    </div>
    <dl>
      <dt>Area</dt><dd>${esc(p.area) || 'N/A'}</dd>
      <dt>Entry</dt><dd>${fee}</dd>
      <dt>Hours</dt><dd>${esc(p.opening_hours) || 'N/A'}</dd>
      <dt>Condition</dt><dd><span class="tag ${esc(p.condition)}">${esc(p.condition)}</span></dd>
      <dt>Amenities</dt><dd>${esc(p.amenities) || 'N/A'}</dd>
    </dl>
    <div class="pop-actions"><button onclick="editPark(${Number(p.id)})">Edit this facility</button></div>
  </div>`;
}

window.focusPark = (id) => {
  const p = parks.find((x) => x.id === id);
  if (!p || !markers[id]) return;
  map.flyTo([p.lat, p.lng], 16, { duration: 1.2 });
  map.once('moveend', () => markers[id] && markers[id].openPopup());
};

// ---------- Form ----------
function setCoords(lat, lng) {
  $('p-lat').value = Number(lat).toFixed(6);
  $('p-lng').value = Number(lng).toFixed(6);
  if (pick) map.removeLayer(pick);
  pick = L.marker([lat, lng]).addTo(map);
}

map.on('click', (e) => {
  if ($('manage').classList.contains('active')) setCoords(e.latlng.lat, e.latlng.lng);
});

function resetForm() {
  $('park-form').reset();
  $('p-id').value = '';
  $('form-title').textContent = 'Add a new facility';
  $('btn-save').textContent = 'Save facility';
  $('btn-delete').hidden = true;
  formMsg('');
  if (pick) { map.removeLayer(pick); pick = null; }
}

window.editPark = (id) => {
  const p = parks.find((x) => x.id === id);
  if (!p) return;
  map.closePopup();
  setTab('manage');
  $('p-id').value = p.id;
  $('p-name').value = p.name;
  $('p-type').value = p.facility_type;
  $('p-city').value = p.city;
  $('p-area').value = p.area || '';
  $('p-fee').value = p.entry_fee;
  $('p-condition').value = p.condition;
  $('p-hours').value = p.opening_hours || '';
  $('p-amenities').value = p.amenities || '';
  setCoords(p.lat, p.lng);
  $('form-title').textContent = 'Update facility #' + p.id;
  $('btn-save').textContent = 'Update facility';
  $('btn-delete').hidden = false;
  formMsg('');
};

$('park-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errs = [];
  if (!$('p-name').value.trim()) errs.push('Name is required.');
  if ($('p-lat').value === '' || $('p-lng').value === '') errs.push('Click the map to choose a location.');
  if (Number($('p-fee').value) < 0) errs.push('Entry fee cannot be negative.');
  if (errs.length) return formMsg(errs.join(' '), 'error');

  const id = $('p-id').value;
  const body = {
    name: $('p-name').value.trim(),
    facility_type: $('p-type').value,
    city: $('p-city').value,
    area: $('p-area').value.trim(),
    entry_fee: $('p-fee').value,
    opening_hours: $('p-hours').value.trim(),
    amenities: $('p-amenities').value.trim(),
    condition: $('p-condition').value,
    lat: $('p-lat').value,
    lng: $('p-lng').value,
  };

  try {
    const res = await fetch(id ? `${API}/${id}` : API, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return formMsg((data.details || [data.error]).join(' '), 'error');
    toast(id ? 'Facility updated' : 'Facility added');
    resetForm();
    setTab('explore');
    await load(false);
  } catch (err) {
    formMsg('Could not reach the server.', 'error');
    console.error(err);
  }
});

$('btn-delete').addEventListener('click', async () => {
  const id = $('p-id').value;
  if (!id || !confirm('Delete this record permanently?')) return;
  try {
    const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
    if (!res.ok) return formMsg('Delete failed.', 'error');
    toast('Facility deleted');
    resetForm();
    setTab('explore');
    await load(false);
  } catch (err) {
    formMsg('Could not reach the server.', 'error');
  }
});

$('btn-clear').addEventListener('click', resetForm);

// ---------- Filters ----------
let searchTimer;
$('f-search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => load(true), 300);
});
['f-city', 'f-type', 'f-condition'].forEach((id) => $(id).addEventListener('change', () => load(true)));
$('btn-reset').addEventListener('click', () => {
  ['f-search', 'f-city', 'f-type', 'f-condition'].forEach((id) => { $(id).value = ''; });
  hidden.clear();
  load(true);
});

load(true);