from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.employee import UserAccount
from app.models.notifications import Notification
from app.api.schemas import NotificationResponse, MessageResponse

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """FR6: Fetch user's notifications."""
    # Assuming user_id maps cleanly to the user account's ID or employee ID depending on how the system resolves it.
    # We will use user_id = current_user.user_id since the Notification targets the UserAccount.
    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    results = (await db.execute(stmt)).scalars().all()
    
    return [
        NotificationResponse(
            notification_id=n.notification_id,
            user_id=n.user_id,
            title=n.title,
            message=n.message,
            notification_type=n.notification_type,
            is_read=n.is_read,
            created_at=n.created_at
        ) for n in results
    ]


@router.put("/{notification_id}/read", response_model=MessageResponse)
async def mark_as_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """Mark a notification as read."""
    result = await db.execute(
        select(Notification)
        .where(Notification.notification_id == notification_id)
        .where(Notification.user_id == current_user.user_id)
    )
    notif = result.scalar_one_or_none()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_read = True
    await db.commit()
    return MessageResponse(message="Marked as read")
