/**
 * 体态健康日记 - 主应用脚本
 */

// ==================== 全局状态 ====================
const state = {
    currentTab: 'record',
    currentMonth: new Date().getMonth() + 1,
    currentYear: new Date().getFullYear(),
    today: new Date().toISOString().split('T')[0],
    sleepQuality: 3,
    moodScore: 7,
    selectedBodyPart: '',
    selectedCause: '',
    charts: {
        pain: null,
        correlation: null
    },
    reminders: {
        sitReminder: false,
        nightReminder: false,
        sitTimer: null,
        nightTimer: null
    }
};

// ==================== 工具函数 ====================

/**
 * 显示提示消息
 */
function showToast(message, duration = 2000) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), duration);
}

/**
 * 格式化日期
 */
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * 格式化完整日期
 */
function formatFullDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * 获取周几
 */
function getWeekday(date) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[new Date(date).getDay()];
}

// ==================== API 调用 ====================

const API_BASE = '';

/**
 * 获取每日记录
 */
async function fetchRecords() {
    const res = await fetch(`${API_BASE}/api/records`);
    return res.json();
}

/**
 * 获取指定日期记录
 */
async function fetchRecord(date) {
    const res = await fetch(`${API_BASE}/api/records/${date}`);
    if (res.ok) {
        return res.json();
    }
    return null;
}

/**
 * 保存记录
 */
async function saveRecord(data) {
    const res = await fetch(`${API_BASE}/api/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}

/**
 * 删除记录
 */
async function deleteRecord(date) {
    const res = await fetch(`${API_BASE}/api/records/${date}`, {
        method: 'DELETE'
    });
    return res.json();
}

/**
 * 获取症状列表
 */
async function fetchSymptoms(date = null) {
    let url = `${API_BASE}/api/symptoms`;
    if (date) url += `?date=${date}`;
    const res = await fetch(url);
    return res.json();
}

/**
 * 添加症状
 */
async function addSymptom(data) {
    const res = await fetch(`${API_BASE}/api/symptoms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}

/**
 * 删除症状
 */
async function deleteSymptom(id) {
    const res = await fetch(`${API_BASE}/api/symptoms/${id}`, {
        method: 'DELETE'
    });
    return res.json();
}

/**
 * 获取所有动作
 */
async function fetchExercises() {
    const res = await fetch(`${API_BASE}/api/exercises`);
    return res.json();
}

/**
 * 获取推荐动作
 */
async function fetchRecommendedExercises(date = state.today) {
    const res = await fetch(`${API_BASE}/api/exercises/recommended?date=${date}`);
    return res.json();
}

/**
 * 完成动作
 */
async function completeExercise(exerciseId, completed = true) {
    const res = await fetch(`${API_BASE}/api/exercises/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            exercise_id: exerciseId,
            record_date: state.today,
            completed: completed
        })
    });
    return res.json();
}

/**
 * 获取周分析数据
 */
async function fetchWeeklyAnalytics() {
    const res = await fetch(`${API_BASE}/api/analytics/weekly`);
    return res.json();
}

/**
 * 获取睡眠与疼痛相关性
 */
async function fetchCorrelation() {
    const res = await fetch(`${API_BASE}/api/analytics/sleep-pain-correlation`);
    return res.json();
}

/**
 * 获取日历数据
 */
async function fetchCalendarData(year, month) {
    const res = await fetch(`${API_BASE}/api/analytics/calendar/${year}/${month}`);
    return res.json();
}

/**
 * 导出数据
 */
async function exportData() {
    const res = await fetch(`${API_BASE}/api/export`);
    const data = await res.json();
    
    // 创建下载
    const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = data.filename;
    link.click();
    URL.revokeObjectURL(url);
    
    showToast('数据已导出');
}

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // 设置今日日期
    document.getElementById('recordDate').value = state.today;
    document.getElementById('symptomDate').value = state.today;
    
    // 初始化UI组件
    initTabs();
    initForms();
    initSettings();
    initModals();
    
    // 加载初始数据
    await loadTodayOverview();
    await loadSymptoms();
    await loadExercises();
    await loadHistory();
    
    // 切换到历史标签页时加载图表
    document.querySelector('[data-tab="history"]').addEventListener('click', async () => {
        await loadAnalytics();
    });
}

// ==================== 标签页切换 ====================

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const tab = btn.dataset.tab;
            
            // 更新按钮状态
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 更新内容显示
            tabContents.forEach(c => c.classList.remove('active'));
            document.getElementById(`${tab}Tab`).classList.add('active');
            
            state.currentTab = tab;
            
            // 加载数据
            if (tab === 'exercises') {
                await loadExercises();
            } else if (tab === 'history') {
                await loadAnalytics();
            }
        });
    });
}

// ==================== 表单处理 ====================

function initForms() {
    // 疼痛滑块
    const painSliders = ['neckPain', 'shoulderPain', 'waistPain', 'backPain'];
    painSliders.forEach(id => {
        const slider = document.getElementById(id);
        const valueDisplay = document.getElementById(`${id}Value`);
        
        slider.addEventListener('input', () => {
            valueDisplay.textContent = slider.value;
        });
    });
    
    // 睡眠质量星级
    const stars = document.querySelectorAll('#sleepQuality .star');
    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            state.sleepQuality = index + 1;
            updateStarRating(stars, index + 1);
        });
    });
    
    // 心情选择
    const moodBtns = document.querySelectorAll('.mood-btn');
    moodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            state.moodScore = parseInt(btn.dataset.value);
            moodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // 部位选择
    const bodyPartBtns = document.querySelectorAll('.body-part-btn');
    bodyPartBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            state.selectedBodyPart = btn.dataset.part;
            bodyPartBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // 原因标签
    const causeChips = document.querySelectorAll('.chip');
    causeChips.forEach(chip => {
        chip.addEventListener('click', () => {
            state.selectedCause = chip.dataset.cause;
            document.getElementById('possibleCause').value = chip.dataset.cause;
            causeChips.forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
        });
    });
    
    // 记录表单提交
    document.getElementById('recordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitRecord();
    });
    
    // 症状表单提交
    document.getElementById('symptomForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitSymptom();
    });
    
    // 筛选按钮
    document.getElementById('filterBtn').addEventListener('click', loadHistory);
    document.getElementById('exportBtn').addEventListener('click', exportData);
}

function updateStarRating(stars, rating) {
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
            star.textContent = '★';
        } else {
            star.classList.remove('active');
            star.textContent = '☆';
        }
    });
}

async function submitRecord() {
    const data = {
        record_date: document.getElementById('recordDate').value,
        neck_pain: parseInt(document.getElementById('neckPain').value),
        shoulder_pain: parseInt(document.getElementById('shoulderPain').value),
        waist_pain: parseInt(document.getElementById('waistPain').value),
        back_pain: parseInt(document.getElementById('backPain').value),
        sleep_hours: parseFloat(document.getElementById('sleepHours').value),
        sleep_quality: state.sleepQuality,
        exercise_minutes: parseInt(document.getElementById('exerciseMinutes').value),
        mood_score: state.moodScore
    };
    
    try {
        const result = await saveRecord(data);
        if (result.id) {
            showToast('记录保存成功');
            await loadTodayOverview();
            // 更新今日推荐动作
            await loadExercises();
        }
    } catch (error) {
        showToast('保存失败，请重试');
    }
}

async function submitSymptom() {
    if (!state.selectedBodyPart) {
        showToast('请选择部位');
        return;
    }
    
    const symptomType = document.getElementById('symptomType').value;
    if (!symptomType) {
        showToast('请选择症状类型');
        return;
    }
    
    const data = {
        record_date: document.getElementById('symptomDate').value,
        body_part: state.selectedBodyPart,
        symptom_type: symptomType,
        possible_cause: document.getElementById('possibleCause').value,
        notes: document.getElementById('symptomNotes').value
    };
    
    try {
        const result = await addSymptom(data);
        if (result.id) {
            showToast('症状添加成功');
            // 重置表单
            document.getElementById('symptomForm').reset();
            state.selectedBodyPart = '';
            state.selectedCause = '';
            document.querySelectorAll('.body-part-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
            // 刷新症状列表
            await loadSymptoms();
        }
    } catch (error) {
        showToast('添加失败，请重试');
    }
}

// ==================== 设置 ====================

function initSettings() {
    // 从 localStorage 加载设置
    const sitReminder = localStorage.getItem('sitReminder') === 'true';
    const nightReminder = localStorage.getItem('nightReminder') === 'true';
    
    document.getElementById('sitReminder').checked = sitReminder;
    document.getElementById('nightReminder').checked = nightReminder;
    
    state.reminders.sitReminder = sitReminder;
    state.reminders.nightReminder = nightReminder;
    
    // 开关事件
    document.getElementById('sitReminder').addEventListener('change', (e) => {
        state.reminders.sitReminder = e.target.checked;
        localStorage.setItem('sitReminder', e.target.checked);
        if (e.target.checked) {
            startSitReminder();
        } else {
            stopSitReminder();
        }
    });
    
    document.getElementById('nightReminder').addEventListener('change', (e) => {
        state.reminders.nightReminder = e.target.checked;
        localStorage.setItem('nightReminder', e.target.checked);
        if (e.target.checked) {
            startNightReminder();
        } else {
            stopNightReminder();
        }
    });
    
    // 启动提醒
    if (sitReminder) startSitReminder();
    if (nightReminder) startNightReminder();
}

function initModals() {
    const settingsModal = document.getElementById('settingsModal');
    const dateDetailModal = document.getElementById('dateDetailModal');
    
    // 设置按钮
    document.getElementById('settingsBtn').addEventListener('click', () => {
        settingsModal.classList.add('active');
    });
    
    document.getElementById('closeSettings').addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });
    
    // 日期详情弹窗
    document.getElementById('closeDetail').addEventListener('click', () => {
        dateDetailModal.classList.remove('active');
    });
    
    // 点击外部关闭
    [settingsModal, dateDetailModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// ==================== 数据加载 ====================

async function loadTodayOverview() {
    const date = new Date();
    const todayStr = date.toISOString().split('T')[0];
    
    // 更新今日日期显示
    document.getElementById('todayDate').textContent = 
        `${date.getMonth() + 1}月${date.getDate()}日 ${getWeekday(todayStr)}`;
    
    // 获取今日记录
    const record = await fetchRecord(todayStr);
    
    if (record && record.id) {
        // 更新疼痛显示
        const avgPain = ((record.neck_pain + record.shoulder_pain + record.waist_pain + record.back_pain) / 4).toFixed(1);
        document.getElementById('todayPain').textContent = `${avgPain}/10`;
        
        // 更新睡眠显示
        document.getElementById('todaySleep').textContent = `${record.sleep_hours}小时`;
        
        // 更新运动显示
        document.getElementById('todayExercise').textContent = `${record.exercise_minutes}分钟`;
        
        // 填充表单
        document.getElementById('neckPain').value = record.neck_pain;
        document.getElementById('neckPainValue').textContent = record.neck_pain;
        document.getElementById('shoulderPain').value = record.shoulder_pain;
        document.getElementById('shoulderPainValue').textContent = record.shoulder_pain;
        document.getElementById('waistPain').value = record.waist_pain;
        document.getElementById('waistPainValue').textContent = record.waist_pain;
        document.getElementById('backPain').value = record.back_pain;
        document.getElementById('backPainValue').textContent = record.back_pain;
        document.getElementById('sleepHours').value = record.sleep_hours;
        document.getElementById('sleepQualityValue').value = record.sleep_quality;
        state.sleepQuality = record.sleep_quality;
        const stars = document.querySelectorAll('#sleepQuality .star');
        updateStarRating(stars, record.sleep_quality);
        document.getElementById('exerciseMinutes').value = record.exercise_minutes;
        document.getElementById('moodScore').value = record.mood_score;
        state.moodScore = record.mood_score;
        const moodBtns = document.querySelectorAll('.mood-btn');
        moodBtns.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.value) === record.mood_score);
        });
    } else {
        document.getElementById('todayPain').textContent = '暂无记录';
        document.getElementById('todaySleep').textContent = '暂无记录';
        document.getElementById('todayExercise').textContent = '暂无记录';
    }
}

async function loadSymptoms() {
    const symptoms = await fetchSymptoms();
    const container = document.getElementById('symptomsList');
    
    if (symptoms.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-text">暂无症状记录</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = symptoms.map(symptom => `
        <div class="symptom-item" data-id="${symptom.id}">
            <span class="symptom-part">${getBodyIcon(symptom.body_part)}</span>
            <div class="symptom-info">
                <div class="symptom-type">${symptom.symptom_type}</div>
                <div class="symptom-meta">
                    <span>${symptom.body_part_name || getBodyPartName(symptom.body_part)}</span>
                    <span>${symptom.record_date}</span>
                    ${symptom.possible_cause ? `<span>原因: ${symptom.possible_cause}</span>` : ''}
                </div>
            </div>
            <button class="symptom-delete" onclick="handleDeleteSymptom(${symptom.id})">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        </div>
    `).join('');
}

async function handleDeleteSymptom(id) {
    if (confirm('确定删除这条症状记录吗？')) {
        await deleteSymptom(id);
        showToast('已删除');
        await loadSymptoms();
    }
}

function getBodyIcon(part) {
    const icons = {
        neck: '🦒',
        shoulder: '💪',
        waist: '🫃',
        back: '🧍'
    };
    return icons[part] || '❓';
}

function getBodyPartName(part) {
    const names = {
        neck: '颈部',
        shoulder: '肩部',
        waist: '腰部',
        back: '背部'
    };
    return names[part] || part;
}

async function loadExercises() {
    // 加载推荐动作
    const recommended = await fetchRecommendedExercises();
    const recommendedContainer = document.getElementById('recommendedExercises');
    
    if (recommended.length === 0) {
        recommendedContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🧘</div>
                <div class="empty-state-text">加载中...</div>
            </div>
        `;
    } else {
        recommendedContainer.innerHTML = `
            <div style="margin-bottom: 16px; padding: 12px; background: linear-gradient(135deg, rgba(78,205,196,0.1), rgba(69,183,209,0.1)); border-radius: 12px;">
                <span style="font-size: 0.9rem; color: var(--text-secondary);">
                    已完成 ${recommended.filter(r => r.completed).length}/${recommended.length} 个动作
                </span>
            </div>
            ${recommended.map(rec => renderExerciseItem(rec.exercise, rec.completed, true)).join('')}
        `;
    }
    
    // 加载全部动作
    const allExercises = await fetchExercises();
    const allContainer = document.getElementById('allExercises');
    
    allContainer.innerHTML = allExercises.map(ex => renderExerciseItem(ex, false, false)).join('');
}

function renderExerciseItem(exercise, completed = false, showCheckbox = false) {
    const duration = Math.floor(exercise.duration_seconds / 60);
    const durationText = duration >= 1 ? `${duration}分钟` : `${exercise.duration_seconds}秒`;
    
    return `
        <div class="exercise-item">
            <div class="exercise-icon">${exercise.icon}</div>
            <div class="exercise-info">
                <div class="exercise-name">${exercise.name}</div>
                <div class="exercise-desc">${exercise.description}</div>
                <div class="exercise-meta">
                    <span class="difficulty-tag ${exercise.difficulty}">${getDifficultyText(exercise.difficulty)}</span>
                    <span>⏱ ${durationText}</span>
                    <span>部位: ${exercise.target_parts.map(p => getBodyPartName(p)).join(', ')}</span>
                </div>
            </div>
            ${showCheckbox ? `
                <div class="exercise-checkbox">
                    <div class="checkbox-custom ${completed ? 'checked' : ''}" 
                         onclick="toggleExercise(${exercise.id}, ${!completed})"></div>
                </div>
            ` : ''}
        </div>
    `;
}

function getDifficultyText(difficulty) {
    const texts = {
        easy: '简单',
        medium: '中等',
        hard: '困难'
    };
    return texts[difficulty] || difficulty;
}

async function toggleExercise(exerciseId, completed) {
    await completeExercise(exerciseId, completed);
    await loadExercises();
}

async function loadHistory() {
    const filterDate = document.getElementById('filterDate').value;
    let records = await fetchRecords();
    
    if (filterDate) {
        records = records.filter(r => r.record_date === filterDate);
    }
    
    const container = document.getElementById('historyList');
    
    if (records.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📜</div>
                <div class="empty-state-text">暂无历史记录</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = records.slice(0, 20).map(record => `
        <div class="history-item">
            <div class="history-date">
                ${formatFullDate(record.record_date)} ${getWeekday(record.record_date)}
            </div>
            <div class="history-stats">
                <span class="history-stat">🦒颈部: ${record.neck_pain}</span>
                <span class="history-stat">💪肩部: ${record.shoulder_pain}</span>
                <span class="history-stat">🫃腰部: ${record.waist_pain}</span>
                <span class="history-stat">🧍背部: ${record.back_pain}</span>
                <span class="history-stat">😴${record.sleep_hours}小时</span>
                <span class="history-stat">🏃${record.exercise_minutes}分钟</span>
                <span class="history-stat">😊${record.mood_score}/10</span>
            </div>
            <div class="history-actions">
                <button class="btn-secondary" onclick="loadRecordToForm('${record.record_date}')">编辑</button>
                <button class="btn-secondary" onclick="handleDeleteRecord('${record.record_date}')" style="color: var(--danger); border-color: var(--danger);">删除</button>
            </div>
        </div>
    `).join('');
}

async function loadRecordToForm(date) {
    const record = await fetchRecord(date);
    if (record) {
        document.getElementById('recordDate').value = record.record_date;
        document.getElementById('neckPain').value = record.neck_pain;
        document.getElementById('neckPainValue').textContent = record.neck_pain;
        document.getElementById('shoulderPain').value = record.shoulder_pain;
        document.getElementById('shoulderPainValue').textContent = record.shoulder_pain;
        document.getElementById('waistPain').value = record.waist_pain;
        document.getElementById('waistPainValue').textContent = record.waist_pain;
        document.getElementById('backPain').value = record.back_pain;
        document.getElementById('backPainValue').textContent = record.back_pain;
        document.getElementById('sleepHours').value = record.sleep_hours;
        document.getElementById('sleepQualityValue').value = record.sleep_quality;
        state.sleepQuality = record.sleep_quality;
        updateStarRating(document.querySelectorAll('#sleepQuality .star'), record.sleep_quality);
        document.getElementById('exerciseMinutes').value = record.exercise_minutes;
        document.getElementById('moodScore').value = record.mood_score;
        state.moodScore = record.mood_score;
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.value) === record.mood_score);
        });
        
        // 切换到记录标签页
        document.querySelector('[data-tab="record"]').click();
        showToast('已加载记录，可进行编辑');
    }
}

async function handleDeleteRecord(date) {
    if (confirm('确定删除这条记录吗？')) {
        await deleteRecord(date);
        showToast('已删除');
        await loadHistory();
        await loadTodayOverview();
    }
}

// ==================== 数据分析 ====================

async function loadAnalytics() {
    await loadPainChart();
    await loadCorrelationChart();
    await loadCalendar();
    await loadWeeklyReport();
}

async function loadPainChart() {
    const data = await fetchWeeklyAnalytics();
    const records = data.records || [];
    
    // 准备数据
    const labels = records.map(r => formatDate(r.record_date));
    const neckData = records.map(r => r.neck_pain);
    const shoulderData = records.map(r => r.shoulder_pain);
    const waistData = records.map(r => r.waist_pain);
    const backData = records.map(r => r.back_pain);
    
    const ctx = document.getElementById('painChart').getContext('2d');
    
    // 销毁旧图表
    if (state.charts.pain) {
        state.charts.pain.destroy();
    }
    
    state.charts.pain = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '颈部',
                    data: neckData,
                    borderColor: '#FF6B6B',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: '肩部',
                    data: shoulderData,
                    borderColor: '#FFE66D',
                    backgroundColor: 'rgba(255, 230, 109, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: '腰部',
                    data: waistData,
                    borderColor: '#45B7D1',
                    backgroundColor: 'rgba(69, 183, 209, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: '背部',
                    data: backData,
                    borderColor: '#96E6A1',
                    backgroundColor: 'rgba(150, 230, 161, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    title: {
                        display: true,
                        text: '疼痛程度 (0-10)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

async function loadCorrelationChart() {
    const data = await fetchCorrelation();
    
    // 更新相关性信息
    const infoContainer = document.getElementById('correlationInfo');
    infoContainer.innerHTML = `
        <div class="correlation-item">
            <div class="correlation-label">睡眠时长与疼痛相关性</div>
            <div class="correlation-value">${data.correlation.sleep_hours_vs_pain.toFixed(2)}</div>
        </div>
        <div class="correlation-item">
            <div class="correlation-label">睡眠质量与疼痛相关性</div>
            <div class="correlation-value">${data.correlation.sleep_quality_vs_pain.toFixed(2)}</div>
        </div>
    `;
    
    // 绘制散点图
    const records = data.records || [];
    const scatterData = records.map(r => ({
        x: r.sleep_hours,
        y: r.avg_pain
    }));
    
    const ctx = document.getElementById('correlationChart').getContext('2d');
    
    // 销毁旧图表
    if (state.charts.correlation) {
        state.charts.correlation.destroy();
    }
    
    state.charts.correlation = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: '睡眠时长 vs 疼痛程度',
                data: scatterData,
                backgroundColor: 'rgba(78, 205, 196, 0.6)',
                borderColor: '#4ECDC4',
                pointRadius: 8,
                pointHoverRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '睡眠时长 (小时)'
                    },
                    min: 0,
                    max: 12
                },
                y: {
                    title: {
                        display: true,
                        text: '平均疼痛程度'
                    },
                    min: 0,
                    max: 10
                }
            }
        }
    });
}

// ==================== 日历 ====================

async function loadCalendar() {
    const calendarData = await fetchCalendarData(state.currentYear, state.currentMonth);
    
    // 更新标题
    document.getElementById('calendarTitle').textContent = 
        `${state.currentYear}年${state.currentMonth}月`;
    
    const grid = document.getElementById('calendarGrid');
    
    // 星期标题
    let html = `
        <div class="calendar-weekday">日</div>
        <div class="calendar-weekday">一</div>
        <div class="calendar-weekday">二</div>
        <div class="calendar-weekday">三</div>
        <div class="calendar-weekday">四</div>
        <div class="calendar-weekday">五</div>
        <div class="calendar-weekday">六</div>
    `;
    
    // 获取月份第一天和最后一天
    const firstDay = new Date(state.currentYear, state.currentMonth - 1, 1);
    const lastDay = new Date(state.currentYear, state.currentMonth, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    // 上月空白
    for (let i = 0; i < startWeekday; i++) {
        html += `<div class="calendar-day other-month"></div>`;
    }
    
    // 当月日期
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = calendarData.days && calendarData.days[day];
        const isToday = today.getFullYear() === state.currentYear && 
                       today.getMonth() + 1 === state.currentMonth && 
                       today.getDate() === day;
        
        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        
        if (dayData) {
            classes += ' has-record';
            html += `
                <div class="${classes}" style="background-color: ${dayData.color};" 
                     onclick="showDateDetail('${dateStr}')">
                    <span>${day}</span>
                    <span class="day-pain">${dayData.avg_pain}</span>
                </div>
            `;
        } else {
            html += `
                <div class="${classes}" onclick="showDateDetail('${dateStr}')">
                    <span>${day}</span>
                </div>
            `;
        }
    }
    
    grid.innerHTML = html;
    
    // 月份切换
    document.getElementById('prevMonth').onclick = () => {
        if (state.currentMonth === 1) {
            state.currentMonth = 12;
            state.currentYear--;
        } else {
            state.currentMonth--;
        }
        loadCalendar();
    };
    
    document.getElementById('nextMonth').onclick = () => {
        if (state.currentMonth === 12) {
            state.currentMonth = 1;
            state.currentYear++;
        } else {
            state.currentMonth++;
        }
        loadCalendar();
    };
}

async function showDateDetail(dateStr) {
    const record = await fetchRecord(dateStr);
    const symptoms = await fetchSymptoms(dateStr);
    
    const modal = document.getElementById('dateDetailModal');
    const title = document.getElementById('detailDateTitle');
    const content = document.getElementById('dateDetailContent');
    
    title.textContent = formatFullDate(dateStr);
    
    let html = '';
    
    if (record && record.id) {
        html += `
            <div class="report-section">
                <div class="report-section-title">📊 疼痛情况</div>
                <div class="report-section-content">
                    <div class="report-item">🦒 颈部: ${record.neck_pain}/10</div>
                    <div class="report-item">💪 肩部: ${record.shoulder_pain}/10</div>
                    <div class="report-item">🫃 腰部: ${record.waist_pain}/10</div>
                    <div class="report-item">🧍 背部: ${record.back_pain}/10</div>
                </div>
            </div>
            <div class="report-section">
                <div class="report-section-title">😴 睡眠</div>
                <div class="report-section-content">
                    <div class="report-item">睡眠时长: ${record.sleep_hours}小时</div>
                    <div class="report-item">睡眠质量: ${'★'.repeat(record.sleep_quality)}${'☆'.repeat(5 - record.sleep_quality)}</div>
                </div>
            </div>
            <div class="report-section">
                <div class="report-section-title">🏃 运动</div>
                <div class="report-section-content">
                    <div class="report-item">运动时长: ${record.exercise_minutes}分钟</div>
                </div>
            </div>
            <div class="report-section">
                <div class="report-section-title">😊 心情</div>
                <div class="report-section-content">
                    <div class="report-item">心情指数: ${record.mood_score}/10</div>
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-text">当日暂无记录</div>
            </div>
        `;
    }
    
    if (symptoms.length > 0) {
        html += `
            <div class="report-section">
                <div class="report-section-title">🔍 症状</div>
                <div class="report-section-content">
                    ${symptoms.map(s => `
                        <div class="report-item">
                            ${getBodyIcon(s.body_part)} ${s.body_part_name || getBodyPartName(s.body_part)} - ${s.symptom_type}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    content.innerHTML = html;
    modal.classList.add('active');
}

// ==================== 周报 ====================

async function loadWeeklyReport() {
    const data = await fetchWeeklyAnalytics();
    const report = data.report || {};
    
    const container = document.getElementById('weeklyReport');
    
    container.innerHTML = `
        <div class="report-section">
            <div class="report-section-title">📈 ${report.overall_trend || '本周整体趋势'}</div>
            <div class="report-section-content">
                ${report.best_day ? `
                    <div class="report-item">🏆 最佳表现日: ${report.best_day.description}</div>
                ` : ''}
            </div>
        </div>
        
        ${report.concerns && report.concerns.length > 0 ? `
            <div class="report-section">
                <div class="report-section-title">⚠️ 需要关注</div>
                <div class="report-section-content">
                    ${report.concerns.map(c => `<div class="report-item">${c}</div>`).join('')}
                </div>
            </div>
        ` : ''}
        
        ${report.suggestions && report.suggestions.length > 0 ? `
            <div class="report-section">
                <div class="report-section-title">💡 康复建议</div>
                <div class="report-section-content">
                    ${report.suggestions.map(s => `<div class="report-item">${s}</div>`).join('')}
                </div>
            </div>
        ` : ''}
        
        <div class="report-section">
            <div class="report-section-title">📊 本周统计</div>
            <div class="report-section-content">
                <div class="report-item">记录天数: ${data.summary?.total_records || 0}天</div>
                <div class="report-item">平均疼痛: ${data.summary?.avg_pain || 0}/10</div>
                <div class="report-item">平均睡眠: ${data.summary?.avg_sleep || 0}小时</div>
                <div class="report-item">总运动: ${data.summary?.total_exercise || 0}分钟</div>
            </div>
        </div>
    `;
}

// ==================== 提醒功能 ====================

function startSitReminder() {
    if (state.reminders.sitTimer) return;
    
    state.reminders.sitTimer = setInterval(() => {
        if (Notification.permission === 'granted') {
            new Notification('体态健康提醒', {
                body: '该站起来活动一下了！试试做几个伸展动作。',
                icon: '🌿'
            });
        }
    }, 45 * 60 * 1000); // 45分钟
    
    // 首次检查权限
    checkNotificationPermission();
}

function stopSitReminder() {
    if (state.reminders.sitTimer) {
        clearInterval(state.reminders.sitTimer);
        state.reminders.sitTimer = null;
    }
}

function startNightReminder() {
    if (state.reminders.nightTimer) return;
    
    // 检查是否到达8点
    function checkNightTime() {
        const now = new Date();
        if (now.getHours() === 20 && Notification.permission === 'granted') {
            new Notification('体态健康提醒', {
                body: '今日体态记录还没填写哦，点击开始记录！',
                icon: '🌿'
            });
        }
    }
    
    // 每分钟检查一次
    state.reminders.nightTimer = setInterval(checkNightTime, 60 * 1000);
    
    // 首次检查权限
    checkNotificationPermission();
}

function stopNightReminder() {
    if (state.reminders.nightTimer) {
        clearInterval(state.reminders.nightTimer);
        state.reminders.nightTimer = null;
    }
}

function checkNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}
