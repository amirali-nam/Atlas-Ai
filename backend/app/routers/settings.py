"""User preference storage (persona overrides, callsign, UI options)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import Preference, get_db
from ..schemas import PreferencesUpdate

router = APIRouter(prefix="/api/preferences", tags=["preferences"])

ALLOWED_KEYS = {"persona", "callsign", "voice_enabled", "theme_accent"}


@router.get("")
def get_preferences(db: Session = Depends(get_db)):
    return {p.key: p.value for p in db.query(Preference).all()}


@router.put("")
def update_preferences(req: PreferencesUpdate, db: Session = Depends(get_db)):
    for key, value in req.values.items():
        if key not in ALLOWED_KEYS:
            continue
        pref = db.get(Preference, key)
        if pref is None:
            db.add(Preference(key=key, value=value))
        else:
            pref.value = value
    db.commit()
    return {p.key: p.value for p in db.query(Preference).all()}
