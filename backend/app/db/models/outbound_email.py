from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.db.session import Base


class OutboundEmail(Base):
    """A candidate email sent from Kubrick (transactional recruiting mail)."""

    __tablename__ = "outbound_emails"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE", name="fk_outbound_emails_org_id"),
        nullable=False,
        index=True,
    )
    job_application_id = Column(
        Integer,
        ForeignKey("job_applications.id", ondelete="CASCADE", name="fk_outbound_emails_application_id"),
        nullable=False,
        index=True,
    )
    candidate_id = Column(
        Integer,
        ForeignKey("candidates.id", ondelete="CASCADE", name="fk_outbound_emails_candidate_id"),
        nullable=False,
        index=True,
    )
    template_id = Column(
        Integer,
        ForeignKey("email_templates.id", ondelete="SET NULL", name="fk_outbound_emails_template_id"),
        nullable=True,
    )
    sent_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL", name="fk_outbound_emails_user_id"),
        nullable=True,
    )

    to_email = Column(String(320), nullable=False)
    subject_snapshot = Column(String(500), nullable=False)
    html_snapshot = Column(Text, nullable=False)

    provider_message_id = Column(String(120), nullable=True, index=True)
    status = Column(
        String(32),
        nullable=False,
        default="sent",
        index=True,
    )  # sent | delivered | bounced | failed

    tracking_token = Column(String(64), unique=True, nullable=False, index=True)
    first_opened_at = Column(DateTime(timezone=True), nullable=True)

    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    organization = relationship("Organization", back_populates="outbound_emails")
    job_application = relationship("JobApplication", back_populates="outbound_emails")
    candidate = relationship("Candidate", back_populates="outbound_emails")
    template = relationship("EmailTemplate", back_populates="outbound_emails")
    sent_by = relationship("User", foreign_keys=[sent_by_user_id])
