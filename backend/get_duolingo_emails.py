#!/usr/bin/env python3
"""
Duolingoウィークリーレポート取得とLangExtract解析
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
    """Duolingoウィークリーレポート取得"""
    service = get_gmail_service()
    
    # ウィークリーレポートを絞り込み検索
    query = 'from:duolingo (weekly OR ウィークリー OR "進捗" OR "XP") newer_than:30d'
    
    print(f"🔍 検索クエリ: {query}")
    
    results = service.users().messages().list(
        userId='me',
        q=query,
        maxResults=10
    ).execute()
    
    messages = results.get('messages', [])
    print(f"📨 発見メール数: {len(messages)}")
    
    reports = []
    
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
        
        print(f"\n📧 件名: {subject}")
        print(f"📅 日付: {date}")
        print(f"📝 本文プレビュー: {body[:100]}...")
        
        # XPや時間などのデータが含まれているかチェック
        if any(keyword in body.lower() for keyword in ['xp', '分', 'レッスン', '連続']):
            print("✅ ウィークリーレポートの可能性が高い")
            reports.append({
                'subject': subject,
                'date': date,
                'body': body,
                'message_id': message['id']
            })
        else:
            print("❌ ウィークリーレポートではない")
    
    return reports

def extract_email_body(msg):
    """メール本文抽出"""
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
                    # HTMLから簡単にテキスト抽出
                    import re
                    text = re.sub(r'<[^>]+>', '', html_content)
                    body += text
    
    extract_text_from_payload(msg['payload'])
    return body

if __name__ == '__main__':
    print("🦉 Duolingoウィークリーレポート取得開始...")
    reports = get_duolingo_weekly_reports()
    print(f"\n🎯 ウィークリーレポート候補: {len(reports)}件")
