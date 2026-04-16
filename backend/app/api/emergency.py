from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import joinedload
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.employee import UserAccount, Employee
from app.models.emergency import EmergencyEvent, EmergencyHeadcount, EmergencySafetyCheck
from app.models.events import OccupancyState
from app.models.notifications import Notification
from app.api.schemas import (
    EmergencyEventCreate,
    EmergencyEventResponse,
    EmergencyHeadcountResponse,
    MessageResponse,
    EmergencySafetyCheckMyStatus,
    EmergencySafetyCheckListResponse,
    EmergencySafetyCheckEntry,
    EmergencySafetyRespondRequest,
)

router = APIRouter(prefix="/api/emergency", tags=["Emergency"])

EMERGENCY_SAFETY_TIMEOUT_SECONDS = 120
# Shown in in-app notification + safety prompt (Yes → SAFE, No / no reply by deadline → IN_DANGER)
EMERGENCY_SAFETY_PROMPT_MESSAGE = "Are you safe?"
EMERGENCY_SAFETY_NOTIFICATION_TITLE = "Emergency — Are you safe?"


async def _broadcast_safety_check_for_emergency(
    db: AsyncSession,
    emergency_id: uuid.UUID,
    *,
    timeout_seconds: int = EMERGENCY_SAFETY_TIMEOUT_SECONDS,
) -> int:
    """
    Create actionable Yes/No notifications + safety check rows for all ACTIVE employees
    who don't already have a safety check for this emergency.
    Returns number created.
    """
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=timeout_seconds)

    employees_res = await db.execute(select(Employee).where(Employee.status == "ACTIVE"))
    employees = employees_res.scalars().all()

    existing_res = await db.execute(
        select(EmergencySafetyCheck.employee_id).where(EmergencySafetyCheck.emergency_id == emergency_id)
    )
    existing = {row[0] for row in existing_res.all()}

    created = 0
    for emp in employees:
        if emp.employee_id in existing:
            continue

        notif = Notification(
            recipient_id=emp.employee_id,
            title=EMERGENCY_SAFETY_NOTIFICATION_TITLE,
            message=EMERGENCY_SAFETY_PROMPT_MESSAGE,
            type="EMERGENCY",
            channel="IN_APP",
            priority="CRITICAL",
            is_actionable=True,
            action_type="EMERGENCY_SAFETY_CHECK",
            action_metadata={
                "emergency_id": str(emergency_id),
                "buttons": [
                    {"label": "Yes", "action": "YES"},
                    {"label": "No", "action": "NO"},
                ],
                "expires_at": expires_at.isoformat(),
            },
            delivery_status="DELIVERED",
        )
        db.add(notif)
        await db.flush()

        db.add(
            EmergencySafetyCheck(
                emergency_id=emergency_id,
                employee_id=emp.employee_id,
                prompt_message=EMERGENCY_SAFETY_PROMPT_MESSAGE,
                status="PENDING",
                expires_at=expires_at,
                notification_id=notif.notification_id,
            )
        )
        created += 1

    return created

@router.post("/trigger", response_model=EmergencyEventResponse)
async def trigger_emergency(
    data: EmergencyEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """FR9: Super Admin or HR triggers emergency evacuation mode."""
    if current_user.role.name not in ["SUPER_ADMIN", "HR_MANAGER"]:
        raise HTTPException(status_code=403, detail="Only Admins & HR can trigger emergencies")

    # Check if an active emergency exists
    active = await db.execute(select(EmergencyEvent).where(EmergencyEvent.status == "ACTIVE"))
    if active.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="An emergency is already active!")

    # 1. Create Event
    ev = EmergencyEvent(
        activated_by=current_user.employee_id,
        emergency_type=data.emergency_type,
        notes=data.notes,
        status="ACTIVE"
    )
    db.add(ev)
    await db.flush()

    # 2. Get headcount of everyone currently inside or recently stepped out
    # ACTIVE + IN_MEETING = physically inside the building
    # ON_BREAK = scanned out recently, may still be nearby
    occupancy_res = await db.execute(
        select(OccupancyState)
        .where(OccupancyState.current_status.in_(["ACTIVE", "IN_MEETING", "ON_BREAK"]))
    )
    inside_occupants = occupancy_res.scalars().all()
    ev.headcount_at_activation = len(inside_occupants)

    # 3. Create Headcount snapshots
    for occ in inside_occupants:
        hc = EmergencyHeadcount(
            emergency_id=ev.emergency_id,
            employee_id=occ.employee_id,
            status_at_event=occ.current_status,
            accounted_for=False
        )
        db.add(hc)

    # 4. Broadcast safety prompt to ALL active employees (actionable Yes/No)
    await _broadcast_safety_check_for_emergency(db, ev.emergency_id, timeout_seconds=EMERGENCY_SAFETY_TIMEOUT_SECONDS)

    await db.commit()

    # 5. Return complete response
    result = await db.execute(
        select(EmergencyEvent)
        .options(joinedload(EmergencyEvent.activator), joinedload(EmergencyEvent.headcount_entries).joinedload(EmergencyHeadcount.employee))
        .where(EmergencyEvent.emergency_id == ev.emergency_id)
    )
    saved_ev = result.unique().scalar_one()

    formatted = _format_emergency_response(saved_ev)
    formatted.safety_check_timeout_seconds = EMERGENCY_SAFETY_TIMEOUT_SECONDS
    return formatted


@router.get("/active", response_model=Optional[EmergencyEventResponse])
async def get_active_emergency(db: AsyncSession = Depends(get_db)):
    """Fetch the currently active emergency."""
    result = await db.execute(
        select(EmergencyEvent)
        .options(joinedload(EmergencyEvent.activator), joinedload(EmergencyEvent.headcount_entries).joinedload(EmergencyHeadcount.employee))
        .where(EmergencyEvent.status == "ACTIVE")
    )
    ev = result.unique().scalar_one_or_none()
    formatted = _format_emergency_response(ev) if ev else None
    if formatted:
        formatted.safety_check_timeout_seconds = EMERGENCY_SAFETY_TIMEOUT_SECONDS
    return formatted


@router.get("/active/my-safety", response_model=Optional[EmergencySafetyCheckMyStatus])
async def get_my_safety_status(
    db: AsyncSession = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user),
):
    active = (await db.execute(
        select(EmergencyEvent).where(EmergencyEvent.status == "ACTIVE")
    )).scalar_one_or_none()
    if not active:
        return None

    row = (await db.execute(
        select(EmergencySafetyCheck).where(
            and_(
                EmergencySafetyCheck.emergency_id == active.emergency_id,
                EmergencySafetyCheck.employee_id == current_user.employee_id,
            )
        )
    )).scalar_one_or_none()
    if not row:
        return None

    return EmergencySafetyCheckMyStatus(
        emergency_id=row.emergency_id,
        employee_id=row.employee_id,
        status=row.status,
        response=row.response,
        expires_at=row.expires_at,
        responded_at=row.responded_at,
        prompt_message=row.prompt_message,
    )


@router.post("/active/respond", response_model=MessageResponse)
async def respond_to_active_emergency(
    payload: EmergencySafetyRespondRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user),
):
    response = payload.response.strip().upper()
    if response not in ("YES", "NO"):
        raise HTTPException(status_code=400, detail="Response must be YES or NO")

    active = (await db.execute(
        select(EmergencyEvent).where(EmergencyEvent.status == "ACTIVE")
    )).scalar_one_or_none()
    if not active:
        raise HTTPException(status_code=400, detail="No active emergency")

    row = (await db.execute(
        select(EmergencySafetyCheck).where(
            and_(
                EmergencySafetyCheck.emergency_id == active.emergency_id,
                EmergencySafetyCheck.employee_id == current_user.employee_id,
            )
        )
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Safety check not found")

    if row.status != "PENDING":
        return MessageResponse(message=f"Already recorded: {row.status}")

    now = datetime.now(timezone.utc)
    row.response = response
    row.responded_at = now
    row.status = "SAFE" if response == "YES" else "IN_DANGER"

    if row.notification_id:
        notif = (await db.execute(
            select(Notification).where(Notification.notification_id == row.notification_id)
        )).scalar_one_or_none()
        if notif:
            notif.action_taken = response
            notif.action_taken_at = now
            notif.is_read = True
            notif.read_at = now

    await db.commit()
    return MessageResponse(message=f"Recorded: {row.status}")


@router.post(
    "/active/broadcast-safety",
    response_model=MessageResponse,
    dependencies=[Depends(require_roles(["SUPER_ADMIN", "HR_MANAGER"]))],
)
async def broadcast_safety_check_again(
    db: AsyncSession = Depends(get_db),
):
    """
    Admin option: re-send the 'Are you safe?' prompt during an active emergency.
    Only sends to employees who do NOT yet have a safety check row for this emergency.
    """
    active = (await db.execute(
        select(EmergencyEvent).where(EmergencyEvent.status == "ACTIVE")
    )).scalar_one_or_none()
    if not active:
        raise HTTPException(status_code=400, detail="No active emergency")

    created = await _broadcast_safety_check_for_emergency(db, active.emergency_id, timeout_seconds=EMERGENCY_SAFETY_TIMEOUT_SECONDS)
    await db.commit()
    return MessageResponse(message=f"Safety check broadcast sent to {created} employee(s)")


@router.get(
    "/active/safety",
    response_model=EmergencySafetyCheckListResponse,
    dependencies=[Depends(require_roles(["SUPER_ADMIN", "HR_MANAGER"]))],
)
async def list_active_safety_checks(
    db: AsyncSession = Depends(get_db),
):
    active = (await db.execute(
        select(EmergencyEvent).where(EmergencyEvent.status == "ACTIVE")
    )).scalar_one_or_none()
    if not active:
        raise HTTPException(status_code=404, detail="No active emergency")

    rows = (await db.execute(
        select(EmergencySafetyCheck)
        .options(joinedload(EmergencySafetyCheck.employee))
        .where(EmergencySafetyCheck.emergency_id == active.emergency_id)
        .order_by(EmergencySafetyCheck.created_at.asc())
    )).scalars().all()

    entries: List[EmergencySafetyCheckEntry] = []
    safe_count = 0
    in_danger_count = 0
    pending_count = 0

    for r in rows:
        if r.status == "SAFE":
            safe_count += 1
        elif r.status == "IN_DANGER":
            in_danger_count += 1
        else:
            pending_count += 1

        entries.append(EmergencySafetyCheckEntry(
            employee_id=r.employee_id,
            employee_name=f"{r.employee.first_name} {r.employee.last_name}" if r.employee else None,
            status=r.status,
            response=r.response,
            responded_at=r.responded_at,
        ))

    return EmergencySafetyCheckListResponse(
        emergency_id=active.emergency_id,
        total=len(entries),
        safe_count=safe_count,
        in_danger_count=in_danger_count,
        pending_count=pending_count,
        entries=entries,
    )


@router.get("/", response_model=List[EmergencyEventResponse])
async def list_emergencies(db: AsyncSession = Depends(get_db)):
    """List historical emergencies."""
    result = await db.execute(
        select(EmergencyEvent)
        .options(joinedload(EmergencyEvent.activator), joinedload(EmergencyEvent.headcount_entries).joinedload(EmergencyHeadcount.employee))
        .order_by(EmergencyEvent.activation_time.desc())
    )
    events = result.unique().scalars().all()
    return [_format_emergency_response(ev) for ev in events]


@router.put("/{emergency_id}/resolve", response_model=MessageResponse)
async def resolve_emergency(
    emergency_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    if current_user.role.name not in ["SUPER_ADMIN", "HR_MANAGER"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    result = await db.execute(select(EmergencyEvent).where(EmergencyEvent.emergency_id == emergency_id))
    ev = result.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail="Emergency not found")

    ev.status = "RESOLVED"
    ev.deactivation_time = datetime.now(timezone.utc)
    await db.commit()
    return MessageResponse(message="Emergency resolved")


@router.put("/headcount/{headcount_id}/account", response_model=MessageResponse)
async def account_for_employee(
    headcount_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """Muster point operator marks employee as safe."""
    result = await db.execute(select(EmergencyHeadcount).where(EmergencyHeadcount.id == headcount_id))
    hc = result.scalar_one_or_none()
    if not hc:
        raise HTTPException(status_code=404, detail="Headcount entry not found")

    hc.accounted_for = True
    hc.accounted_at = datetime.now(timezone.utc)
    await db.commit()
    return MessageResponse(message="Employee marked as safe.")


def _format_emergency_response(ev: EmergencyEvent) -> EmergencyEventResponse:
    entries = []
    for hc in ev.headcount_entries:
        entries.append(EmergencyHeadcountResponse(
            id=hc.id,
            employee_id=hc.employee_id,
            employee_name=f"{hc.employee.first_name} {hc.employee.last_name}",
            status_at_event=hc.status_at_event,
            accounted_for=hc.accounted_for,
            last_known_door=hc.last_known_door,
            accounted_at=hc.accounted_at
        ))
        
    return EmergencyEventResponse(
        emergency_id=ev.emergency_id,
        activated_by=ev.activated_by,
        activator_name=f"{ev.activator.first_name} {ev.activator.last_name}",
        activation_time=ev.activation_time,
        deactivation_time=ev.deactivation_time,
        emergency_type=ev.emergency_type,
        headcount_at_activation=ev.headcount_at_activation,
        notes=ev.notes,
        status=ev.status,
        headcount_entries=entries,
        safety_check_timeout_seconds=None,
    )
