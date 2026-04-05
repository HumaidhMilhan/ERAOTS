import logging
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

from app.models.notifications import Notification

logger = logging.getLogger("eraots.notifications")

async def dispatch_notification(
    db: AsyncSession,
    user_id: UUID,
    title: str,
    message: str,
    notification_type: str = "SYSTEM_ALERT"
) -> Notification:
    """
    Core engine for dispatching notifications (FR6).
    1. Saves notification strictly to the database for the Bell icon.
    2. Stubs email delivery (which would connect to SMTP/SendGrid).
    """
    # 1. DB Persistence
    new_notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        is_read=False
    )
    db.add(new_notif)
    await db.flush()
    
    # 2. Email Stub
    # Here we would normally use a celery task or background task to send the email
    # e.g., send_email.delay(user.email, title, message)
    logger.info(f"[EMAIL MOCK] To User={user_id} | Subject: {title} | Body: {message}")
    
    return new_notif
