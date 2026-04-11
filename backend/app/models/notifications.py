"""
Notification and notification preference models (FR6).
Extended to support interactive actionable notifications for the 30-second confirmation rule.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, DateTime, ForeignKey, Text, Index
)
from app.core.types import GUID, JSONType
from sqlalchemy.orm import relationship
from app.core.database import Base


class Notification(Base):
    """
    Every notification sent, across all channels.
    
    For actionable notifications (like calendar transition confirmations):
    - action_type: Type of action required (e.g., "CONFIRM_TRANSITION")
    - action_metadata: JSON payload with context (transition_id, buttons, etc.)
    - action_taken: What action the user took
    - action_taken_at: When the action was taken
    """
    __tablename__ = "notifications"

    notification_id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    recipient_id = Column(GUID(), ForeignKey("employees.employee_id"), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(30), nullable=False)  # LATE_ARRIVAL, UNAUTHORIZED, EMERGENCY, CORRECTION, DIGEST, MEETING_TRANSITION, etc.
    channel = Column(String(20), nullable=False)  # IN_APP, EMAIL, WHATSAPP
    priority = Column(String(10), nullable=False, default="LOW")  # LOW, MEDIUM, HIGH, CRITICAL
    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    delivery_status = Column(String(20), nullable=False, default="PENDING")  # PENDING, SENT, DELIVERED, FAILED
    
    # Interactive notification support
    is_actionable = Column(Boolean, default=False, nullable=False)
    action_type = Column(String(50), nullable=True)  # CONFIRM_TRANSITION, APPROVE_LEAVE, etc.
    action_metadata = Column(JSONType(), nullable=True)  # {transition_id, buttons: [{label, action}], expires_at, ...}
    action_taken = Column(String(30), nullable=True)  # CONFIRM, CANCEL, TIMEOUT, etc.
    action_taken_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    recipient = relationship("Employee", back_populates="notifications")

    # Indexes
    __table_args__ = (
        Index("ix_notifications_recipient_read", "recipient_id", "is_read"),
        Index("ix_notifications_actionable", "recipient_id", "is_actionable", "action_taken"),
    )

    def __repr__(self):
        return f"<Notification {self.type} to={self.recipient_id} priority={self.priority}>"


class NotificationPreference(Base):
    """Per-employee notification opt-in/out settings."""
    __tablename__ = "notification_preferences"

    preference_id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    employee_id = Column(GUID(), ForeignKey("employees.employee_id"), nullable=False, unique=True)
    notification_type = Column(String(30), nullable=False, default="ALL")
    in_app_enabled = Column(Boolean, default=True, nullable=False)
    email_enabled = Column(Boolean, default=True, nullable=False)
    whatsapp_enabled = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    employee = relationship("Employee", back_populates="notification_preference")
