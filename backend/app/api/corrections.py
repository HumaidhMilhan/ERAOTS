from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.employee import UserAccount
from app.models.corrections import CorrectionRequest
from app.models.events import ScanEvent
from app.api.schemas import (
    CorrectionRequestCreate,
    CorrectionRequestResponse,
    MessageResponse
)

router = APIRouter(prefix="/api/corrections", tags=["Corrections"])

@router.post("/", response_model=CorrectionRequestResponse)
async def submit_correction(
    data: CorrectionRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """FR14: Employee submits a correction request (e.g., missed scan)."""
    # Quick sanity check on time vs date
    if data.proposed_time.date() != data.correction_date:
        raise HTTPException(status_code=400, detail="Proposed time must be on the correction date")
        
    req = CorrectionRequest(
        employee_id=current_user.employee_id,
        correction_date=data.correction_date,
        correction_type=data.correction_type.upper(),
        proposed_time=data.proposed_time,
        reason=data.reason,
        status="PENDING"
    )
    db.add(req)
    await db.flush()
    
    result = await db.execute(
        select(CorrectionRequest).options(joinedload(CorrectionRequest.employee))
        .where(CorrectionRequest.correction_id == req.correction_id)
    )
    saved_req = result.scalar_one()
    
    return CorrectionRequestResponse(
        request_id=saved_req.correction_id,
        employee_id=saved_req.employee_id,
        employee_name=f"{saved_req.employee.first_name} {saved_req.employee.last_name}",
        correction_date=saved_req.correction_date,
        correction_type=saved_req.correction_type,
        status=saved_req.status,
        reason=saved_req.reason,
        proposed_time=saved_req.proposed_time,
        created_at=saved_req.created_at
    )


@router.get("/", response_model=List[CorrectionRequestResponse])
async def list_corrections(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """List corrections. Employees see their own, HR sees all."""
    stmt = select(CorrectionRequest).options(joinedload(CorrectionRequest.employee))
    
    if current_user.role.name == "EMPLOYEE":
        stmt = stmt.where(CorrectionRequest.employee_id == current_user.employee_id)
        
    if status:
        stmt = stmt.where(CorrectionRequest.status == status.upper())
        
    stmt = stmt.order_by(CorrectionRequest.created_at.desc())
    results = (await db.execute(stmt)).scalars().all()
    
    return [
        CorrectionRequestResponse(
            request_id=r.correction_id,
            employee_id=r.employee_id,
            employee_name=f"{r.employee.first_name} {r.employee.last_name}",
            correction_date=r.correction_date,
            correction_type=r.correction_type,
            status=r.status,
            reason=r.reason,
            proposed_time=r.proposed_time,
            reviewed_by=r.reviewed_by,
            created_at=r.created_at
        ) for r in results
    ]


@router.put("/{request_id}/status", response_model=MessageResponse)
async def update_correction_status(
    request_id: uuid.UUID,
    status: str = Query(..., description="APPROVED or REJECTED"),
    comment: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """HR ONLY: Approve or Reject a correction."""
    if "HR" not in current_user.role.name and current_user.role.name != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Insufficient permissions")
        
    status = status.upper()
    if status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    result = await db.execute(select(CorrectionRequest).where(CorrectionRequest.correction_id == request_id))
    req = result.scalar_one_or_none()
    
    if not req:
        raise HTTPException(status_code=404, detail="Correction request not found")
        
    if req.status != "PENDING":
        raise HTTPException(status_code=400, detail="Request is already processed")
        
    req.status = status
    req.reviewed_by = current_user.employee_id
    req.review_comment = comment
    req.reviewed_at = datetime.now(timezone.utc)
    
    # If approved and it's a MISSED_SCAN, we inject a synthetic ScanEvent
    if status == "APPROVED" and req.correction_type == "MISSED_SCAN":
        # We assume direction is derived or it's just 'IN' for simplicty of this scope,
        # but realistically HR might need to specify IN/OUT. We'll default to 'IN' if 
        # morning, 'OUT' if afternoon for demo logic, but this would be better explicit.
        direction = "IN" if req.proposed_time.hour < 12 else "OUT"
        
        synthetic_event = ScanEvent(
            employee_id=req.employee_id,
            scanner_id=None, # Synthetic events have no physical scanner
            fingerprint_hash="MANUAL_CORRECTION",
            scan_timestamp=req.proposed_time,
            direction=direction,
            is_valid=True
        )
        db.add(synthetic_event)
        
    # Notify user
    user_account_res = await db.execute(select(UserAccount).where(UserAccount.employee_id == req.employee_id))
    uacc = user_account_res.scalar_one_or_none()
    if uacc:
        from app.core.notifications import dispatch_notification
        await dispatch_notification(
            db=db,
            user_id=uacc.user_id,
            title=f"Correction Request {status.capitalize()}",
            message=f"Your {req.correction_type} request for {req.correction_date.isoformat()} was {status.lower()}.\nHR Comment: {comment or 'None'}",
            notification_type="CORRECTION_UPDATE"
        )
        
    return MessageResponse(message=f"Correction request has been {status.lower()}")
