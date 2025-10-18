"""Ensure users table has expected modern columns and add them if missing.
This helper is for development databases that may still have an older legacy users
schema. It will perform safe ALTER TABLE ADD COLUMN operations for SQLite.
"""
import os
import sqlite3

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'instance', 'xear_crm.db'))

EXPECTED_COLUMNS = {
    'first_name': "ALTER TABLE users ADD COLUMN first_name VARCHAR(100);",
    'last_name': "ALTER TABLE users ADD COLUMN last_name VARCHAR(100);",
    'role': "ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';",
    'is_active': "ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1;",
    'last_login': "ALTER TABLE users ADD COLUMN last_login DATETIME;"
}


def get_columns(cursor):
    cursor.execute("PRAGMA table_info(users);")
    rows = cursor.fetchall()
    return {r[1] for r in rows}


def main():
    if not os.path.exists(DB_PATH):
        print('Database file not found:', DB_PATH)
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    existing = get_columns(cur)
    to_add = []
    for col, stmt in EXPECTED_COLUMNS.items():
        if col not in existing:
            to_add.append((col, stmt))

    if not to_add:
        print('No schema changes required; users table is up-to-date')
        conn.close()
        return

    for col, stmt in to_add:
        try:
            print('Adding column', col)
            cur.execute(stmt)
        except Exception as e:
            print('Failed to add column', col, e)

    conn.commit()
    conn.close()
    print('Schema ensure complete')


if __name__ == '__main__':
    main()
