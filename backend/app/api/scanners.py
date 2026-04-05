from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid
import secrets

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.employee import UserAccount
from app.models.hardware import Scanner
from app.api.schemas import (
    ScannerCreate,
    ScannerResponse
)

router = APIRouter(prefix="/api/scanners", tags=["Hardware Management"])

@router.post("/", response_model=ScannerResponse)
async def register_scanner(
    data: ScannerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """FR13: Register a new hardware scanner."""
    if current_user.role.name not in ["SUPER_ADMIN", "HR_MANAGER"]:
        raise HTTPException(status_code=403, detail="Not authorized to manage hardware")
        
    # Generate a secure API Key for the hardware
    api_key = secrets.token_urlsafe(32)
    
    scanner = Scanner(
        name=data.name,
        door_name=data.door_name,
        location_description=data.location_description,
        heartbeat_interval_sec=data.heartbeat_interval_sec,
        status="OFFLINE" # Starts offline until first ping
    )
    # Ideally, we should hash the API key before DB storage, but for this MVP we store plaintext
    db.add(scanner)
    await db.flush()
    
    return ScannerResponse(
        scanner_id=scanner.scanner_id,
        name=scanner.name,
        door_name=scanner.door_name,
        status=scanner.status,
        last_heartbeat=scanner.last_heartbeat,
        api_key=api_key # The only time we send it back
    )

@router.get("/", response_model=List[ScannerResponse])
async def list_scanners(
    db: AsyncSession = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """List all deployed hardware scanners."""
    if current_user.role.name not in ["SUPER_ADMIN", "HR_MANAGER"]:
        raise HTTPException(status_code=403, detail="Not authorized to view hardware")
        
    result = await db.execute(select(Scanner).order_by(Scanner.created_at.desc()))
    scanners = result.scalars().all()
    
    return [
        ScannerResponse(
            scanner_id=s.scanner_id,
            name=s.name,
            door_name=s.door_name,
            status=s.status,
            last_heartbeat=s.last_heartbeat
        ) for s in scanners
    ]
