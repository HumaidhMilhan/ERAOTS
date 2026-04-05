from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from typing import List, Optional
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.employee import UserAccount
from app.models.schedule import LeaveRequest, LeaveType
from app.api.schemas import (
    LeaveRequestCreate,
    LeaveRequestResponse,
    MessageResponse
)

router = APIRouter(prefix="/api/schedules", tags=["Schedules & Leave"])

# ==================== LEAVE TYPES ====================

@router.get("/leave-types")
async def get_leave_types(db: AsyncSession = Depends(get_db)):
    """Fetch all available leave types for the form dropdown."""
    results = await db.execute(select(LeaveType))
    types = results.scalars().all()
    # If empty (unseeded), mock some dynamically
    if not types:
        lt1 = LeaveType(name="Annual Leave", max_days_per_year=20, is_paid=True)
        lt2 = LeaveType(name="Sick Leave", max_days_per_year=14, is_paid=True)
        lt3 = LeaveType(name="Unpaid Leave", is_paid=False, requires_approval=True)
        db.add_all([lt1, lt2, lt3])
        await db.commit()
        results = await db.execute(select(LeaveType))
        types = results.scalars().all()

    return [{"leave_type_id": str(t.leave_type_id), "name": t.name} for t in types]


# ==================== LEAVE REQUESTS ====================

@router.post("/leave-requests", response_model=LeaveRequestResponse)
async def submit_leave_request(
    data: LeaveRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """FR8: Employee submits a new leave request."""
    if data.start_date > data.end_date:
        raise HTTPException(status_code=400, detail="Start date must be before end date")
        
    req = LeaveRequest(
        employee_id=current_user.employee_id,
        leave_type_id=data.leave_type_id,
        start_date=data.start_date,
        end_date=data.end_date,
        reason=data.reason,
        status="PENDING"
    )
    db.add(req)
    await db.flush()
    
    # Reload with relations for response
    result = await db.execute(
        select(LeaveRequest)
        .options(joinedload(LeaveRequest.leave_type), joinedload(LeaveRequest.employee))
        .where(LeaveRequest.leave_id == req.leave_id)
    )
    saved_req = result.scalar_one()
    
    return LeaveRequestResponse(
        request_id=saved_req.leave_id,
        employee_id=saved_req.employee_id,
        employee_name=f"{saved_req.employee.first_name} {saved_req.employee.last_name}",
        leave_type_id=saved_req.leave_type_id,
        leave_type_name=saved_req.leave_type.name,
        start_date=saved_req.start_date,
        end_date=saved_req.end_date,
        status=saved_req.status,
        reason=saved_req.reason,
        created_at=saved_req.created_at
    )


@router.get("/leave-requests", response_model=List[LeaveRequestResponse])
async def list_leave_requests(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """FR8: List leave requests. Employees see their own; HR sees all."""
    stmt = select(LeaveRequest).options(
        joinedload(LeaveRequest.leave_type), 
        joinedload(LeaveRequest.employee)
    )
    
    # Filtering based on role
    if current_user.role.name == "EMPLOYEE":
        stmt = stmt.where(LeaveRequest.employee_id == current_user.employee_id)
        
    if status:
        stmt = stmt.where(LeaveRequest.status == status.upper())
        
    stmt = stmt.order_by(LeaveRequest.created_at.desc())
    
    results = (await db.execute(stmt)).scalars().all()
    
    return [
        LeaveRequestResponse(
            request_id=r.leave_id,
            employee_id=r.employee_id,
            employee_name=f"{r.employee.first_name} {r.employee.last_name}",
            leave_type_id=r.leave_type_id,
            leave_type_name=r.leave_type.name,
            start_date=r.start_date,
            end_date=r.end_date,
            status=r.status,
            reason=r.reason,
            created_at=r.created_at
        ) for r in results
    ]


@router.put("/leave-requests/{request_id}/status", response_model=MessageResponse)
async def update_leave_status(
    request_id: uuid.UUID,
    status: str = Query(..., description="APPROVED or REJECTED"),
    comment: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """HR ONLY: Approve or Reject a leave request."""
    if "HR" not in current_user.role.name and current_user.role.name != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Insufficient permissions")
        
    status = status.upper()
    if status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    result = await db.execute(select(LeaveRequest).where(LeaveRequest.leave_id == request_id))
    req = result.scalar_one_or_none()
    
    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")
        
    req.status = status
    req.reviewed_by = current_user.employee_id
    req.review_comment = comment
    await db.flush()
    
    # Needs to notify the user
    # Find the user's UserAccount to get the user_id (not employee_id) since Notification maps to UserAccount
    user_account_res = await db.execute(select(UserAccount).where(UserAccount.employee_id == req.employee_id))
    uacc = user_account_res.scalar_one_or_none()
    if uacc:
        from app.core.notifications import dispatch_notification
        await dispatch_notification(
            db=db,
            user_id=uacc.user_id,
            title=f"Leave Request {status.capitalize()}",
            message=f"Your leave request for {req.start_date.isoformat()} to {req.end_date.isoformat()} was {status.lower()}.\nHR Comment: {comment or 'None'}",
            notification_type="LEAVE_UPDATE"
        )
    
    return MessageResponse(message=f"Leave request has been {status.lower()}")
