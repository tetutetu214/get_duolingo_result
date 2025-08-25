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
  const [selectedDate, setSelectedDate] = useState<any>(null);

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

  // 統計計算
  const calculateStats = () => {
    const totalXP = data.reduce((sum, item) => sum + item.xp, 0);
    const totalMinutes = data.reduce((sum, item) => sum + item.minutes, 0);
    const totalLessons = data.reduce((sum, item) => sum + item.lessons, 0);
    const currentStreak = data.length > 0 ? data[0].streak : 0;
    const activeDays = data.length;
    
    return {
      totalXP,
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      totalLessons,
      currentStreak,
      avgMinutesPerDay: activeDays > 0 ? Math.round(totalMinutes / activeDays * 10) / 10 : 0,
      avgLessonsPerDay: activeDays > 0 ? Math.round(totalLessons / activeDays * 10) / 10 : 0,
      avgMinutesPerLesson: totalLessons > 0 ? Math.round(totalMinutes / totalLessons * 10) / 10 : 0,
      avgXPPerDay: activeDays > 0 ? Math.round(totalXP / activeDays) : 0
    };
  };

  // GitHub風カレンダーデータ生成
  const generateCalendarData = () => {
    const calendarData: {[key: string]: any} = {};
    
    data.forEach(item => {
      const date = new Date(item.date).toISOString().split('T')[0];
      let intensity = 'none';
      
      if (item.minutes > 60) intensity = 'high';
      else if (item.minutes > 30) intensity = 'medium';  
      else if (item.minutes > 0) intensity = 'low';
      
      calendarData[date] = {
        ...item,
        intensity,
        date: new Date(item.date)
      };
    });

    // 過去1年分のグリッド生成
    const weeks = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    
    const startSunday = new Date(startDate);
    startSunday.setDate(startDate.getDate() - startDate.getDay());
    
    let currentDate = new Date(startSunday);
    
    for (let week = 0; week < 53; week++) {
      const weekData = [];
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayData = calendarData[dateStr] || { 
          intensity: 'none', 
          minutes: 0, 
          xp: 0, 
          lessons: 0, 
          streak: 0,
          date: new Date(currentDate)
        };
        
        weekData.push({
          ...dayData,
          dateStr,
          dayOfWeek: day
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(weekData);
    }
    
    return weeks;
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'high': return 'bg-green-600';
      case 'medium': return 'bg-green-400';
      case 'low': return 'bg-green-200';
      default: return 'bg-gray-100';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const stats = calculateStats();
  const calendarWeeks = generateCalendarData();
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

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

        {/* 拡張サマリーカード */}
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
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 4px 0' }}>1日平均XP</p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#f97316', margin: 0 }}>{stats.avgXPPerDay}</p>
          </div>
        </div>

        {/* GitHub風カレンダー */}
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>学習記録カレンダー (過去1年)</h3>
          
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '700px' }}>
              <div style={{ display: 'flex', marginBottom: '16px' }}>
                <div style={{ width: '30px' }}></div>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {calendarWeeks.map((week, weekIndex) => (
                    <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {week.map((day, dayIndex) => (
                        <div
                          key={`${weekIndex}-${dayIndex}`}
                          className={getIntensityColor(day.intensity)}
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            border: selectedDate?.dateStr === day.dateStr ? '2px solid #374151' : 'none'
                          }}
                          onClick={() => setSelectedDate(day)}
                          title={`${day.date?.toLocaleDateString('ja-JP')} - ${day.minutes}分, ${day.xp}XP`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  継続的な学習が成長への鍵
                </div>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: '#6b7280', gap: '8px' }}>
                  <span>少</span>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#f3f4f6', borderRadius: '2px' }}></div>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#bbf7d0', borderRadius: '2px' }}></div>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#4ade80', borderRadius: '2px' }}></div>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#059669', borderRadius: '2px' }}></div>
                  </div>
                  <span>多</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 選択した日の詳細 */}
        {selectedDate && selectedDate.minutes > 0 && (
          <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
              {selectedDate.date?.toLocaleDateString('ja-JP', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>学習時間</div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>{selectedDate.minutes}分</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>レッスン数</div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>{selectedDate.lessons}回</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>獲得XP</div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>{selectedDate.xp}XP</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>連続記録</div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>{selectedDate.streak}日</div>
              </div>
            </div>
          </div>
        )}

        {/* 既存のチャート */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>週次XP推移</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={[...data].reverse()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
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
              <BarChart data={[...data].reverse()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
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
