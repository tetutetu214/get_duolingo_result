import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Calendar, TrendingUp, Clock, Target, RefreshCw } from 'lucide-react';
import './App.css';

interface DuolingoData {
  date: string;
  xp: number;
  minutes: number;
  lessons: number;
  streak: number;
  subject: string;
}

function App() {
  const [data, setData] = useState<DuolingoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/duolingo/reports');
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
    const currentStreak = data.length > 0 ? data[0].streak : 0;
    
    const activeDays = currentStreak;
    
    return {
      totalXP,
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      totalLessons,
      currentStreak,
      avgMinutesPerDay: activeDays > 0 ? Math.round(totalMinutes / activeDays * 10) / 10 : 0,
      avgLessonsPerDay: activeDays > 0 ? Math.round(totalLessons / activeDays * 10) / 10 : 0,
      avgMinutesPerLesson: totalLessons > 0 ? Math.round(totalMinutes / totalLessons * 10) / 10 : 0
    };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // X軸の間引き間隔を計算
  const calculateInterval = (dataLength: number) => {
    if (dataLength <= 10) return 0;
    if (dataLength <= 20) return 1;
    if (dataLength <= 50) return Math.ceil(dataLength / 10);
    return Math.ceil(dataLength / 12);
  };

  const stats = calculateStats();
  const chartData = [...data].reverse();
  const xAxisInterval = calculateInterval(chartData.length);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdf4, #eff6ff)', padding: '24px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* ヘッダー */}
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

        {/* サマリーカード */}
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
        </div>

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
