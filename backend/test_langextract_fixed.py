#!/usr/bin/env python3
"""
LangExtract テスト - Duolingoメール解析（修正版）
"""
import langextract as lx
from get_duolingo_weekly_reports_fixed import get_duolingo_weekly_reports

def test_langextract_parsing():
    """LangExtractでDuolingoデータ解析テスト"""
    
    prompt = """
    Duolingoウィークリーレポートから以下の学習データを抽出してください：
    
    1. XP（経験値）- 例: "4022XP"
    2. 学習時間（分数）- 例: "346分" 
    3. レッスン回数 - 例: "レッスン 69回"
    4. 連続記録 - 例: "55日連続記録"
    5. 各項目の変化率 - 例: "32%"
    
    正確な数値を抽出してください。
    """
    
    # 実際のメールデータを取得
    print("Duolingoメール取得中...")
    reports = get_duolingo_weekly_reports()
    
    if not reports:
        print("ウィークリーレポートが見つかりません")
        return
    
    # 最新のレポートを解析
    latest_report = reports[0]
    print(f"解析対象: {latest_report['subject']}")
    print(f"日付: {latest_report['date']}")
    
    # 本文の一部を表示
    body_preview = latest_report['body'][:200]
    print(f"本文プレビュー: {body_preview}...")
    
    # LangExtractで解析（シンプル版）
    try:
        result = lx.extract(
            text_or_documents=latest_report['body'],
            prompt_description=prompt,
            model_id="gemini-2.5-flash"
        )
        
        print(f"\n抽出結果:")
        print(f"発見した項目数: {len(result.extractions)}")
        
        for i, extraction in enumerate(result.extractions):
            print(f"{i+1}. クラス: {extraction.extraction_class}")
            print(f"   テキスト: {extraction.extraction_text}")
            if hasattr(extraction, 'attributes') and extraction.attributes:
                print(f"   属性: {extraction.attributes}")
                
    except Exception as e:
        print(f"LangExtract エラー: {e}")
        print("正規表現で手動解析を試行...")
        
        # フォールバック: 正規表現解析
        manual_data = manual_extract(latest_report['body'])
        if manual_data:
            print("手動解析結果:")
            for key, value in manual_data.items():
                print(f"  {key}: {value}")

def manual_extract(body):
    """手動正規表現解析"""
    import re
    data = {}
    
    # XP抽出
    xp_match = re.search(r'(\d+)XP', body)
    if xp_match:
        data['XP'] = xp_match.group(1)
    
    # 分数抽出
    minutes_match = re.search(r'(\d+)分', body)
    if minutes_match:
        data['Minutes'] = minutes_match.group(1)
    
    # レッスン数抽出
    lessons_match = re.search(r'レッスン\s*(\d+)回', body)
    if lessons_match:
        data['Lessons'] = lessons_match.group(1)
    
    # 連続記録抽出
    streak_match = re.search(r'(\d+)日連続', body)
    if streak_match:
        data['Streak'] = streak_match.group(1)
    
    return data

if __name__ == '__main__':
    test_langextract_parsing()
