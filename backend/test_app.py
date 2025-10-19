#!/usr/bin/env python3
"""
app.pyのAPI統合テスト
"""
import os
import pytest
from app import app
from database import init_database, insert_reports_bulk, DB_PATH


@pytest.fixture
def client():
    """Flaskテストクライアント準備"""
    app.config['TESTING'] = True
    
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    
    init_database()
    
    with app.test_client() as client:
        yield client
    
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)


@pytest.fixture
def sample_reports():
    """テスト用サンプルデータ"""
    return [
        {
            'message_id': 'msg001',
            'subject': 'ウィークリーレポート1',
            'date': 'Sat, 30 Aug 2025 05:00:37 +0000',
            'xp': 100,
            'minutes': 50,
            'lessons': 10,
            'streak': 5
        },
        {
            'message_id': 'msg002',
            'subject': 'ウィークリーレポート2',
            'date': 'Sun, 31 Aug 2025 05:00:37 +0000',
            'xp': 200,
            'minutes': 60,
            'lessons': 15,
            'streak': 6
        }
    ]


def test_get_reports_empty_db(client):
    """正常系: DB空の場合"""
    response = client.get('/api/duolingo/reports')
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['data'] == []
    assert data['count'] == 0
    assert data['from_cache'] is True


def test_get_reports_with_data(client, sample_reports):
    """正常系: DBにデータがある場合"""
    insert_reports_bulk(sample_reports)
    
    response = client.get('/api/duolingo/reports')
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['count'] == 2
    assert len(data['data']) == 2
    assert data['from_cache'] is True
    assert data['data'][0]['xp'] == 200
    assert data['data'][1]['xp'] == 100


def test_get_reports_order_by_date_desc(client, sample_reports):
    """正常系: 日付降順で取得"""
    insert_reports_bulk(sample_reports)
    
    response = client.get('/api/duolingo/reports')
    data = response.get_json()
    
    assert data['data'][0]['subject'] == 'ウィークリーレポート2'
    assert data['data'][1]['subject'] == 'ウィークリーレポート1'
