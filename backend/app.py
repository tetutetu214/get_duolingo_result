#!/usr/bin/env python3
"""
Duolingo BI Dashboard - Flask API with Auto Gmail Auth
"""
import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import json

# Gmail API関連
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import base64
import re

app = Flask(__name__)
CORS(app)

# Gmail APIのスコープ設定
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def ensure_gmail_auth():
    """Gmail認証を確実に行う（自動再認証機能付き）"""
    try:
        creds = None
        
        # 既存のtoken.jsonをチェック
        if os.path.exists('token.json'):
            try:
                creds = Credentials.from_authorized_user_file('token.json', SCOPES)
                
                # 有効な認証情報がある場合はそのまま返す
                if creds and creds.valid:
                    print("✅ 既存の認証情報を使用")
                    return creds
                
                # 期限切れだがリフレッシュ可能な場合
                if creds and creds.expired and creds.refresh_token:
                    print("🔄 認証情報をリフレッシュ中...")
                    creds.refresh(Request())
                    
                    # リフレッシュ成功時は保存
                    with open('token.json', 'w') as token:
                        token.write(creds.to_json())
                    print("✅ 認証情報をリフレッシュしました")
                    return creds
                    
            except Exception as refresh_error:
                print(f"🗑️ 認証情報が無効です: {refresh_error}")
                # 無効なtoken.jsonを削除
                os.remove('token.json')
                print("🗑️ 無効なtoken.jsonを削除しました")
        
        # credentials.jsonの存在確認
        if not os.path.exists('credentials.json'):
            raise Exception("credentials.jsonが見つかりません。Google Cloud Consoleから認証情報をダウンロードしてください。")
        
        # 新規認証フロー
        print("🔐 新規認証を開始します...")
        print("📌 ブラウザが開きます。Googleアカウントでログインしてください。")
        
        flow = InstalledAppFlow.from_client_secrets_file(
            'credentials.json', SCOPES)
        creds = flow.run_local_server(port=0)
        
        # 新しいtoken.jsonを保存
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
        
        # より具体的なウィークリーレポート検索
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
                
                # ヘッダー取得
                headers = msg['payload'].get('headers', [])
                subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '')
                date = next((h['value'] for h in headers if h['name'] == 'Date'), '')
                
                # 本文取得
                body = extract_email_body(msg)
                
                # ウィークリーレポート確定判定
                if is_weekly_report(subject, body):
                    print(f"✅ 確定: ウィークリーレポート - {subject}")
                    
                    # XP、分数、レッスン数を抽出
                    data = extract_duolingo_data(body)
                    if data:
                        all_reports.append({
                            'subject': subject,
                            'date': date,
                            'body': body,
                            'data': data,
                            'message_id': message['id']
                        })
                    else:
                        print(f"⚠️ データ抽出失敗: {subject}")
        
        return all_reports
        
    except Exception as e:
        print(f"❌ メール取得エラー: {e}")
        return []

def is_weekly_report(subject, body):
    """ウィークリーレポート確定判定"""
    # 件名での判定
    weekly_subjects = [
        "週間レポート", "ウィークリーレポート", "Weekly Progress",
        "進捗をチェック", "成果が積み重なって"
    ]
    
    if any(ws in subject for ws in weekly_subjects):
        return True
    
    # 本文での判定（より厳密に）
    weekly_patterns = [
        r'\d+XP',  # XPの数値
        r'\d+分',  # 分数
        r'レッスン\s*\d+回',  # レッスン回数
        r'\d+日連続',  # 連続記録
        r'Weekly Progress'
    ]
    
    matches = sum(1 for pattern in weekly_patterns if re.search(pattern, body))
    return matches >= 3  # 3つ以上のパターンがマッチすれば確定

def extract_duolingo_data(body):
    """Duolingo学習データ抽出"""
    data = {}
    
    # XP抽出
    xp_match = re.search(r'(\d+)XP', body)
    if xp_match:
        data['xp'] = int(xp_match.group(1))
    
    # 分数抽出
    minutes_match = re.search(r'(\d+)分', body)
    if minutes_match:
        data['minutes'] = int(minutes_match.group(1))
    
    # レッスン数抽出
    lessons_match = re.search(r'レッスン\s*(\d+)回', body)
    if lessons_match:
        data['lessons'] = int(lessons_match.group(1))
    
    # 連続記録抽出
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
                    # HTMLから適切にテキスト抽出
                    # HTMLタグを削除
                    text = re.sub(r'<[^>]+>', ' ', html_content)
                    # 複数の空白を単一に
                    text = re.sub(r'\s+', ' ', text)
                    body += text
    
    extract_text_from_payload(msg['payload'])
    return body.strip()

@app.route('/api/duolingo/reports', methods=['GET'])
def get_reports():
    """Duolingoウィークリーレポート一覧取得"""
    try:
        print("📊 Duolingoレポート取得開始...")
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
        
        print(f"✅ {len(formatted_reports)}件のレポートを取得しました")
        
        return jsonify({
            'success': True,
            'data': formatted_reports,
            'count': len(formatted_reports)
        })
        
    except Exception as e:
        print(f"❌ APIエラー: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/duolingo/sync', methods=['POST'])
def sync_reports():
    """メール同期（手動トリガー）"""
    return get_reports()  # 同じ処理

@app.route('/')
def index():
    """API情報表示"""
    return jsonify({
        'message': 'Duolingo BI Dashboard API',
        'version': '2.0 - Auto Gmail Auth',
        'endpoints': {
            '/api/duolingo/reports': 'GET - ウィークリーレポート取得',
            '/api/duolingo/sync': 'POST - メール同期'
        }
    })

if __name__ == '__main__':
    print("🚀 Duolingo BI API サーバー起動中...")
    print("📧 Gmail API自動認証機能付き")
    app.run(debug=True, port=5000)
