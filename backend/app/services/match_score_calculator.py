import logging
import re
from typing import Dict, List, Optional, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from rapidfuzz import fuzz
from datetime import datetime

logger = logging.getLogger(__name__)


class MatchScoreCalculator:
    """
    Calculates match scores between candidates and job requirements using weighted scoring.
    
    Score Components (default weights):
    - Skills Match: 40 points (required skills + nice-to-have + bonus skills)
    - Experience Level: 25 points (years + relevant experience)
    - Education Match: 15 points (degree level + field relevance)
    - Additional Factors: 20 points (location + salary + work arrangement)
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize calculator with configuration"""
        self.config = config or self._get_default_config()
        
        # Skills synonyms for better matching
        self.skill_synonyms = {
            "javascript": ["js", "javascript", "ecmascript", "node.js", "nodejs"],
            "react": ["react.js", "reactjs", "react js", "react native"],
            "python": ["python3", "py", "python programming"],
            "postgresql": ["postgres", "psql", "postgresql database"],
            "machine learning": ["ml", "ai", "artificial intelligence"],
            "devops": ["dev ops", "development operations"],
            "docker": ["containerization", "containers"],
            "aws": ["amazon web services", "amazon aws"],
            "vue": ["vue.js", "vuejs"],
            "angular": ["angularjs", "angular.js"],
            "typescript": ["ts", "type script"],
            "c++": ["cpp", "c plus plus"],
            "c#": ["csharp", "c sharp"],
            "ios": ["ios development", "ios sdk", "ios mobile", "uikit", "swiftui", "swift ui"],
            "android": ["android sdk", "android development", "android mobile", "kotlin android"],
            "swift": ["swift programming", "swiftui", "swift ui"],
            "kotlin": ["kotlin programming", "kotlin android"],
            "sql": ["mysql", "sqlite", "sql server", "mssql"],
            "git": ["github", "gitlab", "version control"],
            "ci/cd": ["continuous integration", "continuous deployment", "jenkins", "gitlab ci", "github actions"],
        }
        
        # Experience level mappings
        self.experience_levels = {
            "entry": {"min": 0, "max": 2},
            "junior": {"min": 0, "max": 3},
            "mid": {"min": 2, "max": 6},
            "senior": {"min": 5, "max": 15},
            "lead": {"min": 7, "max": 20},
            "principal": {"min": 10, "max": 25}
        }
        
        # Education level hierarchy
        self.education_hierarchy = {
            "high school": 1,
            "associate": 2,
            "bachelor": 3, "bs": 3, "ba": 3, "b.s.": 3, "b.a.": 3,
            "master": 4, "ms": 4, "ma": 4, "m.s.": 4, "m.a.": 4, "mba": 4,
            "phd": 5, "doctorate": 5, "ph.d.": 5
        }

    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration values"""
        return {
            "weights": {
                "skills": 40,
                "experience": 25,
                "education": 15,
                "additional": 20
            },
            "fuzzy_match_threshold": 0.8,
            "skills_match_algorithm": "tfidf",
            "enable_synonym_matching": True,
            "primary_skills_penalty": {
                "all_present": 1.0,
                "some_present": 0.6,
                "none_present": 0.25,
            }
        }

    def _is_containment_match(self, skill_a: str, skill_b: str) -> bool:
        """Check if one skill is contained as a whole word in the other.

        E.g. 'ios' matches 'ios development frameworks: uikit'
             'swift' matches 'swift ui'
        """
        a = skill_a.lower().strip()
        b = skill_b.lower().strip()
        if not a or not b:
            return False
        # Check if the shorter one appears as a word boundary in the longer one
        shorter, longer = (a, b) if len(a) <= len(b) else (b, a)
        # Use word boundary regex to avoid partial matches like "c" in "cache"
        if len(shorter) >= 2:
            return bool(re.search(r'\b' + re.escape(shorter) + r'\b', longer))
        return False

    def normalize_skills(self, skills: List[str]) -> List[str]:
        """Normalize and expand skills using synonyms"""
        normalized = []

        for skill in skills:
            if not isinstance(skill, str) or not skill.strip():
                continue
            skill_lower = skill.lower().strip()
            normalized.append(skill_lower)
            
            # Add synonyms if enabled
            if self.config.get("enable_synonym_matching", True):
                if skill_lower in self.skill_synonyms:
                    normalized.extend(self.skill_synonyms[skill_lower])
        
        return list(set(normalized))  # Remove duplicates

    def calculate_skills_similarity_tfidf(self, job_skills: List[str], candidate_skills: List[str]) -> float:
        """Calculate skills similarity using TF-IDF vectorization"""
        if not job_skills or not candidate_skills:
            return 0.0
        
        # Normalize skills
        job_skills_norm = self.normalize_skills(job_skills)
        candidate_skills_norm = self.normalize_skills(candidate_skills)
        
        # Create documents for TF-IDF
        job_doc = " ".join(job_skills_norm)
        candidate_doc = " ".join(candidate_skills_norm)
        
        if not job_doc or not candidate_doc:
            return 0.0
        
        try:
            # Create TF-IDF vectors
            vectorizer = TfidfVectorizer(
                lowercase=True,
                token_pattern=r'\b\w+\b',
                max_features=1000
            )
            
            # Fit on both documents
            tfidf_matrix = vectorizer.fit_transform([job_doc, candidate_doc])
            
            # Calculate cosine similarity
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            
            return float(similarity)
            
        except Exception as e:
            logger.error(f"TF-IDF similarity calculation failed: {e}")
            # Fallback to simple overlap
            return self.calculate_skills_similarity_overlap(job_skills, candidate_skills)

    def calculate_skills_similarity_overlap(self, job_skills: List[str], candidate_skills: List[str]) -> float:
        """Calculate skills similarity using simple overlap with fuzzy matching"""
        if not job_skills or not candidate_skills:
            return 0.0
        
        job_skills_norm = set(self.normalize_skills(job_skills))
        candidate_skills_norm = set(self.normalize_skills(candidate_skills))
        
        # Direct matches
        direct_matches = len(job_skills_norm.intersection(candidate_skills_norm))
        
        # Fuzzy matches
        fuzzy_matches = 0
        threshold = self.config.get("fuzzy_match_threshold", 0.8)
        
        for job_skill in job_skills_norm:
            if job_skill not in candidate_skills_norm:  # Not a direct match
                for candidate_skill in candidate_skills_norm:
                    similarity = fuzz.ratio(job_skill, candidate_skill) / 100.0
                    if similarity >= threshold:
                        fuzzy_matches += 1
                        break
        
        total_matches = direct_matches + fuzzy_matches
        return min(1.0, total_matches / len(job_skills_norm))

    def analyze_skills_match(self, job_requirements: Dict[str, Any], candidate: Dict[str, Any]) -> Dict[str, Any]:
        """Detailed skills analysis with matched/missing/extra breakdown"""
        required_skills = [s for s in job_requirements.get("required_skills", []) if isinstance(s, str) and s.strip()]
        nice_to_have_skills = [s for s in job_requirements.get("nice_to_have_skills", []) if isinstance(s, str) and s.strip()]
        candidate_skills = [s for s in candidate.get("skills", []) if isinstance(s, str) and s.strip()]
        
        # Normalize all skills for comparison
        required_norm = self.normalize_skills(required_skills)
        nice_to_have_norm = self.normalize_skills(nice_to_have_skills)
        candidate_norm = self.normalize_skills(candidate_skills)
        
        matched_skills = []
        missing_required = []
        missing_nice_to_have = []
        extra_skills = []
        
        threshold = self.config.get("fuzzy_match_threshold", 0.8)
        
        # Check required skills
        for req_skill in required_skills:
            req_skill_norm = req_skill.lower().strip()
            match_found = False
            
            # Check for direct or synonym match
            for candidate_skill in candidate_skills:
                candidate_skill_norm = candidate_skill.lower().strip()

                # Direct match or synonym match
                if (req_skill_norm in self.normalize_skills([candidate_skill_norm]) or
                    candidate_skill_norm in self.normalize_skills([req_skill_norm])):
                    matched_skills.append({
                        "job_skill": req_skill,
                        "candidate_skill": candidate_skill,
                        "match_type": "direct/synonym",
                        "similarity": 1.0,
                        "required": True
                    })
                    match_found = True
                    break

                # Containment match (e.g. "ios" in "ios development frameworks: uikit")
                if self._is_containment_match(req_skill_norm, candidate_skill_norm):
                    matched_skills.append({
                        "job_skill": req_skill,
                        "candidate_skill": candidate_skill,
                        "match_type": "containment",
                        "similarity": 0.9,
                        "required": True
                    })
                    match_found = True
                    break

                # Fuzzy match
                similarity = fuzz.ratio(req_skill_norm, candidate_skill_norm) / 100.0
                if similarity >= threshold:
                    matched_skills.append({
                        "job_skill": req_skill,
                        "candidate_skill": candidate_skill,
                        "match_type": "fuzzy",
                        "similarity": similarity,
                        "required": True
                    })
                    match_found = True
                    break

            if not match_found:
                missing_required.append(req_skill)

        # Track which candidate skills have already been used for matching
        used_candidate_skills = {m["candidate_skill"].lower() for m in matched_skills}

        # Check nice-to-have skills
        for nice_skill in nice_to_have_skills:
            nice_skill_norm = nice_skill.lower().strip()
            match_found = False

            # Skip if this job skill (or a synonym of it) was already matched as required
            nice_expanded = set(self.normalize_skills([nice_skill_norm]))
            already_matched = any(
                nice_skill_norm == m["job_skill"].lower()
                or nice_expanded.intersection(set(self.normalize_skills([m["job_skill"].lower()])))
                for m in matched_skills
            )
            if already_matched:
                continue

            for candidate_skill in candidate_skills:
                candidate_skill_norm = candidate_skill.lower().strip()

                # Skip candidate skills already used in required matching
                if candidate_skill_norm in used_candidate_skills:
                    continue

                # Direct match or synonym match
                if (nice_skill_norm in self.normalize_skills([candidate_skill_norm]) or
                    candidate_skill_norm in self.normalize_skills([nice_skill_norm])):
                    matched_skills.append({
                        "job_skill": nice_skill,
                        "candidate_skill": candidate_skill,
                        "match_type": "direct/synonym",
                        "similarity": 1.0,
                        "required": False
                    })
                    used_candidate_skills.add(candidate_skill_norm)
                    match_found = True
                    break

                # Containment match
                if self._is_containment_match(nice_skill_norm, candidate_skill_norm):
                    matched_skills.append({
                        "job_skill": nice_skill,
                        "candidate_skill": candidate_skill,
                        "match_type": "containment",
                        "similarity": 0.9,
                        "required": False
                    })
                    used_candidate_skills.add(candidate_skill_norm)
                    match_found = True
                    break

                # Fuzzy match
                similarity = fuzz.ratio(nice_skill_norm, candidate_skill_norm) / 100.0
                if similarity >= threshold:
                    matched_skills.append({
                        "job_skill": nice_skill,
                        "candidate_skill": candidate_skill,
                        "match_type": "fuzzy",
                        "similarity": similarity,
                        "required": False
                    })
                    used_candidate_skills.add(candidate_skill_norm)
                    match_found = True
                    break

            if not match_found:
                missing_nice_to_have.append(nice_skill)
        
        # Find extra skills (candidate has but job doesn't require)
        matched_candidate_skills = {m["candidate_skill"].lower() for m in matched_skills}
        for candidate_skill in candidate_skills:
            if candidate_skill.lower() not in matched_candidate_skills:
                extra_skills.append(candidate_skill)
        
        return {
            "matched_skills": matched_skills,
            "missing_required": missing_required,
            "missing_nice_to_have": missing_nice_to_have,
            "extra_skills": extra_skills,
            "match_counts": {
                "required_matched": len([m for m in matched_skills if m["required"]]),
                "required_total": len(required_skills),
                "nice_to_have_matched": len([m for m in matched_skills if not m["required"]]),
                "nice_to_have_total": len(nice_to_have_skills),
                "extra_count": len(extra_skills)
            }
        }

    def calculate_skills_score(self, job_requirements: Dict[str, Any], candidate: Dict[str, Any]) -> Tuple[float, Dict[str, Any]]:
        """Calculate skills match score (0-40 points)"""
        max_score = self.config["weights"]["skills"]
        
        skills_analysis = self.analyze_skills_match(job_requirements, candidate)
        match_counts = skills_analysis["match_counts"]
        
        # Required skills score (25 points max)
        required_score = 0.0
        if match_counts["required_total"] > 0:
            required_ratio = match_counts["required_matched"] / match_counts["required_total"]
            required_score = required_ratio * 25.0
        
        # Nice-to-have skills score (10 points max) 
        nice_to_have_score = 0.0
        if match_counts["nice_to_have_total"] > 0:
            nice_ratio = match_counts["nice_to_have_matched"] / match_counts["nice_to_have_total"]
            nice_to_have_score = nice_ratio * 10.0
        
        # Extra skills bonus (5 points max)
        extra_bonus = min(5.0, match_counts["extra_count"] * 0.5)
        
        total_score = min(max_score, required_score + nice_to_have_score + extra_bonus)
        
        return total_score, skills_analysis

    def calculate_experience_score(self, job_requirements: Dict[str, Any], candidate: Dict[str, Any], job_level: str = "mid") -> Tuple[float, Dict[str, Any]]:
        """Calculate experience match score (0-25 points)"""
        max_score = self.config["weights"]["experience"]

        job_level = job_level or "mid"
        min_required = job_requirements.get("min_experience_years")
        max_required = job_requirements.get("max_experience_years")
        candidate_years = candidate.get("experience_years", 0) or 0

        analysis = {
            "candidate_years": candidate_years,
            "min_required": min_required,
            "max_required": max_required,
            "job_level": job_level
        }

        # If no specific requirements, use job level defaults
        if min_required is None and max_required is None:
            level_ranges = self.experience_levels.get(job_level.lower(), {"min": 2, "max": 6})
            min_required = level_ranges["min"]
            max_required = level_ranges["max"]
            analysis["using_job_level_defaults"] = True
        
        # Calculate base experience score (15 points)
        experience_score = 0.0
        
        if min_required is not None:
            if candidate_years >= min_required:
                # Perfect match or overqualified
                if max_required and candidate_years <= max_required:
                    experience_score = 15.0  # Perfect range match
                elif max_required and candidate_years > max_required:
                    # Overqualified - slight penalty for very senior roles
                    overqualification = candidate_years - max_required
                    penalty = min(3.0, overqualification * 0.3)
                    experience_score = max(12.0, 15.0 - penalty)
                else:
                    experience_score = 15.0  # Meets minimum, no max specified
            else:
                # Underqualified - penalty based on gap
                gap = min_required - candidate_years
                penalty = min(10.0, gap * 2.0)
                experience_score = max(0.0, 15.0 - penalty)
        else:
            # No specific requirements - give average score
            experience_score = 10.0
        
        # Relevant experience bonus (10 points max)
        # Based on title relevance and skill-years inferred from work history.
        work_experiences = candidate.get("work_experiences", [])
        job_title = (candidate.get("target_job_title") or "").lower().strip()
        required_skills = [s for s in job_requirements.get("required_skills", []) if isinstance(s, str)]
        primary_skills = [s for s in job_requirements.get("primary_skills", []) if isinstance(s, str)]

        title_relevance = self._calculate_title_relevance(job_title, work_experiences) if work_experiences else 0.0
        title_bonus = title_relevance * 6.0  # max 6 points

        # Skill-years bonus based on primary + required skills
        key_skills = list(dict.fromkeys(primary_skills + required_skills))[:8]
        if key_skills and work_experiences:
            skill_years = [self._estimate_skill_years(s, work_experiences) for s in key_skills]
            avg_skill_years = sum(skill_years) / len(skill_years)
            skill_years_bonus = min(4.0, avg_skill_years * 0.6)
        else:
            avg_skill_years = 0.0
            skill_years_bonus = 0.0

        relevant_score = min(10.0, title_bonus + skill_years_bonus)
        
        total_score = min(max_score, experience_score + relevant_score)
        
        analysis.update({
            "experience_subscore": experience_score,
            "relevant_subscore": relevant_score,
            "title_relevance_ratio": round(title_relevance, 3),
            "avg_key_skill_years": round(avg_skill_years, 2),
            "total_score": total_score,
            "meets_minimum": candidate_years >= (min_required or 0)
        })
        
        return total_score, analysis

    def _calculate_title_relevance(self, job_title: str, work_experiences: List[Dict[str, Any]]) -> float:
        """Return 0..1 relevance based on overlap between target job title and past titles."""
        if not job_title or not work_experiences:
            return 0.0

        # keep meaningful tokens only
        stop_tokens = {
            "senior", "junior", "mid", "lead", "principal", "staff",
            "engineer", "developer", "specialist", "associate", "manager",
            "intern", "sr", "jr",
        }
        target_tokens = {t for t in re.findall(r"[a-zA-Z\+#\.]{2,}", job_title.lower()) if t not in stop_tokens}
        if not target_tokens:
            target_tokens = set(re.findall(r"[a-zA-Z\+#\.]{2,}", job_title.lower()))
        if not target_tokens:
            return 0.0

        best = 0.0
        for exp in work_experiences:
            title = str(exp.get("job_title") or "").lower()
            if not title:
                continue
            exp_tokens = set(re.findall(r"[a-zA-Z\+#\.]{2,}", title))
            if not exp_tokens:
                continue

            overlap = len(target_tokens.intersection(exp_tokens))
            ratio = overlap / max(1, len(target_tokens))
            best = max(best, ratio)

        return min(1.0, best)

    def _estimate_skill_years(self, skill: str, work_experiences: List[Dict[str, Any]]) -> float:
        """Estimate years of skill usage from work history date ranges and text mentions."""
        if not skill or not work_experiences:
            return 0.0

        skill_norm = skill.lower().strip()
        synonyms = set(self.normalize_skills([skill_norm]))

        total_years = 0.0
        for exp in work_experiences:
            title = str(exp.get("job_title") or "").lower()
            desc = str(exp.get("description") or "").lower()
            resp = str(exp.get("responsibilities") or "").lower()
            combined = f"{title} {desc} {resp}"

            if not any(
                syn in combined or self._is_containment_match(syn, combined)
                for syn in synonyms
            ):
                continue

            years = self._estimate_experience_duration_years(exp)
            total_years += years

        return min(20.0, total_years)

    def _estimate_experience_duration_years(self, exp: Dict[str, Any]) -> float:
        """Estimate duration in years from start/end/duration fields."""
        start = str(exp.get("start_date") or "").strip()
        end = str(exp.get("end_date") or "").strip()
        duration = str(exp.get("duration") or "").strip().lower()

        # Try YYYY-MM style dates first
        if start:
            start_m = re.match(r"^(\d{4})(?:-(\d{1,2}))?", start)
            if start_m:
                sy = int(start_m.group(1))
                sm = int(start_m.group(2) or 1)
                if end.lower() == "present":
                    ey, em = datetime.utcnow().year, datetime.utcnow().month
                else:
                    end_m = re.match(r"^(\d{4})(?:-(\d{1,2}))?", end)
                    if end_m:
                        ey = int(end_m.group(1))
                        em = int(end_m.group(2) or 1)
                    else:
                        ey, em = datetime.utcnow().year, datetime.utcnow().month
                months = max(1, (ey - sy) * 12 + (em - sm))
                return min(30.0, months / 12.0)

        # Fallback: parse textual duration ("3 years 6 months")
        years = 0.0
        y = re.search(r"(\d+(?:\.\d+)?)\s*year", duration)
        m = re.search(r"(\d+(?:\.\d+)?)\s*month", duration)
        if y:
            years += float(y.group(1))
        if m:
            years += float(m.group(1)) / 12.0
        if years > 0:
            return min(30.0, years)

        return 1.0

    def calculate_education_score(self, job_requirements: Dict[str, Any], candidate: Dict[str, Any]) -> Tuple[float, Dict[str, Any]]:
        """Calculate education match score (0-15 points)"""
        max_score = self.config["weights"]["education"]
        
        education_reqs = job_requirements.get("education_requirements", [])
        candidate_education = candidate.get("education", [])
        
        analysis = {
            "required_education": education_reqs,
            "candidate_education": candidate_education,
            "matches": []
        }
        
        if not education_reqs:
            # No specific education requirements - give neutral score
            return max_score * 0.6, analysis
        
        if not candidate_education:
            # No education data — can't evaluate, no free points
            return 0.0, analysis
        
        # Find the highest education level for candidate
        candidate_highest = 0
        for edu in candidate_education:
            if isinstance(edu, dict):
                degree = (edu.get("degree") or "").lower()
            else:
                degree = str(edu).lower()
            
            for ed_key, level in self.education_hierarchy.items():
                if ed_key in degree:
                    candidate_highest = max(candidate_highest, level)
                    break
        
        # Check requirements against candidate education
        max_req_level = 0
        matches = []
        
        for req in education_reqs:
            req_lower = str(req).lower()
            req_level = 0
            
            for ed_key, level in self.education_hierarchy.items():
                if ed_key in req_lower:
                    req_level = max(req_level, level)
            
            max_req_level = max(max_req_level, req_level)
            
            if candidate_highest >= req_level:
                matches.append({
                    "requirement": req,
                    "candidate_level": candidate_highest,
                    "required_level": req_level,
                    "meets_requirement": True
                })
        
        analysis["matches"] = matches
        analysis["candidate_highest_level"] = candidate_highest
        analysis["max_required_level"] = max_req_level
        
        # Calculate score
        if candidate_highest >= max_req_level:
            # Meets or exceeds requirements
            degree_score = 10.0
            if candidate_highest > max_req_level:
                # Bonus for exceeding requirements
                degree_score = min(12.0, degree_score + (candidate_highest - max_req_level))
        else:
            # Doesn't meet requirements
            deficit = max_req_level - candidate_highest
            degree_score = max(0.0, 10.0 - deficit * 3.0)
        
        # Field relevance score (5 points max)
        # For now, give partial credit if any education is present
        field_score = 5.0 if candidate_education else 0.0
        
        total_score = min(max_score, degree_score + field_score)
        
        analysis.update({
            "degree_subscore": degree_score,
            "field_subscore": field_score,
            "total_score": total_score
        })
        
        return total_score, analysis

    def calculate_additional_score(self, job_requirements: Dict[str, Any], candidate: Dict[str, Any], job_data: Dict[str, Any]) -> Tuple[float, Dict[str, Any]]:
        """Calculate additional factors score (0-20 points).

        Only scores factors where we have real data to evaluate.
        Redistributes weight from unevaluatable factors to evaluatable ones
        so the total component still uses its full weight fairly.
        """
        max_score = self.config["weights"]["additional"]

        location_reqs = job_requirements.get("location_requirements", [])
        candidate_location = (candidate.get("location") or "").strip()
        job_location = (job_data.get("location") or "").strip()
        work_arrangement = job_data.get("work_arrangement", "onsite")

        # --- Location score (0.0 to 1.0 ratio) ---
        location_ratio = self._evaluate_location(
            location_reqs, candidate_location, job_location, work_arrangement
        )

        # We can always evaluate location (even "no data" is a signal), so
        # location is the primary driver of additional score.
        # Salary and work arrangement are only scored when data exists.

        # --- Salary score (0.0 to 1.0 ratio or None if unevaluatable) ---
        salary_ratio = None  # We don't have candidate salary expectations yet

        # --- Work arrangement score (0.0 to 1.0 ratio or None) ---
        arrangement_ratio = None  # We don't have candidate preferences yet

        # Build the score from evaluatable factors only.
        # Location always gets the majority of the weight.
        evaluatable = [("location", location_ratio)]
        if salary_ratio is not None:
            evaluatable.append(("salary", salary_ratio))
        if arrangement_ratio is not None:
            evaluatable.append(("arrangement", arrangement_ratio))

        # Distribute max_score across evaluatable factors
        per_factor = max_score / len(evaluatable) if evaluatable else 0
        total_score = sum(ratio * per_factor for _, ratio in evaluatable)
        total_score = min(max_score, total_score)

        # Build analysis with actual point values
        location_points = location_ratio * per_factor
        salary_points = (salary_ratio * per_factor) if salary_ratio is not None else None
        arrangement_points = (arrangement_ratio * per_factor) if arrangement_ratio is not None else None

        analysis = {
            "location_score": round(location_points, 2),
            "salary_score": round(salary_points, 2) if salary_points is not None else "not_evaluated",
            "work_arrangement_score": round(arrangement_points, 2) if arrangement_points is not None else "not_evaluated",
            "total_score": round(total_score, 2),
            "evaluatable_factors": len(evaluatable),
        }

        return total_score, analysis

    def _evaluate_location(
        self,
        location_reqs: List,
        candidate_location: str,
        job_location: str,
        work_arrangement: str,
    ) -> float:
        """Return a 0.0-1.0 ratio for location fit."""
        # Remote job — location irrelevant
        if any("remote" in str(req).lower() for req in location_reqs) or work_arrangement == "remote_only":
            return 1.0

        # No location specified on the job
        if not location_reqs and not job_location:
            return 1.0

        # Candidate has no location data — unknown fit
        if not candidate_location:
            return 0.5

        # Remote-possible or hybrid: candidate location matters less
        if work_arrangement in ("remote_possible", "hybrid"):
            if job_location and (
                candidate_location.lower() in job_location.lower()
                or job_location.lower() in candidate_location.lower()
            ):
                return 1.0
            return 0.7  # Hybrid/remote-possible tolerates distance

        # Onsite or relocation required — strict location match
        if job_location:
            if (candidate_location.lower() in job_location.lower()
                    or job_location.lower() in candidate_location.lower()):
                return 1.0
            return 0.3  # Different location, would need relocation

        return 0.5  # Insufficient data

    def calculate_primary_skills_multiplier(self, job_requirements: Dict[str, Any], candidate: Dict[str, Any]) -> Tuple[float, Dict[str, Any]]:
        """Calculate primary skills penalty multiplier.

        Returns (multiplier, analysis_dict).
        If no primary skills defined, returns 1.0 (no penalty).
        """
        primary_skills = job_requirements.get("primary_skills", [])

        if not primary_skills:
            return 1.0, {
                "primary_skills": [],
                "matched": [],
                "missing": [],
                "multiplier": 1.0,
                "penalty_applied": False,
            }

        candidate_skills = candidate.get("skills", [])
        candidate_skills_norm = set(self.normalize_skills(candidate_skills))
        threshold = self.config.get("fuzzy_match_threshold", 0.8)

        matched = []
        missing = []

        for ps in primary_skills:
            if not isinstance(ps, str) or not ps.strip():
                continue
            ps_norm = ps.lower().strip()
            ps_expanded = set(self.normalize_skills([ps]))
            found = False

            # Check direct/synonym match
            if ps_expanded.intersection(candidate_skills_norm):
                matched.append(ps)
                found = True
            else:
                # Containment match
                for cs in candidate_skills_norm:
                    if self._is_containment_match(ps_norm, cs):
                        matched.append(ps)
                        found = True
                        break

            if not found:
                # Fuzzy match
                for cs in candidate_skills_norm:
                    if (fuzz.ratio(ps_norm, cs) / 100.0) >= threshold:
                        matched.append(ps)
                        found = True
                        break

            if not found:
                missing.append(ps)

        penalty_config = self.config.get("primary_skills_penalty", {})

        if len(matched) == len(primary_skills):
            multiplier = penalty_config.get("all_present", 1.0)
        elif len(matched) > 0:
            multiplier = penalty_config.get("some_present", 0.6)
        else:
            multiplier = penalty_config.get("none_present", 0.25)

        return multiplier, {
            "primary_skills": primary_skills,
            "matched": matched,
            "missing": missing,
            "multiplier": multiplier,
            "penalty_applied": multiplier < 1.0,
        }

    def calculate_overall_match_score(self, job_requirements: Dict[str, Any], candidate: Dict[str, Any], job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate complete match score with detailed breakdown"""
        # Pass contextual title to experience scoring logic
        candidate = dict(candidate)
        candidate["target_job_title"] = job_data.get("title", "")
        
        # Calculate each component score
        skills_score, skills_analysis = self.calculate_skills_score(job_requirements, candidate)
        experience_score, experience_analysis = self.calculate_experience_score(
            job_requirements, candidate, job_data.get("experience_level") or "mid"
        )
        education_score, education_analysis = self.calculate_education_score(job_requirements, candidate)
        additional_score, additional_analysis = self.calculate_additional_score(job_requirements, candidate, job_data)
        
        # Calculate raw score (sum of 4 components)
        raw_score = skills_score + experience_score + education_score + additional_score

        # Apply primary skills penalty multiplier
        primary_multiplier, primary_analysis = self.calculate_primary_skills_multiplier(job_requirements, candidate)

        # Additional required-skill coverage penalty so critical misses don't rank unrealistically high.
        req_total = skills_analysis.get("match_counts", {}).get("required_total", 0) or 0
        req_matched = skills_analysis.get("match_counts", {}).get("required_matched", 0) or 0
        required_ratio = (req_matched / req_total) if req_total else 1.0
        if required_ratio >= 0.9:
            required_multiplier = 1.0
        elif required_ratio >= 0.75:
            required_multiplier = 0.9
        elif required_ratio >= 0.6:
            required_multiplier = 0.8
        else:
            required_multiplier = 0.65

        # Role-specific hard penalty for DevOps/infra roles missing core automation skills
        role_title = str(job_data.get("title") or "").lower()
        missing_required = [s.lower() for s in skills_analysis.get("missing_required", [])]
        critical_devops_skills = {"ci/cd", "kubernetes", "docker", "terraform", "aws"}
        critical_missing = sorted(list(critical_devops_skills.intersection(set(missing_required))))
        critical_multiplier = 0.8 if ("devops" in role_title and critical_missing) else 1.0

        overall_score = raw_score * primary_multiplier * required_multiplier * critical_multiplier

        # Determine tier
        if overall_score >= 80:
            tier = "excellent"
            tier_color = "green"
        elif overall_score >= 60:
            tier = "good"
            tier_color = "yellow"
        else:
            tier = "poor"
            tier_color = "red"

        return {
            "overall_score": round(overall_score, 2),
            "tier": tier,
            "tier_color": tier_color,
            "component_scores": {
                "skills": round(skills_score, 2),
                "experience": round(experience_score, 2),
                "education": round(education_score, 2),
                "additional": round(additional_score, 2),
                "raw_score": round(raw_score, 2),
                "primary_skills_multiplier": round(primary_multiplier, 2),
                "required_coverage_multiplier": round(required_multiplier, 2),
                "critical_skill_multiplier": round(critical_multiplier, 2),
            },
            "detailed_analysis": {
                "skills": skills_analysis,
                "experience": experience_analysis,
                "education": education_analysis,
                "additional": additional_analysis,
                "primary_skills": primary_analysis
            },
            "summary": {
                "skills_matched": len(skills_analysis.get("matched_skills", [])),
                "skills_missing": len(skills_analysis.get("missing_required", [])),
                "skills_extra": len(skills_analysis.get("extra_skills", [])),
                "meets_experience": experience_analysis.get("meets_minimum", False),
                "education_level": education_analysis.get("candidate_highest_level", 0),
                "primary_skills_missing": primary_analysis.get("missing", []),
                "required_skills_ratio": round(required_ratio, 3),
                "critical_missing_skills": critical_missing,
            },
            "calculation_metadata": {
                "algorithm_version": "1.2",
                "config_used": self.config,
                "calculated_at": datetime.utcnow().isoformat()
            }
        }