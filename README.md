# Duolingo Learning Analytics Dashboard
Gmail APIを使ってDuolingoのウィークリーレポートを自動取得し、学習進捗を可視化するダッシュボード。

## 特徴
- 学習データ取得: Gmail APIでDuolingoのウィークリーレポートを自動解析
- 統計情報: 総XP、学習時間、レッスン数、連続記録などの分析
- 視覚的なチャート: XP推移と学習時間の週次グラフ

## 技術スタック
### フロントエンド
- React 19.1.1 + TypeScript
- Recharts (チャート表示)
- Lucide React (アイコン)

### バックエンド
- Python 3.12 + Flask
- Gmail API (Google API Client)
- Flask-CORS

## セットアップ手順
### 1. Gmail API認証設定
- Google Cloud Console でプロジェクト作成
- Gmail APIを有効化
- OAuth2.0認証情報を作成
- credentials.jsonをダウンロード → backend/フォルダに配置

### 2. バックエンド設定
```bash
cd backend

# 仮想環境作成・有効化
python -m venv venv
source venv/bin/activate  # Linux/Mac

# 依存関係インストール
pip install -r requirements.txt

# Gmail API認証テスト
python test_gmail_connection.py
```

### 3. フロントエンド設定
```bash
cd frontend

# 依存関係インストール
npm install

# 開発サーバー起動
npm start
```

## 使用方法
### サーバー起動
#### バックエンド (ターミナル1)
```bash
cd backend

source venv/bin/activate
python app.py
```

#### フロントエンド (ターミナル2)
```bash
cd frontend
npm start
```

## アクセス
- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:5000

## データ更新
ブラウザで「Gmail同期」ボタンをクリックしてDuolingoメールを取得・解析

### API エンドポイント
GET /api/duolingo/reports
Duolingoウィークリーレポートデータを取得

レスポンス例:
```json
{
  "success": true,
  "count": 9,
  "data": [
    {
      "date": "Sat, 30 Aug 2025 05:00:37 +0000",
      "subject": "ウィークリーレポートをお届け！がんばったね 🤩",
      "xp": 4863,
      "minutes": 389,
      "lessons": 82,
      "streak": 62
    }
  ]
}
```

## プロジェクト構成
```bash
duolingo-analytics/
├── backend/
│   ├── app.py                                    # Flask APIメイン
│   ├── get_duolingo_weekly_reports_fixed.py     # Gmail解析ロジック
│   ├── test_gmail_connection.py                 # Gmail API認証テスト
│   ├── requirements.txt                         # Python依存関係
│   ├── credentials.json                         # Gmail API認証情報
│   └── token.json                               # 生成される認証トークン
├── frontend/
│   ├── src/
│   │   ├── App.tsx                              # Reactメインコンポーネント
│   │   └── ...
│   ├── package.json                             # Node.js依存関係
│   └── public/
└── README.md
```

## 表示される統計情報
- 総XP: 全期間の累計経験値
- 総学習時間: 全期間の累計学習時間
- 総レッスン数: 完了したレッスンの総数
- 現在の連続記録: 最新の連続学習日数
- 1日平均学習時間: レポート期間での日平均
- 1レッスン平均時間: 1レッスンあたりの平均時間
- 1日平均レッスン数: 日平均のレッスン完了数