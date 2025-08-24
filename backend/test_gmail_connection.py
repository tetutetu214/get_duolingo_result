#!/usr/bin/env python3
"""
Gmail API認証テスト
"""
import os
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# Gmail APIのスコープ設定
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def authenticate_gmail():
    """Gmail API認証"""
    creds = None
    
    # token.jsonが存在する場合は読み込み
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    # 認証情報が無効または存在しない場合
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("🔄 認証情報を更新中...")
            creds.refresh(Request())
        else:
            print("🔐 初回認証を開始します...")
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        
        # token.jsonに保存
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    
    return creds

def test_gmail_connection():
    """Gmail接続テスト"""
    try:
        print("📧 Gmail API接続テストを開始...")
        
        # 認証
        creds = authenticate_gmail()
        
        # Gmail API サービス構築
        service = build('gmail', 'v1', credentials=creds)
        
        # プロフィール取得テスト
        profile = service.users().getProfile(userId='me').execute()
        print(f"✅ 認証成功！")
        print(f"📧 メールアドレス: {profile['emailAddress']}")
        print(f"📊 総メッセージ数: {profile['messagesTotal']}")
        print(f"🗂️ 総スレッド数: {profile['threadsTotal']}")
        
        # Duolingoメール検索テスト
        print("\n🦉 Duolingoメール検索テスト...")
        query = 'from:duolingo OR from:hello@duolingo.com'
        results = service.users().messages().list(
            userId='me', 
            q=query,
            maxResults=5
        ).execute()
        
        messages = results.get('messages', [])
        print(f"📨 Duolingoメール発見数: {len(messages)}")
        
        if messages:
            print("最新のDuolingoメール:")
            for i, message in enumerate(messages[:3]):
                msg = service.users().messages().get(
                    userId='me', 
                    id=message['id']
                ).execute()
                
                headers = msg['payload'].get('headers', [])
                subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
                date = next((h['value'] for h in headers if h['name'] == 'Date'), 'No Date')
                
                print(f"  {i+1}. {subject[:50]}...")
                print(f"     日付: {date}")
        else:
            print("⚠️ Duolingoメールが見つかりませんでした")
            print("   検索クエリを調整する必要があるかもしれません")
        
        print("\n🎉 Gmail API接続テスト完了！")
        return True
        
    except Exception as e:
        print(f"❌ エラー: {e}")
        return False

if __name__ == '__main__':
    test_gmail_connection()
