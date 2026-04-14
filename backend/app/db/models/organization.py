from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, func
from sqlalchemy.orm import relationship
from app.db.session import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)

    # Career page branding
    logo_url = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    website_url = Column(String, nullable=True)
    brand_color = Column(String, nullable=True)  # hex color, e.g. "#4F46E5"
    career_page_enabled = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="organization")
    jobs = relationship("Job", back_populates="organization")
    invites = relationship("Invite", back_populates="organization", cascade="all, delete-orphan")
    candidates = relationship("Candidate", back_populates="organization", cascade="all, delete-orphan")
    matching_config = relationship("MatchingAlgorithmConfig", back_populates="organization", cascade="all, delete-orphan", uselist=False)
    application_form_config = relationship("ApplicationFormConfig", back_populates="organization", uselist=False, cascade="all, delete-orphan")
    custom_form_fields = relationship("CustomFormField", back_populates="organization", cascade="all, delete-orphan", order_by="CustomFormField.sort_order")
    email_templates = relationship("EmailTemplate", back_populates="organization", cascade="all, delete-orphan")
    outbound_emails = relationship("OutboundEmail", back_populates="organization")