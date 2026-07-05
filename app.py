from datetime import date, datetime, timedelta
import json
import os

from flask import Flask, jsonify, render_template, request

DATA_FILE = 'data.json'
app = Flask(__name__, static_folder='static', static_url_path='')


def load_data():
    if not os.path.exists(DATA_FILE):
        save_data({'readings': [], 'checkins': []})

    with open(DATA_FILE, 'r', encoding='utf-8') as file:
        return json.load(file)


def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=2)


def get_today_key():
    return date.today().isoformat()


def get_week_start(week_value):
    year, week = week_value.split('-W')
    year = int(year)
    week = int(week)
    jan4 = date(year, 1, 4)
    start = jan4 - timedelta(days=jan4.weekday()) + timedelta(weeks=week - 1)
    return start


def get_week_days(week_value):
    start = get_week_start(week_value)
    return [start + timedelta(days=i) for i in range(7)]


def get_month_days(month_value):
    year, month = map(int, month_value.split('-'))
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1)
    else:
        end = date(year, month + 1, 1)
    days = []
    while start < end:
        days.append(start)
        start += timedelta(days=1)
    return days


def get_year_days(year_value):
    year = int(year_value)
    start = date(year, 1, 1)
    end = date(year + 1, 1, 1)
    days = []
    while start < end:
        days.append(start)
        start += timedelta(days=1)
    return days


def compute_summary(days, checkins):
    read_set = set(checkins)
    total = len(days)
    read_days = sum(1 for day in days if day.isoformat() in read_set)
    rate = round((read_days / total) * 100) if total else 0
    streak = 0
    current = 0
    for day in days:
        if day.isoformat() in read_set:
            current += 1
            streak = max(streak, current)
        else:
            current = 0
    return {'days': read_days, 'rate': rate, 'streak': streak}


def build_day_entries(days, checkins, view):
    read_set = set(checkins)
    entries = []
    for day in days:
        entries.append({
            'day': day.day,
            'iso': day.isoformat(),
            'label': day.strftime('%b %d') if view != 'weekly' else day.strftime('%a'),
            'read': day.isoformat() in read_set,
        })
    return entries


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/data', methods=['GET'])
def get_data():
    return jsonify(load_data())


@app.route('/api/checkin', methods=['POST'])
def toggle_checkin():
    payload = request.get_json(silent=True) or {}
    data = load_data()
    date_key = payload.get('date') or get_today_key()
    if date_key in data['checkins']:
        data['checkins'].remove(date_key)
    else:
        data['checkins'].append(date_key)
    # keep checkins unique and sorted
    data['checkins'] = sorted(set(data['checkins']))
    save_data(data)
    return jsonify(data)


@app.route('/api/reading', methods=['POST'])
def add_or_update_reading():
    payload = request.get_json(force=True)
    if not payload or 'title' not in payload or 'date' not in payload:
        return jsonify({'message': 'Missing title or date'}), 400

    data = load_data()
    if 'id' in payload and payload.get('id') is not None:
        for item in data['readings']:
            if item['id'] == payload['id']:
                item.update({
                    'title': payload['title'].strip(),
                    'duration': payload.get('duration', '').strip(),
                    'date': payload['date'],
                    'notes': payload.get('notes', '').strip(),
                })
                break
    else:
        new_id = int(datetime.now().timestamp() * 1000)
        data['readings'].append({
            'id': new_id,
            'title': payload['title'].strip(),
            'duration': payload.get('duration', '').strip(),
            'date': payload['date'],
            'notes': payload.get('notes', '').strip(),
        })

    save_data(data)
    return jsonify(data)


@app.route('/api/reading/<int:reading_id>', methods=['DELETE'])
def delete_reading(reading_id):
    data = load_data()
    data['readings'] = [item for item in data['readings'] if item['id'] != reading_id]
    save_data(data)
    return jsonify(data)


@app.route('/api/clear-readings', methods=['POST'])
def clear_readings():
    data = load_data()
    data['readings'] = []
    save_data(data)
    return jsonify(data)


@app.route('/api/stats', methods=['GET'])
def get_stats():
    view = request.args.get('view', 'weekly')
    period = request.args.get('period', '')
    data = load_data()
    checkins = sorted(data['checkins'])

    if not period:
        if view == 'weekly':
            period = date.today().strftime('%G-W%V')
        elif view == 'monthly':
            period = date.today().strftime('%Y-%m')
        else:
            period = date.today().strftime('%Y')

    if view == 'weekly':
        try:
            days = get_week_days(period)
        except Exception:
            days = get_week_days(date.today().strftime('%G-W%V'))
    elif view == 'monthly':
        try:
            days = get_month_days(period)
        except Exception:
            days = get_month_days(date.today().strftime('%Y-%m'))
    else:
        try:
            days = get_year_days(period)
        except Exception:
            days = get_year_days(date.today().strftime('%Y'))

    summary = compute_summary(days, checkins)
    entries = build_day_entries(days, checkins, view)
    return jsonify({'view': view, 'period': period, 'summary': summary, 'days': entries})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
