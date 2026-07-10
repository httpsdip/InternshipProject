import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "database.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Users Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    """)
    
    # 2. Portfolios Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS portfolios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            fund_id TEXT NOT NULL,
            fund_name TEXT NOT NULL,
            units REAL NOT NULL,
            invested_value REAL NOT NULL,
            purchase_nav REAL NOT NULL,
            category TEXT NOT NULL,
            return3Y TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    
    # 3. News Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT NOT NULL,
            published_at TEXT NOT NULL
        )
    """)
    
    # Seed News items if news table is empty
    cursor.execute("SELECT COUNT(*) FROM news")
    if cursor.fetchone()[0] == 0:
        seed_news = [
            (
                "RBI keeps Repo Rate unchanged at 6.5% - focus remains on inflation control",
                "The Reserve Bank of India (RBI) Monetary Policy Committee (MPC) decided to keep the repo rate unchanged at 6.5%. The central bank aims to align inflation with the 4% target. Yields on corporate bonds are expected to remain stable, making debt funds highly attractive for conservative investors.",
                "Debt / Banking",
                datetime.now().strftime("%d-%b-%Y %H:%M")
            ),
            (
                "Government allocates ₹11.11 Lakh Crore Capex for Infrastructure and digital corridors",
                "Union Budget reveals a massive infrastructure expansion, setting aside major capital expenditures for expressways, railway expansions, and rural housing. Infrastructure mutual funds and industrial-cap funds are anticipated to experience major structural inflows.",
                "Infrastructure / Capital Goods",
                datetime.now().strftime("%d-%b-%Y %H:%M")
            ),
            (
                "Indian Tech firms sign multi-billion dollar AI enterprise deals with global firms",
                "Major IT services companies have reported significant contract wins in generative AI automation, cloud migration, and tech consulting in the US and Europe. Analysts estimate digital sector index funds will see positive momentum after a year of consolidation.",
                "Technology",
                datetime.now().strftime("%d-%b-%Y %H:%M")
            ),
            (
                "GST collections surge 12% year-on-year, signaling resilient corporate earnings",
                "India's GST revenue collection recorded robust numbers indicating strong domestic consumption. Mid-cap and small-cap consumer index schemes stand to benefit directly from active consumer spending trends.",
                "Equity / Consumption",
                datetime.now().strftime("%d-%b-%Y %H:%M")
            )
        ]
        cursor.executemany("""
            INSERT INTO news (title, content, category, published_at)
            VALUES (?, ?, ?, ?)
        """, seed_news)
        
    conn.commit()
    conn.close()
    print("Database initialized and seeded successfully.")

# Run initialisation
if __name__ == "__main__":
    init_db()
