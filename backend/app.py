#!/usr/bin/env python3
"""
Duolingo BI Dashboard - Flask API with SQLite Cache
"""
import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import json

from database import (
    init_database,
    insert_reports_bulk,
    get_all_reports,
    get_latest_date,
    count_reports
)

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import base64
import re

app = Flask(__name__)
CORS(app)

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']


def ensure_gmail_auth():
    """Gmail認証を確実に行う（自動再認証機能付き）"""
    try:
        creds = None
        
        if os.path.exists('token.json'):
            try:
                creds = Credentials.from_authorized_user_file('token.json', SCOPES)
                
                if creds and creds.valid:
                    print("✅ 既存の認証情報を使用")
                    return creds
                
                if creds and creds.expired and creds.refresh_token:
                    print("🔄 認証情報をリフレッシュ中...")
                    creds.refresh(Request())
                    
                    with open('token.json', 'w') as token:
                        token.write(creds.to_json())
                    print("✅ 認証情報をリフレッシュしました")
                    return creds
                    
            except Exception as refresh_error:
                print(f"🗑️ 認証情報が無効です: {refresh_error}")
                os.remove('token.json')
                print("🗑️ 無効なtoken.jsonを削除しました")
        
        if not os.path.exists('credentials.json'):
            raise Exception("credentials.jsonが見つかりません。Google Cloud Consoleから認証情報をダウンロードしてください。")
        
        print("🔐 新規認証を開始します...")
        print("📌 ブラウザが開きます。Googleアカウントでログインしてください。")
        
        flow = InstalledAppFlow.from_client_secrets_file(
            'credentials.json', SCOPES)
        creds = flow.run_local_server(port=0)
        
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
        
        print("✅ 新規認証が完了しました")
        return creds
        
    except Exception as e:
        print(f"❌ Gmail認証エラー: {e}")
        return None


def get_gmail_service():
    """Gmail APIサービス取得（認証自動化）"""
    creds = ensure_gmail_auth()
    if not creds:
        raise Exception("Gmail認証に失敗しました")
    
    return build('gmail', 'v1', credentials=creds)


def get_duolingo_weekly_reports():
    """Duolingoウィークリーレポート取得（修正版）"""
    try:
        service = get_gmail_service()
        
        queries = [
            'from:duolingo "今週の進捗はいかに"'
        ]
        
        all_reports = []
        
        for query in queries:
            print(f"🔍 検索クエリ: {query}")
            
            results = service.users().messages().list(
                userId='me',
                q=query,
                maxResults=20
            ).execute()
            
            messages = results.get('messages', [])
            print(f"📨 発見メール数: {len(messages)}")
            
            for message in messages:
                msg = service.users().messages().get(
                    userId='me',
                    id=message['id']
                ).execute()
                
                headers = msg['payload'].get('headers', [])
                subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '')
                date = next((h['value'] for h in headers if h['name'] == 'Date'), '')
                
                body = extract_email_body(msg)
                
                if is_weekly_report(subject, body):
                    print(f"✅ 確定: ウィークリーレポート - {subject}")
                    
                    data = extract_duolingo_data(body)
                    if data:
                        all_reports.append({
                            'subject': subject,
                            'date': date,
                            'message_id': message['id'],
                            'data': data
                        })
                    else:
                        print(f"⚠️ データ抽出失敗: {subject}")
        
        return all_reports
        
    except Exception as e:
        print(f"❌ メール取得エラー: {e}")
        return []


def is_weekly_report(subject, body):
    """ウィークリーレポート確定判定"""
    weekly_subjects = [
        "週間レポート", "ウィークリーレポート", "Weekly Progress",
        "進捗をチェック", "成果が積み重なって"
    ]
    
    if any(ws in subject for ws in weekly_subjects):
        return True
    
    weekly_patterns = [
        r'\d+XP',
        r'\d+分',
        r'レッスン\s*\d+回',
        r'\d+日連続',
        r'Weekly Progress'
    ]
    
    matches = sum(1 for pattern in weekly_patterns if re.search(pattern, body))
    return matches >= 3


def extract_duolingo_data(body):
    """Duolingo学習データ抽出"""
    data = {}
    
    xp_match = re.search(r'(\d+)XP', body)
    if xp_match:
        data['xp'] = int(xp_match.group(1))
    
    minutes_match = re.search(r'(\d+)分', body)
    if minutes_match:
        data['minutes'] = int(minutes_match.group(1))
    
    lessons_match = re.search(r'レッスン\s*(\d+)回', body)
    if lessons_match:
        data['lessons'] = int(lessons_match.group(1))
    
    streak_match = re.search(r'(\d+)日連続', body)
    if streak_match:
        data['streak'] = int(streak_match.group(1))
    
    return data if data else None


def extract_email_body(msg):
    """メール本文抽出（改良版）"""
    body = ""
    
    def extract_text_from_payload(payload):
        nonlocal body
        
        if 'parts' in payload:
            for part in payload['parts']:
                extract_text_from_payload(part)
        else:
            if payload.get('mimeType') == 'text/plain':
                data = payload.get('body', {}).get('data')
                if data:
                    body += base64.urlsafe_b64decode(data).decode('utf-8')
            elif payload.get('mimeType') == 'text/html':
                data = payload.get('body', {}).get('data')
                if data:
                    html_content = base64.urlsafe_b64decode(data).decode('utf-8')
                    text = re.sub(r'<[^>]+>', ' ', html_content)
                    text = re.sub(r'\s+', ' ', text)
                    body += text
    
    extract_text_from_payload(msg['payload'])
    return body.strip()


@app.route('/api/duolingo/reports', methods=['GET'])
def get_reports():
    """Duolingoウィークリーレポート一覧取得（DB優先、空なら初回同期）"""
    try:
        print("📊 Duolingoレポート取得開始...")
        
        reports = get_all_reports()
        
        if len(reports) == 0:
            print("🔄 DB空のため初回Gmail同期を実行...")
            gmail_reports = get_duolingo_weekly_reports()
            
            if gmail_reports:
                db_reports = []
                for report in gmail_reports:
                    if report.get('data'):
                        db_reports.append({
                            'message_id': report['message_id'],
                            'subject': report['subject'],
                            'date': report['date'],
                            'xp': report['data'].get('xp', 0),
                            'minutes': report['data'].get('minutes', 0),
                            'lessons': report['data'].get('lessons', 0),
                            'streak': report['data'].get('streak', 0)
                        })
                
                new_count = insert_reports_bulk(db_reports)
                print(f"✅ {new_count}件の新規レポートを保存しました")
                
                reports = get_all_reports()
        
        formatted_reports = []
        for report in reports:
            formatted_reports.append({
                'date': report['date'],
                'subject': report['subject'],
                'xp': report['xp'],
                'minutes': report['minutes'],
                'lessons': report['lessons'],
                'streak': report['streak']
            })
        
        print(f"✅ {len(formatted_reports)}件のレポートを取得しました")
        
        return jsonify({
            'success': True,
            'data': formatted_reports,
            'count': len(formatted_reports),
            'from_cache': len(reports) > 0
        })
        
    except Exception as e:
        print(f"❌ APIエラー: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/duolingo/sync', methods=['POST'])
def sync_reports():
    """メール同期（Gmail → DB）"""
    try:
        print("🔄 Gmail同期開始...")
        
        gmail_reports = get_duolingo_weekly_reports()
        
        if not gmail_reports:
            print("⚠️ 新規レポートなし")
            return jsonify({
                'success': True,
                'sync_info': {
                    'new_records': 0,
                    'total_records': count_reports()
                },
                'data': []
            })
        
        db_reports = []
        for report in gmail_reports:
            if report.get('data'):
                db_reports.append({
                    'message_id': report['message_id'],
                    'subject': report['subject'],
                    'date': report['date'],
                    'xp': report['data'].get('xp', 0),
                    'minutes': report['data'].get('minutes', 0),
                    'lessons': report['data'].get('lessons', 0),
                    'streak': report['data'].get('streak', 0)
                })
        
        new_count = insert_reports_bulk(db_reports)
        
        print(f"✅ {new_count}件の新規レポートを保存しました")
        
        all_reports = get_all_reports()
        formatted_reports = []
        for report in all_reports:
            formatted_reports.append({
                'date': report['date'],
                'subject': report['subject'],
                'xp': report['xp'],
                'minutes': report['minutes'],
                'lessons': report['lessons'],
                'streak': report['streak']
            })
        
        return jsonify({
            'success': True,
            'sync_info': {
                'new_records': new_count,
                'total_records': count_reports()
            },
            'data': formatted_reports
        })
        
    except Exception as e:
        print(f"❌ 同期エラー: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/')
def index():
    """API情報表示"""
    return jsonify({
        'message': 'Duolingo BI Dashboard API',
        'version': '3.0 - SQLite Cache',
        'endpoints': {
            '/api/duolingo/reports': 'GET - ウィークリーレポート取得（DB優先）',
            '/api/duolingo/sync': 'POST - メール同期（Gmail → DB）'
        }
    })


if __name__ == '__main__':
    print("🚀 Duolingo BI API サーバー起動中...")
    print("📧 SQLite Cache有効")
    
    init_database()
    
    app.run(debug=True, port=5000)
