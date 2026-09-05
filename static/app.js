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
const currentPeriod = document.getElementById('currentPeriod');
const periodButtons = document.querySelectorAll('.period-step-button, .period-current-button');
const readingForm = document.getElementById('readingForm');
const saveReadingButton = document.getElementById('saveReadingButton');
const cancelEditReading = document.getElementById('cancelEditReading');
const bookTitle = document.getElementById('bookTitle');
const readingDurationHours = document.getElementById('readingDurationHours');
const readingDurationMinutes = document.getElementById('readingDurationMinutes');
const readingStartDate = document.getElementById('readingStartDate');
const readingStartDatePicker = document.getElementById('readingStartDatePicker');
const readingDate = document.getElementById('readingDate');
const bookNotes = document.getElementById('bookNotes');
const readingDatePicker = document.getElementById('readingDatePicker');
const datePickerButtons = document.querySelectorAll('.date-picker-button[data-date-target]');
const readingList = document.getElementById('readingList');
const totalBooks = document.getElementById('totalBooks');
const booksThisYear = document.getElementById('booksThisYear');
const libraryChart = document.getElementById('libraryChart');
const bookTimelineChart = document.getElementById('bookTimelineChart');
const summaryDays = document.getElementById('summaryDays');
const summaryRate = document.getElementById('summaryRate');
const summaryStreak = document.getElementById('summaryStreak');
const summaryAvgCompletion = document.getElementById('summaryAvgCompletion');
const viewButtons = document.querySelectorAll('.view-button[data-view]');
const dataAnalysisBtn = document.getElementById('dataAnalysis');
const analysisPanel = document.getElementById('analysisPanel');
const exportDateHistoryBtn = document.getElementById('exportDateHistory');
const exportBookHistoryBtn = document.getElementById('exportBookHistory');
const exportBookTimelineImageBtn = document.getElementById('exportBookTimelineImage');
const sizeButtons = document.querySelectorAll('.size-button[data-ui-size]');

let currentView = 'weekly';
let editingId = null;
let currentData = { readings: [], checkins: [] };
let analysisVisible = false;
let readingHistoryFilters = { start: '', end: '' };
let analysisFilters = {
  yearlyStart: '',
  yearlyEnd: '',
  monthlyStart: '',
  monthlyEnd: '',
  weeklyTrendStart: '',
  weeklyTrendEnd: '',
  weeklyCompletionStart: '',
  weeklyCompletionEnd: '',
};

const analysisFilterPairs = {
  yearly: ['yearlyStart', 'yearlyEnd'],
  monthly: ['monthlyStart', 'monthlyEnd'],
  weeklyTrend: ['weeklyTrendStart', 'weeklyTrendEnd'],
  weeklyCompletion: ['weeklyCompletionStart', 'weeklyCompletionEnd'],
};

function setUiSize(size) {
  const nextSize = ['small', 'medium', 'large'].includes(size) ? size : 'medium';
  document.body.dataset.uiSize = nextSize;
  sizeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.uiSize === nextSize);
  });
  localStorage.setItem('readingTrackerUiSize', nextSize);
}

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
    requestAnimationFrame(() => renderBookTimelineChart(currentData.readings || []));
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/\n/g, '&#10;');
}

function getChartTooltip() {
  let tooltip = document.querySelector('.chart-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

function positionChartTooltip(event, tooltip) {
  const offset = 14;
  const rect = tooltip.getBoundingClientRect();
  let left = event.clientX + offset;
  let top = event.clientY + offset;
  if (left + rect.width > window.innerWidth - 12) {
    left = event.clientX - rect.width - offset;
  }
  if (top + rect.height > window.innerHeight - 12) {
    top = event.clientY - rect.height - offset;
  }
  tooltip.style.left = `${Math.max(12, left)}px`;
  tooltip.style.top = `${Math.max(12, top)}px`;
}

function showChartTooltip(event, target) {
  const tooltip = getChartTooltip();
  tooltip.textContent = target.dataset.tooltip || '';
  tooltip.classList.add('visible');
  positionChartTooltip(event, tooltip);
}

function hideChartTooltip() {
  const tooltip = document.querySelector('.chart-tooltip');
  if (tooltip) tooltip.classList.remove('visible');
}

function getInclusiveReadingDays(startDate, finishDate) {
  if (!startDate || !finishDate) return '';
  const start = new Date(`${startDate}T00:00:00`);
  const finish = new Date(`${finishDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(finish.getTime())) return '';
  const diffDays = Math.round((finish - start) / 86400000) + 1;
  if (diffDays < 1) return 'Invalid date range';
  const months = Math.floor(diffDays / 30);
  const days = diffDays % 30;
  const totalText = diffDays === 1 ? '1 day' : `${diffDays} days`;
  if (months === 0) return totalText;
  const monthText = months === 1 ? '1 month' : `${months} months`;
  const dayText = days === 1 ? '1 day' : `${days} days`;
  const periodParts = [];
  periodParts.push(monthText);
  if (days > 0) periodParts.push(dayText);
  return `${totalText} (${periodParts.join(' ')})`;
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
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
  const monthMap = {};
  const ensureMonth = (monthKey) => {
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = {
        key: monthKey,
        readDays: 0,
        books: 0,
        minutes: 0,
        totalDays: monthKey === currentMonthKey ? today.getDate() : getDaysInMonth(monthKey),
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
  const today = new Date();
  const currentYear = today.getFullYear();
  return Object.keys(yearMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map((year) => {
      const start = new Date(year, 0, 1);
      const end = year === currentYear ? today : new Date(year, 11, 31);
      const totalDays = Math.round((end - start) / 86400000) + 1;
      const readDays = yearMap[year];
      return {
        key: year.toString(),
        readDays,
        totalDays,
        rate: Math.round((readDays / totalDays) * 100),
      };
    });
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

function formatDateISO(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthWeekLabel(weekStart) {
  const anchor = new Date(weekStart);
  anchor.setDate(weekStart.getDate() + 3);
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthOffset = (monthStart.getDay() + 6) % 7;
  const weekOfMonth = Math.ceil((anchor.getDate() + monthOffset) / 7);
  const month = (anchor.getMonth() + 1).toString().padStart(2, '0');
  const yearMonth = `${anchor.getFullYear()}-${month}`;
  return {
    short: `${month} W${weekOfMonth}`,
    month: yearMonth,
    long: `${yearMonth} week ${weekOfMonth}`,
  };
}

function buildWeeklyCompletionTrend(data, startIso, endIso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkins = [...(data.checkins || [])].sort();
  const firstDate = startIso || checkins[0] || formatDateISO(today);
  const lastDate = endIso || checkins[checkins.length - 1] || formatDateISO(today);
  const rangeStart = new Date(`${firstDate}T00:00:00`);
  const rangeEnd = new Date(`${lastDate}T00:00:00`);
  rangeStart.setHours(0, 0, 0, 0);
  rangeEnd.setHours(0, 0, 0, 0);
  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime()) || rangeStart > rangeEnd) return [];

  const readSet = new Set(data.checkins || []);
  const items = [];
  const weekStart = new Date(rangeStart);
  weekStart.setDate(rangeStart.getDate() - ((rangeStart.getDay() + 6) % 7));

  while (weekStart <= rangeEnd) {
    if (weekStart > today) break;

    const weekDays = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + index);
      day.setHours(0, 0, 0, 0);
      return day;
    }).filter((day) => day >= rangeStart && day <= rangeEnd && day <= today);

    const readDays = weekDays.filter((day) => readSet.has(formatDateISO(day))).length;
    const totalDays = weekDays.length;
    const rate = totalDays ? Math.round((readDays / totalDays) * 100) : 0;

    if (totalDays) {
      const monthWeek = getMonthWeekLabel(weekStart);
      const weekRangeStart = formatDateISO(weekDays[0]);
      const weekRangeEnd = formatDateISO(weekDays[weekDays.length - 1]);
      items.push({
        key: formatWeekPeriod(weekStart),
        week: getISOWeekNumber(weekStart),
        label: monthWeek.short,
        month: monthWeek.month,
        titleLabel: monthWeek.long,
        dateRange: `${weekRangeStart} to ${weekRangeEnd}`,
        rate,
        readDays,
        totalDays,
      });
    }

    weekStart.setDate(weekStart.getDate() + 7);
  }

  return items;
}

function averageRate(items) {
  if (!items.length) return 0;
  return Math.round(items.reduce((total, item) => total + item.rate, 0) / items.length);
}

function buildMonthlyCompletionTrend(data) {
  const checkins = [...(data.checkins || [])].sort();
  if (!checkins.length) return [];

  const readSet = new Set(checkins);
  const first = new Date(`${checkins[0].slice(0, 7)}-01T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const items = [];

  for (let current = new Date(first); current <= today; current = new Date(current.getFullYear(), current.getMonth() + 1, 1)) {
    const monthKey = `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}`;
    const totalDaysInMonth = getDaysInMonth(monthKey);
    const isCurrentMonth = current.getFullYear() === today.getFullYear() && current.getMonth() === today.getMonth();
    const denominator = isCurrentMonth ? today.getDate() : totalDaysInMonth;
    let readDays = 0;
    for (let day = 1; day <= denominator; day += 1) {
      const iso = `${monthKey}-${day.toString().padStart(2, '0')}`;
      if (readSet.has(iso)) readDays += 1;
    }
    items.push({ key: monthKey, rate: Math.round((readDays / denominator) * 100) });
  }

  return items;
}

function buildYearlyCompletionTrend(data) {
  const checkins = [...(data.checkins || [])].sort();
  if (!checkins.length) return [];

  const readSet = new Set(checkins);
  const firstYear = Number(checkins[0].slice(0, 4));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();
  const items = [];

  for (let year = firstYear; year <= currentYear; year += 1) {
    const start = new Date(year, 0, 1);
    const end = year === currentYear ? today : new Date(year, 11, 31);
    const denominator = Math.round((end - start) / 86400000) + 1;
    let readDays = 0;
    for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
      if (readSet.has(formatDateISO(day))) readDays += 1;
    }
    items.push({ key: year.toString(), rate: Math.round((readDays / denominator) * 100) });
  }

  return items;
}

function getAverageCompletionForView(view, data) {
  const checkins = [...(data.checkins || [])].sort();
  if (!checkins.length) return 0;
  const todayIso = formatDateISO(new Date());
  if (view === 'weekly') return averageRate(buildWeeklyCompletionTrend(data, checkins[0], todayIso));
  if (view === 'monthly') return averageRate(buildMonthlyCompletionTrend(data));
  return averageRate(buildYearlyCompletionTrend(data));
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
  if (checkins.length && !analysisFilters.weeklyTrendStart) analysisFilters.weeklyTrendStart = checkins[0];
  if (checkins.length && !analysisFilters.weeklyTrendEnd) analysisFilters.weeklyTrendEnd = checkins[checkins.length - 1];
  if (checkins.length && !analysisFilters.weeklyCompletionStart) analysisFilters.weeklyCompletionStart = checkins[0];
  if (checkins.length && !analysisFilters.weeklyCompletionEnd) analysisFilters.weeklyCompletionEnd = checkins[checkins.length - 1];
}

function renderAnalysisSection({ title, controls, chart }) {
  const controlsMarkup = controls ? `<div class="analysis-date-controls">${controls}</div>` : '';
  return `
    <section class="analysis-section">
      <div class="analysis-section-header">
        <h4>${title}</h4>
        ${controlsMarkup}
      </div>
      ${chart}
    </section>`;
}

function renderAnalysisPresets(rangeType) {
  const activePreset = getActiveAnalysisPreset(rangeType);
  return `
    <span class="analysis-preset-group" data-range-type="${rangeType}">
      <button type="button" class="analysis-preset-button analysis-year-step" data-range-preset="previousYear" aria-label="Previous year">&lt;</button>
      <button type="button" class="analysis-preset-button ${activePreset === 'year' ? 'active' : ''}" data-range-preset="year">This year</button>
      <button type="button" class="analysis-preset-button ${activePreset === 'all' ? 'active' : ''}" data-range-preset="all">All</button>
      <button type="button" class="analysis-preset-button analysis-year-step" data-range-preset="nextYear" aria-label="Next year">&gt;</button>
    </span>`;
}

function renderReadingHistoryPresets() {
  return `
    <span class="analysis-preset-group" data-history-range-type="readingHistory">
      <button type="button" class="analysis-preset-button" data-history-preset="previousYear" aria-label="Previous year">&lt;</button>
      <button type="button" class="analysis-preset-button" data-history-preset="year">This year</button>
      <button type="button" class="analysis-preset-button" data-history-preset="all">All</button>
      <button type="button" class="analysis-preset-button" data-history-preset="nextYear" aria-label="Next year">&gt;</button>
    </span>`;
}

function getActiveAnalysisPreset(rangeType) {
  const [startKey, endKey] = analysisFilterPairs[rangeType] || [];
  if (!startKey || !endKey) return '';

  const bounds = getAnalysisBounds(rangeType);
  const start = analysisFilters[startKey];
  const end = analysisFilters[endKey];
  if (start === bounds.yearStart && end === bounds.yearEnd) return 'year';
  if (start === bounds.allStart && end === bounds.allEnd) return 'all';
  return '';
}

function renderEmptyAnalysisChart(message) {
  return `<div class="analysis-chart"><p class="analysis-empty">${message}</p></div>`;
}

function renderAnalysisTable({ title, headers, rows, controls = '', tableClass = '', expanded = false, emptyMessage = 'No data in this range.' }) {
  const tableId = `analysis-table-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const toggleLabel = expanded ? 'Collapse' : 'Show all';
  if (!rows.length) return `<section class="analysis-section"><div class="analysis-section-header"><h4>${title}</h4>${controls}</div><p class="analysis-empty">${emptyMessage}</p></section>`;
  return `
    <section class="analysis-section analysis-table-section">
      <div class="analysis-section-header">
        <h4>${title}</h4>
        <div class="analysis-table-header-controls">
          ${controls}
          <button type="button" class="analysis-table-toggle" data-table-target="${tableId}" aria-expanded="${expanded}">${toggleLabel}</button>
        </div>
      </div>
      <div id="${tableId}" class="analysis-table-wrap ${tableClass} ${rows.length > 12 ? 'table-has-many-rows' : ''} ${expanded ? '' : 'table-is-collapsed'}">
        <table class="analysis-table">
          <thead><tr>${headers.map((header) => `<th scope="col">${header}</th>`).join('')}</tr></thead>
          <tbody>${rows.map((row) => {
            const cells = Array.isArray(row) ? row : row.cells;
            const rowClass = Array.isArray(row) ? '' : (row.className || '');
            return `<tr class="${rowClass}">${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`;
          }).join('')}</tbody>
        </table>
      </div>
    </section>`;
}

function renderTrendChart({ items, xAxisLabel, yAxisLabel, itemLabel, pointLabel, pointLabelRenderer, tooltipLabel, ariaLabel }) {
  if (!items.length) return renderEmptyAnalysisChart('No data in this range.');

  const pointGap = 82;
  const shouldFit = items.length <= 12;
  const svgWidth = shouldFit ? 720 : Math.max(720, items.length * pointGap + 104);
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
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = `${currentYear}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
  const currentKey = xAxisLabel === 'Month' ? currentMonth : currentYear;
  const defaultPoint = [...points].reverse().find((point) => point.key <= currentKey) || points[points.length - 1];

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
    .map((point) => {
      const valueLabel = pointLabel ? pointLabel(point) : point.readDays;
      const labelNode = pointLabelRenderer
        ? pointLabelRenderer(point)
        : `<text x="${point.x}" y="${point.y - 10}" text-anchor="middle" font-size="11" fill="#184d3d">${valueLabel}</text>`;
      const tooltip = tooltipLabel ? tooltipLabel(point) : `${itemLabel(point)}\n${yAxisLabel}: ${point.readDays}`;
      return `
      <g class="chart-tooltip-target" data-tooltip="${escapeAttr(tooltip)}">
        <circle cx="${point.x}" cy="${point.y}" r="10" fill="transparent" />
        <circle cx="${point.x}" cy="${point.y}" r="5" fill="#10a57b" />
      </g>
      ${labelNode}
    `;
    })
    .join('');

  return `
    <div class="analysis-chart ${shouldFit ? '' : 'trend-scroll-chart'}" ${shouldFit ? '' : `data-default-x="${defaultPoint ? defaultPoint.x : padding}"`}>
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" ${shouldFit ? '' : `style="width: ${svgWidth}px; max-width: none;"`} aria-label="${ariaLabel}">
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
    const tooltip = `${item.key}\n${yAxisLabel}: ${item.readDays}`;
    return `
      <rect class="chart-tooltip-target" data-tooltip="${escapeAttr(tooltip)}" x="${x}" y="${y}" width="${barWidth}" height="${Math.max(height, 2)}" rx="8" fill="#10a57b" />
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

function renderWeeklyCompletionChart(data, startIso, endIso) {
  const items = buildWeeklyCompletionTrend(data, startIso, endIso);
  if (!items.length) return renderEmptyAnalysisChart('No data in this range.');

  const svgWidth = Math.max(760, items.length * 42 + 104);
  const svgHeight = 320;
  const padding = 50;
  const bottomPadding = 80;
  const innerWidth = svgWidth - padding * 2;
  const innerHeight = svgHeight - padding - bottomPadding;
  const xStep = items.length > 1 ? innerWidth / (items.length - 1) : innerWidth;

  const points = items.map((item, index) => {
    const x = items.length > 1 ? padding + index * xStep : padding + innerWidth / 2;
    const y = padding + innerHeight - (item.rate / 100) * innerHeight;
    return { ...item, x, y };
  });
  const todayIso = formatDateISO(new Date());
  const defaultPoint = [...points].reverse().find((point) => {
    const [start, end] = point.dateRange.split(' to ');
    return start <= todayIso && todayIso <= end;
  }) || points[points.length - 1];

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const monthGroups = [];
  points.forEach((point, index) => {
    const previous = monthGroups[monthGroups.length - 1];
    if (!previous || previous.key !== point.month) {
      monthGroups.push({ key: point.month, startIndex: index, endIndex: index });
    } else {
      previous.endIndex = index;
    }
  });

  monthGroups.forEach((group) => {
    points.slice(group.startIndex, group.endIndex + 1).forEach((point, offset) => {
      const weekNumber = offset + 1;
      const month = group.key.slice(5);
      point.label = `${month} W${weekNumber}`;
      point.titleLabel = `${group.key} week ${weekNumber}`;
    });
  });

  const monthBands = monthGroups.map((group, index) => {
    const groupStart = points[group.startIndex];
    const groupEnd = points[group.endIndex];
    const beforeX = group.startIndex === 0
      ? padding
      : (points[group.startIndex - 1].x + groupStart.x) / 2;
    const afterX = group.endIndex === points.length - 1
      ? padding + innerWidth
      : (groupEnd.x + points[group.endIndex + 1].x) / 2;
    const labelX = beforeX + (afterX - beforeX) / 2;
    const fill = index % 2 === 0 ? '#f4faf6' : '#ffffff';
    const separator = index === 0
      ? ''
      : `<line x1="${beforeX}" y1="${padding}" x2="${beforeX}" y2="${padding + innerHeight}" stroke="#10a57b" stroke-width="1.5" stroke-dasharray="4 5" opacity="0.55" />`;
    return `
      <rect x="${beforeX}" y="${padding}" width="${afterX - beforeX}" height="${innerHeight}" fill="${fill}" />
      ${separator}
      <text x="${labelX}" y="${svgHeight - 22}" text-anchor="middle" font-size="13" font-weight="800" fill="#1a3d34">${group.key}</text>`;
  }).join('');

  const gridLines = [100, 75, 50, 25, 0].map((value) => {
    const y = padding + innerHeight - (value / 100) * innerHeight;
    const gridLine = value === 0
      ? ''
      : `<line x1="${padding}" y1="${y}" x2="${padding + innerWidth}" y2="${y}" stroke="#d7e4de" stroke-width="1" />`;
    return `
      <g>
        ${gridLine}
        <text x="${padding - 10}" y="${y + 4}" text-anchor="end" font-size="11" fill="#5f746d">${value}%</text>
      </g>`;
  }).join('');

  const labelEvery = Math.max(1, Math.ceil(items.length / 12));
  const xLabels = points.map((point, index) => {
    if (index % labelEvery !== 0 && index !== points.length - 1) return '';
    return `<text x="${point.x}" y="${svgHeight - 54}" text-anchor="middle" font-size="11" fill="#5f746d">${point.label}</text>`;
  }).join('');

  const pointNodes = points.map((point, index) => {
    const label = point.rate > 0 || index === points.length - 1
      ? `<text x="${point.x}" y="${point.y - 20}" text-anchor="middle" font-size="11" fill="#184d3d">
          <tspan x="${point.x}">${point.rate}%</tspan>
          <tspan x="${point.x}" dy="12">${point.readDays}/${point.totalDays}</tspan>
        </text>`
      : '';
    return `
      <g class="chart-tooltip-target" data-tooltip="${escapeAttr(`${point.titleLabel}\n${point.dateRange}\nCompletion: ${point.rate}%\nRead days: ${point.readDays}/${point.totalDays}`)}">
        <circle cx="${point.x}" cy="${point.y}" r="10" fill="transparent" />
        <circle cx="${point.x}" cy="${point.y}" r="5" fill="#10a57b" />
      </g>
      ${label}`;
  }).join('');

  return `
      <div class="analysis-chart weekly-completion-chart" data-default-x="${defaultPoint ? defaultPoint.x : padding}">
        <svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width: ${svgWidth}px; max-width: none;" aria-label="Weekly completion trend">
          ${monthBands}
          <path d="M ${padding + 0.5} ${padding + 0.5} V ${padding + innerHeight + 0.5} H ${padding + innerWidth + 0.5}" fill="none" stroke="#203c31" stroke-width="1" shape-rendering="crispEdges" />
          ${gridLines}
          <path d="${linePath}" fill="none" stroke="#10a57b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          ${pointNodes}
          ${xLabels}
          <text x="${padding + innerWidth / 2}" y="${svgHeight - 4}" text-anchor="middle" font-size="12" fill="#5f746d">Month</text>
          <text x="12" y="${padding + innerHeight / 2}" text-anchor="middle" font-size="12" fill="#5f746d" transform="rotate(-90 12,${padding + innerHeight / 2})">Completion</text>
        </svg>
      </div>`;
}

function scrollChartToDefault(container) {
  if (!container) return;
  requestAnimationFrame(() => {
    const defaultX = Number(container.dataset.defaultX || 0);
    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
    container.scrollLeft = Math.max(0, Math.min(maxScrollLeft, defaultX - container.clientWidth / 2));
  });
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
  const weeklyTrendData = buildWeeklyCompletionTrend(data, analysisFilters.weeklyTrendStart, analysisFilters.weeklyTrendEnd);
  const weekdayData = buildWeekdayAnalysis(filterCheckinsByDateRange(data, analysisFilters.weeklyTrendStart, analysisFilters.weeklyTrendEnd));
  const monthYears = [...new Set(filteredMonths.map((item) => item.key.slice(0, 4)))].sort();
  const monthlyTrendControls = `
    <div class="analysis-date-controls">
      ${renderAnalysisPresets('monthly')}
      <button type="button" class="analysis-picker-button" data-picker-type="month" data-filter-key="monthlyStart" aria-label="Monthly start month">${analysisFilters.monthlyStart}</button>
      <span>to</span>
      <button type="button" class="analysis-picker-button" data-picker-type="month" data-filter-key="monthlyEnd" aria-label="Monthly end month">${analysisFilters.monthlyEnd}</button>
    </div>`;
  const weeklyTrendControls = `
    <div class="analysis-date-controls">
      ${renderAnalysisPresets('weeklyTrend')}
      <button type="button" class="analysis-picker-button" data-picker-type="date" data-filter-key="weeklyTrendStart" aria-label="Weekly start date">${analysisFilters.weeklyTrendStart}</button>
      <span>to</span>
      <button type="button" class="analysis-picker-button" data-picker-type="date" data-filter-key="weeklyTrendEnd" aria-label="Weekly end date">${analysisFilters.weeklyTrendEnd}</button>
    </div>`;
  const monthlyTable = renderAnalysisTable({
    title: 'Monthly Reading Trend',
    controls: monthlyTrendControls,
    tableClass: 'monthly-analysis-table',
    headers: ['Month', 'Read days', 'Total days', 'Completion'],
    rows: [...filteredMonths].reverse().map((item) => ({
      className: `analysis-year-${monthYears.indexOf(item.key.slice(0, 4)) % 6}`,
      cells: [item.key, item.readDays, item.totalDays, `${item.rate}%`],
    })),
  });
  const weeklyTable = renderAnalysisTable({
    title: 'Weekly Reading Trend',
    controls: weeklyTrendControls,
    headers: ['Week', 'Start date', 'End date', 'Read days', 'Total days', 'Completion'],
    rows: [...weeklyTrendData].reverse().map((item) => {
      const [startDate, endDate] = item.dateRange.split(' to ');
      return [item.titleLabel, startDate, endDate, item.readDays, item.totalDays, `${item.rate}%`];
    }),
  });

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
        pointLabelRenderer: (item) => `
          <text x="${item.x}" y="${item.y - 26}" text-anchor="middle">
            <tspan x="${item.x}" font-size="13" font-weight="800" fill="#184d3d">${item.readDays}</tspan>
            <tspan x="${item.x}" dy="17" font-size="10" font-weight="700" fill="#5f746d">${item.rate}%</tspan>
          </text>`,
        tooltipLabel: (item) => `${item.key}\nRead days: ${item.readDays}/${item.totalDays}\nCompletion: ${item.rate}%`,
        ariaLabel: 'Yearly Reading Trend chart',
      }),
    }) : '',
    visibleMonths.length ? renderAnalysisSection({
      title: 'Monthly Reading Trend',
      controls: `
        ${renderAnalysisPresets('monthly')}
        <button type="button" class="analysis-picker-button" data-picker-type="month" data-filter-key="monthlyStart" aria-label="Monthly start month">${analysisFilters.monthlyStart}</button>
        <span>to</span>
        <button type="button" class="analysis-picker-button" data-picker-type="month" data-filter-key="monthlyEnd" aria-label="Monthly end month">${analysisFilters.monthlyEnd}</button>
      `,
      chart: renderTrendChart({
        items: filteredMonths,
        xAxisLabel: 'Month',
        yAxisLabel: 'Read days',
        itemLabel: (item) => item.key,
        pointLabelRenderer: (item) => `
          <text x="${item.x}" y="${item.y - 26}" text-anchor="middle">
            <tspan x="${item.x}" font-size="13" font-weight="800" fill="#184d3d">${item.readDays}</tspan>
            <tspan x="${item.x}" dy="17" font-size="10" font-weight="700" fill="#5f746d">${item.rate}%</tspan>
          </text>`,
        tooltipLabel: (item) => `${item.key}\nRead days: ${item.readDays}/${item.totalDays}\nCompletion: ${item.rate}%`,
        ariaLabel: 'Monthly Reading Trend chart',
      }),
    }) : '',
    renderAnalysisSection({
      title: 'Weekly Completion Trend',
      controls: `
        ${renderAnalysisPresets('weeklyCompletion')}
        <button type="button" class="analysis-picker-button" data-picker-type="date" data-filter-key="weeklyCompletionStart" aria-label="Weekly completion start date">${analysisFilters.weeklyCompletionStart}</button>
        <span>to</span>
        <button type="button" class="analysis-picker-button" data-picker-type="date" data-filter-key="weeklyCompletionEnd" aria-label="Weekly completion end date">${analysisFilters.weeklyCompletionEnd}</button>
      `,
      chart: renderWeeklyCompletionChart(data, analysisFilters.weeklyCompletionStart, analysisFilters.weeklyCompletionEnd),
    }),
    renderAnalysisSection({
      title: 'Reading by Weekday',
      controls: weeklyTrendControls,
      chart: renderBarChart({
        items: weekdayData,
        xAxisLabel: 'Weekday',
        yAxisLabel: 'Read days',
        ariaLabel: 'Reading by weekday chart',
      }),
    }),
    monthlyTable,
    weeklyTable,
  ].join('');

  attachAnalysisFilterHandlers();
  analysisPanel.querySelectorAll('.analysis-chart[data-default-x]').forEach(scrollChartToDefault);
}

function attachAnalysisFilterHandlers() {
  document.querySelectorAll('[data-filter-key]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openAnalysisPicker(button);
    });
  });
  document.querySelectorAll('[data-range-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      applyAnalysisPreset(button.closest('[data-range-type]').dataset.rangeType, button.dataset.rangePreset);
    });
  });
  document.querySelectorAll('[data-table-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const table = document.getElementById(button.dataset.tableTarget);
      if (!table) return;
      const isCurrentlyCollapsed = table.classList.contains('table-is-collapsed');
      const shouldExpand = isCurrentlyCollapsed;
      table.classList.toggle('table-is-expanded', shouldExpand);
      table.classList.toggle('table-is-collapsed', !shouldExpand);
      button.setAttribute('aria-expanded', shouldExpand.toString());
      button.textContent = shouldExpand ? 'Collapse' : 'Show all';
    });
  });
}

function attachReadingHistoryFilterHandlers() {
  document.querySelectorAll('[data-history-preset]').forEach((button) => {
    button.addEventListener('click', () => applyReadingHistoryPreset(button.dataset.historyPreset));
  });
  document.querySelectorAll('[data-history-filter-key]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openAnalysisPicker(button);
    });
  });
}

function getAnalysisBounds(rangeType) {
  const currentYear = new Date().getFullYear().toString();
  if (rangeType === 'yearly') {
    const years = buildYearlyAnalysis(currentData);
    return {
      allStart: years[0]?.key || currentYear,
      allEnd: years[years.length - 1]?.key || currentYear,
      yearStart: currentYear,
      yearEnd: currentYear,
    };
  }

  const months = buildMonthlyAnalysis(currentData);
  if (rangeType === 'monthly') {
    const currentMonth = `${currentYear}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
    return {
      allStart: months[0]?.key || currentMonth,
      allEnd: months[months.length - 1]?.key || currentMonth,
      yearStart: `${currentYear}-01`,
      yearEnd: currentMonth,
    };
  }

  const checkins = [...(currentData.checkins || [])].sort();
  const today = formatDateISO(new Date());
  return {
    allStart: checkins[0] || today,
    allEnd: checkins[checkins.length - 1] || today,
    yearStart: `${currentYear}-01-01`,
    yearEnd: today,
  };
}

function applyAnalysisPreset(rangeType, preset) {
  const [startKey, endKey] = analysisFilterPairs[rangeType] || [];
  if (!startKey || !endKey) return;

  const bounds = getAnalysisBounds(rangeType);
  if (preset === 'all') {
    analysisFilters[startKey] = bounds.allStart;
    analysisFilters[endKey] = bounds.allEnd;
  } else if (preset === 'previousYear' || preset === 'nextYear') {
    const currentYear = new Date().getFullYear();
    const currentStart = Number((analysisFilters[startKey] || currentYear.toString()).slice(0, 4)) || currentYear;
    const nextYear = Math.min(currentYear, currentStart + (preset === 'nextYear' ? 1 : -1));
    setAnalysisYearRange(rangeType, nextYear);
  } else {
    analysisFilters[startKey] = bounds.yearStart;
    analysisFilters[endKey] = bounds.yearEnd;
  }
  renderMonthlyAnalysis(currentData);
}

function setAnalysisYearRange(rangeType, year) {
  const [startKey, endKey] = analysisFilterPairs[rangeType] || [];
  if (!startKey || !endKey) return;

  const currentYear = new Date().getFullYear();
  const boundedYear = Math.min(currentYear, year);
  if (rangeType === 'yearly') {
    analysisFilters[startKey] = boundedYear.toString();
    analysisFilters[endKey] = boundedYear.toString();
  } else if (rangeType === 'monthly') {
    const endMonth = boundedYear === currentYear
      ? (new Date().getMonth() + 1).toString().padStart(2, '0')
      : '12';
    analysisFilters[startKey] = `${boundedYear}-01`;
    analysisFilters[endKey] = `${boundedYear}-${endMonth}`;
  } else {
    const today = formatDateISO(new Date());
    analysisFilters[startKey] = `${boundedYear}-01-01`;
    analysisFilters[endKey] = boundedYear === currentYear ? today : `${boundedYear}-12-31`;
  }
}

function openAnalysisPicker(targetButton) {
  const targetKey = targetButton.dataset.filterKey;
  const pickerType = targetButton.dataset.pickerType;
  const filterStore = targetButton.dataset.historyFilterKey ? readingHistoryFilters : analysisFilters;
  const storeKey = targetButton.dataset.historyFilterKey || targetKey;
  const currentValue = filterStore[storeKey] || new Date().toISOString().slice(0, pickerType === 'date' ? 10 : 7);
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

  attachOpenPickerControls(picker, storeKey, pickerType, filterStore, targetButton.dataset.historyFilterKey ? renderReadingHistory : () => renderMonthlyAnalysis(currentData));
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

function confirmAnalysisPicker(picker, targetKey, pickerType, filterStore = analysisFilters, onConfirm = () => renderMonthlyAnalysis(currentData)) {
  const input = picker.querySelector('[data-picker-input]');
  const nextValue = normalizePickerValue(input.value, pickerType);
  if (!nextValue) {
    input.classList.add('invalid');
    input.focus();
    return;
  }
  filterStore[targetKey] = nextValue;
  picker.remove();
  onConfirm();
}

function attachOpenPickerControls(picker, targetKey, pickerType, filterStore = analysisFilters, onConfirm = () => renderMonthlyAnalysis(currentData)) {
  picker.querySelectorAll('[data-year-step]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const baseYear = Number(picker.dataset.year);
      picker.dataset.year = (baseYear + Number(button.dataset.yearStep)).toString();
      picker.innerHTML = buildAnalysisPickerContent(pickerType, picker.dataset.pendingValue, Number(picker.dataset.year));
      attachOpenPickerControls(picker, targetKey, pickerType, filterStore, onConfirm);
    });
  });
  picker.querySelectorAll('[data-month-step]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const pending = picker.dataset.pendingValue || filterStore[targetKey] || new Date().toISOString().slice(0, 10);
      const [year, month] = pending.split('-').map(Number);
      const nextDate = new Date(year, month - 1 + Number(button.dataset.monthStep), 1);
      const nextValue = `${nextDate.getFullYear()}-${(nextDate.getMonth() + 1).toString().padStart(2, '0')}-01`;
      picker.dataset.pendingValue = nextValue;
      picker.dataset.year = nextDate.getFullYear().toString();
      picker.innerHTML = buildAnalysisPickerContent(pickerType, nextValue);
      attachOpenPickerControls(picker, targetKey, pickerType, filterStore, onConfirm);
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
      confirmAnalysisPicker(picker, targetKey, pickerType, filterStore, onConfirm);
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
    confirmAnalysisPicker(picker, targetKey, pickerType, filterStore, onConfirm);
  });
  picker.dataset.year = (picker.dataset.year || (filterStore[targetKey] || '').slice(0, 4) || new Date().getFullYear()).toString();
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

document.addEventListener('click', (event) => {
  const backdrop = document.querySelector('.export-picker-backdrop');
  if (!backdrop) return;
  if (event.target === backdrop) {
    backdrop.remove();
  }
});

document.addEventListener('pointerover', (event) => {
  const target = event.target.closest('[data-tooltip]');
  if (!target) return;
  showChartTooltip(event, target);
});

document.addEventListener('pointermove', (event) => {
  const tooltip = document.querySelector('.chart-tooltip.visible');
  if (!tooltip) return;
  positionChartTooltip(event, tooltip);
});

document.addEventListener('pointerout', (event) => {
  const target = event.target.closest('[data-tooltip]');
  if (!target) return;
  const nextTarget = event.relatedTarget && event.relatedTarget.closest
    ? event.relatedTarget.closest('[data-tooltip]')
    : null;
  if (nextTarget !== target) hideChartTooltip();
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
  if (summaryAvgCompletion) {
    summaryAvgCompletion.textContent = `${getAverageCompletionForView(view, currentData)}%`;
  }

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
    const elapsedDays = days.filter((day) => !isFutureDate(day.iso));
    const readCount = elapsedDays.filter((day) => day.read).length;
    const completion = elapsedDays.length ? Math.round((readCount / elapsedDays.length) * 100) : 0;
    const readLabel = readCount === 1 ? '1 read' : `${readCount} reads`;
    const completionLabel = `${completion}% · ${readCount}/${elapsedDays.length}`;
    return `\n      <div class="month-row">\n        <div class="month-label">\n          <span>${monthNames[mi]}</span>\n          <small>${readLabel}</small>\n          <small>${completionLabel}</small>\n        </div>\n        <div class="month-days">${days.map(d => `\n          <div class="grid-day ${d.read ? 'grid-read' : 'grid-empty'}" data-iso="${d.iso}" title="${d.label}">\n            <div class="grid-day-number">${d.day}</div>\n          </div>`).join('')}\n        </div>\n      </div>`;
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
  renderBookTimelineChart(readings);
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
      <g class="chart-tooltip-target" data-tooltip="${escapeAttr(`${point.year}\nBooks: ${point.value}`)}">
        <circle cx="${point.x}" cy="${point.y}" r="10" fill="transparent" />
        <circle cx="${point.x}" cy="${point.y}" r="5" fill="#10a57b" />
      </g>
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

function renderBookTimelineChart(readings) {
  if (!bookTimelineChart) return;
  const colors = ['#10a57b', '#f59e0b', '#8b5cf6', '#0ea5e9', '#f43f5e', '#84cc16'];
  const items = (readings || [])
    .map((item) => {
      const startValue = item.startDate || '';
      const endValue = item.date || '';
      const start = startValue ? new Date(`${startValue}T00:00:00`) : null;
      const end = endValue ? new Date(`${endValue}T00:00:00`) : null;
      return {
        title: item.title || 'Untitled book',
        startValue,
        endValue,
        hasExplicitStart: Boolean(startValue),
        start: start && !Number.isNaN(start.getTime()) ? start : null,
        end: end && !Number.isNaN(end.getTime()) ? end : null,
      };
    })
    .filter((item) => item.start || item.end)
    .sort((a, b) => {
      const aTime = (a.start || a.end).getTime();
      const bTime = (b.start || b.end).getTime();
      return aTime - bTime;
    });

  if (!items.length) {
    bookTimelineChart.innerHTML = '<div class="empty-chart">Add start and finish dates to see book timelines.</div>';
    return;
  }

  const allDates = items.flatMap((item) => [item.start, item.end].filter(Boolean));
  let minTime = Math.min(...allDates.map((dt) => dt.getTime()));
  let maxTime = Math.max(...allDates.map((dt) => dt.getTime()));
  if (minTime === maxTime) {
    minTime -= 86400000;
    maxTime += 86400000;
  }
  const paddingMs = Math.max((maxTime - minTime) * 0.08, 86400000);
  minTime -= paddingMs;
  maxTime += paddingMs;

  const daySpan = Math.max(1, Math.round((maxTime - minTime) / 86400000));
  const halfYearWidth = 1320;
  const pixelsPerDay = halfYearWidth / 183;
  const svgWidth = Math.max(1320, Math.min(9000, Math.round(daySpan * pixelsPerDay)));
  const leftPadding = 96;
  const rightPadding = 96;
  const axisY = 56;
  const laneTop = 116;
  const laneGap = 98;
  const cardWidth = 360;
  const cardHeight = 76;
  const innerWidth = svgWidth - leftPadding - rightPadding;
  const xForDate = (date) => leftPadding + ((date.getTime() - minTime) / (maxTime - minTime)) * innerWidth;
  const lanes = [];
  const axisOffsets = [-16, -8, 0, 8, 16];

  const positioned = items.map((item, index) => {
    const startDate = item.start || item.end;
    const endDate = item.end || item.start;
    const startX = xForDate(startDate);
    const endX = xForDate(endDate);
    const rangeStart = Math.min(startX, endX);
    const rangeEnd = Math.max(startX, endX);
    const midpoint = rangeStart + Math.max(rangeEnd - rangeStart, 8) / 2;
    const labelStart = midpoint - cardWidth / 2;
    const labelEnd = midpoint + cardWidth / 2;
    let lane = lanes.findIndex((laneEnd) => labelStart > laneEnd + 28);
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(labelEnd);
    } else {
      lanes[lane] = labelEnd;
    }
    return {
      ...item,
      color: colors[index % colors.length],
      lane,
      axisOffset: axisOffsets[index % axisOffsets.length],
      startX,
      endX,
      rangeStart,
      rangeEnd,
      midpoint,
    };
  });

  const svgHeight = Math.max(350, laneTop + lanes.length * laneGap + 28);
  const firstTickDate = new Date(minTime);
  firstTickDate.setDate(1);
  firstTickDate.setHours(0, 0, 0, 0);
  const monthTicks = [];
  for (
    let date = new Date(firstTickDate);
    date.getTime() <= maxTime;
    date = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  ) {
    if (date.getTime() >= minTime) monthTicks.push(new Date(date));
  }
  const ticks = monthTicks.map((date) => {
    const x = xForDate(date);
    return `
      <line x1="${x}" y1="${axisY - 20}" x2="${x}" y2="${svgHeight - 22}" stroke="#d7e4de" stroke-width="1.2" stroke-dasharray="5 5" />
      <text x="${x}" y="${axisY - 30}" text-anchor="middle" font-size="17" font-weight="700" fill="#1a3d34">${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}</text>
    `;
  }).join('');

  const nodes = positioned.map((item) => {
    const readingPeriod = item.hasExplicitStart ? getInclusiveReadingDays(item.startValue, item.endValue) : '';
    const dateLabel = item.hasExplicitStart
      ? `${item.startValue} to ${item.endValue}`
      : `Finished ${item.endValue}`;
    const laneY = laneTop + item.lane * laneGap;
    const barWidth = Math.max(item.rangeEnd - item.rangeStart, 18);
    const cardX = Math.max(leftPadding, Math.min(item.midpoint - cardWidth / 2, svgWidth - rightPadding - cardWidth));
    const title = escapeHtml(item.title.length > 40 ? `${item.title.slice(0, 39)}...` : item.title);
    const dateText = escapeHtml(item.hasExplicitStart ? `${item.startValue} - ${item.endValue}` : `End ${item.endValue}`);
    const period = escapeHtml(readingPeriod);
    const hasRange = item.start && item.end && item.startValue !== item.endValue;
    const itemAxisY = axisY + 12 + item.axisOffset;
    const periodText = period
      ? `<text x="${cardX + cardWidth / 2}" y="${laneY + 62}" text-anchor="middle" font-size="11" fill="#61756d">${period}</text>`
      : '';
    const tooltip = `${item.title}\n${dateLabel}${readingPeriod ? `\n${readingPeriod}` : ''}`;
    return `
      <g class="chart-tooltip-target" data-tooltip="${escapeAttr(tooltip)}">
        <path d="M ${item.midpoint} ${itemAxisY} C ${item.midpoint} ${axisY + 30}, ${item.midpoint} ${laneY - 18}, ${item.midpoint} ${laneY + 1}" fill="none" stroke="${item.color}" stroke-width="3" opacity="0.85" />
        ${hasRange
          ? `<line x1="${item.rangeStart}" y1="${itemAxisY}" x2="${item.rangeEnd}" y2="${itemAxisY}" stroke="${item.color}" stroke-width="8" stroke-linecap="round" />`
          : `<rect x="${item.midpoint - 8}" y="${itemAxisY - 8}" width="16" height="16" transform="rotate(45 ${item.midpoint} ${itemAxisY})" fill="${item.color}" />`}
        <rect x="${cardX}" y="${laneY}" width="${cardWidth}" height="${cardHeight}" rx="14" fill="#ffffff" stroke="${item.color}" stroke-width="3" />
        <text x="${cardX + cardWidth / 2}" y="${laneY + 25}" text-anchor="middle" font-size="15" font-weight="700" fill="#112527">${title}</text>
        <text x="${cardX + cardWidth / 2}" y="${laneY + 45}" text-anchor="middle" font-size="11" fill="#61756d">${dateText}</text>
        ${periodText}
      </g>
    `;
  }).join('');

  bookTimelineChart.innerHTML = `
    <svg class="interval-timeline" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" style="width: ${svgWidth}px; height: ${svgHeight}px; max-width: none;" aria-label="Book interval timeline chart">
      ${ticks}
      <line x1="${leftPadding}" y1="${axisY + 12}" x2="${svgWidth - rightPadding}" y2="${axisY + 12}" stroke="#203c31" stroke-width="2" />
      ${nodes}
    </svg>`;

  requestAnimationFrame(() => {
    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() - 3);
    defaultDate.setHours(0, 0, 0, 0);
    const boundedDefaultDate = new Date(Math.max(minTime, Math.min(maxTime, defaultDate.getTime())));
    const targetX = xForDate(boundedDefaultDate);
    const maxScrollLeft = Math.max(0, bookTimelineChart.scrollWidth - bookTimelineChart.clientWidth);
    bookTimelineChart.scrollLeft = Math.max(0, Math.min(maxScrollLeft, targetX - bookTimelineChart.clientWidth / 2));
  });
}

function getReadingHistoryBounds() {
  const dates = (currentData.readings || []).map((item) => item.date).filter(Boolean).sort();
  const today = formatDateISO(new Date());
  return {
    allStart: dates[0] || today,
    allEnd: dates[dates.length - 1] || today,
    yearStart: `${new Date().getFullYear()}-01-01`,
    yearEnd: today,
  };
}

function setReadingHistoryDefaults() {
  const bounds = getReadingHistoryBounds();
  if (!readingHistoryFilters.start) readingHistoryFilters.start = bounds.allStart;
  if (!readingHistoryFilters.end) readingHistoryFilters.end = bounds.allEnd;
  const startButton = document.querySelector('[data-history-filter-key="start"]');
  const endButton = document.querySelector('[data-history-filter-key="end"]');
  if (startButton) startButton.textContent = readingHistoryFilters.start;
  if (endButton) endButton.textContent = readingHistoryFilters.end;
}

function applyReadingHistoryPreset(preset) {
  const bounds = getReadingHistoryBounds();
  if (preset === 'all') {
    readingHistoryFilters.start = bounds.allStart;
    readingHistoryFilters.end = bounds.allEnd;
  } else if (preset === 'previousYear' || preset === 'nextYear') {
    const currentYear = new Date().getFullYear();
    const currentStart = Number((readingHistoryFilters.start || currentYear.toString()).slice(0, 4)) || currentYear;
    const nextYear = Math.min(currentYear, currentStart + (preset === 'nextYear' ? 1 : -1));
    readingHistoryFilters.start = `${nextYear}-01-01`;
    readingHistoryFilters.end = nextYear === currentYear ? bounds.yearEnd : `${nextYear}-12-31`;
  } else {
    readingHistoryFilters.start = bounds.yearStart;
    readingHistoryFilters.end = bounds.yearEnd;
  }
  renderReadings(currentData.readings || []);
}

function getFilteredReadingHistory(readings) {
  const { start, end } = readingHistoryFilters;
  return (readings || []).filter((item) => {
    if (start && item.date < start) return false;
    if (end && item.date > end) return false;
    return true;
  });
}

function renderReadings(readings) {
  setReadingHistoryDefaults();
  const filteredReadings = getFilteredReadingHistory(readings);
  readingList.innerHTML = '';
  if (filteredReadings.length === 0) {
    readingList.innerHTML = '<li class="reading-item">No reading records yet.</li>';
    return;
  }

  const sortedReadings = [...filteredReadings].sort((a, b) => b.date.localeCompare(a.date));

  sortedReadings.forEach((item) => {
    const listItem = document.createElement('li');
    listItem.className = 'reading-item';
    const readingPeriod = getInclusiveReadingDays(item.startDate, item.date);
    listItem.innerHTML = `
      <h3>${item.title}</h3>
      <div class="reading-meta">
        <div class="reading-meta-group reading-meta-primary">
          <span>Finished: ${formatDate(item.date)}</span>
          <span>Duration: ${item.duration || 'No duration'}</span>
        </div>
        <div class="reading-meta-group">
          <span>Started: ${item.startDate ? formatDate(item.startDate) : 'No start date'}</span>
          <span>Reading period: ${readingPeriod || 'Not calculated'}</span>
        </div>
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
  saveReadingButton.textContent = 'Save changes';
  cancelEditReading.parentElement.classList.add('editing');
  cancelEditReading.classList.remove('hidden');
  bookTitle.value = item.title;
  const parsed = parseDuration(item.duration || '');
  readingDurationHours.value = parsed.hours;
  readingDurationMinutes.value = parsed.minutes;
  readingStartDate.value = item.startDate || '';
  readingStartDatePicker.value = item.startDate || '';
  readingDate.value = item.date;
  readingDatePicker.value = item.date;
  bookNotes.value = item.notes;
  bookTitle.focus();
}

function resetReadingForm() {
  readingForm.reset();
  readingDurationHours.value = '';
  readingDurationMinutes.value = '';
  readingStartDate.value = '';
  readingStartDatePicker.value = '';
  readingDate.value = '';
  readingDatePicker.value = '';
  bookNotes.value = '';
  editingId = null;
  saveReadingButton.textContent = 'Save reading';
  cancelEditReading.parentElement.classList.remove('editing');
  cancelEditReading.classList.add('hidden');
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

function goToCurrentPeriod() {
  periodPicker.value = getDefaultPeriod(currentView);
  loadStats(currentView);
}

function setPeriodButtonHover(activeButton) {
  periodButtons.forEach((button) => {
    button.classList.toggle('period-button-hover', button === activeButton);
  });
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
      attachReadingHistoryFilterHandlers();
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
  const startDateValue = readingStartDate.value.trim();
  const dateValue = readingDate.value.trim();
  if (!dateValue) {
    alert('Please select a valid date.');
    return;
  }
  if (startDateValue && startDateValue > dateValue) {
    alert('Start date cannot be later than finish date.');
    return;
  }
  const payload = {
    title: bookTitle.value.trim(),
    duration: buildDuration(readingDurationHours.value.trim(), readingDurationMinutes.value.trim()),
    startDate: startDateValue,
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
      resetReadingForm();
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
cancelEditReading.addEventListener('click', resetReadingForm);
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
previousPeriod.addEventListener('click', (event) => {
  event.currentTarget.blur();
  shiftPeriod(-1);
});
nextPeriod.addEventListener('click', (event) => {
  event.currentTarget.blur();
  shiftPeriod(1);
});
currentPeriod.addEventListener('click', (event) => {
  event.currentTarget.blur();
  goToCurrentPeriod();
});
periodButtons.forEach((button) => {
  button.addEventListener('pointerenter', () => setPeriodButtonHover(button));
  button.addEventListener('pointerleave', () => setPeriodButtonHover(null));
});
sizeButtons.forEach((button) => {
  button.addEventListener('click', () => setUiSize(button.dataset.uiSize));
});

window.addEventListener('DOMContentLoaded', () => {
  setUiSize(localStorage.getItem('readingTrackerUiSize') || 'medium');
  setActiveTab('today');
  setActiveViewButton(currentView);
  setPeriodType(currentView);
  loadData();
  registerServiceWorker();
  if (exportDateHistoryBtn) exportDateHistoryBtn.addEventListener('click', (event) => openExportPicker(event, 'dates'));
  if (dataAnalysisBtn) dataAnalysisBtn.addEventListener('click', showDataAnalysis);
  if (exportBookHistoryBtn) exportBookHistoryBtn.addEventListener('click', (event) => openExportPicker(event, 'books'));
  if (exportBookTimelineImageBtn) exportBookTimelineImageBtn.addEventListener('click', (event) => openExportPicker(event, 'timeline'));

  const setupDateField = (textInput, dateInput) => {
    if (!textInput || !dateInput) return;
    const dateField = textInput.closest('.custom-date-field');
    dateInput.addEventListener('change', () => {
      textInput.value = dateInput.value || '';
    });
    const openDatePicker = () => {
      dateInput.focus();
      if (typeof dateInput.showPicker === 'function') {
        dateInput.showPicker();
      } else {
        dateInput.click();
      }
    };
    textInput.addEventListener('click', openDatePicker);
    if (dateField) {
      dateField.addEventListener('click', openDatePicker);
    }
  };

  setupDateField(readingStartDate, readingStartDatePicker);
  setupDateField(readingDate, readingDatePicker);

  datePickerButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const dateInput = document.getElementById(button.dataset.dateTarget);
      if (!dateInput) return;
      dateInput.focus();
      if (typeof dateInput.showPicker === 'function') {
        dateInput.showPicker();
      } else {
        dateInput.click();
      }
    });
  });
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

function exportTimelineSvg(svg, filename, onComplete) {
  if (!svg) {
    alert('No timeline to export.');
    return;
  }

  const width = Number(svg.getAttribute('width')) || Math.ceil(svg.getBoundingClientRect().width);
  const height = Number(svg.getAttribute('height')) || Math.ceil(svg.getBoundingClientRect().height);
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', width);
  clone.setAttribute('height', height);
  clone.setAttribute('viewBox', svg.getAttribute('viewBox') || `0 0 ${width} ${height}`);
  clone.removeAttribute('style');

  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  background.setAttribute('x', '0');
  background.setAttribute('y', '0');
  background.setAttribute('width', width);
  background.setAttribute('height', height);
  background.setAttribute('fill', '#ffffff');
  clone.insertBefore(background, clone.firstChild);

  const svgText = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0);
    URL.revokeObjectURL(url);
    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (onComplete) onComplete();
  };

  image.onerror = () => {
    URL.revokeObjectURL(url);
    alert('Could not export the timeline image.');
    if (onComplete) onComplete();
  };

  image.src = url;
}

function exportBookTimelineImage(options = { mode: 'all' }) {
  fetch('/api/data')
    .then((r) => r.json())
    .then((data) => {
      const readings = filterReadingsByExportOptions(data.readings || [], options, true);
      if (!readings.length) {
        alert('No timeline items to export');
        return;
      }
      const previousTimeline = bookTimelineChart.innerHTML;
      const previousScrollLeft = bookTimelineChart.scrollLeft;
      renderBookTimelineChart(readings);
      requestAnimationFrame(() => {
        const svg = bookTimelineChart ? bookTimelineChart.querySelector('svg') : null;
        exportTimelineSvg(svg, buildExportFilename('book-reading-timeline', options, 'png'), () => {
          bookTimelineChart.innerHTML = previousTimeline;
          bookTimelineChart.scrollLeft = previousScrollLeft;
        });
      });
    });
}

function openExportPicker(event, exportType) {
  event.stopPropagation();
  const existingPicker = document.querySelector('.export-picker-backdrop');
  if (existingPicker) {
    existingPicker.remove();
  }

  const today = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear().toString();
  const titles = {
    dates: ['Download history', 'Choose which daily reading dates to export.'],
    books: ['Export reading history', 'Choose which finished book records to export.'],
    timeline: ['Export timeline image', 'Choose which books to include in the timeline image.'],
  };
  const [title, subtitle] = titles[exportType];
  const backdrop = document.createElement('div');
  backdrop.className = 'export-picker-backdrop';
  backdrop.innerHTML = `
    <div class="export-picker" role="dialog" aria-modal="true" aria-label="${title}">
    <h4>${title}</h4>
    <p class="export-subtitle">${subtitle}</p>
    <fieldset>
      <label class="export-option">
        <span class="export-choice">
          <input type="radio" name="exportMode" value="all" checked />
          <span>All</span>
        </span>
      </label>
      <label class="export-option">
        <span class="export-choice">
          <input type="radio" name="exportMode" value="year" />
          <span>Whole year</span>
        </span>
        <input type="number" data-export-year min="2020" value="${currentYear}" />
      </label>
      <label class="export-option">
        <span class="export-choice">
          <input type="radio" name="exportMode" value="range" />
          <span>Custom range</span>
        </span>
        <span class="export-range">
          <input type="date" data-export-start value="${currentYear}-01-01" />
          <input type="date" data-export-end value="${today}" />
        </span>
      </label>
    </fieldset>
    <div class="export-picker-actions">
      <button type="button" data-export-cancel>Cancel</button>
      <button type="button" data-export-confirm>Export</button>
    </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  const picker = backdrop.querySelector('.export-picker');
  picker.addEventListener('click', (pickerEvent) => pickerEvent.stopPropagation());

  picker.querySelectorAll('[data-export-year], [data-export-start], [data-export-end]').forEach((input) => {
    input.addEventListener('focus', () => {
      const mode = input.hasAttribute('data-export-year') ? 'year' : 'range';
      picker.querySelector(`input[name="exportMode"][value="${mode}"]`).checked = true;
    });
  });
  picker.querySelector('[data-export-cancel]').addEventListener('click', () => backdrop.remove());
  picker.querySelector('[data-export-confirm]').addEventListener('click', () => {
    const mode = picker.querySelector('input[name="exportMode"]:checked').value;
    const year = picker.querySelector('[data-export-year]').value.trim();
    const start = picker.querySelector('[data-export-start]').value;
    const end = picker.querySelector('[data-export-end]').value;
    const options = { mode, year, start, end };
    if (!validateExportOptions(options)) return;
    if (exportType === 'dates') exportDateHistory(options);
    if (exportType === 'books') exportBookHistory(options);
    if (exportType === 'timeline') exportBookTimelineImage(options);
    backdrop.remove();
  });
}

function validateExportOptions(options) {
  if (options.mode === 'year' && !/^\d{4}$/.test(options.year || '')) {
    alert('Please enter a valid year.');
    return false;
  }
  if (options.mode === 'range' && (!options.start || !options.end || options.start > options.end)) {
    alert('Please select a valid date range.');
    return false;
  }
  return true;
}

function buildExportFilename(prefix, options, extension) {
  if (options.mode === 'year') return `${prefix}-${options.year}.${extension}`;
  if (options.mode === 'range') return `${prefix}-${options.start}-to-${options.end}.${extension}`;
  return `${prefix}-all.${extension}`;
}

function filterDatesByExportOptions(dates, options) {
  if (options.mode === 'year') {
    return dates.filter((date) => date.startsWith(`${options.year}-`));
  }
  if (options.mode === 'range') {
    return dates.filter((date) => date >= options.start && date <= options.end);
  }
  return dates;
}

function filterReadingsByExportOptions(readings, options, includeOverlappingRange = false) {
  if (options.mode === 'year') {
    const start = `${options.year}-01-01`;
    const end = `${options.year}-12-31`;
    return includeOverlappingRange
      ? readings.filter((item) => {
          const itemStart = item.startDate || item.date;
          const itemEnd = item.date;
          return itemStart <= end && itemEnd >= start;
        })
      : readings.filter((item) => (item.date || '').startsWith(`${options.year}-`));
  }
  if (options.mode === 'range') {
    return includeOverlappingRange
      ? readings.filter((item) => {
          const itemStart = item.startDate || item.date;
          const itemEnd = item.date;
          return itemStart <= options.end && itemEnd >= options.start;
        })
      : readings.filter((item) => item.date >= options.start && item.date <= options.end);
  }
  return readings;
}

function exportDateHistory(options = { mode: 'all' }) {
  fetch('/api/data')
    .then((r) => r.json())
    .then((data) => {
      const dates = filterDatesByExportOptions(data.checkins || [], options);
      const rows = dates.map((date, index) => ({
        index: index + 1,
        date,
        weekday: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      }));
      const csv = toCSV(rows);
      if (!csv) return alert('No dates to export');
      download(buildExportFilename('reading-dates', options, 'csv'), csv);
    });
}

function exportBookHistory(options = { mode: 'all' }) {
  fetch('/api/data')
    .then((r) => r.json())
    .then((data) => {
      const readings = filterReadingsByExportOptions(data.readings || [], options);
      const rows = readings.map((r) => ({
        id: r.id,
        title: r.title,
        startDate: r.startDate || '',
        date: r.date,
        readingPeriod: getInclusiveReadingDays(r.startDate, r.date),
        duration: r.duration || '',
        notes: r.notes || '',
      }));
      const csv = toCSV(rows);
      if (!csv) return alert('No books to export');
      download(buildExportFilename('reading-books', options, 'csv'), csv);
    });
}
