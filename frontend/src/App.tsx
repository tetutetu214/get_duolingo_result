import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { RefreshCw, ArrowUp, ArrowDown, Minus, ChevronUp } from 'lucide-react';

interface DuolingoData {
  date: string;
  subject: string;
  xp: number;
  minutes: number;
  lessons: number;
  streak: number;
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
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const colors = {
    xp: '#10b981',
    time: '#3b82f6',
    lesson: '#8b5cf6',
    streak: '#f59e0b'
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/duolingo/reports');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calculateStats = () => {
    if (data.length === 0) return {
      totalXP: 0,
      totalHours: 0,
      totalLessons: 0,
      currentStreak: 0,
      avgMinutesPerDay: 0,
      avgMinutesPerLesson: 0,
      avgLessonsPerDay: 0,
      avgXPPerWeek: 0
    };

    const totalXP = data.reduce((sum, item) => sum + item.xp, 0);
    const totalMinutes = data.reduce((sum, item) => sum + item.minutes, 0);
    const totalLessons = data.reduce((sum, item) => sum + item.lessons, 0);
    const currentStreak = data[0]?.streak || 0;

    const weekCount = data.length;
    const avgMinutesPerWeek = weekCount > 0 ? totalMinutes / weekCount : 0;
    const avgLessonsPerWeek = weekCount > 0 ? totalLessons / weekCount : 0;
    const avgXPPerWeek = weekCount > 0 ? totalXP / weekCount : 0;

    return {
      totalXP,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      totalLessons,
      currentStreak,
      avgMinutesPerDay: Math.round(avgMinutesPerWeek / 7),
      avgMinutesPerLesson: totalLessons > 0 ? Math.round((totalMinutes / totalLessons) * 10) / 10 : 0,
      avgLessonsPerDay: Math.round(avgLessonsPerWeek / 7 * 10) / 10,
      avgXPPerWeek: Math.round(avgXPPerWeek)
    };
  };

  const calculateWeekComparisons = () => {
    if (data.length < 2) {
      return {
        xp: { current: 0, previous: 0, diff: 0, percentage: 0, trend: 'same' as const },
        minutes: { current: 0, previous: 0, diff: 0, percentage: 0, trend: 'same' as const },
        lessons: { current: 0, previous: 0, diff: 0, percentage: 0, trend: 'same' as const },
        avgMinutesPerLesson: { current: 0, previous: 0, diff: 0, percentage: 0, trend: 'same' as const }
      };
    }

    const thisWeek = data[0];
    const lastWeek = data[1];

    const createComparison = (current: number, previous: number): WeekComparison => {
      const diff = current - previous;
      const percentage = previous !== 0 ? Math.round((diff / previous) * 100) : 0;
      const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
      
      return { current, previous, diff, percentage, trend };
    };

    const thisWeekAvgMinutesPerLesson = thisWeek.lessons > 0 ? thisWeek.minutes / thisWeek.lessons : 0;
    const lastWeekAvgMinutesPerLesson = lastWeek.lessons > 0 ? lastWeek.minutes / lastWeek.lessons : 0;

    return {
      xp: createComparison(Math.round(thisWeek.xp / 7), Math.round(lastWeek.xp / 7)),
      minutes: createComparison(Math.round(thisWeek.minutes / 7), Math.round(lastWeek.minutes / 7)),
      lessons: createComparison(Math.round(thisWeek.lessons / 7 * 10) / 10, Math.round(lastWeek.lessons / 7 * 10) / 10),
      avgMinutesPerLesson: createComparison(Math.round(thisWeekAvgMinutesPerLesson * 10) / 10, Math.round(lastWeekAvgMinutesPerLesson * 10) / 10)
    };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'same') => {
    switch (trend) {
      case 'up': return <ArrowUp size={32} style={{ color: '#10b981' }} />;
      case 'down': return <ArrowDown size={32} style={{ color: '#ef4444' }} />;
      case 'same': return <Minus size={32} style={{ color: '#6b7280' }} />;
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

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '24px' }}>
      <style>{`
        .hover-enhance:hover {
          transform: translateY(-4px) scale(1.15);
          box-shadow: 0 20px 35px rgba(0, 0, 0, 0.2);
          filter: brightness(1.1) !important;
        }
        .chart-hover-enhance { transition: all 0.3s ease; }
        .chart-hover-enhance:hover { transform: translateY(-4px) scale(1.05); box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2); }
      `}</style>

      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: '600', color: '#1f2937', margin: 0 }}>Duolingo Learning Analytics</h1>
              <p style={{ color: '#6b7280', margin: '4px 0 0 0', fontSize: '14px' }}>Gmail API連携でリアルタイム学習進捗追跡</p>
            </div>
            <button onClick={fetchData} disabled={loading} className="hover-enhance" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: loading ? '#9ca3af' : '#10b981', color: 'white', padding: '12px 20px', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '500', transition: 'all 0.3s ease' }}>
              <RefreshCw size={16} />
              <span>{loading ? 'データ取得中...' : 'Gmail同期'}</span>
            </button>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px', border: '2px solid rgba(16, 185, 129, 0.2)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ChevronUp size={24} style={{ color: '#10b981' }} />
            これまでの全体サマリ
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: '総XP', value: stats.totalXP.toLocaleString(), color: colors.xp },
              { label: '総学習時間', value: `${stats.totalHours}時間`, color: colors.time },
              { label: '総レッスン数', value: stats.totalLessons, color: colors.lesson },
              { label: '現在の連続記録', value: `${stats.currentStreak}日`, color: colors.streak }
            ].map((item, index) => (
              <div key={index} className="hover-enhance" style={{ background: '#f8fafc', borderRadius: '16px', padding: '24px', transition: 'all 0.3s ease', border: `3px solid ${item.color}` }}>
                <p style={{ fontSize: '14px', margin: '0 0 4px 0', color: '#6b7280', fontWeight: '500' }}>{item.label}</p>
                <p style={{ fontSize: '36px', fontWeight: 'bold', margin: 0, color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {[
              { label: '1日平均XP', value: stats.avgXPPerWeek ? Math.round(stats.avgXPPerWeek / 7) : 0, color: colors.xp },
              { label: '1日平均学習時間', value: `${stats.avgMinutesPerDay}分`, color: colors.time },
              { label: '1日平均レッスン数', value: `${stats.avgLessonsPerDay}回`, color: colors.lesson },
              { label: '1レッスン平均時間', value: `${stats.avgMinutesPerLesson}分`, color: colors.streak }
            ].map((item, index) => (
              <div key={index} className="hover-enhance" style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', transition: 'all 0.3s ease', border: `2px solid ${item.color}` }}>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 4px 0' }}>{item.label}</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: item.color, margin: 0 }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px', border: '2px solid rgba(16, 185, 129, 0.2)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ChevronUp size={24} style={{ color: '#10b981' }} />
            1日平均での先週比較
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
            {[
              { key: 'xp', label: '1日平均XP', data: weekComparisons.xp, color: colors.xp },
              { key: 'minutes', label: '1日平均学習時間', data: weekComparisons.minutes, color: colors.time },
              { key: 'lessons', label: '1日平均レッスン数', data: weekComparisons.lessons, color: colors.lesson },
              { key: 'avgMinutes', label: '1レッスン平均時間', data: weekComparisons.avgMinutesPerLesson, color: colors.streak }
            ].map((item, index) => (
              <div key={item.key} className="hover-enhance" onMouseEnter={() => setHoveredCard(index)} onMouseLeave={() => setHoveredCard(null)} style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', border: `1px solid ${item.color}33`, position: 'relative', transition: 'all 0.3s ease' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(Math.abs(item.data.percentage) * 3, 100)}%`, background: `linear-gradient(90deg, ${getTrendColor(item.data.trend)}22, transparent)`, borderRadius: '12px 0 0 12px', opacity: hoveredCard === index ? 0.8 : 0.4, transition: 'all 0.3s ease' }} />
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', position: 'relative' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: item.color, margin: 0 }}>{item.label}</h3>
                  {getTrendIcon(item.data.trend)}
                </div>
                
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937' }}>
                        {typeof item.data.current === 'number' && item.data.current % 1 !== 0 ? item.data.current.toFixed(1) : item.data.current.toLocaleString()}
                      </span>
                      <span style={{ fontSize: '14px', color: '#6b7280' }}>
                        {item.key === 'minutes' ? '分' : item.key === 'lessons' ? '回' : item.key === 'avgMinutes' ? '分' : item.key === 'xp' ? 'XP' : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: '16px', color: getTrendColor(item.data.trend), fontWeight: '600' }}>
                      {item.data.diff > 0 ? '+' : ''}{typeof item.data.diff === 'number' && item.data.diff % 1 !== 0 ? item.data.diff.toFixed(1) : item.data.diff} 
                      ({item.data.percentage > 0 ? '+' : ''}{item.data.percentage}%)
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                    先週: {typeof item.data.previous === 'number' && item.data.previous % 1 !== 0 ? item.data.previous.toFixed(1) : item.data.previous.toLocaleString()}
                    {item.key === 'minutes' ? '分' : item.key === 'lessons' ? '回' : item.key === 'avgMinutes' ? '分' : item.key === 'xp' ? 'XP' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px', border: '2px solid rgba(16, 185, 129, 0.2)', width: 'calc(100% - 60px)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ChevronUp size={24} style={{ color: '#10b981' }} />
            学習推移チャート
          </h2>

          <div className="chart-hover-enhance" style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '2px solid rgba(16, 185, 129, 0.2)', overflow: 'hidden' }}>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData} margin={{ top: 10, right: 50, left: 10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#6b7280" fontSize={11} angle={-45} textAnchor="end" height={60} />
                <YAxis yAxisId="left" stroke={colors.xp} fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={11} />
                <Tooltip contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} labelFormatter={(label) => `日付: ${formatDate(label)}`} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line yAxisId="left" type="monotone" dataKey="xp" stroke={colors.xp} strokeWidth={3} dot={{ fill: colors.xp, r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="minutes" stroke={colors.time} strokeWidth={3} dot={{ fill: colors.time, r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="lessons" stroke={colors.lesson} strokeWidth={3} dot={{ fill: colors.lesson, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;