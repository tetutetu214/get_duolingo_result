#!/usr/bin/env python3
"""
Duolingo BI Dashboard - Flask API
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
from get_duolingo_weekly_reports_fixed import get_duolingo_weekly_reports
from datetime import datetime
import json

app = Flask(__name__)
CORS(app)

@app.route('/api/duolingo/reports', methods=['GET'])
def get_reports():
    """Duolingoウィークリーレポート一覧取得"""
    try:
        reports = get_duolingo_weekly_reports()
        
        # フロントエンド用にデータ整形
        formatted_reports = []
        for report in reports:
            if report.get('data'):
                formatted_reports.append({
                    'date': report['date'],
                    'subject': report['subject'],
                    'xp': report['data'].get('xp', 0),
                    'minutes': report['data'].get('minutes', 0),
                    'lessons': report['data'].get('lessons', 0),
                    'streak': report['data'].get('streak', 0)
                })
        
        return jsonify({
            'success': True,
            'data': formatted_reports,
            'count': len(formatted_reports)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/duolingo/sync', methods=['POST'])
def sync_reports():
    """メール同期（手動トリガー）"""
    return get_reports()  # 同じ処理

if __name__ == '__main__':
    print("🚀 Duolingo BI API サーバー起動中...")
    app.run(debug=True, port=5000)

@app.route('/')
def index():
    """API情報表示"""
    return jsonify({
        'message': 'Duolingo BI Dashboard API',
        'endpoints': {
            '/api/duolingo/reports': 'GET - ウィークリーレポート取得',
            '/api/duolingo/sync': 'POST - メール同期'
        }
    })
