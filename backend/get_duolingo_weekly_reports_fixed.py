#!/usr/bin/env python3
"""
Duolingoウィークリーレポート取得（修正版）
"""
import os
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import base64
import re
from datetime import datetime

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def get_gmail_service():
    """Gmail API サービス取得"""
    creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    return build('gmail', 'v1', credentials=creds)

def get_duolingo_weekly_reports():
    """Duolingoウィークリーレポート取得（修正版）"""
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
                print(f"\n✅ 確定: ウィークリーレポート")
                print(f"📧 件名: {subject}")
                print(f"📅 日付: {date}")
                
                # XP、分数、レッスン数を抽出
                data = extract_duolingo_data(body)
                if data:
                    print(f"📊 抽出データ: {data}")
                    all_reports.append({
                        'subject': subject,
                        'date': date,
                        'body': body,
                        'data': data,
                        'message_id': message['id']
                    })
                else:
                    print(f"⚠️ データ抽出失敗")
            else:
                print(f"❌ 除外: {subject}")
    
    return all_reports

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
                    import re
                    # HTMLタグを削除
                    text = re.sub(r'<[^>]+>', ' ', html_content)
                    # 複数の空白を単一に
                    text = re.sub(r'\s+', ' ', text)
                    body += text
    
    extract_text_from_payload(msg['payload'])
    return body.strip()

if __name__ == '__main__':
    print("🦉 Duolingoウィークリーレポート取得開始...")
    reports = get_duolingo_weekly_reports()
    print(f"\n🎯 確定ウィークリーレポート: {len(reports)}件")
    
    for i, report in enumerate(reports):
        print(f"\n{i+1}. {report['subject']}")
        print(f"   日付: {report['date']}")
        if report['data']:
            for key, value in report['data'].items():
                print(f"   {key}: {value}")
