#!/usr/bin/env python3
"""
LangExtract テスト - Duolingoメール解析
"""
import langextract as lx
from get_duolingo_weekly_reports_fixed import get_duolingo_weekly_reports

def test_langextract_parsing():
    """LangExtractでDuolingoデータ解析テスト"""
    
    # サンプル用の具体例を定義
    example = lx.data.ExampleData(
        text="Weekly Progress 4022XP 先週との差 32% 346分 先週との差 14% レッスン 69回 先週との差 21% 55日連続記録",
        extractions=[
            lx.data.Extraction(
                extraction_class="XP",
                extraction_text="4022XP",
                char_start=15,
                char_end=21,
                attributes={"value": 4022, "change": "32%"}
            ),
            lx.data.Extraction(
                extraction_class="Minutes", 
                extraction_text="346分",
                char_start=38,
                char_end=42,
                attributes={"value": 346, "change": "14%"}
            ),
            lx.data.Extraction(
                extraction_class="Lessons",
                extraction_text="レッスン 69回", 
                char_start=59,
                char_end=67,
                attributes={"value": 69, "change": "21%"}
            ),
            lx.data.Extraction(
                extraction_class="Streak",
                extraction_text="55日連続記録",
                char_start=84,
                char_end=91,
                attributes={"value": 55}
            )
        ]
    )
    
    prompt = """
    Duolingoウィークリーレポートから学習データを抽出してください：
    - XP（経験値）とその変化率
    - 学習時間（分）とその変化率  
    - レッスン回数とその変化率
    - 連続記録（日数）
    
    数値と変化率を正確に抽出してください。
    """
    
    # 実際のメールデータを取得
    print("Duolingoメール取得中...")
    reports = get_duolingo_weekly_reports()
    
    if not reports:
        print("ウィークリーレポートが見つかりません")
        return
    
    # 最新のレポートを解析
    latest_report = reports[0]
    print(f"\n解析対象: {latest_report['subject']}")
    
    # LangExtractで解析
    result = lx.extract(
        text_or_documents=latest_report['body'],
        prompt_description=prompt,
        examples=[example],
        model_id="gemini-2.5-flash"
    )
    
    print(f"\n抽出結果:")
    for extraction in result.extractions:
        print(f"- {extraction.extraction_class}: {extraction.extraction_text}")
        print(f"  属性: {extraction.attributes}")
        print(f"  位置: {extraction.char_start}-{extraction.char_end}")

if __name__ == '__main__':
    test_langextract_parsing()
