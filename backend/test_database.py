#!/usr/bin/env python3
"""
database.pyの単体テスト
"""
import os
import pytest
import sqlite3
from database import (
    get_connection,
    init_database,
    insert_report,
    insert_reports_bulk,
    get_all_reports,
    get_latest_date,
    count_reports,
    DB_PATH
)


@pytest.fixture
def test_db():
    """テスト用DB準備"""
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    
    init_database()
    yield
    
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)


def test_init_database_creates_table(test_db):
    """テーブル作成の確認"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='reports'
    """)
    
    result = cursor.fetchone()
    conn.close()
    
    assert result is not None
    assert result['name'] == 'reports'


def test_insert_report_success(test_db):
    """正常系: レポート挿入成功"""
    report = {
        'message_id': 'test123',
        'subject': 'テスト件名',
        'date': 'Sat, 30 Aug 2025 05:00:37 +0000',
        'xp': 100,
        'minutes': 50,
        'lessons': 10,
        'streak': 5
    }
    
    result = insert_report(report)
    
    assert result is True
    assert count_reports() == 1


def test_insert_report_duplicate_message_id(test_db):
    """異常系: message_id重複時は無視"""
    report = {
        'message_id': 'test123',
        'subject': 'テスト件名',
        'date': 'Sat, 30 Aug 2025 05:00:37 +0000',
        'xp': 100,
        'minutes': 50,
        'lessons': 10,
        'streak': 5
    }
    
    result1 = insert_report(report)
    result2 = insert_report(report)
    
    assert result1 is True
    assert result2 is False
    assert count_reports() == 1


def test_insert_reports_bulk_success(test_db):
    """正常系: 一括挿入成功"""
    reports = [
        {
            'message_id': 'test1',
            'subject': '件名1',
            'date': 'Sat, 30 Aug 2025 05:00:37 +0000',
            'xp': 100,
            'minutes': 50,
            'lessons': 10,
            'streak': 5
        },
        {
            'message_id': 'test2',
            'subject': '件名2',
            'date': 'Sat, 31 Aug 2025 05:00:37 +0000',
            'xp': 200,
            'minutes': 60,
            'lessons': 15,
            'streak': 6
        }
    ]
    
    inserted_count = insert_reports_bulk(reports)
    
    assert inserted_count == 2
    assert count_reports() == 2


def test_insert_reports_bulk_with_duplicate(test_db):
    """異常系: 一括挿入で重複がある場合"""
    reports = [
        {
            'message_id': 'test1',
            'subject': '件名1',
            'date': 'Sat, 30 Aug 2025 05:00:37 +0000',
            'xp': 100,
            'minutes': 50,
            'lessons': 10,
            'streak': 5
        },
        {
            'message_id': 'test1',
            'subject': '件名1重複',
            'date': 'Sat, 31 Aug 2025 05:00:37 +0000',
            'xp': 200,
            'minutes': 60,
            'lessons': 15,
            'streak': 6
        }
    ]
    
    inserted_count = insert_reports_bulk(reports)
    
    assert inserted_count == 1
    assert count_reports() == 1


def test_get_all_reports_empty(test_db):
    """境界値: DB空の場合"""
    reports = get_all_reports()
    
    assert reports == []


def test_get_all_reports_order(test_db):
    """正常系: 日付降順でソート"""
    reports = [
        {
            'message_id': 'test1',
            'subject': '古い',
            'date': 'Sat, 30 Aug 2025 05:00:37 +0000',
            'xp': 100,
            'minutes': 50,
            'lessons': 10,
            'streak': 5
        },
        {
            'message_id': 'test2',
            'subject': '新しい',
            'date': 'Sun, 31 Aug 2025 05:00:37 +0000',
            'xp': 200,
            'minutes': 60,
            'lessons': 15,
            'streak': 6
        }
    ]
    
    insert_reports_bulk(reports)
    result = get_all_reports()
    
    assert len(result) == 2
    assert result[0]['subject'] == '新しい'
    assert result[1]['subject'] == '古い'


def test_get_latest_date_empty(test_db):
    """境界値: DB空の場合はNone"""
    latest_date = get_latest_date()
    
    assert latest_date is None


def test_get_latest_date_success(test_db):
    """正常系: 最新日付取得"""
    reports = [
        {
            'message_id': 'test1',
            'subject': '古い',
            'date': 'Sat, 30 Aug 2025 05:00:37 +0000',
            'xp': 100,
            'minutes': 50,
            'lessons': 10,
            'streak': 5
        },
        {
            'message_id': 'test2',
            'subject': '新しい',
            'date': 'Sun, 31 Aug 2025 05:00:37 +0000',
            'xp': 200,
            'minutes': 60,
            'lessons': 15,
            'streak': 6
        }
    ]
    
    insert_reports_bulk(reports)
    latest_date = get_latest_date()
    
    assert latest_date == 'Sun, 31 Aug 2025 05:00:37 +0000'


def test_count_reports_empty(test_db):
    """境界値: DB空の場合は0"""
    count = count_reports()
    
    assert count == 0


def test_count_reports_success(test_db):
    """正常系: 件数カウント"""
    reports = [
        {
            'message_id': 'test1',
            'subject': '件名1',
            'date': 'Sat, 30 Aug 2025 05:00:37 +0000',
            'xp': 100,
            'minutes': 50,
            'lessons': 10,
            'streak': 5
        },
        {
            'message_id': 'test2',
            'subject': '件名2',
            'date': 'Sun, 31 Aug 2025 05:00:37 +0000',
            'xp': 200,
            'minutes': 60,
            'lessons': 15,
            'streak': 6
        }
    ]
    
    insert_reports_bulk(reports)
    count = count_reports()
    
    assert count == 2
