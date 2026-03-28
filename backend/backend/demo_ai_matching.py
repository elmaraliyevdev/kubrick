#!/usr/bin/env python3
"""
Kubrick AI Matching Demo Script
==================================

This script creates comprehensive sample data and demonstrates the full AI matching workflow:
1. Creates a demo organization and admin user
2. Creates diverse job postings with detailed requirements  
3. Creates candidate profiles with varied skills and experience
4. Runs AI matching calculations
5. Shows detailed scoring and skills gap analysis

Run with: python demo_ai_matching.py
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.organization import Organization
from app.db.models.job import Job
from app.db.models.candidate import Candidate
from app.db.models.candidate_skill import CandidateSkill
from app.db.models.candidate_work_experience import CandidateWorkExperience
from app.db.models.candidate_education import CandidateEducation
from app.services.candidate_matching_service import CandidateMatchingService
from app.services.job_description_parser import JobDescriptionParser
from app.core.security import get_password_hash


class AIMatchingDemo:
    def __init__(self):
        self.db = next(get_db())
        self.org_id = None
        self.admin_user_id = None
        self.jobs = []
        self.candidates = []
        
    def create_organization_and_user(self):
        """Create demo organization and admin user"""
        print("🏢 Creating demo organization and admin user...")
        
        # Create organization
        org = Organization(
            name="TechCorp Solutions",
            description="A leading technology company specializing in cloud solutions and AI development",
            website="https://techcorp.example.com",
            industry="Technology",
            size="51-200",
            location="San Francisco, CA"
        )
        self.db.add(org)
        self.db.flush()
        self.org_id = org.id
        
        # Create admin user
        admin = User(
            email="admin@techcorp.example.com",
            password_hash=get_password_hash("demo123"),
            first_name="Sarah",
            last_name="Johnson",
            is_active=True,
            is_verified=True,
            organization_id=self.org_id,
            role="admin"
        )
        self.db.add(admin)
        self.db.flush()
        self.admin_user_id = admin.id
        
        self.db.commit()
        print(f"✅ Created organization: {org.name} (ID: {org.id})")
        print(f"✅ Created admin user: {admin.first_name} {admin.last_name}")
        
    def create_sample_jobs(self):
        """Create diverse job postings with detailed requirements"""
        print("\n💼 Creating sample job postings...")
        
        job_data = [
            {
                "title": "Senior Full Stack Developer",
                "description": """We are looking for an experienced Senior Full Stack Developer to join our engineering team. 

The ideal candidate will have:
- 5+ years of experience in web development
- Strong proficiency in React, Node.js, and TypeScript
- Experience with PostgreSQL and database design
- Knowledge of AWS cloud services and Docker
- Experience with CI/CD pipelines and DevOps practices
- Strong understanding of REST APIs and microservices architecture
- Experience with testing frameworks (Jest, Cypress)
- Knowledge of Redis caching and performance optimization
- Familiarity with Kubernetes orchestration
- Experience with GraphQL is a plus

Responsibilities:
- Design and develop scalable web applications
- Lead technical decision making and architecture discussions
- Mentor junior developers and conduct code reviews
- Collaborate with product managers and designers
- Optimize application performance and scalability
- Implement security best practices

This is a full-time, remote-friendly position with competitive salary and benefits.""",
                "employment_type": "full_time",
                "experience_level": "senior",
                "work_arrangement": "hybrid",
                "location": "San Francisco, CA",
                "skills_required": "React, Node.js, TypeScript, PostgreSQL, AWS, Docker, REST APIs, microservices, Jest, Cypress, CI/CD",
                "status": "open"
            },
            {
                "title": "Data Scientist - AI/ML",
                "description": """Join our AI team as a Data Scientist working on cutting-edge machine learning projects.

Required qualifications:
- PhD or MS in Computer Science, Statistics, or related field
- 3+ years of experience in machine learning and data science
- Expert knowledge of Python and machine learning libraries (scikit-learn, TensorFlow, PyTorch)
- Strong statistical analysis and data visualization skills
- Experience with large-scale data processing (Spark, Hadoop)
- Proficiency in SQL and database optimization
- Knowledge of deep learning architectures
- Experience with A/B testing and experimental design
- Familiarity with MLOps and model deployment
- Strong communication skills for presenting findings

Nice to have:
- Experience with NLP and text processing
- Knowledge of computer vision techniques  
- Familiarity with Kubernetes and Docker
- Experience with cloud ML platforms (AWS SageMaker, Google AI)
- Publications in top-tier conferences

You will work on:
- Developing predictive models for business problems
- Building recommendation systems and personalization algorithms
- Implementing NLP solutions for text analysis
- Designing experiments and analyzing results
- Collaborating with engineering teams on model deployment""",
                "employment_type": "full_time", 
                "experience_level": "senior",
                "work_arrangement": "remote",
                "location": "Remote",
                "skills_required": "Python, scikit-learn, TensorFlow, PyTorch, SQL, Spark, Hadoop, statistics, deep learning, NLP, A/B testing, MLOps",
                "status": "open"
            },
            {
                "title": "Product Manager - B2B SaaS",
                "description": """We're seeking a Product Manager to lead our B2B SaaS product initiatives and drive growth.

Key requirements:
- 4+ years of product management experience in B2B SaaS
- Strong analytical skills and data-driven decision making
- Experience with product analytics tools (Mixpanel, Amplitude, Google Analytics)
- Knowledge of agile development methodologies
- Excellent stakeholder management and communication skills
- Experience conducting user research and usability testing
- Understanding of SaaS metrics (MRR, churn, LTV, CAC)
- Familiarity with design thinking and user-centered design
- Experience with project management tools (Jira, Asana, Linear)
- Technical background or ability to work closely with engineering teams

Preferred qualifications:
- MBA or equivalent business experience
- Experience with API products and developer tools
- Knowledge of enterprise sales processes
- Familiarity with CRM and marketing automation tools
- Experience in fast-growing startup environments

Responsibilities:
- Define product roadmap and strategy
- Gather and prioritize product requirements
- Work with engineering teams on product development
- Analyze user data and feedback to drive improvements  
- Collaborate with sales and marketing teams
- Manage product launches and go-to-market strategies""",
                "employment_type": "full_time",
                "experience_level": "mid",
                "work_arrangement": "hybrid", 
                "location": "San Francisco, CA",
                "skills_required": "product management, B2B SaaS, analytics, agile, Mixpanel, user research, SaaS metrics, Jira, stakeholder management",
                "status": "open"
            },
            {
                "title": "DevOps Engineer",
                "description": """Looking for a DevOps Engineer to help scale our infrastructure and improve development workflows.

Essential skills:
- 3+ years of DevOps/Infrastructure experience
- Strong experience with AWS services (EC2, S3, RDS, Lambda, CloudFormation)
- Proficiency with Infrastructure as Code (Terraform, CloudFormation)
- Extensive Docker and Kubernetes experience
- Experience with CI/CD pipelines (GitHub Actions, Jenkins, GitLab CI)
- Strong Linux/Unix system administration skills
- Knowledge of monitoring and alerting tools (Prometheus, Grafana, DataDog)
- Experience with configuration management (Ansible, Chef, Puppet)
- Understanding of networking, security, and compliance requirements
- Scripting skills in Python, Bash, or similar

Bonus qualifications:
- Experience with service mesh (Istio, Linkerd)
- Knowledge of database administration (PostgreSQL, MongoDB)  
- Familiarity with logging solutions (ELK stack, Fluentd)
- Experience with chaos engineering and disaster recovery
- Security automation and vulnerability management experience

You'll be responsible for:
- Designing and maintaining cloud infrastructure
- Implementing automated deployment pipelines
- Monitoring system performance and reliability
- Ensuring security and compliance requirements
- Supporting development teams with tooling and processes
- Incident response and troubleshooting""",
                "employment_type": "full_time",
                "experience_level": "mid", 
                "work_arrangement": "remote",
                "location": "Remote",
                "skills_required": "AWS, Terraform, Docker, Kubernetes, CI/CD, Linux, Prometheus, Grafana, Python, Bash, Jenkins, monitoring",
                "status": "open"
            }
        ]
        
        for job_info in job_data:
            job = Job(
                title=job_info["title"],
                description=job_info["description"],
                employment_type=job_info["employment_type"],
                experience_level=job_info["experience_level"], 
                work_arrangement=job_info["work_arrangement"],
                location=job_info["location"],
                skills_required=job_info["skills_required"],
                status=job_info["status"],
                organization_id=self.org_id,
                posted_by_id=self.admin_user_id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            self.db.add(job)
            self.db.flush()
            self.jobs.append(job)
            print(f"✅ Created job: {job.title} (ID: {job.id})")
            
        self.db.commit()
        print(f"📋 Total jobs created: {len(self.jobs)}")
        
    def create_sample_candidates(self):
        """Create diverse candidate profiles with varied skills and experience"""
        print("\n👥 Creating sample candidates...")
        
        candidate_data = [
            {
                "first_name": "Alex",
                "last_name": "Rodriguez", 
                "email": "alex.rodriguez@email.com",
                "phone": "+1-555-0101",
                "location": "San Francisco, CA",
                "linkedin_url": "https://linkedin.com/in/alexrodriguez",
                "experience_years": 6,
                "skills": ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS", "Docker", "REST APIs", "Jest", "GraphQL", "Redis"],
                "work_experience": [
                    {
                        "job_title": "Senior Software Engineer",
                        "company_name": "StartupXYZ",
                        "location": "San Francisco, CA",
                        "duration": "2020 - Present",
                        "employment_type": "Full-time",
                        "description": "Lead development of React/Node.js applications serving 100k+ users. Built microservices architecture with Docker and AWS. Implemented GraphQL APIs and optimized database performance.",
                        "responsibilities": "• Led team of 4 developers\n• Architected scalable backend systems\n• Improved application performance by 40%"
                    },
                    {
                        "job_title": "Full Stack Developer",
                        "company_name": "TechSolutions Inc",
                        "location": "Mountain View, CA", 
                        "duration": "2018 - 2020",
                        "employment_type": "Full-time",
                        "description": "Developed web applications using React, Express.js, and MongoDB. Worked on CI/CD pipelines and AWS deployment.",
                        "responsibilities": "• Built responsive web applications\n• Implemented automated testing\n• Collaborated with design team"
                    }
                ],
                "education": [
                    {
                        "degree": "Bachelor of Science in Computer Science",
                        "school": "UC Berkeley",
                        "year": "2018",
                        "field": "Computer Science"
                    }
                ]
            },
            {
                "first_name": "Sarah",
                "last_name": "Chen",
                "email": "sarah.chen@email.com", 
                "phone": "+1-555-0102",
                "location": "Seattle, WA",
                "linkedin_url": "https://linkedin.com/in/sarahchen",
                "experience_years": 4,
                "skills": ["Python", "scikit-learn", "TensorFlow", "SQL", "Pandas", "NumPy", "Jupyter", "statistics", "data visualization", "A/B testing"],
                "work_experience": [
                    {
                        "job_title": "Data Scientist",
                        "company_name": "DataCorp",
                        "location": "Seattle, WA",
                        "duration": "2021 - Present", 
                        "employment_type": "Full-time",
                        "description": "Built predictive models for customer behavior analysis. Developed recommendation systems using collaborative filtering. Conducted A/B tests and statistical analysis.",
                        "responsibilities": "• Built ML models with 85% accuracy\n• Reduced customer churn by 15%\n• Presented insights to C-level executives"
                    },
                    {
                        "job_title": "Junior Data Analyst",
                        "company_name": "Analytics Pro",
                        "location": "Portland, OR",
                        "duration": "2020 - 2021",
                        "employment_type": "Full-time", 
                        "description": "Analyzed customer data using SQL and Python. Created dashboards and reports for business stakeholders.",
                        "responsibilities": "• Automated reporting processes\n• Improved data quality procedures\n• Trained team on analytics tools"
                    }
                ],
                "education": [
                    {
                        "degree": "Master of Science in Data Science",
                        "school": "University of Washington", 
                        "year": "2020",
                        "field": "Data Science"
                    },
                    {
                        "degree": "Bachelor of Science in Mathematics",
                        "school": "Stanford University",
                        "year": "2018",
                        "field": "Mathematics"
                    }
                ]
            },
            {
                "first_name": "Michael",
                "last_name": "Thompson",
                "email": "michael.thompson@email.com",
                "phone": "+1-555-0103", 
                "location": "Austin, TX",
                "linkedin_url": "https://linkedin.com/in/michaelthompson",
                "experience_years": 5,
                "skills": ["product management", "agile", "Jira", "user research", "analytics", "SaaS metrics", "stakeholder management", "roadmapping", "competitive analysis"],
                "work_experience": [
                    {
                        "job_title": "Product Manager",
                        "company_name": "SaaS Solutions",
                        "location": "Austin, TX",
                        "duration": "2019 - Present",
                        "employment_type": "Full-time",
                        "description": "Led product development for B2B SaaS platform with $5M ARR. Managed product roadmap and worked closely with engineering, sales, and marketing teams.",
                        "responsibilities": "• Increased user engagement by 30%\n• Launched 3 major product features\n• Reduced customer churn from 8% to 5%"
                    },
                    {
                        "job_title": "Associate Product Manager", 
                        "company_name": "GrowthTech",
                        "location": "San Francisco, CA",
                        "duration": "2017 - 2019",
                        "employment_type": "Full-time",
                        "description": "Supported senior PMs on mobile app development. Conducted user research and competitive analysis.",
                        "responsibilities": "• Managed feature development lifecycle\n• Conducted 50+ user interviews\n• Improved app store ratings from 3.2 to 4.5"
                    }
                ],
                "education": [
                    {
                        "degree": "MBA in Technology Management",
                        "school": "UT Austin",
                        "year": "2017", 
                        "field": "Business Administration"
                    },
                    {
                        "degree": "Bachelor of Science in Engineering",
                        "school": "Rice University",
                        "year": "2015",
                        "field": "Computer Engineering"
                    }
                ]
            },
            {
                "first_name": "Emily", 
                "last_name": "Davis",
                "email": "emily.davis@email.com",
                "phone": "+1-555-0104",
                "location": "Denver, CO",
                "linkedin_url": "https://linkedin.com/in/emilydavis",
                "experience_years": 3,
                "skills": ["AWS", "Docker", "Kubernetes", "Terraform", "Python", "Linux", "Jenkins", "monitoring", "CI/CD", "bash scripting"],
                "work_experience": [
                    {
                        "job_title": "DevOps Engineer",
                        "company_name": "CloudFirst",
                        "location": "Denver, CO",
                        "duration": "2021 - Present",
                        "employment_type": "Full-time", 
                        "description": "Managed AWS infrastructure for high-traffic applications. Implemented CI/CD pipelines and container orchestration with Kubernetes.",
                        "responsibilities": "• Reduced deployment time by 60%\n• Maintained 99.9% uptime\n• Automated infrastructure provisioning"
                    },
                    {
                        "job_title": "Systems Administrator",
                        "company_name": "TechSupport Inc",
                        "location": "Boulder, CO",
                        "duration": "2020 - 2021", 
                        "employment_type": "Full-time",
                        "description": "Maintained Linux servers and network infrastructure. Implemented backup and monitoring solutions.",
                        "responsibilities": "• Managed 50+ Linux servers\n• Implemented monitoring with Nagios\n• Reduced system downtime by 40%"
                    }
                ],
                "education": [
                    {
                        "degree": "Bachelor of Science in Information Technology",
                        "school": "Colorado State University",
                        "year": "2020",
                        "field": "Information Technology"
                    }
                ]
            },
            {
                "first_name": "David",
                "last_name": "Kim", 
                "email": "david.kim@email.com",
                "phone": "+1-555-0105",
                "location": "New York, NY",
                "linkedin_url": "https://linkedin.com/in/davidkim",
                "experience_years": 2,
                "skills": ["JavaScript", "HTML", "CSS", "React", "Python", "Git", "MySQL", "basic AWS", "responsive design"],
                "work_experience": [
                    {
                        "job_title": "Junior Frontend Developer",
                        "company_name": "WebDev Co",
                        "location": "New York, NY",
                        "duration": "2022 - Present",
                        "employment_type": "Full-time",
                        "description": "Developed responsive web interfaces using React and modern CSS. Collaborated with UX designers to implement user-friendly interfaces.",
                        "responsibilities": "• Built 5+ React components\n• Improved website load time by 25%\n• Participated in code reviews"
                    }
                ],
                "education": [
                    {
                        "degree": "Bachelor of Science in Computer Science",
                        "school": "NYU",
                        "year": "2022", 
                        "field": "Computer Science"
                    }
                ]
            }
        ]
        
        for candidate_info in candidate_data:
            # Create candidate
            candidate = Candidate(
                first_name=candidate_info["first_name"],
                last_name=candidate_info["last_name"],
                email=candidate_info["email"],
                phone=candidate_info["phone"],
                location=candidate_info["location"],
                linkedin_url=candidate_info["linkedin_url"],
                experience_years=candidate_info["experience_years"],
                organization_id=self.org_id,
                added_by_id=self.admin_user_id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            self.db.add(candidate)
            self.db.flush()
            
            # Add skills
            for skill_name in candidate_info["skills"]:
                skill = CandidateSkill(
                    candidate_id=candidate.id,
                    skill_name=skill_name,
                    created_at=datetime.utcnow()
                )
                self.db.add(skill)
                
            # Add work experience
            for exp_info in candidate_info.get("work_experience", []):
                experience = CandidateWorkExperience(
                    candidate_id=candidate.id,
                    job_title=exp_info["job_title"],
                    company_name=exp_info["company_name"],
                    location=exp_info["location"],
                    duration=exp_info["duration"],
                    employment_type=exp_info["employment_type"],
                    description=exp_info["description"],
                    responsibilities=exp_info["responsibilities"],
                    created_at=datetime.utcnow()
                )
                self.db.add(experience)
                
            # Add education  
            for edu_info in candidate_info.get("education", []):
                education = CandidateEducation(
                    candidate_id=candidate.id,
                    degree=edu_info["degree"],
                    school=edu_info["school"],
                    year=edu_info["year"],
                    field=edu_info["field"],
                    created_at=datetime.utcnow()
                )
                self.db.add(education)
                
            self.candidates.append(candidate)
            print(f"✅ Created candidate: {candidate.first_name} {candidate.last_name} (ID: {candidate.id})")
            
        self.db.commit()
        print(f"👤 Total candidates created: {len(self.candidates)}")
        
    def parse_job_requirements(self):
        """Parse job requirements using the AI system"""
        print("\n🧠 Parsing job requirements with AI...")
        
        parser = JobDescriptionParser()
        
        for job in self.jobs:
            try:
                result = parser.parse_job_description(self.db, job.id, force_reparse=True)
                if result.get("success"):
                    requirements = result.get("requirements", {})
                    print(f"✅ Parsed requirements for: {job.title}")
                    print(f"   Required skills: {len(requirements.get('required_skills', []))}")
                    print(f"   Nice-to-have skills: {len(requirements.get('nice_to_have_skills', []))}")
                    print(f"   Min experience: {requirements.get('minimum_experience_years', 0)} years")
                else:
                    print(f"❌ Failed to parse: {job.title}")
            except Exception as e:
                print(f"❌ Error parsing {job.title}: {str(e)}")
                
    def run_ai_matching(self):
        """Demonstrate AI matching calculations"""
        print("\n🎯 Running AI matching calculations...")
        
        matching_service = CandidateMatchingService(self.db)
        
        for job in self.jobs:
            print(f"\n📊 Calculating matches for: {job.title}")
            try:
                # Calculate matches for all candidates
                result = matching_service.calculate_matches_for_job(job.id)
                
                if result.get("success"):
                    stats = result.get("statistics", {})
                    print(f"   ✅ Processed: {stats.get('processed', 0)} candidates")
                    print(f"   ✅ Successful: {stats.get('successful', 0)} matches")  
                    print(f"   ❌ Failed: {stats.get('failed', 0)} matches")
                    
                    # Get top matches
                    matches = matching_service.get_ranked_candidates_for_job(job.id, limit=3)
                    if matches and matches.get("candidates"):
                        print("   🏆 Top matches:")
                        for i, match in enumerate(matches["candidates"][:3], 1):
                            candidate = match["candidate"]
                            score = match["match"]["overall_score"]
                            tier = match["match"]["tier"]
                            skills_matched = match["match"]["skills_summary"]["matched_count"]
                            skills_missing = match["match"]["skills_summary"]["missing_count"]
                            
                            print(f"      {i}. {candidate['first_name']} {candidate['last_name']}: "
                                  f"{score:.1f}/100 ({tier}) - "
                                  f"{skills_matched} skills matched, {skills_missing} missing")
                else:
                    print(f"   ❌ Failed: {result.get('error', 'Unknown error')}")
                    
            except Exception as e:
                print(f"   ❌ Error: {str(e)}")
                
    def demonstrate_detailed_analysis(self):
        """Show detailed skills gap analysis for top matches"""  
        print("\n🔍 Demonstrating detailed skills gap analysis...")
        
        matching_service = CandidateMatchingService(self.db)
        
        # Get the first job and its top candidate match
        if self.jobs and self.candidates:
            job = self.jobs[0]  # Senior Full Stack Developer
            
            # Get ranked candidates
            matches = matching_service.get_ranked_candidates_for_job(job.id, limit=1)
            if matches and matches.get("candidates"):
                top_match = matches["candidates"][0]
                candidate_id = top_match["candidate"]["id"] 
                
                print(f"\n📋 Detailed analysis for:")
                print(f"   Job: {job.title}")
                print(f"   Candidate: {top_match['candidate']['first_name']} {top_match['candidate']['last_name']}")
                print(f"   Overall Score: {top_match['match']['overall_score']:.1f}/100")
                
                # Get detailed match analysis
                try:
                    analysis = matching_service.get_detailed_match_analysis(candidate_id, job.id)
                    
                    if analysis:
                        match_data = analysis.get("match_analysis", {})
                        component_scores = match_data.get("component_scores", {})
                        
                        print(f"\n📊 Component Scores:")
                        print(f"   Skills: {component_scores.get('skills', 0):.1f}/40")
                        print(f"   Experience: {component_scores.get('experience', 0):.1f}/25") 
                        print(f"   Education: {component_scores.get('education', 0):.1f}/15")
                        print(f"   Additional: {component_scores.get('additional', 0):.1f}/20")
                        
                        # Skills analysis
                        skills_analysis = match_data.get("detailed_analysis", {}).get("skills", {})
                        if skills_analysis:
                            matched_skills = skills_analysis.get("matched_skills", [])
                            missing_required = skills_analysis.get("missing_required", [])
                            missing_nice = skills_analysis.get("missing_nice_to_have", [])
                            extra_skills = skills_analysis.get("extra_skills", [])
                            
                            print(f"\n🎯 Skills Breakdown:")
                            print(f"   ✅ Matched: {len(matched_skills)} skills")
                            if matched_skills:
                                print(f"      {', '.join([s.get('job_skill', '') for s in matched_skills[:5]])}")
                            
                            print(f"   ❌ Missing Required: {len(missing_required)} skills")
                            if missing_required:
                                print(f"      {', '.join(missing_required[:5])}")
                                
                            print(f"   ⚠️  Missing Nice-to-Have: {len(missing_nice)} skills")
                            if missing_nice:
                                print(f"      {', '.join(missing_nice[:3])}")
                                
                            print(f"   ⭐ Bonus Skills: {len(extra_skills)} skills") 
                            if extra_skills:
                                print(f"      {', '.join(extra_skills[:3])}")
                                
                except Exception as e:
                    print(f"   ❌ Error getting detailed analysis: {str(e)}")
                    
    def run_demo(self):
        """Run the complete AI matching demo"""
        print("Kubrick AI Matching System Demo")
        print("=" * 50)
        
        try:
            # Step 1: Create organization and users
            self.create_organization_and_user()
            
            # Step 2: Create sample jobs
            self.create_sample_jobs()
            
            # Step 3: Create sample candidates
            self.create_sample_candidates()
            
            # Step 4: Parse job requirements
            self.parse_job_requirements()
            
            # Step 5: Run AI matching
            self.run_ai_matching()
            
            # Step 6: Show detailed analysis
            self.demonstrate_detailed_analysis()
            
            print("\n" + "=" * 50)
            print("🎉 Demo completed successfully!")
            print("\n🌐 Access the system:")
            print("   Frontend: http://localhost:5174")
            print("   Backend API: http://localhost:8000/docs") 
            print("\n📧 Demo login credentials:")
            print("   Email: admin@techcorp.example.com")
            print("   Password: demo123")
            print("\n✨ The AI matching system is now populated with sample data!")
            print("   You can test job calculations, candidate matching, and skills analysis.")
            
        except Exception as e:
            print(f"\n❌ Demo failed with error: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            self.db.close()


if __name__ == "__main__":
    demo = AIMatchingDemo()
    demo.run_demo()