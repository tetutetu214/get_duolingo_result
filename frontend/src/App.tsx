import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Calendar, TrendingUp, Clock, Target, RefreshCw, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import './App.css';

interface DuolingoData {
  date: string;
  xp: number;
  minutes: number;
  lessons: number;
  streak: number;
  subject: string;
}

interface WeekComparison {
  current: number;
  previous: number;
  diff: number;
  percentage: number;
  trend: 'up' | 'down' | 'same';
}

function App() {
  const [data, setData] = useState<DuolingoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/duolingo/reports`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calculateStats = () => {
    const totalXP = data.reduce((sum, item) => sum + item.xp, 0);
    const totalMinutes = data.reduce((sum, item) => sum + item.minutes, 0);
    const totalLessons = data.reduce((sum, item) => sum + item.lessons, 0);
    const currentStreak = data.length > 0 ? Math.max(...data.map(item => item.streak)) : 0;
    
    const weekCount = data.length;
    const totalDays = weekCount * 7;
    
    return {
      totalXP,
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      totalLessons,
      currentStreak,
      weekCount,
      avgMinutesPerDay: totalDays > 0 ? Math.round(totalMinutes / totalDays * 10) / 10 : 0,
      avgLessonsPerDay: totalDays > 0 ? Math.round(totalLessons / totalDays * 10) / 10 : 0,
      avgMinutesPerWeek: weekCount > 0 ? Math.round(totalMinutes / weekCount * 10) / 10 : 0,
      avgLessonsPerWeek: weekCount > 0 ? Math.round(totalLessons / weekCount * 10) / 10 : 0,
      avgXPPerWeek: weekCount > 0 ? Math.round(totalXP / weekCount) : 0,
      avgMinutesPerLesson: totalLessons > 0 ? Math.round(totalMinutes / totalLessons * 10) / 10 : 0
    };
  };

  const calculateWeekComparisons = () => {
    if (data.length < 2) return null;

    const thisWeek = data[0]; // 最新週
    const lastWeek = data[1]; // 先週

    const createComparison = (current: number, previous: number): WeekComparison => {
      const diff = Math.round((current - previous) * 10) / 10;
      const percentage = previous !== 0 ? Math.round((diff / previous) * 100) : 0;
      const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
      
      return { current, previous, diff, percentage, trend };
    };

    const thisWeekAvgMinutesPerLesson = thisWeek.lessons > 0 ? thisWeek.minutes / thisWeek.lessons : 0;
    const lastWeekAvgMinutesPerLesson = lastWeek.lessons > 0 ? lastWeek.minutes / lastWeek.lessons : 0;

    return {
      xp: createComparison(thisWeek.xp, lastWeek.xp),
      minutes: createComparison(thisWeek.minutes, lastWeek.minutes),
      lessons: createComparison(thisWeek.lessons, lastWeek.lessons),
      avgMinutesPerLesson: createComparison(
        Math.round(thisWeekAvgMinutesPerLesson * 10) / 10,
        Math.round(lastWeekAvgMinutesPerLesson * 10) / 10
      ),
      dailyMinutes: createComparison(
        Math.round(thisWeek.minutes / 7 * 10) / 10,
        Math.round(lastWeek.minutes / 7 * 10) / 10
      ),
      dailyLessons: createComparison(
        Math.round(thisWeek.lessons / 7 * 10) / 10,
        Math.round(lastWeek.lessons / 7 * 10) / 10
      )
    };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const calculateInterval = (dataLength: number) => {
    if (dataLength <= 10) return 0;
    if (dataLength <= 20) return 1;
    if (dataLength <= 50) return Math.ceil(dataLength / 10);
    return Math.ceil(dataLength / 12);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'same') => {
    switch (trend) {
      case 'up': return <ArrowUp size={16} style={{ color: '#10b981' }} />;
      case 'down': return <ArrowDown size={16} style={{ color: '#ef4444' }} />;
      case 'same': return <Minus size={16} style={{ color: '#6b7280' }} />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'same') => {
    switch (trend) {
      case 'up': return '#10b981';
      case 'down': return '#ef4444';
      case 'same': return '#6b7280';
    }
  };

  const stats = calculateStats();
  const weekComparisons = calculateWeekComparisons();
  const chartData = [...data].reverse();
  const xAxisInterval = calculateInterval(chartData.length);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdf4, #eff6ff)', padding: '24px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 8px 0' }}>Duolingo Learning Analytics</h1>
              <p style={{ color: '#6b7280', margin: 0 }}>Gmail API連携でリアルタイム学習進捗追跡</p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: loading ? '#9ca3af' : '#10b981',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw style={{ width: '16px', height: '16px' }} />
              <span>{loading ? 'データ取得中...' : 'Gmail同期'}</span>
            </button>
          </div>
        </div>

        {/* 基本統計カード */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '20px' }}>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 4px 0' }}>総XP</p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', margin: 0 }}>{stats.totalXP.toLocaleString()}</p>
          </div>
          
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '20px' }}>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 4px 0' }}>総学習時間</p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6', margin: 0 }}>{stats.totalHours}時間</p>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '20px' }}>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 4px 0' }}>総レッスン数</p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6', margin: 0 }}>{stats.totalLessons}</p>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '20px' }}>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 4px 0' }}>現在の連続記録</p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>{stats.currentStreak}日</p>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '20px' }}>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 4px 0' }}>1日平均学習時間</p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#06b6d4', margin: 0 }}>{stats.avgMinutesPerDay}分</p>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '20px' }}>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 4px 0' }}>1レッスン平均時間</p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#ec4899', margin: 0 }}>{stats.avgMinutesPerLesson}分</p>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '20px' }}>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 4px 0' }}>1日平均レッスン数</p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#84cc16', margin: 0 }}>{stats.avgLessonsPerDay}回</p>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '20px' }}>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 4px 0' }}>1週間平均XP</p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#f97316', margin: 0 }}>{stats.avgXPPerWeek}</p>
          </div>
        </div>

        {/* 先週比較セクション */}
        {weekComparisons && (
          <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1f2937', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={24} />
              先週との比較 - 頑張り度チェック
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>週間XP</h3>
                  {getTrendIcon(weekComparisons.xp.trend)}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>{weekComparisons.xp.current.toLocaleString()}</span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>XP</span>
                </div>
                <div style={{ fontSize: '14px', color: getTrendColor(weekComparisons.xp.trend) }}>
                  {weekComparisons.xp.diff > 0 ? '+' : ''}{weekComparisons.xp.diff} ({weekComparisons.xp.percentage > 0 ? '+' : ''}{weekComparisons.xp.percentage}%)
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                  先週: {weekComparisons.xp.previous}XP
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>週間学習時間</h3>
                  {getTrendIcon(weekComparisons.minutes.trend)}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>{weekComparisons.minutes.current}</span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>分</span>
                </div>
                <div style={{ fontSize: '14px', color: getTrendColor(weekComparisons.minutes.trend) }}>
                  {weekComparisons.minutes.diff > 0 ? '+' : ''}{weekComparisons.minutes.diff}分 ({weekComparisons.minutes.percentage > 0 ? '+' : ''}{weekComparisons.minutes.percentage}%)
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                  先週: {weekComparisons.minutes.previous}分
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>週間レッスン数</h3>
                  {getTrendIcon(weekComparisons.lessons.trend)}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>{weekComparisons.lessons.current}</span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>回</span>
                </div>
                <div style={{ fontSize: '14px', color: getTrendColor(weekComparisons.lessons.trend) }}>
                  {weekComparisons.lessons.diff > 0 ? '+' : ''}{weekComparisons.lessons.diff}回 ({weekComparisons.lessons.percentage > 0 ? '+' : ''}{weekComparisons.lessons.percentage}%)
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                  先週: {weekComparisons.lessons.previous}回
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>1レッスン平均時間</h3>
                  {getTrendIcon(weekComparisons.avgMinutesPerLesson.trend)}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>{weekComparisons.avgMinutesPerLesson.current}</span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>分</span>
                </div>
                <div style={{ fontSize: '14px', color: getTrendColor(weekComparisons.avgMinutesPerLesson.trend) }}>
                  {weekComparisons.avgMinutesPerLesson.diff > 0 ? '+' : ''}{weekComparisons.avgMinutesPerLesson.diff}分 ({weekComparisons.avgMinutesPerLesson.percentage > 0 ? '+' : ''}{weekComparisons.avgMinutesPerLesson.percentage}%)
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                  先週: {weekComparisons.avgMinutesPerLesson.previous}分
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>1日平均学習時間</h3>
                  {getTrendIcon(weekComparisons.dailyMinutes.trend)}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>{weekComparisons.dailyMinutes.current}</span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>分</span>
                </div>
                <div style={{ fontSize: '14px', color: getTrendColor(weekComparisons.dailyMinutes.trend) }}>
                  {weekComparisons.dailyMinutes.diff > 0 ? '+' : ''}{weekComparisons.dailyMinutes.diff}分 ({weekComparisons.dailyMinutes.percentage > 0 ? '+' : ''}{weekComparisons.dailyMinutes.percentage}%)
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                  先週: {weekComparisons.dailyMinutes.previous}分
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>1日平均レッスン数</h3>
                  {getTrendIcon(weekComparisons.dailyLessons.trend)}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>{weekComparisons.dailyLessons.current}</span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>回</span>
                </div>
                <div style={{ fontSize: '14px', color: getTrendColor(weekComparisons.dailyLessons.trend) }}>
                  {weekComparisons.dailyLessons.diff > 0 ? '+' : ''}{weekComparisons.dailyLessons.diff}回 ({weekComparisons.dailyLessons.percentage > 0 ? '+' : ''}{weekComparisons.dailyLessons.percentage}%)
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                  先週: {weekComparisons.dailyLessons.previous}回
                </div>
              </div>
            </div>
          </div>
        )}

        {/* チャート */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>週次XP推移</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  interval={xAxisInterval}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(label) => `日付: ${formatDate(label)}`}
                  formatter={(value) => [value, 'XP']}
                />
                <Line 
                  type="monotone" 
                  dataKey="xp" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>週次学習時間推移</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  interval={xAxisInterval}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(label) => `日付: ${formatDate(label)}`}
                  formatter={(value) => [value, '分']}
                />
                <Bar dataKey="minutes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ marginTop: '32px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
          <p>Powered by Duolingo Weekly Reports via Gmail API</p>
          <p style={{ marginTop: '4px' }}>継続は力なり - Keep learning!</p>
        </div>
      </div>
    </div>
  );
}

export default App;