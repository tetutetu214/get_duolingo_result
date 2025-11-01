#!/usr/bin/env python3
"""
SQLiteデータベース管理
"""
import sqlite3
import os
from typing import List, Dict, Optional
from email.utils import parsedate_to_datetime


DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "duolingo_data.db")


def get_connection() -> sqlite3.Connection:
    """DB接続取得"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database() -> None:
    """データベース初期化"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            message_id TEXT PRIMARY KEY,
            subject TEXT NOT NULL,
            date TEXT NOT NULL,
            xp INTEGER NOT NULL,
            minutes INTEGER NOT NULL,
            lessons INTEGER NOT NULL,
            streak INTEGER NOT NULL
        )
    """)
    
    conn.commit()
    conn.close()


def insert_report(report: Dict) -> bool:
    """レポート挿入"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO reports 
            (message_id, subject, date, xp, minutes, lessons, streak)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            report['message_id'],
            report['subject'],
            report['date'],
            report['xp'],
            report['minutes'],
            report['lessons'],
            report['streak']
        ))
        
        conn.commit()
        inserted = cursor.rowcount > 0
        conn.close()
        return inserted
        
    except Exception as e:
        conn.close()
        raise e


def insert_reports_bulk(reports: List[Dict]) -> int:
    """レポート一括挿入"""
    conn = get_connection()
    cursor = conn.cursor()
    inserted_count = 0
    
    try:
        for report in reports:
            cursor.execute("""
                INSERT OR IGNORE INTO reports 
                (message_id, subject, date, xp, minutes, lessons, streak)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                report['message_id'],
                report['subject'],
                report['date'],
                report['xp'],
                report['minutes'],
                report['lessons'],
                report['streak']
            ))
            
            if cursor.rowcount > 0:
                inserted_count += 1
        
        conn.commit()
        conn.close()
        return inserted_count
        
    except Exception as e:
        conn.rollback()
        conn.close()
        raise e


def get_all_reports() -> List[Dict]:
    """全レポート取得（日付降順）"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT message_id, subject, date, xp, minutes, lessons, streak
        FROM reports
    """)
    
    rows = cursor.fetchall()
    conn.close()
    
    reports = [dict(row) for row in rows]
    
    reports.sort(key=lambda x: parsedate_to_datetime(x['date']), reverse=True)
    
    return reports


def get_latest_date() -> Optional[str]:
    """最新のレポート日付取得"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT date
        FROM reports
    """)
    
    rows = cursor.fetchall()
    conn.close()
    
    if not rows:
        return None
    
    dates = [dict(row)['date'] for row in rows]
    dates.sort(key=lambda x: parsedate_to_datetime(x), reverse=True)
    
    return dates[0]


def count_reports() -> int:
    """レポート件数取得"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) as count FROM reports")
    
    row = cursor.fetchone()
    conn.close()
    
    return row['count']
