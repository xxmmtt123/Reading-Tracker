const tabToday = document.getElementById('tabToday');
const tabBooks = document.getElementById('tabBooks');
const todayView = document.getElementById('todayView');
const booksView = document.getElementById('booksView');
const todayCheckin = document.getElementById('todayCheckin');
const checkinStatus = document.getElementById('checkinStatus');
const statsChart = document.getElementById('statsChart');
const periodPicker = document.getElementById('periodPicker');
const readingForm = document.getElementById('readingForm');
const bookTitle = document.getElementById('bookTitle');
const readingDurationHours = document.getElementById('readingDurationHours');
const readingDurationMinutes = document.getElementById('readingDurationMinutes');
const readingDate = document.getElementById('readingDate');
const bookNotes = document.getElementById('bookNotes');
const readingList = document.getElementById('readingList');
const totalBooks = document.getElementById('totalBooks');
const summaryDays = document.getElementById('summaryDays');
const summaryRate = document.getElementById('summaryRate');
const summaryStreak = document.getElementById('summaryStreak');
const viewButtons = document.querySelectorAll('.view-button[data-view]');
const exportDateHistoryBtn = document.getElementById('exportDateHistory');
const exportBookHistoryBtn = document.getElementById('exportBookHistory');

let currentView = 'weekly';
let editingId = null;
let currentData = { readings: [], checkins: [] };

function setActiveTab(tab) {
  if (tab === 'today') {
    tabToday.classList.add('active');
    tabBooks.classList.remove('active');
    todayView.classList.remove('hidden');
    booksView.classList.add('hidden');
  } else {
    tabBooks.classList.add('active');
    tabToday.classList.remove('active');
    booksView.classList.remove('hidden');
    todayView.classList.add('hidden');
  }
}

function setActiveViewButton(view) {
  viewButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function parseDuration(value) {
  if (!value) return { hours: '', minutes: '' };
  const hoursMatch = value.match(/(\d+)\s*(h|hours?)/i);
  const minutesMatch = value.match(/(\d+)\s*(m|mins?|minutes?)/i);
  return {
    hours: hoursMatch ? hoursMatch[1] : '',
    minutes: minutesMatch ? minutesMatch[1] : '',
  };
}

function buildDuration(hours, minutes) {
  const parts = [];
  if (hours && Number(hours) > 0) parts.push(`${hours}h`);
  if (minutes && Number(minutes) > 0) parts.push(`${minutes}m`);
  return parts.join(' ');
}

function isFutureDate(iso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(iso);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate > today;
}

function updateCheckinStatus(data) {
  currentData = data;
  const today = new Date().toISOString().slice(0, 10);
  const didRead = data.checkins.includes(today);
  todayCheckin.textContent = didRead ? 'I read today ✓' : 'Mark today as read';
  todayCheckin.classList.toggle('active', didRead);
  checkinStatus.textContent = didRead ? 'You have read today.' : 'Tap the button when you finish reading.';
}

function renderGrid(view, stats) {
  summaryDays.textContent = stats.summary.days;
  summaryRate.textContent = `${stats.summary.rate}%`;
  summaryStreak.textContent = stats.summary.streak;

  if (view === 'yearly') {
    renderYearlyCompact(stats);
    return;
  }

  const columnClass = view === 'weekly' ? 'week-grid' : 'month-grid';
  statsChart.innerHTML = `
    <div class="grid-row ${columnClass}">
      ${stats.days
        .map((day) => {
          return `
            <div class="grid-day ${day.read ? 'grid-read' : 'grid-empty'} ${view === 'monthly' ? 'month-day' : ''}" data-iso="${day.iso}">
              <div class="grid-day-number">${day.day}</div>
              <div class="grid-day-label">${day.label}</div>
            </div>`;
        })
        .join('')}
    </div>`;

  // attach click handlers to day boxes
  document.querySelectorAll('#statsChart .grid-day').forEach((el) => {
    el.addEventListener('click', () => {
      if (isFutureDate(el.dataset.iso)) {
        alert('Cannot mark future dates. Please select today or an earlier date.');
        return;
      }
      handleDayClick(el.dataset.iso);
    });
  });
}

function renderYearlyCompact(stats) {
  // group by month index 0..11
  const months = Array.from({ length: 12 }, () => []);
  stats.days.forEach((d) => {
    const dt = new Date(d.iso);
    months[dt.getMonth()].push(d);
  });
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  statsChart.innerHTML = '<div class="year-compact">' + months.map((days, mi) => {
    return `\n      <div class="month-row">\n        <div class="month-label">${monthNames[mi]}</div>\n        <div class="month-days">${days.map(d => `\n          <div class="grid-day ${d.read ? 'grid-read' : 'grid-empty'}" data-iso="${d.iso}" title="${d.label}">\n            <div class="grid-day-number">${d.day}</div>\n          </div>`).join('')}\n        </div>\n      </div>`;
  }).join('') + '\n</div>';

  document.querySelectorAll('#statsChart .month-days .grid-day').forEach((el) => {
    el.addEventListener('click', (e) => {
      const iso = el.dataset.iso;
      if (isFutureDate(iso)) {
        alert('Cannot mark future dates. Please select today or an earlier date.');
        return;
      }
      // toggle checkin for that date
      fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: iso }),
      })
        .then((r) => r.json())
        .then((data) => {
          currentData = data;
          updateCheckinStatus(data);
          loadStats(currentView);
        });
    });
  });
}

function handleDayClick(dateIso) {
  // single-click toggles read/unread for the day
  fetch('/api/checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: dateIso }),
  })
    .then((r) => r.json())
    .then((data) => {
      currentData = data;
      updateCheckinStatus(data);
      loadStats(currentView);
    });
}

function updateSummary(readings) {
  totalBooks.textContent = readings.length;
  if (readings.length === 0) {
    return;
  }
}

function renderReadings(readings) {
  readingList.innerHTML = '';
  if (readings.length === 0) {
    readingList.innerHTML = '<li class="reading-item">No reading records yet.</li>';
    return;
  }

  readings.forEach((item) => {
    const listItem = document.createElement('li');
    listItem.className = 'reading-item';
    listItem.innerHTML = `
      <h3>${item.title}</h3>
      <div class="reading-meta">
        <span>Date: ${formatDate(item.date)}</span>
        <span>Duration: ${item.duration || 'No duration'}</span>
      </div>
      ${item.notes ? `<p class="reading-notes">${item.notes}</p>` : ''}
      <div class="reading-actions">
        <button class="small-button" data-action="edit" data-id="${item.id}">Edit</button>
        <button class="small-button" data-action="delete" data-id="${item.id}">Delete</button>
      </div>`;

    listItem.querySelector('[data-action="edit"]').addEventListener('click', () => startEdit(item));
    listItem.querySelector('[data-action="delete"]').addEventListener('click', () => deleteReading(item.id));
    readingList.appendChild(listItem);
  });
}

function startEdit(item) {
  editingId = item.id;
  bookTitle.value = item.title;
  const parsed = parseDuration(item.duration || '');
  readingDurationHours.value = parsed.hours;
  readingDurationMinutes.value = parsed.minutes;
  readingDate.value = item.date;
  bookNotes.value = item.notes;
  bookTitle.focus();
}

function getDefaultPeriod(view) {
  const now = new Date();
  if (view === 'weekly') {
    const year = now.getFullYear();
    const week = getISOWeekNumber(now);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }
  if (view === 'monthly') {
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }
  return now.getFullYear().toString();
}

function getISOWeekNumber(date) {
  const target = new Date(date.valueOf());
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  return 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
}

function setPeriodType(view) {
  periodPicker.removeAttribute('min');
  periodPicker.removeAttribute('max');
  if (view === 'weekly') {
    periodPicker.type = 'week';
    periodPicker.value = getDefaultPeriod(view);
  } else if (view === 'monthly') {
    periodPicker.type = 'month';
    periodPicker.value = getDefaultPeriod(view);
  } else {
    periodPicker.type = 'number';
    periodPicker.min = '2020';
    periodPicker.max = new Date().getFullYear().toString();
    periodPicker.value = getDefaultPeriod(view);
  }
}

function loadData() {
  fetch('/api/data')
    .then((response) => response.json())
    .then((data) => {
      updateCheckinStatus(data);
      renderReadings(data.readings);
      updateSummary(data.readings);
      loadStats(currentView);
    });
}

function loadStats(view) {
  const period = periodPicker.value;
  fetch(`/api/stats?view=${view}&period=${encodeURIComponent(period)}`)
    .then((response) => response.json())
    .then((stats) => {
      renderGrid(view, stats);
      setActiveViewButton(view);
    });
}

function toggleCheckin() {
  fetch('/api/checkin', { method: 'POST' })
    .then((response) => response.json())
    .then((data) => {
      updateCheckinStatus(data);
      loadStats(currentView);
    });
}

function submitReading(event) {
  event.preventDefault();
  const payload = {
    title: bookTitle.value.trim(),
    duration: buildDuration(readingDurationHours.value.trim(), readingDurationMinutes.value.trim()),
    date: readingDate.value,
    notes: bookNotes.value.trim(),
  };
  if (!payload.title || !payload.date) return;
  if (editingId) payload.id = editingId;

  fetch('/api/reading', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then((response) => response.json())
    .then((data) => {
      currentData = data;
      renderReadings(data.readings);
      updateSummary(data.readings);
      readingForm.reset();
      readingDurationHours.value = '';
      readingDurationMinutes.value = '';
      editingId = null;
    });
}

function deleteReading(id) {
  fetch(`/api/reading/${id}`, { method: 'DELETE' })
    .then((response) => response.json())
    .then((data) => {
      currentData = data;
      renderReadings(data.readings);
      updateSummary(data.readings);
    });
}

// removed clearAll button and handler — clearing all is no longer exposed in UI

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('SW failed', error));
    });
  }
}

tabToday.addEventListener('click', () => setActiveTab('today'));
tabBooks.addEventListener('click', () => setActiveTab('books'));
todayCheckin.addEventListener('click', toggleCheckin);
readingForm.addEventListener('submit', submitReading);
viewButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentView = button.dataset.view;
    setPeriodType(currentView);
    loadStats(currentView);
  });
});

periodPicker.addEventListener('change', () => loadStats(currentView));

window.addEventListener('DOMContentLoaded', () => {
  setActiveTab('today');
  setActiveViewButton(currentView);
  setPeriodType(currentView);
  loadData();
  registerServiceWorker();
  if (exportDateHistoryBtn) exportDateHistoryBtn.addEventListener('click', exportDateHistory);
  if (exportBookHistoryBtn) exportBookHistoryBtn.addEventListener('click', exportBookHistory);
});

function toCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const keys = Object.keys(rows[0]);
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [keys.join(',')];
  rows.forEach((r) => {
    lines.push(keys.map((k) => esc(r[k] ?? '')).join(','));
  });
  return lines.join('\n');
}

function download(filename, content, mime='text/csv') {
  const blob = new Blob([content], { type: mime + ';charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportDateHistory() {
  fetch('/api/data')
    .then((r) => r.json())
    .then((data) => {
      const rows = (data.checkins || []).map((date, index) => ({
        index: index + 1,
        date,
        weekday: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      }));
      const csv = toCSV(rows);
      if (!csv) return alert('No dates to export');
      download('reading-dates.csv', csv);
    });
}

function exportBookHistory() {
  fetch('/api/data')
    .then((r) => r.json())
    .then((data) => {
      const rows = (data.readings || []).map((r) => ({
        id: r.id,
        title: r.title,
        date: r.date,
        duration: r.duration || '',
        notes: r.notes || '',
      }));
      const csv = toCSV(rows);
      if (!csv) return alert('No books to export');
      download('reading-books.csv', csv);
    });
}
