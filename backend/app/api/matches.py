from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from app.db.models.candidate_job_match import CandidateJobMatch
from app.db.models.candidate import Candidate
from app.db.models.job import Job
from app.core.security import get_db, require_org_member
from app.db.models.user import User
from app.services.candidate_matching_service import CandidateMatchingService

router = APIRouter()


@router.get("/{candidate_id}/{job_id}")
def get_detailed_match_analysis(
    candidate_id: int,
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
) -> Dict[str, Any]:
    """Get detailed match analysis for a specific candidate-job pair"""
    
    # Verify candidate and job exist and belong to user's organization
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id,
        Candidate.organization_id == current_user.organization_id
    ).first()
    
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.organization_id == current_user.organization_id
    ).first()
    
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Get match record
    match = db.query(CandidateJobMatch).filter(
        CandidateJobMatch.candidate_id == candidate_id,
        CandidateJobMatch.job_id == job_id
    ).first()
    
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found. Please calculate match scores first."
        )
    
    # Return detailed analysis
    return {
        "candidate": {
            "id": candidate.id,
            "first_name": candidate.first_name,
            "last_name": candidate.last_name,
            "email": candidate.email,
            "experience_years": candidate.experience_years,
            "skills": candidate.skills or [],
            "education": candidate.education or [],
            "location": candidate.location
        },
        "job": {
            "id": job.id,
            "title": job.title,
            "location": job.location,
            "employment_type": job.employment_type,
            "experience_level": job.experience_level,
            "work_arrangement": job.work_arrangement
        },
        "match_analysis": match.match_details,
        "summary": match.get_match_summary(),
        "calculated_at": match.calculated_at.isoformat() if match.calculated_at else None
    }


@router.get("/{candidate_id}/{job_id}/skills-gap")
def get_skills_gap_analysis(
    candidate_id: int,
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
) -> Dict[str, Any]:
    """Get skills gap analysis for a candidate-job pair"""
    
    # Verify access
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id,
        Candidate.organization_id == current_user.organization_id
    ).first()
    
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.organization_id == current_user.organization_id
    ).first()
    
    if not candidate or not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate or job not found"
        )
    
    # Get match record
    match = db.query(CandidateJobMatch).filter(
        CandidateJobMatch.candidate_id == candidate_id,
        CandidateJobMatch.job_id == job_id
    ).first()
    
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found. Please calculate match scores first."
        )
    
    # Extract skills analysis from match details
    skills_analysis = match.match_details.get("detailed_analysis", {}).get("skills", {})
    
    return {
        "candidate_id": candidate_id,
        "job_id": job_id,
        "skills_gap_analysis": {
            "matched_skills": skills_analysis.get("matched_skills", []),
            "missing_required": skills_analysis.get("missing_required", []),
            "missing_nice_to_have": skills_analysis.get("missing_nice_to_have", []),
            "extra_skills": skills_analysis.get("extra_skills", []),
            "match_counts": skills_analysis.get("match_counts", {}),
        },
        "recommendations": {
            "skills_to_develop": skills_analysis.get("missing_required", []),
            "bonus_skills_to_learn": skills_analysis.get("missing_nice_to_have", []),
            "strengths": [skill["candidate_skill"] for skill in skills_analysis.get("matched_skills", []) if skill.get("required", False)]
        },
        "match_score": {
            "overall": float(match.overall_score) if match.overall_score else 0,
            "skills_component": float(match.skills_score) if match.skills_score else 0
        }
    }


@router.post("/{candidate_id}/{job_id}/recalculate")
async def recalculate_single_match(
    candidate_id: int,
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
) -> Dict[str, Any]:
    """Recalculate match score for a specific candidate-job pair"""
    
    # Verify access
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id,
        Candidate.organization_id == current_user.organization_id
    ).first()
    
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.organization_id == current_user.organization_id
    ).first()
    
    if not candidate or not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate or job not found"
        )
    
    try:
        matching_service = CandidateMatchingService(db)
        
        match_result = matching_service.calculate_match_for_pair(
            candidate_id, job_id, force_recalculate=True
        )
        
        if not match_result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to calculate match score"
            )
        
        return {
            "message": "Match recalculated successfully",
            "candidate_id": candidate_id,
            "job_id": job_id,
            "match_result": match_result
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to recalculate match: {str(e)}"
        )


@router.get("/statistics/{organization_id}")
def get_matching_statistics(
    organization_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
) -> Dict[str, Any]:
    """Get matching statistics for an organization (admin only)"""
    # Path must match the authenticated tenant (do not trust client-supplied org id alone)
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    try:
        matching_service = CandidateMatchingService(db)
        stats = matching_service.get_matching_statistics(organization_id)
        
        return stats
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        )