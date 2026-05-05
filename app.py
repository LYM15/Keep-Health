"""
体态健康日记 - Flask应用主文件
"""
import os
from datetime import datetime, date, timedelta

# 获取项目根目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')

# 确保数据目录存在
os.makedirs(DATA_DIR, exist_ok=True)

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SECRET_KEY'] = 'health-diary-secret-key-2024'
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(DATA_DIR, "health_diary.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app)
db = SQLAlchemy(app)


# ==================== 数据模型 ====================

class DailyRecord(db.Model):
    """每日健康记录"""
    __tablename__ = 'daily_records'

    id = db.Column(db.Integer, primary_key=True)
    record_date = db.Column(db.Date, unique=True, nullable=False, default=date.today)

    # 疼痛程度 (0-10)
    neck_pain = db.Column(db.Integer, default=0)
    shoulder_pain = db.Column(db.Integer, default=0)
    waist_pain = db.Column(db.Integer, default=0)
    back_pain = db.Column(db.Integer, default=0)

    # 睡眠
    sleep_hours = db.Column(db.Float, default=0)
    sleep_quality = db.Column(db.Integer, default=3)

    # 运动
    exercise_minutes = db.Column(db.Integer, default=0)

    # 心情
    mood_score = db.Column(db.Integer, default=5)

    # 时间戳
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'record_date': self.record_date.isoformat() if self.record_date else None,
            'neck_pain': self.neck_pain,
            'shoulder_pain': self.shoulder_pain,
            'waist_pain': self.waist_pain,
            'back_pain': self.back_pain,
            'sleep_hours': self.sleep_hours,
            'sleep_quality': self.sleep_quality,
            'exercise_minutes': self.exercise_minutes,
            'mood_score': self.mood_score,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def get_avg_pain(self):
        pains = [self.neck_pain, self.shoulder_pain, self.waist_pain, self.back_pain]
        return round(sum(pains) / len(pains), 1) if pains else 0


class Symptom(db.Model):
    """症状记录"""
    __tablename__ = 'symptoms'

    id = db.Column(db.Integer, primary_key=True)
    record_date = db.Column(db.Date, nullable=False, default=date.today)
    body_part = db.Column(db.String(20), nullable=False)
    symptom_type = db.Column(db.String(20), nullable=False)
    possible_cause = db.Column(db.String(200), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'record_date': self.record_date.isoformat() if self.record_date else None,
            'body_part': self.body_part,
            'body_part_name': {'neck': '颈部', 'shoulder': '肩部', 'waist': '腰部', 'back': '背部'}.get(self.body_part, self.body_part),
            'symptom_type': self.symptom_type,
            'possible_cause': self.possible_cause,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Exercise(db.Model):
    """康复动作库"""
    __tablename__ = 'exercises'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=False)
    duration_seconds = db.Column(db.Integer, default=30)
    target_parts = db.Column(db.String(100), default='all')
    difficulty = db.Column(db.String(10), default='easy')
    icon = db.Column(db.String(10), default='🧘')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'duration_seconds': self.duration_seconds,
            'target_parts': self.target_parts.split(',') if self.target_parts else [],
            'difficulty': self.difficulty,
            'icon': self.icon
        }


class ExerciseLog(db.Model):
    """动作完成记录"""
    __tablename__ = 'exercise_logs'

    id = db.Column(db.Integer, primary_key=True)
    exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.id'), nullable=False)
    record_date = db.Column(db.Date, nullable=False, default=date.today)
    completed = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        exercise = Exercise.query.get(self.exercise_id)
        return {
            'id': self.id,
            'exercise_id': self.exercise_id,
            'record_date': self.record_date.isoformat() if self.record_date else None,
            'completed': self.completed,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'exercise': exercise.to_dict() if exercise else None
        }


def init_default_exercises():
    """初始化默认康复动作"""
    default_exercises = [
        {'name': '颈部米字操', 'description': '用下巴写"米"字，每个方向停留2秒，有效缓解颈部僵硬和紧张。', 'duration_seconds': 60, 'target_parts': 'neck', 'difficulty': 'easy', 'icon': '🔄'},
        {'name': '肩部旋转', 'description': '双臂自然下垂，肩膀向前向后各画10个圈，放松肩关节。', 'duration_seconds': 45, 'target_parts': 'shoulder', 'difficulty': 'easy', 'icon': '💪'},
        {'name': '猫牛式伸展', 'description': '四点支撑，吸气时拱背(猫)，呼气时塌腰(牛)，每个动作保持3秒。', 'duration_seconds': 90, 'target_parts': 'back,waist', 'difficulty': 'easy', 'icon': '🐱'},
        {'name': '胸椎旋转', 'description': '坐姿，一手撑椅背，另一手扶膝盖，身体向支撑手方向旋转。', 'duration_seconds': 60, 'target_parts': 'back,shoulder', 'difficulty': 'medium', 'icon': '🌀'},
        {'name': '平板支撑', 'description': '肘撑地面，保持身体成一直线，腹部收紧，坚持30-60秒。', 'duration_seconds': 60, 'target_parts': 'back,waist', 'difficulty': 'medium', 'icon': '🧱'},
        {'name': '臀桥', 'description': '仰卧屈膝，臀部发力抬起身体至肩髋膝成一直线，保持3秒后放下。', 'duration_seconds': 60, 'target_parts': 'waist,back', 'difficulty': 'easy', 'icon': '🌉'},
        {'name': '鸟狗式', 'description': '四点支撑，同时伸展对侧手臂和腿，保持5秒，换边进行。', 'duration_seconds': 90, 'target_parts': 'back,waist,shoulder', 'difficulty': 'medium', 'icon': '🐦'},
        {'name': '门框伸展', 'description': '站在门框两侧，手臂呈90度靠在门框上，身体向前倾，拉伸胸部。', 'duration_seconds': 60, 'target_parts': 'shoulder,back', 'difficulty': 'easy', 'icon': '🚪'},
        {'name': '死虫式', 'description': '仰卧，双手指向天花板，屈膝抬腿，然后交替伸直对侧手臂和腿。', 'duration_seconds': 90, 'target_parts': 'waist,back', 'difficulty': 'medium', 'icon': '🐛'},
        {'name': '婴儿式放松', 'description': '跪坐，臀部坐在脚跟上，身体前倾贴地，双臂前伸或放在身体两侧。', 'duration_seconds': 120, 'target_parts': 'back,shoulder,waist', 'difficulty': 'easy', 'icon': '👶'}
    ]

    if Exercise.query.count() == 0:
        for ex_data in default_exercises:
            exercise = Exercise(**ex_data)
            db.session.add(exercise)
        db.session.commit()


# ==================== 页面路由 ====================

@app.route('/')
def index():
    return render_template('index.html')


# ==================== 每日记录 API ====================

@app.route('/api/records', methods=['GET'])
def get_records():
    records = DailyRecord.query.order_by(DailyRecord.record_date.desc()).all()
    return jsonify([r.to_dict() for r in records])


@app.route('/api/records/<record_date>', methods=['GET'])
def get_record(record_date):
    try:
        date_obj = datetime.strptime(record_date, '%Y-%m-%d').date()
        record = DailyRecord.query.filter_by(record_date=date_obj).first()
        if record:
            return jsonify(record.to_dict())
        return jsonify({'error': '未找到记录'}), 404
    except ValueError:
        return jsonify({'error': '日期格式错误'}), 400


@app.route('/api/records', methods=['POST'])
def save_record():
    data = request.get_json()
    if not data:
        return jsonify({'error': '无数据'}), 400

    try:
        record_date = datetime.strptime(data.get('record_date', date.today().isoformat()), '%Y-%m-%d').date()
        record = DailyRecord.query.filter_by(record_date=record_date).first()

        if record:
            record.neck_pain = data.get('neck_pain', record.neck_pain)
            record.shoulder_pain = data.get('shoulder_pain', record.shoulder_pain)
            record.waist_pain = data.get('waist_pain', record.waist_pain)
            record.back_pain = data.get('back_pain', record.back_pain)
            record.sleep_hours = data.get('sleep_hours', record.sleep_hours)
            record.sleep_quality = data.get('sleep_quality', record.sleep_quality)
            record.exercise_minutes = data.get('exercise_minutes', record.exercise_minutes)
            record.mood_score = data.get('mood_score', record.mood_score)
        else:
            record = DailyRecord(
                record_date=record_date,
                neck_pain=data.get('neck_pain', 0),
                shoulder_pain=data.get('shoulder_pain', 0),
                waist_pain=data.get('waist_pain', 0),
                back_pain=data.get('back_pain', 0),
                sleep_hours=data.get('sleep_hours', 0),
                sleep_quality=data.get('sleep_quality', 3),
                exercise_minutes=data.get('exercise_minutes', 0),
                mood_score=data.get('mood_score', 5)
            )
            db.session.add(record)

        db.session.commit()
        return jsonify(record.to_dict())

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/records/<record_date>', methods=['DELETE'])
def delete_record(record_date):
    try:
        date_obj = datetime.strptime(record_date, '%Y-%m-%d').date()
        record = DailyRecord.query.filter_by(record_date=date_obj).first()
        if record:
            db.session.delete(record)
            db.session.commit()
            return jsonify({'success': True})
        return jsonify({'error': '未找到记录'}), 404
    except ValueError:
        return jsonify({'error': '日期格式错误'}), 400


# ==================== 症状 API ====================

@app.route('/api/symptoms', methods=['GET'])
def get_symptoms():
    date_filter = request.args.get('date')
    query = Symptom.query
    if date_filter:
        try:
            date_obj = datetime.strptime(date_filter, '%Y-%m-%d').date()
            query = query.filter_by(record_date=date_obj)
        except ValueError:
            pass
    symptoms = query.order_by(Symptom.record_date.desc()).all()
    return jsonify([s.to_dict() for s in symptoms])


@app.route('/api/symptoms', methods=['POST'])
def add_symptom():
    data = request.get_json()
    if not data or not data.get('body_part') or not data.get('symptom_type'):
        return jsonify({'error': '缺少必要字段'}), 400

    try:
        record_date = datetime.strptime(data.get('record_date', date.today().isoformat()), '%Y-%m-%d').date()
        symptom = Symptom(
            record_date=record_date,
            body_part=data.get('body_part'),
            symptom_type=data.get('symptom_type'),
            possible_cause=data.get('possible_cause', ''),
            notes=data.get('notes', '')
        )
        db.session.add(symptom)
        db.session.commit()
        return jsonify(symptom.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/symptoms/<int:symptom_id>', methods=['DELETE'])
def delete_symptom(symptom_id):
    symptom = Symptom.query.get(symptom_id)
    if symptom:
        db.session.delete(symptom)
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'error': '未找到记录'}), 404


# ==================== 康复动作 API ====================

@app.route('/api/exercises', methods=['GET'])
def get_exercises():
    exercises = Exercise.query.all()
    return jsonify([e.to_dict() for e in exercises])


@app.route('/api/exercises/recommended', methods=['GET'])
def get_recommended_exercises():
    target_date = request.args.get('date')
    if target_date:
        try:
            date_obj = datetime.strptime(target_date, '%Y-%m-%d').date()
        except ValueError:
            date_obj = date.today()
    else:
        date_obj = date.today()

    record = DailyRecord.query.filter_by(record_date=date_obj).first()
    pain_parts = []
    if record:
        if record.neck_pain >= 3: pain_parts.append('neck')
        if record.shoulder_pain >= 3: pain_parts.append('shoulder')
        if record.waist_pain >= 3: pain_parts.append('waist')
        if record.back_pain >= 3: pain_parts.append('back')
    if not pain_parts:
        pain_parts = ['neck', 'shoulder', 'waist', 'back']

    all_exercises = Exercise.query.all()
    recommended = []
    for ex in all_exercises:
        parts = ex.target_parts.split(',') if ex.target_parts else []
        score = len(set(parts) & set(pain_parts))
        if score > 0:
            recommended.append((ex, score))

    recommended.sort(key=lambda x: x[1], reverse=True)
    recommended = [ex for ex, _ in recommended[:5]]

    if len(recommended) < 5:
        existing_ids = [ex.id for ex in recommended]
        for ex in all_exercises:
            if ex.id not in existing_ids:
                recommended.append(ex)
                if len(recommended) >= 5:
                    break

    logs = ExerciseLog.query.filter_by(record_date=date_obj).all()
    completed_ids = {log.exercise_id: log for log in logs}

    result = []
    for ex in recommended:
        log = completed_ids.get(ex.id)
        result.append({
            'exercise': ex.to_dict(),
            'completed': log.completed if log else False,
            'completed_at': log.completed_at.isoformat() if log and log.completed_at else None
        })
    return jsonify(result)


@app.route('/api/exercises/complete', methods=['POST'])
def complete_exercise():
    data = request.get_json()
    if not data or not data.get('exercise_id'):
        return jsonify({'error': '缺少exercise_id'}), 400

    try:
        exercise_id = data.get('exercise_id')
        target_date = datetime.strptime(data.get('record_date', date.today().isoformat()), '%Y-%m-%d').date()
        completed = data.get('completed', True)

        log = ExerciseLog.query.filter_by(exercise_id=exercise_id, record_date=target_date).first()
        if log:
            log.completed = completed
            log.completed_at = datetime.utcnow() if completed else None
        else:
            log = ExerciseLog(
                exercise_id=exercise_id,
                record_date=target_date,
                completed=completed,
                completed_at=datetime.utcnow() if completed else None
            )
            db.session.add(log)
        db.session.commit()
        return jsonify(log.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ==================== 数据分析 API ====================

@app.route('/api/analytics/weekly', methods=['GET'])
def get_weekly_analytics():
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())
    end_of_week = start_of_week + timedelta(days=6)

    records = DailyRecord.query.filter(
        DailyRecord.record_date >= start_of_week,
        DailyRecord.record_date <= end_of_week
    ).order_by(DailyRecord.record_date).all()

    week_data = {
        'start_date': start_of_week.isoformat(),
        'end_date': end_of_week.isoformat(),
        'records': [r.to_dict() for r in records],
        'summary': {'total_records': len(records), 'avg_pain': 0, 'avg_sleep': 0, 'total_exercise': 0, 'pain_trend': 'stable', 'sleep_trend': 'stable'}
    }

    if records:
        total_pain = sum([r.get_avg_pain() for r in records])
        total_sleep = sum([r.sleep_hours for r in records])
        total_exercise = sum([r.exercise_minutes for r in records])
        week_data['summary']['avg_pain'] = round(total_pain / len(records), 1)
        week_data['summary']['avg_sleep'] = round(total_sleep / len(records), 1)
        week_data['summary']['total_exercise'] = total_exercise

    week_data['report'] = generate_weekly_report(records, week_data['summary'])
    return jsonify(week_data)


def generate_weekly_report(records, summary):
    report = {'overall_trend': '', 'best_day': None, 'concerns': [], 'suggestions': []}
    if not records:
        report['overall_trend'] = '本周暂无记录，继续保持健康的生活习惯！'
        report['suggestions'] = ['建议每天记录体态数据，以便更好地追踪健康状况']
        return report

    if summary['pain_trend'] == 'improving':
        report['overall_trend'] = '本周疼痛程度呈下降趋势，继续保持！'
    elif summary['pain_trend'] == 'worsening':
        report['overall_trend'] = '本周疼痛程度有所上升，需要多加注意。'
    else:
        report['overall_trend'] = '本周疼痛程度较为稳定。'

    best_record = min(records, key=lambda r: r.get_avg_pain())
    report['best_day'] = {'date': best_record.record_date.isoformat(), 'avg_pain': best_record.get_avg_pain(), 'description': f'{best_record.record_date.month}月{best_record.record_date.day}日疼痛程度最低'}

    neck_avg = sum([r.neck_pain for r in records]) / len(records)
    shoulder_avg = sum([r.shoulder_pain for r in records]) / len(records)
    waist_avg = sum([r.waist_pain for r in records]) / len(records)
    back_avg = sum([r.back_pain for r in records]) / len(records)

    averages = [('颈部', neck_avg), ('肩部', shoulder_avg), ('腰部', waist_avg), ('背部', back_avg)]
    for name, avg in averages:
        if avg >= 5:
            report['concerns'].append(f'{name}平均疼痛程度较高({avg:.1f}/10)')

    if summary['avg_sleep'] < 7:
        report['suggestions'].append('建议保证每晚7-8小时的睡眠时间')
    if summary['total_exercise'] < 100:
        report['suggestions'].append('建议增加每日运动时间，至少达到30分钟')
    if neck_avg >= 4:
        report['suggestions'].append('颈部不适建议：每45分钟起身活动，做颈部米字操')
    if shoulder_avg >= 4:
        report['suggestions'].append('肩部不适建议：多做肩部旋转和门框伸展')
    if waist_avg >= 4:
        report['suggestions'].append('腰部不适建议：练习臀桥和死虫式，加强核心力量')
    if back_avg >= 4:
        report['suggestions'].append('背部不适建议：尝试猫牛式伸展和婴儿式放松')

    if not report['concerns']:
        report['concerns'].append('本周各部位疼痛程度均在可控范围内，继续保持！')
    if not report['suggestions']:
        report['suggestions'].append('继续保持良好的生活习惯！')
    return report


@app.route('/api/analytics/calendar/<int:year>/<int:month>', methods=['GET'])
def get_calendar_data(year, month):
    first_day = date(year, month, 1)
    if month == 12:
        last_day = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        last_day = date(year, month + 1, 1) - timedelta(days=1)

    records = DailyRecord.query.filter(
        DailyRecord.record_date >= first_day,
        DailyRecord.record_date <= last_day
    ).all()

    calendar_data = {'year': year, 'month': month, 'days': {}}
    for record in records:
        day = record.record_date.day
        avg_pain = record.get_avg_pain()
        if avg_pain <= 2: color = '#4ECDC4'
        elif avg_pain <= 5: color = '#FFA94D'
        elif avg_pain <= 7: color = '#FFB3B3'
        else: color = '#FF6B6B'

        calendar_data['days'][day] = {
            'date': record.record_date.isoformat(), 'avg_pain': avg_pain, 'color': color,
            'has_record': True, 'neck_pain': record.neck_pain, 'shoulder_pain': record.shoulder_pain,
            'waist_pain': record.waist_pain, 'back_pain': record.back_pain,
            'sleep_hours': record.sleep_hours, 'sleep_quality': record.sleep_quality, 'mood_score': record.mood_score
        }

    if records:
        calendar_data['stats'] = {
            'total_days': len(records),
            'pain_free_days': len([r for r in records if r.get_avg_pain() <= 2]),
            'avg_pain': round(sum([r.get_avg_pain() for r in records]) / len(records), 1)
        }
    return jsonify(calendar_data)


@app.route('/api/analytics/sleep-pain-correlation', methods=['GET'])
def get_sleep_pain_correlation():
    today = date.today()
    start_date = today - timedelta(days=30)
    records = DailyRecord.query.filter(DailyRecord.record_date >= start_date).order_by(DailyRecord.record_date).all()

    correlation_data = {'records': [], 'correlation': {'sleep_hours_vs_pain': 0, 'sleep_quality_vs_pain': 0}}

    if len(records) >= 3:
        sleep_hours = [r.sleep_hours for r in records]
        sleep_qualities = [r.sleep_quality for r in records]
        avg_pains = [r.get_avg_pain() for r in records]
        try:
            correlation_data['correlation']['sleep_hours_vs_pain'] = round(calculate_simple_correlation(sleep_hours, avg_pains), 2)
            correlation_data['correlation']['sleep_quality_vs_pain'] = round(calculate_simple_correlation(sleep_qualities, avg_pains), 2)
        except:
            pass

    correlation_data['records'] = [{'date': r.record_date.isoformat(), 'sleep_hours': r.sleep_hours, 'sleep_quality': r.sleep_quality, 'avg_pain': r.get_avg_pain()} for r in records]
    return jsonify(correlation_data)


def calculate_simple_correlation(x, y):
    n = len(x)
    if n < 2: return 0
    mean_x, mean_y = sum(x) / n, sum(y) / n
    numerator = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
    denom_x = sum((x[i] - mean_x) ** 2 for i in range(n)) ** 0.5
    denom_y = sum((y[i] - mean_y) ** 2 for i in range(n)) ** 0.5
    if denom_x == 0 or denom_y == 0: return 0
    return numerator / (denom_x * denom_y)


# ==================== 导出 API ====================

@app.route('/api/export', methods=['GET'])
def export_data():
    import csv
    from io import StringIO

    records = DailyRecord.query.order_by(DailyRecord.record_date).all()
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['日期', '颈部疼痛', '肩部疼痛', '腰部疼痛', '背部疼痛', '睡眠时长', '睡眠质量', '运动时长', '心情指数'])
    for r in records:
        writer.writerow([r.record_date.isoformat(), r.neck_pain, r.shoulder_pain, r.waist_pain, r.back_pain, r.sleep_hours, r.sleep_quality, r.exercise_minutes, r.mood_score])

    csv_content = output.getvalue()
    output.close()
    return jsonify({'csv': csv_content, 'filename': f'health_diary_export_{date.today().isoformat()}.csv'})


# ==================== 初始化 ====================

with app.app_context():
    db.create_all()
    init_default_exercises()


# ==================== 启动 ====================

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
