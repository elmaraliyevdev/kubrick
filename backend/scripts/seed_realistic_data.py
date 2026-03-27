#!/usr/bin/env python3
"""
Seed realistic demo data for local testing.

Usage:
  cd backend
  python3 scripts/seed_realistic_data.py
  python3 scripts/seed_realistic_data.py --fresh

Notes:
- Uses DATABASE_URL from backend/.env
- Creates one demo organization with admin + recruiter users
- Creates realistic jobs, job requirements, candidates, work history, applications, and match scores
- Safe to re-run; by default it skips records that already exist
"""

from __future__ import annotations

import argparse
import os
import random
import sys
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

from passlib.context import CryptContext

# Allow "from app..." imports when run as: python3 scripts/seed_realistic_data.py
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db.session import SessionLocal
from app.db.models.organization import Organization
from app.db.models.user import User
from app.db.models.job import Job
from app.db.models.job_requirement import JobRequirement
from app.db.models.candidate import Candidate
from app.db.models.work_experience import WorkExperience
from app.db.models.job_application import JobApplication
from app.db.models.candidate_job_match import CandidateJobMatch
from app.utils.slug import generate_organization_slug, generate_job_slug


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

ORG_NAME = "Northstar Talent Labs"
# Use a normal, non-reserved domain so Pydantic EmailStr validation accepts it.
ORG_DOMAIN = "northstartalentlabs.com"
ADMIN_EMAIL = f"admin@{ORG_DOMAIN}"
RECRUITER_EMAIL = f"recruiter@{ORG_DOMAIN}"
DEFAULT_PASSWORD = "Password123!"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed realistic jobs/candidates data")
    parser.add_argument(
        "--fresh",
        action="store_true",
        help="Delete existing demo organization data first, then recreate",
    )
    return parser.parse_args()


def get_or_create_org(db, fresh: bool) -> Organization:
    org = db.query(Organization).filter(Organization.name == ORG_NAME).first()

    if org and fresh:
        # Use bulk delete to let DB-level ON DELETE CASCADE handle children.
        # ORM instance delete can attempt to null non-nullable FKs (e.g. jobs.organization_id).
        db.query(Organization).filter(Organization.id == org.id).delete(synchronize_session=False)
        db.commit()
        org = None

    if org:
        return org

    org = Organization(
        name=ORG_NAME,
        slug=generate_organization_slug(ORG_NAME, db),
        description="Recruiting operations for modern SaaS and data teams.",
        website_url="https://northstar-talent.example",
        brand_color="#2563EB",
        career_page_enabled=True,
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


def get_or_create_users(db, organization_id: int) -> tuple[User, User]:
    admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if not admin:
        admin = User(
            email=ADMIN_EMAIL,
            hashed_password=hash_password(DEFAULT_PASSWORD),
            first_name="Aylin",
            last_name="Mammadova",
            organization_id=organization_id,
            role="admin",
            email_verified=True,
            is_active=True,
        )
        db.add(admin)

    recruiter = db.query(User).filter(User.email == RECRUITER_EMAIL).first()
    if not recruiter:
        recruiter = User(
            email=RECRUITER_EMAIL,
            hashed_password=hash_password(DEFAULT_PASSWORD),
            first_name="Kenan",
            last_name="Aliyev",
            organization_id=organization_id,
            role="recruiter",
            email_verified=True,
            is_active=True,
        )
        db.add(recruiter)

    db.commit()
    db.refresh(admin)
    db.refresh(recruiter)
    return admin, recruiter


def realistic_jobs() -> list[dict[str, Any]]:
    role_templates: list[dict[str, Any]] = [
        {
            "title_prefix": "Backend Engineer",
            "category": "Engineering",
            "required_skills": [
                "Python", "FastAPI", "PostgreSQL", "SQLAlchemy", "Redis", "Docker",
                "REST APIs", "Unit Testing", "CI/CD", "Git", "Alembic", "AsyncIO",
            ],
            "nice_skills": ["Kubernetes", "OpenAI API", "Celery", "Nginx", "Terraform"],
            "primary_skills": ["Python", "FastAPI", "PostgreSQL"],
            "employment_type": "full_time",
            "work_arrangement": "hybrid",
            "experience_level": "senior",
            "salary_min": 60000,
            "salary_max": 92000,
            "min_exp": 4,
            "max_exp": 10,
        },
        {
            "title_prefix": "Frontend Engineer",
            "category": "Engineering",
            "required_skills": [
                "React", "TypeScript", "Redux Toolkit", "TanStack Query", "Tailwind CSS",
                "Vite", "HTML", "CSS", "Responsive Design", "UI Testing", "REST APIs",
            ],
            "nice_skills": ["Recharts", "MSW", "Vitest", "Accessibility", "Design Systems"],
            "primary_skills": ["React", "TypeScript", "Redux Toolkit"],
            "employment_type": "full_time",
            "work_arrangement": "remote_only",
            "experience_level": "mid",
            "salary_min": 48000,
            "salary_max": 76000,
            "min_exp": 3,
            "max_exp": 8,
        },
        {
            "title_prefix": "Data Analyst",
            "category": "Data",
            "required_skills": [
                "SQL", "Python", "Data Visualization", "Statistics", "Dashboarding",
                "Cohort Analysis", "A/B Testing", "ETL", "Excel", "Reporting",
            ],
            "nice_skills": ["Tableau", "Metabase", "dbt", "BigQuery", "Looker"],
            "primary_skills": ["SQL", "Data Visualization"],
            "employment_type": "contract",
            "work_arrangement": "remote_possible",
            "experience_level": "mid",
            "salary_min": 26000,
            "salary_max": 45000,
            "min_exp": 3,
            "max_exp": 7,
        },
        {
            "title_prefix": "Technical Recruiter",
            "category": "Recruiting",
            "required_skills": [
                "Technical Recruiting", "Sourcing", "Interviewing", "Stakeholder Management",
                "Pipeline Management", "ATS", "Offer Management", "Candidate Experience",
            ],
            "nice_skills": ["Employer Branding", "Talent Mapping", "Compensation Benchmarking"],
            "primary_skills": ["Technical Recruiting", "Sourcing"],
            "employment_type": "full_time",
            "work_arrangement": "onsite",
            "experience_level": "mid",
            "salary_min": 30000,
            "salary_max": 55000,
            "min_exp": 2,
            "max_exp": 7,
        },
        {
            "title_prefix": "DevOps Engineer",
            "category": "Infrastructure",
            "required_skills": [
                "AWS", "Docker", "Kubernetes", "CI/CD", "Linux", "Terraform",
                "Monitoring", "Incident Response", "Networking", "Security Basics",
            ],
            "nice_skills": ["Prometheus", "Grafana", "Ansible", "Helm", "SRE Practices"],
            "primary_skills": ["AWS", "Kubernetes", "CI/CD"],
            "employment_type": "full_time",
            "work_arrangement": "hybrid",
            "experience_level": "senior",
            "salary_min": 58000,
            "salary_max": 95000,
            "min_exp": 4,
            "max_exp": 10,
        },
    ]

    locations = ["Baku, Azerbaijan", "Remote (EMEA)", "Istanbul, Turkiye", "Tbilisi, Georgia", "Ankara, Turkiye"]
    products = ["candidate ranking engine", "career page suite", "recruiter dashboard", "matching analytics module", "application workflow system"]
    teams = ["platform team", "product engineering team", "data operations team", "hiring intelligence team"]

    jobs: list[dict[str, Any]] = []
    for i in range(20):
        tpl = role_templates[i % len(role_templates)]
        title = f"{tpl['title_prefix']} {i + 1}"
        location = locations[i % len(locations)]
        product = products[i % len(products)]
        team = teams[i % len(teams)]

        # 4-sentence realistic description
        description = (
            f"We are hiring a {title} to help scale our {product} across multiple markets. "
            f"In this role, you will partner with product managers, recruiters, and engineers to deliver measurable hiring outcomes. "
            f"You will own key deliverables end-to-end, from discovery and planning to rollout and iteration in production. "
            f"This position sits within the {team} and requires strong communication, execution discipline, and hands-on problem solving."
        )

        responsibilities = [
            f"Lead delivery for core initiatives in the {product}",
            "Collaborate cross-functionally with design, product, and operations partners",
            "Document decisions and maintain clear technical and process standards",
            "Contribute to sprint planning, estimation, and incident resolution",
            "Mentor teammates and improve team delivery quality",
        ]

        requirements = [
            f"{tpl['min_exp']}+ years of relevant experience",
            "Demonstrated ownership of production systems or high-impact recruiting workflows",
            "Strong analytical thinking and structured communication",
            "Ability to operate independently with stakeholder alignment",
            "Proven experience with modern collaboration tools and agile practices",
        ]

        jobs.append(
            {
                "title": title,
                "category": tpl["category"],
                "location": location,
                "employment_type": tpl["employment_type"],
                "work_arrangement": tpl["work_arrangement"],
                "status": "open" if i < 16 else ("draft" if i < 18 else "closed"),
                "salary_min": tpl["salary_min"] + (i % 4) * 1500,
                "salary_max": tpl["salary_max"] + (i % 4) * 2200,
                "experience_level": tpl["experience_level"],
                "description": description,
                "responsibilities": responsibilities,
                "requirements": requirements,
                "nice_to_have": [
                    "Experience working in fast-moving product teams",
                    "Comfort with KPI-driven prioritization",
                    "Ability to improve internal processes through automation",
                ],
                "benefits": [
                    "Private health insurance and annual wellness budget",
                    "Learning stipend for books, courses, and certifications",
                    "Flexible working hours with outcome-based performance culture",
                ],
                "required_skills": tpl["required_skills"],
                "nice_skills": tpl["nice_skills"],
                "primary_skills": tpl["primary_skills"],
                "min_exp": tpl["min_exp"],
                "max_exp": tpl["max_exp"],
            }
        )

    return jobs


def realistic_candidates() -> list[dict[str, Any]]:
    first_names = [
        "Murad", "Nigar", "Leyla", "Orkhan", "Aysel", "Tural", "Kamran", "Farida", "Elvin", "Roya",
        "Samir", "Laman", "Rauf", "Gunel", "Rashad", "Ulker", "Emil", "Nermin", "Kanan", "Sevda",
    ]
    last_names = [
        "Hasanov", "Quliyeva", "Karimli", "Ismayilov", "Mammadli", "Aliyev", "Suleymanov", "Huseynova",
        "Abbasov", "Rahimova", "Asgarov", "Taghiyeva", "Nabiyev", "Gasimova", "Jafarov", "Babayeva",
        "Rustamov", "Safarli", "Hajiyev", "Yusifova",
    ]
    locations = ["Baku, Azerbaijan", "Istanbul, Turkiye", "Remote", "Tbilisi, Georgia", "Ankara, Turkiye"]
    tracks = [
        ["Python", "FastAPI", "PostgreSQL", "SQLAlchemy", "Docker", "Redis", "CI/CD", "REST APIs"],
        ["React", "TypeScript", "Redux Toolkit", "TanStack Query", "Tailwind CSS", "Vite", "Vitest", "MSW"],
        ["SQL", "Python", "Data Visualization", "Dashboarding", "Statistics", "Tableau", "A/B Testing"],
        ["Technical Recruiting", "Sourcing", "Interviewing", "ATS", "Stakeholder Management", "Offer Negotiation"],
        ["AWS", "Kubernetes", "Docker", "Terraform", "Linux", "Monitoring", "Incident Response"],
    ]
    role_title_options = [
        ["Backend Engineer", "Python Developer", "Software Engineer", "API Engineer"],
        ["Frontend Developer", "Frontend Engineer", "React Developer", "UI Engineer"],
        ["Data Analyst", "Business Analyst", "Reporting Analyst", "Product Analyst"],
        ["Technical Recruiter", "Talent Acquisition Specialist", "Recruitment Consultant", "HR Business Partner"],
        ["DevOps Engineer", "Site Reliability Engineer", "Cloud Engineer", "Infrastructure Engineer"],
    ]
    schools = ["ADA University", "BSU", "Khazar University", "METU", "ASOIU", "UFAZ"]
    companies = ["Cloudlane", "Productivo", "ScaleUp HR", "Insightloop", "Paynorth", "DataNest", "TalentFlow"]

    candidates: list[dict[str, Any]] = []
    for i in range(20):
        fn = first_names[i]
        ln = last_names[i]
        track = tracks[i % len(tracks)]
        role_titles = role_title_options[i % len(role_title_options)]
        exp = 2 + (i % 8)

        candidates.append(
            {
                "first_name": fn,
                "last_name": ln,
                "email": f"{fn.lower()}.{ln.lower()}@example.com",
                "phone": f"+99450{100000 + i}",
                "location": locations[i % len(locations)],
                "linkedin_url": f"https://linkedin.com/in/{fn.lower()}-{ln.lower()}",
                "portfolio_url": f"https://{fn.lower()}{ln.lower()}.dev" if i % 3 != 0 else None,
                "experience_years": exp,
                "skills": track + random.sample(
                    ["Communication", "Problem Solving", "Agile", "Jira", "Notion", "Git", "English", "Mentorship"],
                    3,
                ),
                "education": [
                    {
                        "degree": "BSc Computer Science" if i % 2 == 0 else "BSc Information Systems",
                        "school": schools[i % len(schools)],
                        "year": str(2014 + (i % 9)),
                    }
                ],
                "certifications": [
                    {"name": ("AWS Certified Developer" if i % 5 == 0 else "Google Data Analytics"), "year": 2023},
                    {"name": "Scrum Fundamentals Certified", "year": 2022},
                ],
                "notes": "Profile created for realistic pipeline testing with diverse skill coverage and tenure.",
                "work_experience": [
                    {
                        "job_title": role_titles[0] if exp > 5 else role_titles[1],
                        "company_name": companies[i % len(companies)],
                        "location": locations[i % len(locations)],
                        "employment_type": "Full-time",
                        "start_date": f"{2018 + (i % 5)}-01",
                        "end_date": "Present",
                        "duration": f"{exp} years",
                        "description": (
                            f"Led delivery across core initiatives using {', '.join(track[:4])}. "
                            "Collaborated with cross-functional stakeholders and improved reliability of production workflows."
                        ),
                        "responsibilities": (
                            f"Implemented features and improvements using {', '.join(track[:3])}. "
                            "Led sprint execution, maintained delivery quality, and mentored junior contributors."
                        ),
                    },
                    {
                        "job_title": role_titles[2] if exp > 4 else role_titles[3],
                        "company_name": companies[(i + 2) % len(companies)],
                        "location": locations[(i + 1) % len(locations)],
                        "employment_type": "Full-time",
                        "start_date": f"{2016 + (i % 4)}-02",
                        "end_date": f"{2018 + (i % 5)}-01",
                        "duration": "2 years",
                        "description": (
                            f"Contributed to roadmap execution with focus on {', '.join(track[2:6])}. "
                            "Supported operational reporting and process improvements."
                        ),
                        "responsibilities": (
                            f"Prepared analyses and delivered updates using {', '.join(track[:2])}. "
                            "Collaborated with stakeholders and documented best practices."
                        ),
                    },
                ],
            }
        )

    return candidates


def create_jobs(db, org: Organization, owner_id: int) -> list[Job]:
    jobs: list[Job] = []
    for seed in realistic_jobs():
        existing = (
            db.query(Job)
            .filter(Job.organization_id == org.id, Job.title == seed["title"])
            .first()
        )
        if existing:
            jobs.append(existing)
            continue

        slug = generate_job_slug(seed["title"], org.id, db)
        job = Job(
            user_id=owner_id,
            organization_id=org.id,
            title=seed["title"],
            slug=slug,
            description=seed["description"],
            location=seed["location"],
            employment_type=seed["employment_type"],
            responsibilities=seed["responsibilities"],
            requirements=seed["requirements"],
            nice_to_have=seed["nice_to_have"],
            benefits=seed["benefits"],
            experience_level=seed["experience_level"],
            salary_min=seed["salary_min"],
            salary_max=seed["salary_max"],
            skills_required=", ".join(seed["required_skills"]),
            category=seed["category"],
            work_arrangement=seed["work_arrangement"],
            status=seed["status"],
        )
        db.add(job)
        db.flush()

        req = JobRequirement(
            job_id=job.id,
            required_skills=seed["required_skills"],
            nice_to_have_skills=seed["nice_skills"],
            primary_skills=seed["primary_skills"],
            min_experience_years=seed["min_exp"],
            max_experience_years=seed["max_exp"],
            education_requirements=["Bachelor's degree or equivalent practical experience"],
            location_requirements=[seed["location"], seed["work_arrangement"]],
            parsed_at=datetime.utcnow(),
            needs_reparsing=False,
        )
        db.add(req)
        jobs.append(job)

    db.commit()
    for j in jobs:
        db.refresh(j)
    return jobs


def create_candidates(db, org: Organization, added_by_id: int) -> list[Candidate]:
    out: list[Candidate] = []
    for seed in realistic_candidates():
        existing = (
            db.query(Candidate)
            .filter(
                Candidate.email == seed["email"],
                Candidate.organization_id == org.id,
            )
            .first()
        )
        if existing:
            out.append(existing)
            continue

        candidate = Candidate(
            first_name=seed["first_name"],
            last_name=seed["last_name"],
            email=seed["email"],
            phone=seed["phone"],
            location=seed["location"],
            organization_id=org.id,
            added_by_id=added_by_id,
            skills=seed["skills"],
            experience_years=seed["experience_years"],
            education=seed["education"],
            certifications=seed["certifications"],
            raw_resume_text=(
                f"{seed['first_name']} {seed['last_name']} | {seed['email']} | "
                f"Skills: {', '.join(seed['skills'])}"
            ),
            linkedin_url=seed["linkedin_url"],
            portfolio_url=seed["portfolio_url"],
            notes=seed["notes"],
        )
        db.add(candidate)
        db.flush()

        for w in seed["work_experience"]:
            db.add(
                WorkExperience(
                    candidate_id=candidate.id,
                    job_title=w["job_title"],
                    company_name=w["company_name"],
                    location=w["location"],
                    employment_type=w["employment_type"],
                    start_date=w["start_date"],
                    end_date=w["end_date"],
                    duration=w["duration"],
                    description=w["description"],
                    responsibilities=w["responsibilities"],
                )
            )
        out.append(candidate)

    db.commit()
    for c in out:
        db.refresh(c)
    return out


def pick_scores(matched: int, missing: int) -> tuple[Decimal, Decimal, Decimal, Decimal, Decimal]:
    # Weighted towards realistic mid-high scores with penalties for missing core skills.
    base = 55 + (matched * 6) - (missing * 4) + random.randint(-6, 7)
    overall = max(18, min(97, base))
    skills = Decimal(str(round(overall * 0.40, 2)))
    exp = Decimal(str(round(overall * 0.25, 2)))
    edu = Decimal(str(round(overall * 0.15, 2)))
    add = Decimal(str(round(overall * 0.20, 2)))
    return (
        Decimal(str(round(overall, 2))),
        skills,
        exp,
        edu,
        add,
    )


def create_applications_and_matches(db, jobs: list[Job], candidates: list[Candidate]) -> None:
    statuses = ["new", "reviewed", "shortlisted", "interviewed"]
    now = datetime.utcnow()

    for job in jobs:
        req = db.query(JobRequirement).filter(JobRequirement.job_id == job.id).first()
        required = set(req.required_skills or [])
        primary = set(req.primary_skills or [])

        for candidate in candidates:
            # 65% chance candidate has an application for each job.
            if random.random() > 0.65:
                continue

            app = (
                db.query(JobApplication)
                .filter(
                    JobApplication.job_id == job.id,
                    JobApplication.candidate_id == candidate.id,
                )
                .first()
            )
            if app:
                continue

            cskills = set(candidate.skills or [])
            matched = sorted(required.intersection(cskills))
            missing = sorted(required - cskills)

            score_int = max(20, min(96, 56 + len(matched) * 7 - len(missing) * 5 + random.randint(-8, 8)))
            status = random.choice(statuses)
            created_at = now - timedelta(days=random.randint(1, 45))

            db.add(
                JobApplication(
                    job_id=job.id,
                    candidate_id=candidate.id,
                    match_score=score_int,
                    matched_skills=matched,
                    missing_skills=missing,
                    status=status,
                    ai_summary=(
                        f"{candidate.first_name} shows strong alignment for {job.title} "
                        f"with {len(matched)} directly matched required skills."
                    ),
                    ai_reasoning=(
                        "Candidate evaluation based on required skill coverage, practical experience, "
                        "and overlap with primary role competencies."
                    ),
                    cover_letter=(
                        "I am interested in this role because it aligns with my hands-on experience "
                        "building production systems and collaborating in cross-functional teams."
                    ),
                    recruiter_notes=(
                        "Strong profile; evaluate communication and architecture depth in next round."
                    ),
                    created_at=created_at,
                )
            )

            match = (
                db.query(CandidateJobMatch)
                .filter(
                    CandidateJobMatch.job_id == job.id,
                    CandidateJobMatch.candidate_id == candidate.id,
                )
                .first()
            )
            if not match:
                overall, skills_score, exp_score, edu_score, add_score = pick_scores(
                    matched=len(matched), missing=len(missing)
                )
                primary_missing = sorted(primary - cskills)
                multiplier = 0.85 if primary_missing else 1.0

                db.add(
                    CandidateJobMatch(
                        candidate_id=candidate.id,
                        job_id=job.id,
                        overall_score=overall,
                        skills_score=skills_score,
                        experience_score=exp_score,
                        education_score=edu_score,
                        additional_score=add_score,
                        skills_matched=matched,
                        skills_missing=missing,
                        skills_extra=sorted(cskills - required),
                        match_details={
                            "summary": {
                                "required_skills_count": len(required),
                                "matched_skills_count": len(matched),
                                "missing_skills_count": len(missing),
                                "primary_skills_missing": primary_missing,
                            },
                            "component_scores": {
                                "raw_score": float(overall),
                                "primary_skills_multiplier": multiplier,
                            },
                        },
                        calculated_at=created_at + timedelta(hours=1),
                        needs_recalculation=False,
                        calculation_version="1.0",
                    )
                )

    db.commit()


def main() -> None:
    args = parse_args()
    random.seed(42)

    if "DATABASE_URL" not in os.environ:
        print("WARNING: DATABASE_URL is not explicitly set in environment; using backend/.env defaults.")

    db = SessionLocal()
    try:
        org = get_or_create_org(db, fresh=args.fresh)
        admin, recruiter = get_or_create_users(db, organization_id=org.id)
        jobs = create_jobs(db, org=org, owner_id=admin.id)
        candidates = create_candidates(db, org=org, added_by_id=recruiter.id)
        create_applications_and_matches(db, jobs=jobs, candidates=candidates)

        app_count = db.query(JobApplication).join(Job).filter(Job.organization_id == org.id).count()
        match_count = db.query(CandidateJobMatch).join(Job).filter(Job.organization_id == org.id).count()

        print("\nSeed complete.")
        print(f"- Organization: {org.name} ({org.slug})")
        print(f"- Users: {ADMIN_EMAIL}, {RECRUITER_EMAIL}")
        print(f"- Default password: {DEFAULT_PASSWORD}")
        print(f"- Jobs: {len(jobs)}")
        print(f"- Candidates: {len(candidates)}")
        print(f"- Applications: {app_count}")
        print(f"- Candidate matches: {match_count}")
    finally:
        db.close()


if __name__ == "__main__":
    main()

