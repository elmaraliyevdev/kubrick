from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func, Boolean
from sqlalchemy.orm import relationship
from app.db.session import Base


class CandidateFile(Base):
    __tablename__ = "candidate_files"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(
        Integer,
        ForeignKey("candidates.id", ondelete="CASCADE", name="fk_files_candidate_id"),
        nullable=False,
        index=True,  # Index for candidate-based file queries
    )

    # File metadata
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)  # S3 path or local path
    file_type = Column(String, nullable=False)  # pdf, docx, txt
    file_size = Column(Integer, nullable=False)  # in bytes

    # Processing status
    is_parsed = Column(Boolean, default=False)
    parse_error = Column(Text, nullable=True)

    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    candidate = relationship("Candidate", back_populates="resume_files")