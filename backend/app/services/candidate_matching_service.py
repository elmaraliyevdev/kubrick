import json
import logging
import traceback
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, date

from app.db.models.job import Job
from app.db.models.job_requirement import JobRequirement
from app.db.models.candidate import Candidate
from app.db.models.candidate_job_match import CandidateJobMatch
from app.db.models.matching_algorithm_config import MatchingAlgorithmConfig
from app.services.match_score_calculator import MatchScoreCalculator

logger = logging.getLogger(__name__)


def _make_json_safe(obj: Any) -> Any:
    """Recursively convert an object to be JSON-serializable."""
    if obj is None or isinstance(obj, (str, int, bool)):
        return obj
    if isinstance(obj, float):
        # Handle numpy floats and NaN/Inf
        import math
        if math.isnan(obj) or math.isinf(obj):
            return 0.0
        return float(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {str(k): _make_json_safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_make_json_safe(item) for item in obj]
    # numpy scalar types
    try:
        return float(obj)
    except (TypeError, ValueError):
        pass
    return str(obj)


class CandidateMatchingService:
    """
    Service for matching candidates to jobs and managing match scores.
    Handles bulk matching operations and score management.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self._calculator_cache = {}  # Cache calculators per organization

    def get_calculator_for_organization(self, organization_id: int) -> MatchScoreCalculator:
        """Get or create a match calculator for a specific organization"""
        if organization_id not in self._calculator_cache:
            # Get organization-specific config
            config = self.db.query(MatchingAlgorithmConfig).filter(
                MatchingAlgorithmConfig.organization_id == organization_id
            ).first()
            
            if config:
                calculator_config = config.get_config_dict()
            else:
                # Use default config and create one for the organization
                calculator_config = MatchScoreCalculator()._get_default_config()
                self._create_default_config(organization_id)
            
            self._calculator_cache[organization_id] = MatchScoreCalculator(calculator_config)
        
        return self._calculator_cache[organization_id]

    def _create_default_config(self, organization_id: int) -> MatchingAlgorithmConfig:
        """Create default matching configuration for an organization"""
        default_config = MatchingAlgorithmConfig(organization_id=organization_id)
        self.db.add(default_config)
        self.db.commit()
        self.db.refresh(default_config)
        return default_config

    def calculate_match_for_pair(self, candidate_id: int, job_id: int, force_recalculate: bool = False) -> Optional[Dict[str, Any]]:
        """Calculate match score for a specific candidate-job pair"""
        
        # Get candidate and job data
        candidate = self.db.query(Candidate).filter(Candidate.id == candidate_id).first()
        job = self.db.query(Job).filter(Job.id == job_id).first()
        
        if not candidate or not job:
            logger.error(f"Candidate {candidate_id} or Job {job_id} not found")
            return None
        
        # Check if organizations match
        if candidate.organization_id != job.organization_id:
            logger.error(f"Candidate {candidate_id} and Job {job_id} belong to different organizations")
            return None
        
        # Get job requirements
        job_requirements = self.db.query(JobRequirement).filter(
            JobRequirement.job_id == job_id
        ).first()
        
        if not job_requirements:
            logger.error(f"Job {job_id} has no parsed requirements. Please parse job description first.")
            return None
        
        # Check if match already exists and is up to date
        existing_match = self.db.query(CandidateJobMatch).filter(
            and_(
                CandidateJobMatch.candidate_id == candidate_id,
                CandidateJobMatch.job_id == job_id
            )
        ).first()
        
        if existing_match and not existing_match.needs_recalculation and not force_recalculate:
            return existing_match.get_match_summary()
        
        try:
            # Get calculator for the organization
            calculator = self.get_calculator_for_organization(candidate.organization_id)
            
            # Prepare data for calculation
            job_requirements_data = {
                "required_skills": job_requirements.required_skills or [],
                "nice_to_have_skills": job_requirements.nice_to_have_skills or [],
                "min_experience_years": job_requirements.min_experience_years,
                "max_experience_years": job_requirements.max_experience_years,
                "education_requirements": job_requirements.education_requirements or [],
                "location_requirements": job_requirements.location_requirements or [],
                "primary_skills": job_requirements.primary_skills or []
            }
            
            candidate_data = {
                "skills": [s for s in (candidate.skills or []) if isinstance(s, str) and s.strip()],
                "experience_years": candidate.experience_years,
                "education": candidate.education or [],
                "work_experiences": [
                    {
                        "job_title": getattr(exp, "job_title", None),
                        "company_name": getattr(exp, "company_name", None),
                        "location": getattr(exp, "location", None),
                        "duration": getattr(exp, "duration", None),
                    }
                    for exp in (candidate.work_experiences or [])
                ],
                "location": candidate.location
            }
            
            job_data = {
                "title": job.title,
                "location": job.location,
                "employment_type": job.employment_type or "full_time",
                "experience_level": job.experience_level or "mid",
                "work_arrangement": job.work_arrangement or "onsite",
                "salary_min": job.salary_min,
                "salary_max": job.salary_max
            }
            
            # Calculate match score
            match_result = calculator.calculate_overall_match_score(
                job_requirements_data, candidate_data, job_data
            )
            
            # Make match_result JSON-safe before storing in JSONB column
            safe_match_result = _make_json_safe(match_result)

            # Update or create match record
            if existing_match:
                # Update existing
                existing_match.overall_score = match_result["overall_score"]
                existing_match.skills_score = match_result["component_scores"]["skills"]
                existing_match.experience_score = match_result["component_scores"]["experience"]
                existing_match.education_score = match_result["component_scores"]["education"]
                existing_match.additional_score = match_result["component_scores"]["additional"]
                existing_match.skills_matched = [m["candidate_skill"] for m in match_result["detailed_analysis"]["skills"]["matched_skills"]]
                existing_match.skills_missing = match_result["detailed_analysis"]["skills"]["missing_required"]
                existing_match.skills_extra = match_result["detailed_analysis"]["skills"]["extra_skills"]
                existing_match.match_details = safe_match_result
                existing_match.needs_recalculation = False
                existing_match.calculated_at = datetime.utcnow()

                match_record = existing_match
            else:
                # Create new
                match_record = CandidateJobMatch(
                    candidate_id=candidate_id,
                    job_id=job_id,
                    overall_score=match_result["overall_score"],
                    skills_score=match_result["component_scores"]["skills"],
                    experience_score=match_result["component_scores"]["experience"],
                    education_score=match_result["component_scores"]["education"],
                    additional_score=match_result["component_scores"]["additional"],
                    skills_matched=[m["candidate_skill"] for m in match_result["detailed_analysis"]["skills"]["matched_skills"]],
                    skills_missing=match_result["detailed_analysis"]["skills"]["missing_required"],
                    skills_extra=match_result["detailed_analysis"]["skills"]["extra_skills"],
                    match_details=safe_match_result,
                    needs_recalculation=False,
                    calculation_version="1.1"
                )
                self.db.add(match_record)

            self.db.commit()
            self.db.refresh(match_record)

            return match_record.get_match_summary()

        except Exception as e:
            error_msg = f"Error calculating match for candidate {candidate_id} and job {job_id}: {e}"
            logger.error(f"{error_msg}\n{traceback.format_exc()}")
            self.db.rollback()
            return {"error": str(e)}

    def calculate_matches_for_job(self, job_id: int, candidate_ids: Optional[List[int]] = None, force_recalculate: bool = False) -> Dict[str, Any]:
        """Calculate matches for all candidates against a specific job"""
        
        job = self.db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return {"error": "Job not found", "job_id": job_id}
        
        # Get candidates to process
        candidates_query = self.db.query(Candidate).filter(
            Candidate.organization_id == job.organization_id
        )
        
        if candidate_ids:
            candidates_query = candidates_query.filter(Candidate.id.in_(candidate_ids))
        
        candidates = candidates_query.all()
        
        if not candidates:
            return {"error": "No candidates found", "job_id": job_id}
        
        results = {
            "job_id": job_id,
            "total_candidates": len(candidates),
            "processed": 0,
            "successful": 0,
            "failed": 0,
            "results": [],
            "errors": []
        }
        
        for candidate in candidates:
            results["processed"] += 1
            
            try:
                match_result = self.calculate_match_for_pair(
                    candidate.id, job_id, force_recalculate
                )
                
                if match_result and "error" not in match_result:
                    results["successful"] += 1
                    results["results"].append({
                        "candidate_id": candidate.id,
                        "candidate_name": f"{candidate.first_name or ''} {candidate.last_name or ''}".strip(),
                        "match_score": match_result["overall_score"],
                        "tier": match_result["tier"],
                        "skills_matched": len(match_result["skills_summary"]["matched"]),
                        "skills_missing": len(match_result["skills_summary"]["missing"])
                    })
                elif match_result and "error" in match_result:
                    results["failed"] += 1
                    results["errors"].append(f"Failed to calculate match for candidate {candidate.id}: {match_result['error']}")
                else:
                    results["failed"] += 1
                    results["errors"].append(f"Failed to calculate match for candidate {candidate.id}: no result returned")
                    
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"Error processing candidate {candidate.id}: {str(e)}")
                logger.error(f"Error processing candidate {candidate.id}: {e}")
        
        # Sort results by match score (highest first)
        results["results"].sort(key=lambda x: x["match_score"], reverse=True)
        
        return results

    def get_ranked_candidates_for_job(self, job_id: int, limit: int = 50, offset: int = 0, min_score: Optional[float] = None) -> Dict[str, Any]:
        """Get ranked candidates for a job with pagination"""
        
        job = self.db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return {"error": "Job not found", "job_id": job_id}
        
        # Build query for matches
        query = self.db.query(CandidateJobMatch).filter(
            CandidateJobMatch.job_id == job_id
        ).join(Candidate).filter(
            Candidate.organization_id == job.organization_id
        )
        
        if min_score is not None:
            query = query.filter(CandidateJobMatch.overall_score >= min_score)
        
        # Get total count
        total_matches = query.count()
        
        # Get paginated results ordered by score
        matches = query.order_by(
            CandidateJobMatch.overall_score.desc(),
            CandidateJobMatch.calculated_at.desc()
        ).offset(offset).limit(limit).all()
        
        # Format results
        candidates_data = []
        for match in matches:
            candidate = match.candidate
            candidates_data.append({
                "candidate": {
                    "id": candidate.id,
                    "first_name": candidate.first_name,
                    "last_name": candidate.last_name,
                    "email": candidate.email,
                    "location": candidate.location,
                    "experience_years": candidate.experience_years,
                    "skills_count": len(candidate.skills or [])
                },
                "match": match.get_match_summary(),
                "calculated_at": match.calculated_at.isoformat() if match.calculated_at else None
            })
        
        return {
            "job_id": job_id,
            "total_matches": total_matches,
            "page_size": limit,
            "offset": offset,
            "returned_count": len(candidates_data),
            "candidates": candidates_data,
            "has_more": (offset + len(candidates_data)) < total_matches
        }

    def get_job_matches_for_candidate(self, candidate_id: int, limit: int = 20) -> Dict[str, Any]:
        """Get job matches for a specific candidate"""
        
        candidate = self.db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            return {"error": "Candidate not found", "candidate_id": candidate_id}
        
        # Get matches ordered by score
        matches = self.db.query(CandidateJobMatch).filter(
            CandidateJobMatch.candidate_id == candidate_id
        ).join(Job).filter(
            Job.organization_id == candidate.organization_id
        ).order_by(
            CandidateJobMatch.overall_score.desc()
        ).limit(limit).all()
        
        jobs_data = []
        for match in matches:
            job = match.job
            jobs_data.append({
                "job": {
                    "id": job.id,
                    "title": job.title,
                    "location": job.location,
                    "employment_type": job.employment_type,
                    "experience_level": job.experience_level,
                    "work_arrangement": job.work_arrangement
                },
                "match": match.get_match_summary(),
                "calculated_at": match.calculated_at.isoformat() if match.calculated_at else None
            })
        
        return {
            "candidate_id": candidate_id,
            "total_matches": len(jobs_data),
            "jobs": jobs_data
        }

    def mark_matches_for_recalculation(self, job_id: Optional[int] = None, candidate_id: Optional[int] = None, organization_id: Optional[int] = None):
        """Mark matches for recalculation when data changes"""
        
        query = self.db.query(CandidateJobMatch)
        
        if job_id:
            query = query.filter(CandidateJobMatch.job_id == job_id)
        
        if candidate_id:
            query = query.filter(CandidateJobMatch.candidate_id == candidate_id)
        
        if organization_id:
            # Mark matches for all jobs/candidates in organization
            if job_id is None:
                query = query.join(Job).filter(Job.organization_id == organization_id)
            if candidate_id is None:
                query = query.join(Candidate).filter(Candidate.organization_id == organization_id)
        
        # Update matches to need recalculation
        updated_count = query.update({"needs_recalculation": True})
        self.db.commit()
        
        logger.info(f"Marked {updated_count} matches for recalculation")
        
        return updated_count

    def cleanup_stale_matches(self, older_than_days: int = 30):
        """Clean up old match records that may be stale"""
        from datetime import timedelta
        
        cutoff_date = datetime.utcnow() - timedelta(days=older_than_days)
        
        # Delete matches older than cutoff that are marked for recalculation
        deleted_count = self.db.query(CandidateJobMatch).filter(
            and_(
                CandidateJobMatch.calculated_at < cutoff_date,
                CandidateJobMatch.needs_recalculation == True
            )
        ).delete()
        
        self.db.commit()
        
        logger.info(f"Cleaned up {deleted_count} stale match records")
        return deleted_count

    def get_matching_statistics(self, organization_id: int) -> Dict[str, Any]:
        """Get matching statistics for an organization"""
        
        # Get total matches
        total_matches = self.db.query(CandidateJobMatch).join(Job).filter(
            Job.organization_id == organization_id
        ).count()
        
        # Get matches needing recalculation
        needs_recalc = self.db.query(CandidateJobMatch).join(Job).filter(
            and_(
                Job.organization_id == organization_id,
                CandidateJobMatch.needs_recalculation == True
            )
        ).count()
        
        # Get match quality distribution
        excellent = self.db.query(CandidateJobMatch).join(Job).filter(
            and_(
                Job.organization_id == organization_id,
                CandidateJobMatch.overall_score >= 80
            )
        ).count()
        
        good = self.db.query(CandidateJobMatch).join(Job).filter(
            and_(
                Job.organization_id == organization_id,
                CandidateJobMatch.overall_score >= 60,
                CandidateJobMatch.overall_score < 80
            )
        ).count()
        
        poor = self.db.query(CandidateJobMatch).join(Job).filter(
            and_(
                Job.organization_id == organization_id,
                CandidateJobMatch.overall_score < 60
            )
        ).count()
        
        return {
            "organization_id": organization_id,
            "total_matches": total_matches,
            "needs_recalculation": needs_recalc,
            "quality_distribution": {
                "excellent": excellent,
                "good": good,
                "poor": poor
            },
            "completion_rate": round((total_matches - needs_recalc) / max(1, total_matches) * 100, 2)
        }