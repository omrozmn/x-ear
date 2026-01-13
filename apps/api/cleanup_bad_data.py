
from app import app, db
from sqlalchemy import text

def cleanup():
    with app.app_context():
        # Delete patients with invalid status 'new'
        # Since SQLAlchemy model might crash on query, use raw SQL
        try:
            print("Cleaning up patients with status='new'...")
            # SQLite specific
            db.session.execute(text("DELETE FROM patients WHERE status = 'new'"))
            db.session.commit()
            print("✅ Cleanup complete.")
        except Exception as e:
            print(f"Cleanup failed: {e}")
            db.session.rollback()

        # Also cleanup notifications with NULL tenant_id
        try:
            print("Cleaning up notifications with NULL tenant_id...")
            db.session.execute(text("DELETE FROM notifications WHERE tenant_id IS NULL"))
            db.session.commit()
            print("✅ Notifications cleanup complete.")
        except Exception as e:
            print(f"Notif cleanup failed: {e}")

if __name__ == "__main__":
    cleanup()
