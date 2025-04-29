import sqlite3


def init_db():
    conn = sqlite3.connect("vqa_history.db")
    c = conn.cursor()
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS vqa_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_base64 TEXT,
            question TEXT,
            answer TEXT,
            timestamp TEXT,
            model_type TEXT DEFAULT 'finetuned'
        )
    """
    )
    conn.commit()
    conn.close()


init_db()
