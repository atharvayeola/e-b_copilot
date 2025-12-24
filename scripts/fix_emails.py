import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.db.models import User

DATABASE_URL = "postgresql+psycopg2://postgres:postgres@localhost:5435/eb_copilot"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def main():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        for user in users:
            if user.email.endswith("@demo.local"):
                new_email = user.email.replace("@demo.local", "@demo.com")
                print(f"Updating {user.email} -> {new_email}")
                user.email = new_email
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    main()
