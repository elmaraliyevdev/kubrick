from sqlalchemy import Column, Integer, Boolean, ForeignKey, JSON, DateTime, func
from sqlalchemy.orm import relationship
from app.db.session import Base


class JobApplicationFormSettings(Base):
    """
    Per-job overrides for the public application form (hybrid model).
    When use_organization_defaults is True, org-level ApplicationFormConfig + all CustomFormFields apply.
    When False, standard_config and custom_field_ids define the effective form.
    """

    __tablename__ = "job_application_form_settings"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(
        Integer,
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    use_organization_defaults = Column(Boolean, nullable=False, default=True, server_default="true")

    # Used when use_organization_defaults is False: mirrors ApplicationFormConfig toggles as JSON
    standard_config = Column(JSON, nullable=True)

    # Ordered list of CustomFormField ids (subset of org library); may be empty
    custom_field_ids = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    job = relationship("Job", back_populates="application_form_settings")
