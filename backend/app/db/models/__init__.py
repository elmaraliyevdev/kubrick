from .otp_code import OtpCode
from .organization import Organization

# Then models that depend on the base models
from .user import User
from .job import Job

# Import candidate-related models last
from .candidate import Candidate
from .candidate_file import CandidateFile
from .job_application import JobApplication
from .work_experience import WorkExperience

# Import the Invite model
from .invite import Invite

# Import AI matching models
from .job_requirement import JobRequirement
from .candidate_job_match import CandidateJobMatch
from .matching_algorithm_config import MatchingAlgorithmConfig

# Import token-related models
from .token_blacklist import TokenBlacklist
from .refresh_token import RefreshToken

# Import career page models
from .application_form_config import ApplicationFormConfig
from .custom_form_field import CustomFormField
from .job_application_form_settings import JobApplicationFormSettings

# Make them available for import
__all__ = [
    "OtpCode",
    "Organization",
    "User",
    "Job",
    "Candidate",
    "CandidateFile",
    "JobApplication",
    "Invite",
    "WorkExperience",
    "JobRequirement",
    "CandidateJobMatch",
    "MatchingAlgorithmConfig",
    "TokenBlacklist",
    "RefreshToken",
    "ApplicationFormConfig",
    "CustomFormField",
    "JobApplicationFormSettings",
]