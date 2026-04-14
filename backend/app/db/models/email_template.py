from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.db.session import Base


class EmailTemplate(Base):
    """Org-wide HTML email template for a pipeline stage (candidate-facing)."""

    __tablename__ = "email_templates"
    __table_args__ = (UniqueConstraint("organization_id", "stage", name="uq_email_templates_org_stage"),)

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE", name="fk_email_templates_org_id"),
        nullable=False,
        index=True,
    )
    stage = Column(String(32), nullable=False, index=True)
    name = Column(String(120), nullable=True)
    subject = Column(String(500), nullable=False)
    body_html = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization", back_populates="email_templates")
    outbound_emails = relationship("OutboundEmail", back_populates="template")
