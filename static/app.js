const tabToday = document.getElementById('tabToday');
const tabBooks = document.getElementById('tabBooks');
const todayView = document.getElementById('todayView');
const booksView = document.getElementById('booksView');
const todayCheckin = document.getElementById('todayCheckin');
const checkinStatus = document.getElementById('checkinStatus');
const statsCard = document.querySelector('.stats-card');
const statsChart = document.getElementById('statsChart');
const pickerRow = document.querySelector('.picker-row');
const statsSummary = document.querySelector('.stats-summary');
const periodPicker = document.getElementById('periodPicker');
const previousPeriod = document.getElementById('previousPeriod');
const nextPeriod = document.getElementById('nextPeriod');
const readingForm = document.getElementById('readingForm');
const bookTitle = document.getElementById('bookTitle');
const readingDurationHours = document.getElementById('readingDurationHours');
const readingDurationMinutes = document.getElementById('readingDurationMinutes');
const readingDate = document.getElementById('readingDate');
const bookNotes = document.getElementById('bookNotes');
const readingDatePicker = document.getElementById('readingDatePicker');
const datePickerButton = document.querySelector('.date-picker-button');
const readingList = document.getElementById('readingList');
const totalBooks = document.getElementById('totalBooks');
const booksThisYear = document.getElementById('booksThisYear');
const libraryChart = document.getElementById('libraryChart');
const summaryDays = document.getElementById('summaryDays');
const summaryRate = document.getElementById('summaryRate');
const summaryStreak = document.getElementById('summaryStreak');
const viewButtons = document.querySelectorAll('.view-button[data-view]');
const dataAnalysisBtn = document.getElementById('dataAnalysis');
const analysisPanel = document.getElementById('analysisPanel');
const exportDateHistoryBtn = document.getElementById('exportDateHistory');
const exportBookHistoryBtn = document.getElementById('exportBookHistory');

let currentView = 'weekly';
let editingId = null;
let currentData = { readings: [], checkins: [] };
let analysisVisible = false;
let analysisFilters = {
  yearlyStart: '',
  yearlyEnd: '',
  monthlyStart: '',
  monthlyEnd: '',
  weeklyStart: '',
  weeklyEnd: '',
};

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
  dataAnalysisBtn.classList.remove('active');
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  const iso = date.toISOString().slice(0, 10);
  return iso;
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
  if (analysisVisible) renderMonthlyAnalysis(data);
}

function parseDateParts(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

function getMonthKey(iso) {
  const { year, month } = parseDateParts(iso);
  return `${year}-${month.toString().padStart(2, '0')}`;
}

function getMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function getDaysInMonth(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

function getDurationMinutes(value) {
  const parsed = parseDuration(value || '');
  return (Number(parsed.hours) || 0) * 60 + (Number(parsed.minutes) || 0);
}

function formatDurationMinutes(totalMinutes) {
  if (!totalMinutes) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours ? `${hours}h` : ''}${hours && minutes ? ' ' : ''}${minutes ? `${minutes}m` : ''}`;
}

function buildMonthlyAnalysis(data) {
  const monthMap = {};
  const ensureMonth = (monthKey) => {
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = {
        key: monthKey,
        readDays: 0,
        books: 0,
        minutes: 0,
        totalDays: getDaysInMonth(monthKey),
      };
    }
    return monthMap[monthKey];
  };

  (data.checkins || []).forEach((iso) => {
    ensureMonth(getMonthKey(iso)).readDays += 1;
  });

  (data.readings || []).forEach((reading) => {
    if (!reading.date) return;
    const month = ensureMonth(getMonthKey(reading.date));
    month.books += 1;
    month.minutes += getDurationMinutes(reading.duration);
  });

  return Object.values(monthMap)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((month) => ({
      ...month,
      rate: Math.round((month.readDays / month.totalDays) * 100),
    }));
}

function buildYearlyAnalysis(data) {
  const yearMap = {};
  (data.checkins || []).forEach((iso) => {
    const { year } = parseDateParts(iso);
    yearMap[year] = (yearMap[year] || 0) + 1;
  });
  return Object.keys(yearMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map((year) => ({ key: year.toString(), readDays: yearMap[year] }));
}

function buildWeekdayAnalysis(data) {
  const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const counts = weekdayLabels.map((label) => ({ key: label, readDays: 0 }));
  (data.checkins || []).forEach((iso) => {
    const date = new Date(`${iso}T00:00:00`);
    const weekdayIndex = (date.getDay() + 6) % 7;
    counts[weekdayIndex].readDays += 1;
  });
  return counts;
}

function filterCheckinsByDateRange(data, start, end) {
  return {
    ...data,
    checkins: (data.checkins || []).filter((iso) => {
      if (start && iso < start) return false;
      if (end && iso > end) return false;
      return true;
    }),
  };
}

function filterItemsByRange(items, start, end) {
  return items.filter((item) => {
    if (start && item.key < start) return false;
    if (end && item.key > end) return false;
    return true;
  });
}

function setDefaultAnalysisFilters(months, years) {
  const checkins = [...(currentData.checkins || [])].sort();
  if (years.length && !analysisFilters.yearlyStart) analysisFilters.yearlyStart = years[0].key;
  if (years.length && !analysisFilters.yearlyEnd) analysisFilters.yearlyEnd = years[years.length - 1].key;
  if (months.length && !analysisFilters.monthlyStart) analysisFilters.monthlyStart = months[0].key;
  if (months.length && !analysisFilters.monthlyEnd) analysisFilters.monthlyEnd = months[months.length - 1].key;
  if (checkins.length && !analysisFilters.weeklyStart) analysisFilters.weeklyStart = checkins[0];
  if (checkins.length && !analysisFilters.weeklyEnd) analysisFilters.weeklyEnd = checkins[checkins.length - 1];
}

function renderAnalysisSection({ title, controls, chart }) {
  return `
    <section class="analysis-section">
      <div class="analysis-section-header">
        <h4>${title}</h4>
        <div class="analysis-date-controls">${controls}</div>
      </div>
      ${chart}
    </section>`;
}

function renderEmptyAnalysisChart(message) {
  return `<div class="analysis-chart"><p class="analysis-empty">${message}</p></div>`;
}

function renderTrendChart({ items, xAxisLabel, yAxisLabel, itemLabel, ariaLabel }) {
  if (!items.length) return renderEmptyAnalysisChart('No data in this range.');

  const svgWidth = 720;
  const svgHeight = 310;
  const padding = 52;
  const innerWidth = svgWidth - padding * 2;
  const innerHeight = svgHeight - padding * 2;
  const maxValue = Math.max(...items.map((item) => item.readDays), 1);
  const xStep = items.length > 1 ? innerWidth / (items.length - 1) : innerWidth;

  const points = items.map((item, index) => {
    const x = items.length > 1 ? padding + index * xStep : padding + innerWidth / 2;
    const y = padding + innerHeight - (item.readDays / maxValue) * innerHeight;
    return { ...item, x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const y = padding + t * innerHeight;
    const value = Math.round(maxValue * (1 - t));
    const gridLine = t === 1
      ? ''
      : `<line x1="${padding}" y1="${y}" x2="${padding + innerWidth}" y2="${y}" stroke="#d7e4de" stroke-width="1" />`;
    return `
      <g>
        ${gridLine}
        <text x="${padding - 10}" y="${y + 4}" text-anchor="end" font-size="11" fill="#5f746d">${value}</text>
      </g>`;
  }).join('');

  const labelEvery = Math.max(1, Math.ceil(items.length / 8));
  const xLabels = points
    .map((point, index) => {
      if (index % labelEvery !== 0 && index !== points.length - 1) return '';
      return `<text x="${point.x}" y="${svgHeight - 24}" text-anchor="middle" font-size="11" fill="#5f746d">${itemLabel(point)}</text>`;
    })
    .join('');

  const pointNodes = points
    .map((point) => `
      <circle cx="${point.x}" cy="${point.y}" r="5" fill="#10a57b" />
      <text x="${point.x}" y="${point.y - 10}" text-anchor="middle" font-size="11" fill="#184d3d">${point.readDays}</text>
    `)
    .join('');

  return `
    <div class="analysis-chart">
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" aria-label="${ariaLabel}">
        <path d="M ${padding + 0.5} ${padding + 0.5} V ${padding + innerHeight + 0.5} H ${padding + innerWidth + 0.5}" fill="none" stroke="#203c31" stroke-width="1" shape-rendering="crispEdges" />
        ${gridLines}
        <path d="${linePath}" fill="none" stroke="#10a57b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        ${pointNodes}
        ${xLabels}
        <text x="${padding + innerWidth / 2}" y="${svgHeight - 4}" text-anchor="middle" font-size="12" fill="#5f746d">${xAxisLabel}</text>
        <text x="12" y="${padding + innerHeight / 2}" text-anchor="middle" font-size="12" fill="#5f746d" transform="rotate(-90 12,${padding + innerHeight / 2})">${yAxisLabel}</text>
      </svg>
    </div>`;
}

function renderBarChart({ items, xAxisLabel, yAxisLabel, ariaLabel }) {
  if (!items.length) return renderEmptyAnalysisChart('No data in this range.');

  const svgWidth = 720;
  const svgHeight = 310;
  const padding = 52;
  const innerWidth = svgWidth - padding * 2;
  const innerHeight = svgHeight - padding * 2;
  const maxValue = Math.max(...items.map((item) => item.readDays), 1);
  const slotWidth = innerWidth / items.length;
  const barWidth = Math.min(54, slotWidth * 0.58);

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const y = padding + t * innerHeight;
    const value = Math.round(maxValue * (1 - t));
    const gridLine = t === 1
      ? ''
      : `<line x1="${padding}" y1="${y}" x2="${padding + innerWidth}" y2="${y}" stroke="#d7e4de" stroke-width="1" />`;
    return `
      <g>
        ${gridLine}
        <text x="${padding - 10}" y="${y + 4}" text-anchor="end" font-size="11" fill="#5f746d">${value}</text>
      </g>`;
  }).join('');

  const bars = items.map((item, index) => {
    const x = padding + index * slotWidth + (slotWidth - barWidth) / 2;
    const height = (item.readDays / maxValue) * innerHeight;
    const y = padding + innerHeight - height;
    const labelX = padding + index * slotWidth + slotWidth / 2;
    return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="8" fill="#10a57b" />
      <text x="${labelX}" y="${y - 10}" text-anchor="middle" font-size="11" fill="#184d3d">${item.readDays}</text>
      <text x="${labelX}" y="${svgHeight - 24}" text-anchor="middle" font-size="11" fill="#5f746d">${item.key}</text>
    `;
  }).join('');

  return `
    <div class="analysis-chart">
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" aria-label="${ariaLabel}">
        <path d="M ${padding + 0.5} ${padding + 0.5} V ${padding + innerHeight + 0.5} H ${padding + innerWidth + 0.5}" fill="none" stroke="#203c31" stroke-width="1" shape-rendering="crispEdges" />
        ${gridLines}
        ${bars}
        <text x="${padding + innerWidth / 2}" y="${svgHeight - 4}" text-anchor="middle" font-size="12" fill="#5f746d">${xAxisLabel}</text>
        <text x="12" y="${padding + innerHeight / 2}" text-anchor="middle" font-size="12" fill="#5f746d" transform="rotate(-90 12,${padding + innerHeight / 2})">${yAxisLabel}</text>
      </svg>
    </div>`;
}

function renderMonthlyAnalysis(data = currentData) {
  if (!analysisPanel) return;
  const months = buildMonthlyAnalysis(data);
  const firstActiveIndex = months.findIndex((month) => month.readDays > 0);
  const visibleMonths = firstActiveIndex === -1 ? [] : months.slice(firstActiveIndex);
  const years = buildYearlyAnalysis(data);
  setDefaultAnalysisFilters(visibleMonths, years);

  if (!visibleMonths.length && !years.length) {
    analysisPanel.innerHTML = '<p class="analysis-empty">No reading data yet.</p>';
    return;
  }

  const filteredYears = filterItemsByRange(years, analysisFilters.yearlyStart, analysisFilters.yearlyEnd);
  const filteredMonths = filterItemsByRange(visibleMonths, analysisFilters.monthlyStart, analysisFilters.monthlyEnd);
  const weeklyData = buildWeekdayAnalysis(filterCheckinsByDateRange(data, analysisFilters.weeklyStart, analysisFilters.weeklyEnd));

  analysisPanel.innerHTML = [
    years.length ? renderAnalysisSection({
      title: 'Yearly Reading Trend',
      controls: `
        <button type="button" class="analysis-picker-button" data-picker-type="year" data-filter-key="yearlyStart" aria-label="Yearly start year">${analysisFilters.yearlyStart}</button>
        <span>to</span>
        <button type="button" class="analysis-picker-button" data-picker-type="year" data-filter-key="yearlyEnd" aria-label="Yearly end year">${analysisFilters.yearlyEnd}</button>
      `,
      chart: renderTrendChart({
        items: filteredYears,
        xAxisLabel: 'Year',
        yAxisLabel: 'Read days',
        itemLabel: (item) => item.key,
        ariaLabel: 'Yearly Reading Trend chart',
      }),
    }) : '',
    visibleMonths.length ? renderAnalysisSection({
      title: 'Monthly Reading Trend',
      controls: `
        <button type="button" class="analysis-picker-button" data-picker-type="month" data-filter-key="monthlyStart" aria-label="Monthly start month">${analysisFilters.monthlyStart}</button>
        <span>to</span>
        <button type="button" class="analysis-picker-button" data-picker-type="month" data-filter-key="monthlyEnd" aria-label="Monthly end month">${analysisFilters.monthlyEnd}</button>
      `,
      chart: renderTrendChart({
        items: filteredMonths,
        xAxisLabel: 'Month',
        yAxisLabel: 'Read days',
        itemLabel: (item) => item.key,
        ariaLabel: 'Monthly Reading Trend chart',
      }),
    }) : '',
    renderAnalysisSection({
      title: 'Weekly Reading Trend',
      controls: `
        <button type="button" class="analysis-picker-button" data-picker-type="date" data-filter-key="weeklyStart" aria-label="Weekly start date">${analysisFilters.weeklyStart}</button>
        <span>to</span>
        <button type="button" class="analysis-picker-button" data-picker-type="date" data-filter-key="weeklyEnd" aria-label="Weekly end date">${analysisFilters.weeklyEnd}</button>
      `,
      chart: renderBarChart({
        items: weeklyData,
        xAxisLabel: 'Weekday',
        yAxisLabel: 'Read days',
        ariaLabel: 'Weekly Reading Trend chart',
      }),
    }),
  ].join('');

  attachAnalysisFilterHandlers();
}

function attachAnalysisFilterHandlers() {
  document.querySelectorAll('[data-filter-key]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openAnalysisPicker(button);
    });
  });
}

function openAnalysisPicker(targetButton) {
  const targetKey = targetButton.dataset.filterKey;
  const pickerType = targetButton.dataset.pickerType;
  const currentValue = analysisFilters[targetKey] || new Date().toISOString().slice(0, pickerType === 'date' ? 10 : 7);
  const existingPicker = document.querySelector('.analysis-picker');
  if (existingPicker) existingPicker.remove();

  const picker = document.createElement('div');
  picker.className = 'analysis-picker';
  picker.dataset.pendingValue = currentValue;
  picker.dataset.ownerKey = targetKey;
  picker.innerHTML = buildAnalysisPickerContent(pickerType, currentValue);
  picker.addEventListener('click', (event) => event.stopPropagation());
  picker.addEventListener('mousedown', (event) => event.stopPropagation());
  targetButton.insertAdjacentElement('afterend', picker);

  attachOpenPickerControls(picker, targetKey, pickerType);
  const pickerInput = picker.querySelector('[data-picker-input]');
  if (pickerInput) {
    window.setTimeout(() => {
      pickerInput.focus();
      pickerInput.select();
    }, 0);
  }
}

function buildAnalysisPickerContent(type, currentValue, displayYear) {
  const year = displayYear || Number(currentValue.slice(0, 4)) || new Date().getFullYear();
  if (type === 'year') {
    const startYear = year - 5;
    const years = Array.from({ length: 12 }, (_, index) => (startYear + index).toString());
    return buildPickerGrid(year, years, currentValue, 'year');
  }
  if (type === 'date') {
    const month = currentValue.slice(5, 7) || '01';
    const dayCount = new Date(year, Number(month), 0).getDate();
    const days = Array.from({ length: dayCount }, (_, index) => (index + 1).toString().padStart(2, '0'));
    return buildPickerGrid(year, days.map((day) => `${year}-${month}-${day}`), currentValue, 'date', month);
  }
  const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  return buildPickerGrid(year, months.map((month) => `${year}-${month}`), currentValue, 'month');
}

function buildPickerGrid(year, values, currentValue, type, month = '') {
  const buttonLabel = (value) => {
    if (type === 'year') return value;
    if (type === 'date') return value.slice(-2);
    return value.slice(-2);
  };
  const title = type === 'date' ? `${year}-${month}` : year;
  const previousAttribute = type === 'date' ? 'data-month-step="-1"' : 'data-year-step="-1"';
  const nextAttribute = type === 'date' ? 'data-month-step="1"' : 'data-year-step="1"';
  const inputLabel = type === 'year' ? 'YYYY' : type === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';
  const inputMaxLength = type === 'year' ? 4 : type === 'month' ? 7 : 10;
  return `
    <div class="analysis-picker-header">
      <button type="button" ${previousAttribute}>&lt;</button>
      <strong>${title}</strong>
      <button type="button" ${nextAttribute}>&gt;</button>
    </div>
    <label class="analysis-picker-input-label">
      <span>${inputLabel}</span>
      <input type="text" data-picker-input value="${currentValue}" placeholder="${inputLabel}" inputmode="numeric" maxlength="${inputMaxLength}" />
    </label>
    <div class="analysis-picker-grid ${type === 'year' ? 'year-picker-grid' : ''}">
      ${values.map((value) => {
        const active = value === currentValue ? ' active' : '';
        return `<button type="button" class="analysis-picker-option${active}" data-picker-value="${value}">${buttonLabel(value)}</button>`;
      }).join('')}
    </div>
    <div class="analysis-picker-actions">
      <button type="button" data-picker-cancel>Cancel</button>
      <button type="button" data-picker-confirm>Confirm</button>
    </div>
  `;
}

function normalizePickerValue(value, type) {
  const trimmed = value.trim();
  if (type === 'year') {
    return /^\d{4}$/.test(trimmed) ? trimmed : '';
  }
  if (type === 'month') {
    const compact = trimmed.replace(/\D/g, '');
    const monthValue = /^\d{6}$/.test(compact)
      ? `${compact.slice(0, 4)}-${compact.slice(4, 6)}`
      : trimmed;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthValue)) return '';
    return monthValue;
  }

  const compact = trimmed.replace(/\D/g, '');
  const dateValue = /^\d{8}$/.test(compact)
    ? `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`
    : trimmed;
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(dateValue)) return '';
  const [year, month, day] = dateValue.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  const isRealDate = parsed.getFullYear() === year
    && parsed.getMonth() === month - 1
    && parsed.getDate() === day;
  return isRealDate ? dateValue : '';
}

function confirmAnalysisPicker(picker, targetKey, pickerType) {
  const input = picker.querySelector('[data-picker-input]');
  const nextValue = normalizePickerValue(input.value, pickerType);
  if (!nextValue) {
    input.classList.add('invalid');
    input.focus();
    return;
  }
  analysisFilters[targetKey] = nextValue;
  picker.remove();
  renderMonthlyAnalysis(currentData);
}

function attachOpenPickerControls(picker, targetKey, pickerType) {
  picker.querySelectorAll('[data-year-step]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const baseYear = Number(picker.dataset.year);
      picker.dataset.year = (baseYear + Number(button.dataset.yearStep)).toString();
      picker.innerHTML = buildAnalysisPickerContent(pickerType, picker.dataset.pendingValue, Number(picker.dataset.year));
      attachOpenPickerControls(picker, targetKey, pickerType);
    });
  });
  picker.querySelectorAll('[data-month-step]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const pending = picker.dataset.pendingValue || analysisFilters[targetKey] || new Date().toISOString().slice(0, 10);
      const [year, month] = pending.split('-').map(Number);
      const nextDate = new Date(year, month - 1 + Number(button.dataset.monthStep), 1);
      const nextValue = `${nextDate.getFullYear()}-${(nextDate.getMonth() + 1).toString().padStart(2, '0')}-01`;
      picker.dataset.pendingValue = nextValue;
      picker.dataset.year = nextDate.getFullYear().toString();
      picker.innerHTML = buildAnalysisPickerContent(pickerType, nextValue);
      attachOpenPickerControls(picker, targetKey, pickerType);
    });
  });
  picker.querySelectorAll('[data-picker-value]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      picker.dataset.pendingValue = button.dataset.pickerValue;
      picker.querySelector('[data-picker-input]').value = button.dataset.pickerValue;
      picker.querySelectorAll('[data-picker-value]').forEach((option) => option.classList.remove('active'));
      button.classList.add('active');
    });
  });
  picker.querySelector('[data-picker-input]').addEventListener('input', (event) => {
    event.stopPropagation();
    event.target.classList.remove('invalid');
    const normalizedValue = normalizePickerValue(event.target.value, pickerType);
    if (!normalizedValue) return;
    picker.dataset.pendingValue = normalizedValue;
    picker.querySelectorAll('[data-picker-value]').forEach((option) => {
      option.classList.toggle('active', option.dataset.pickerValue === normalizedValue);
    });
  });
  picker.querySelector('[data-picker-input]').addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      confirmAnalysisPicker(picker, targetKey, pickerType);
    }
    if (event.key === 'Escape') {
      picker.remove();
    }
  });
  picker.querySelector('[data-picker-cancel]').addEventListener('click', (event) => {
    event.stopPropagation();
    picker.remove();
  });
  picker.querySelector('[data-picker-confirm]').addEventListener('click', (event) => {
    event.stopPropagation();
    confirmAnalysisPicker(picker, targetKey, pickerType);
  });
  picker.dataset.year = (picker.dataset.year || (analysisFilters[targetKey] || '').slice(0, 4) || new Date().getFullYear()).toString();
}

document.addEventListener('click', (event) => {
  const picker = document.querySelector('.analysis-picker');
  if (!picker) return;
  const clickedInsidePicker = picker.contains(event.target);
  const clickedPickerButton = event.target.closest('[data-filter-key]');
  if (!clickedInsidePicker && !clickedPickerButton) {
    picker.remove();
  }
});

function showDataAnalysis() {
  analysisVisible = true;
  statsCard.classList.add('analysis-mode');
  viewButtons.forEach((button) => button.classList.remove('active'));
  dataAnalysisBtn.classList.add('active');
  analysisPanel.classList.remove('hidden');
  pickerRow.classList.add('hidden');
  statsSummary.classList.add('hidden');
  statsChart.classList.add('hidden');
  renderMonthlyAnalysis(currentData);
}

function hideDataAnalysis() {
  analysisVisible = false;
  statsCard.classList.remove('analysis-mode');
  dataAnalysisBtn.classList.remove('active');
  analysisPanel.classList.add('hidden');
  pickerRow.classList.remove('hidden');
  statsSummary.classList.remove('hidden');
  statsChart.classList.remove('hidden');
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
  const weekdayHeader = view === 'monthly'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      .map((day) => `<div class="calendar-weekday">${day}</div>`)
      .join('')
    : '';
  const monthOffset = view === 'monthly' && stats.days.length
    ? (new Date(stats.days[0].iso).getDay() + 6) % 7
    : 0;
  const monthPlaceholders = Array.from({ length: monthOffset }, () => (
    '<div class="month-placeholder" aria-hidden="true"></div>'
  )).join('');

  statsChart.innerHTML = `
    <div class="grid-row ${columnClass}">
      ${weekdayHeader}
      ${monthPlaceholders}
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
    const readCount = days.filter((day) => day.read).length;
    const readLabel = readCount === 1 ? '1 read' : `${readCount} reads`;
    return `\n      <div class="month-row">\n        <div class="month-label">\n          <span>${monthNames[mi]}</span>\n          <small>${readLabel}</small>\n        </div>\n        <div class="month-days">${days.map(d => `\n          <div class="grid-day ${d.read ? 'grid-read' : 'grid-empty'}" data-iso="${d.iso}" title="${d.label}">\n            <div class="grid-day-number">${d.day}</div>\n          </div>`).join('')}\n        </div>\n      </div>`;
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
  const currentYear = new Date().getFullYear();
  const thisYearCount = readings.filter((item) => {
    if (!item.date) return false;
    return new Date(item.date).getFullYear() === currentYear;
  }).length;
  if (booksThisYear) {
    booksThisYear.textContent = thisYearCount;
  }
  renderBooksPerYearChart(readings);
}

function renderBooksPerYearChart(readings) {
  if (!libraryChart) return;
  const counts = readings.reduce((acc, item) => {
    if (!item.date) return acc;
    const year = new Date(item.date).getFullYear();
    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {});
  const years = Object.keys(counts).map(Number).sort((a, b) => a - b);
  if (years.length === 0) {
    libraryChart.innerHTML = '<div class="empty-chart">Add a reading to see yearly book counts.</div>';
    return;
  }

  const values = years.map((year) => counts[year]);
  const maxValue = Math.max(...values, 1);
  const svgWidth = 560;
  const svgHeight = 240;
  const padding = 40;
  const innerWidth = svgWidth - padding * 2;
  const innerHeight = svgHeight - padding * 2;
  const xStep = years.length > 1 ? innerWidth / (years.length - 1) : innerWidth;

  const points = years.map((year, index) => {
    const x = padding + index * xStep;
    const y = padding + innerHeight - (counts[year] / maxValue) * innerHeight;
    return { x, y, year, value: counts[year] };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const y = padding + t * innerHeight;
    const value = Math.round(maxValue * (1 - t));
    const gridLine = t === 1
      ? ''
      : `<line x1="${padding}" y1="${y}" x2="${padding + innerWidth}" y2="${y}" stroke="#d7e4de" stroke-width="1" />`;
    return `
      <g>
        ${gridLine}
        <text x="${padding - 10}" y="${y + 4}" text-anchor="end" font-size="11" fill="#5f746d">${value}</text>
      </g>`;
  });

  const yearLabels = points
    .map((point) => `
      <text x="${point.x}" y="${svgHeight - 22}" text-anchor="middle" font-size="11" fill="#5f746d">${point.year}</text>
    `)
    .join('');

  const circleNodes = points
    .map((point) => `
      <circle cx="${point.x}" cy="${point.y}" r="5" fill="#10a57b" />
      <text x="${point.x}" y="${point.y - 10}" text-anchor="middle" font-size="11" fill="#184d3d">${point.value}</text>
    `)
    .join('');

  libraryChart.innerHTML = `
    <svg viewBox="0 0 ${svgWidth} ${svgHeight}" aria-label="Annual reading trend chart">
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${padding + innerHeight}" stroke="#203c31" stroke-width="1.2" shape-rendering="crispEdges" />
      <line x1="${padding}" y1="${padding + innerHeight}" x2="${padding + innerWidth}" y2="${padding + innerHeight}" stroke="#203c31" stroke-width="1.2" shape-rendering="crispEdges" />
      ${gridLines.join('')}
      <path d="${linePath}" fill="none" stroke="#10a57b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      ${circleNodes}
      ${yearLabels}
      <text x="${padding + innerWidth / 2}" y="${svgHeight - 4}" text-anchor="middle" font-size="12" fill="#5f746d">Year</text>
      <text x="12" y="${padding + innerHeight / 2}" text-anchor="middle" font-size="12" fill="#5f746d" transform="rotate(-90 12,${padding + innerHeight / 2})">Books</text>
    </svg>`;
}

function renderReadings(readings) {
  readingList.innerHTML = '';
  if (readings.length === 0) {
    readingList.innerHTML = '<li class="reading-item">No reading records yet.</li>';
    return;
  }

  const sortedReadings = [...readings].sort((a, b) => b.date.localeCompare(a.date));

  sortedReadings.forEach((item) => {
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
  readingDatePicker.value = item.date;
  bookNotes.value = item.notes;
  bookTitle.focus();
}

function getDefaultPeriod(view) {
  const now = new Date();
  if (view === 'weekly') {
    return formatWeekPeriod(now);
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

function getISOWeekYear(date) {
  const target = new Date(date.valueOf());
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  return target.getFullYear();
}

function getDateFromISOWeek(period) {
  const [yearValue, weekValue] = period.split('-W');
  const year = Number(yearValue);
  const week = Number(weekValue);
  const jan4 = new Date(year, 0, 4);
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
  return monday;
}

function formatWeekPeriod(date) {
  const weekYear = getISOWeekYear(date);
  const week = getISOWeekNumber(date);
  return `${weekYear}-W${week.toString().padStart(2, '0')}`;
}

function shiftPeriod(direction) {
  if (currentView === 'weekly') {
    const current = getDateFromISOWeek(periodPicker.value || getDefaultPeriod(currentView));
    current.setDate(current.getDate() + direction * 7);
    periodPicker.value = formatWeekPeriod(current);
  } else if (currentView === 'monthly') {
    const [year, month] = (periodPicker.value || getDefaultPeriod(currentView)).split('-').map(Number);
    const current = new Date(year, month - 1 + direction, 1);
    periodPicker.value = `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}`;
  } else {
    const year = Number(periodPicker.value || getDefaultPeriod(currentView));
    periodPicker.value = (year + direction).toString();
  }
  loadStats(currentView);
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
      if (analysisVisible) return;
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
  const dateValue = readingDate.value.trim();
  if (!dateValue) {
    alert('Please select a valid date.');
    return;
  }
  const payload = {
    title: bookTitle.value.trim(),
    duration: buildDuration(readingDurationHours.value.trim(), readingDurationMinutes.value.trim()),
    date: dateValue,
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
      if (analysisVisible) renderMonthlyAnalysis(data);
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
      if (analysisVisible) renderMonthlyAnalysis(data);
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
    hideDataAnalysis();
    currentView = button.dataset.view;
    setActiveViewButton(currentView);
    setPeriodType(currentView);
    loadStats(currentView);
  });
});

periodPicker.addEventListener('change', () => loadStats(currentView));
previousPeriod.addEventListener('click', () => shiftPeriod(-1));
nextPeriod.addEventListener('click', () => shiftPeriod(1));

window.addEventListener('DOMContentLoaded', () => {
  setActiveTab('today');
  setActiveViewButton(currentView);
  setPeriodType(currentView);
  loadData();
  registerServiceWorker();
  if (exportDateHistoryBtn) exportDateHistoryBtn.addEventListener('click', exportDateHistory);
  if (dataAnalysisBtn) dataAnalysisBtn.addEventListener('click', showDataAnalysis);
  if (exportBookHistoryBtn) exportBookHistoryBtn.addEventListener('click', exportBookHistory);

  if (readingDatePicker) {
    readingDatePicker.addEventListener('change', () => {
      if (readingDatePicker.value) {
        readingDate.value = readingDatePicker.value;
      }
    });
  }

  const openDatePicker = () => {
    if (!readingDatePicker) return;
    readingDatePicker.focus();
    if (typeof readingDatePicker.showPicker === 'function') {
      readingDatePicker.showPicker();
    } else {
      readingDatePicker.click();
    }
  };

  if (readingDate) {
    readingDate.addEventListener('click', openDatePicker);
  }

  if (datePickerButton) {
    datePickerButton.addEventListener('click', openDatePicker);
  }
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
