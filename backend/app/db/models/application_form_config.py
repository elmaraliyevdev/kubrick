from sqlalchemy import Column, Integer, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.db.session import Base


class ApplicationFormConfig(Base):
    __tablename__ = "application_form_configs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    # Toggle optional default fields (required fields: email, first_name, last_name, resume are always on)
    show_phone = Column(Boolean, default=True, nullable=False)
    show_location = Column(Boolean, default=True, nullable=False)
    show_linkedin = Column(Boolean, default=True, nullable=False)
    show_portfolio = Column(Boolean, default=True, nullable=False)
    show_cover_letter = Column(Boolean, default=True, nullable=False)

    # Whether optional fields are required when shown
    require_phone = Column(Boolean, default=False, nullable=False)
    require_location = Column(Boolean, default=False, nullable=False)
    require_linkedin = Column(Boolean, default=False, nullable=False)
    require_portfolio = Column(Boolean, default=False, nullable=False)
    require_cover_letter = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization", back_populates="application_form_config")
