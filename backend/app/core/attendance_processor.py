"""
Processor engine that transforms raw scan events into structured daily attendance records (FR4).
Calculates total work hours, delays, breaks, and IN_MEETING time.

Hybrid "Away vs On-Desk" Calculation:
- total_active_time_min: True "At Desk" time (ACTIVE status only)
- total_meeting_time_min: Time spent in meetings (IN_MEETING status)
- total_productive_time_min: Combined active + meeting time
"""
from typing import Optional
from datetime import date, datetime, timedelta, timezone
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.events import ScanEvent, OccupancyState, PendingStateTransition
from app.models.employee import Employee
from app.models.attendance import AttendanceRecord
import uuid
import logging

logger = logging.getLogger("eraots.attendance_processor")


class StatusTransition:
    """Helper class to track status changes within a day."""
    def __init__(self, timestamp: datetime, status: str, source: str):
        self.timestamp = timestamp
        self.status = status
        self.source = source  # BIOMETRIC, MANUAL, CALENDAR_SYNC


async def get_status_transitions_for_day(
    db: AsyncSession, 
    employee_id: uuid.UUID, 
    target_date: date
) -> list[StatusTransition]:
    """
    Build a timeline of status transitions for a specific day.
    Combines scan events with pending state transitions to track ACTIVE vs IN_MEETING time.
    """
    start_of_day = datetime.combine(target_date, datetime.min.time(), tzinfo=timezone.utc)
    end_of_day = datetime.combine(target_date, datetime.max.time(), tzinfo=timezone.utc)
    
    transitions = []
    
    # Get all scan events for the day
    scan_stmt = select(ScanEvent).where(
        and_(
            ScanEvent.employee_id == employee_id,
            ScanEvent.scan_timestamp >= start_of_day,
            ScanEvent.scan_timestamp <= end_of_day,
            ScanEvent.is_valid == True
        )
    ).order_by(ScanEvent.scan_timestamp.asc())
    
    scan_events = (await db.execute(scan_stmt)).scalars().all()
    
    for event in scan_events:
        if event.direction == "IN":
            transitions.append(StatusTransition(event.scan_timestamp, "ACTIVE", "BIOMETRIC"))
        elif event.direction == "OUT":
            transitions.append(StatusTransition(event.scan_timestamp, "OUTSIDE", "BIOMETRIC"))
    
    # Get resolved pending transitions (to track IN_MEETING periods)
    transition_stmt = select(PendingStateTransition).where(
        and_(
            PendingStateTransition.employee_id == employee_id,
            PendingStateTransition.triggered_at >= start_of_day,
            PendingStateTransition.triggered_at <= end_of_day,
            PendingStateTransition.status.in_(["CONFIRMED", "AUTO_CONFIRMED"])
        )
    ).order_by(PendingStateTransition.resolved_at.asc())
    
    pending_transitions = (await db.execute(transition_stmt)).scalars().all()
    
    for pt in pending_transitions:
        if pt.resolved_at:
            transitions.append(StatusTransition(pt.resolved_at, "IN_MEETING", "CALENDAR_SYNC"))
    
    # Sort all transitions by timestamp
    transitions.sort(key=lambda t: t.timestamp)
    
    return transitions


async def process_daily_attendance(db: AsyncSession, target_date: date, employee_id: Optional[uuid.UUID] = None) -> list[AttendanceRecord]:
    """
    Process attendance for a specific date. 
    If employee_id is provided, process only for that employee.
    
    Updated to separate ACTIVE (At Desk) time from IN_MEETING time.
    """
    # Start and end of the day in UTC
    start_of_day = datetime.combine(target_date, datetime.min.time(), tzinfo=timezone.utc)
    end_of_day = datetime.combine(target_date, datetime.max.time(), tzinfo=timezone.utc)

    # 1. Get employees to process
    if employee_id:
        emp_query = select(Employee).where(Employee.employee_id == employee_id)
    else:
        emp_query = select(Employee).where(Employee.status == "ACTIVE")
    
    employees = (await db.execute(emp_query)).scalars().all()
    processed_records = []

    for emp in employees:
        # 2. Get all valid scan events for this employee on this day
        stmt = select(ScanEvent).where(
            and_(
                ScanEvent.employee_id == emp.employee_id,
                ScanEvent.scan_timestamp >= start_of_day,
                ScanEvent.scan_timestamp <= end_of_day,
                ScanEvent.is_valid == True
            )
        ).order_by(ScanEvent.scan_timestamp.asc())
        
        events = (await db.execute(stmt)).scalars().all()
        
        if not events:
            continue  # Person didn't show up
        
        # 3. Get status transitions for detailed time tracking
        transitions = await get_status_transitions_for_day(db, emp.employee_id, target_date)

        # 4. Calculate metrics with IN_MEETING separation
        first_entry = events[0].scan_timestamp
        last_exit = events[-1].scan_timestamp if len(events) > 1 else None
        
        total_active_minutes = 0  # True desk time
        total_meeting_minutes = 0  # IN_MEETING time
        total_break_minutes = 0
        break_count = 0
        
        current_state = "OUT"
        last_time = None
        
        # Process based on status transitions if available
        if len(transitions) > 1:
            for i, transition in enumerate(transitions):
                if i == 0:
                    last_time = transition.timestamp
                    current_state = transition.status
                    continue
                
                # Calculate time spent in previous state
                if last_time:
                    delta_minutes = int((transition.timestamp - last_time).total_seconds() / 60)
                    
                    if current_state == "ACTIVE":
                        total_active_minutes += delta_minutes
                    elif current_state == "IN_MEETING":
                        total_meeting_minutes += delta_minutes
                    elif current_state == "OUTSIDE" and delta_minutes > 0:
                        # They were outside (break) but came back
                        total_break_minutes += delta_minutes
                        break_count += 1
                
                last_time = transition.timestamp
                current_state = transition.status
        else:
            # Fallback to simple IN/OUT calculation if no detailed transitions
            for event in events:
                if event.direction == "IN":
                    current_state = "IN"
                    last_time = event.scan_timestamp
                elif event.direction == "OUT":
                    if current_state == "IN" and last_time:
                        delta = event.scan_timestamp - last_time
                        total_active_minutes += int(delta.total_seconds() / 60)
                    current_state = "OUT"
                    last_time = event.scan_timestamp

        # If still inside at end of day (or we're running mid-day)
        if current_state in ("ACTIVE", "IN_MEETING", "IN") and last_time:
            now = datetime.now(timezone.utc)
            if now < end_of_day:
                delta_minutes = int((now - last_time).total_seconds() / 60)
                if current_state == "IN_MEETING":
                    total_meeting_minutes += delta_minutes
                else:
                    total_active_minutes += delta_minutes
                    
        total_time_in_building = 0
        if last_exit:
            total_time_in_building = int((last_exit - first_entry).total_seconds() / 60)

        # Calculate total productive time (At Desk + In Meeting)
        total_productive_minutes = total_active_minutes + total_meeting_minutes

        # Extract configurations from DB Policies
        from app.models.policies import Policy
        start_time_policy = (await db.execute(select(Policy).where(and_(Policy.policy_type == "START_TIME", Policy.is_active == True)))).scalars().first()
        office_start_hour = int(start_time_policy.value.get("hour", 9)) if start_time_policy else 9
        office_start_min = int(start_time_policy.value.get("minute", 0)) if start_time_policy else 0
        
        expected_arrival = datetime.combine(target_date, datetime.min.time().replace(hour=office_start_hour, minute=office_start_min), tzinfo=timezone.utc)
        
        is_late = False
        late_duration_min = 0
        cmp_first_entry = first_entry.replace(tzinfo=timezone.utc) if first_entry.tzinfo is None else first_entry
        
        if cmp_first_entry > expected_arrival:
            is_late = True
            late_duration_min = int((cmp_first_entry - expected_arrival).total_seconds() / 60)
            
        ot_policy = (await db.execute(select(Policy).where(and_(Policy.policy_type == "OVERTIME_THRESHOLD", Policy.is_active == True)))).scalars().first()
        threshold_min = int(ot_policy.value.get("threshold_min", 480)) if ot_policy else 480

        overtime_min = max(0, total_productive_minutes - threshold_min)

        # 5. Upsert Attendance Record
        record_stmt = select(AttendanceRecord).where(
            and_(
                AttendanceRecord.employee_id == emp.employee_id,
                AttendanceRecord.attendance_date == target_date
            )
        )
        record = (await db.execute(record_stmt)).scalars().first()
        
        if not record:
            record = AttendanceRecord(
                employee_id=emp.employee_id,
                attendance_date=target_date,
            )
            db.add(record)
            
        record.first_entry = first_entry
        record.last_exit = last_exit
        record.total_time_in_building_min = total_time_in_building
        record.total_active_time_min = total_active_minutes  # True desk time
        record.total_meeting_time_min = total_meeting_minutes  # IN_MEETING time
        record.total_productive_time_min = total_productive_minutes  # active + meeting
        record.break_count = break_count
        record.total_break_duration_min = total_break_minutes
        record.is_late = is_late
        record.late_duration_min = late_duration_min
        record.overtime_duration_min = overtime_min
        record.status = "PRESENT"
        
        await db.flush()
        processed_records.append(record)
        
    await db.commit()
    logger.info(f"Processed attendance for {len(processed_records)} employees on {target_date}")
    return processed_records
