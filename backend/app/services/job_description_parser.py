import re
import logging
from typing import Dict, List, Optional, Any
from sklearn.feature_extraction.text import TfidfVectorizer
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from rapidfuzz import fuzz

logger = logging.getLogger(__name__)


class JobDescriptionParser:
    """
    Parses job descriptions to extract structured requirements including:
    - Required skills
    - Nice-to-have skills 
    - Experience requirements
    - Education requirements
    - Location requirements
    """
    
    def __init__(self):
        # Download required NLTK data if not already present
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            nltk.download('punkt')
            
        try:
            nltk.data.find('corpora/stopwords')
        except LookupError:
            nltk.download('stopwords')
            
        self.stop_words = set(stopwords.words('english'))

        # Title keyword → primary skills mapping (sorted longest-first for matching)
        self.title_to_primary_skills = {
            "react native": ["React Native", "JavaScript"],
            "machine learning": ["Python", "Machine Learning"],
            "data science": ["Python", "Data Science"],
            "data engineer": ["Python", "SQL"],
            "full stack": ["JavaScript", "Node.js"],
            "front end": ["JavaScript", "CSS"],
            "frontend": ["JavaScript", "CSS"],
            "back end": ["Python"],
            "backend": ["Python"],
            "devops": ["Docker", "Kubernetes"],
            "android": ["Kotlin", "Android"],
            "ios": ["Swift", "iOS"],
            "ruby on rails": ["Ruby", "Rails"],
            "vue.js": ["Vue", "JavaScript"],
            "vuejs": ["Vue", "JavaScript"],
            "next.js": ["Next.js", "React"],
            "nextjs": ["Next.js", "React"],
            "nuxt": ["Nuxt.js", "Vue"],
            "node.js": ["Node.js", "JavaScript"],
            "nodejs": ["Node.js", "JavaScript"],
            "angular": ["Angular", "TypeScript"],
            "django": ["Django", "Python"],
            "flask": ["Flask", "Python"],
            "fastapi": ["FastAPI", "Python"],
            "laravel": ["Laravel", "PHP"],
            "symfony": ["Symfony", "PHP"],
            "spring": ["Spring", "Java"],
            "dotnet": [".NET", "C#"],
            ".net": [".NET", "C#"],
            "python": ["Python"],
            "java": ["Java"],
            "php": ["PHP"],
            "ruby": ["Ruby"],
            "golang": ["Go"],
            "rust": ["Rust"],
            "scala": ["Scala"],
            "kotlin": ["Kotlin"],
            "swift": ["Swift"],
            "typescript": ["TypeScript"],
            "javascript": ["JavaScript"],
            "react": ["React", "JavaScript"],
            "vue": ["Vue", "JavaScript"],
            "sql": ["SQL"],
            "go": ["Go"],
            "c++": ["C++"],
            "c#": ["C#"],
            "aws": ["AWS"],
            "azure": ["Azure"],
            "gcp": ["GCP"],
            "docker": ["Docker"],
            "kubernetes": ["Kubernetes"],
        }
        # Sort keys longest-first so "react native" matches before "react"
        self._sorted_title_keys = sorted(self.title_to_primary_skills.keys(), key=len, reverse=True)

        # Comprehensive skills patterns (same as resume parser but more extensive)
        self.skills_patterns = [
            # Programming Languages
            r'\b(?:Python|JavaScript|TypeScript|Java|C\+\+|C#|PHP|Ruby|Go|Golang|Rust|Swift|Kotlin|Scala|R|MATLAB|Perl|Shell|Bash|Lua|Dart|Objective-C|Elixir|Haskell|Clojure|Groovy|F#)\b',

            # Web Technologies & Frameworks
            r'\b(?:React|Vue|Vue\.js|Angular|Node\.js|Express|Next\.js|Nuxt\.js|Django|Flask|FastAPI|Spring|Spring Boot|Laravel|Rails|ASP\.NET|Symfony|CodeIgniter|Gatsby|Svelte|Slim|Zend|Zend Framework)\b',

            # Frontend Libraries & Tools
            r'\b(?:jQuery|Bootstrap|Tailwind|Tailwind CSS|Material UI|MUI|Sass|SCSS|LESS|Webpack|Vite|Rollup|Babel|Redux|Vuex|Pinia|Styled Components|Storybook)\b',

            # Databases
            r'\b(?:SQL|PostgreSQL|MySQL|MongoDB|Redis|DynamoDB|Oracle|SQLite|Cassandra|Neo4j|InfluxDB|MariaDB|CouchDB|Firebase|Elasticsearch|Memcached|MSSQL|SQL Server)\b',

            # Cloud & DevOps
            r'\b(?:AWS|Azure|GCP|Google Cloud|Docker|Kubernetes|Jenkins|Git|GitHub|GitLab|CircleCI|Terraform|Ansible|Puppet|Chef|Vagrant|Helm|ArgoCD|Prometheus|Grafana|Datadog|New Relic|CloudFormation|Pulumi)\b',

            # Message Brokers & Queues
            r'\b(?:RabbitMQ|Kafka|Apache Kafka|SQS|SNS|Redis Pub/Sub|NATS|ZeroMQ|ActiveMQ|Celery)\b',

            # Data & Analytics
            r'\b(?:Machine Learning|ML|AI|Data Science|Analytics|Pandas|NumPy|TensorFlow|PyTorch|Scikit-learn|Tableau|Power BI|Excel|Jupyter|Apache Spark|Hadoop|Kafka|dbt|Airflow|ETL|Data Pipeline)\b',

            # Methodologies & Concepts
            r'\b(?:Agile|Scrum|Kanban|DevOps|CI/CD|TDD|BDD|Microservices|REST|RESTful|API|GraphQL|OAuth|JWT|SOLID|Clean Code|Design Patterns|System Design|Scalable Systems|Event-Driven|CQRS|Domain-Driven Design|DDD)\b',

            # Operating Systems & Servers
            r'\b(?:Linux|Ubuntu|Debian|CentOS|Red Hat|RHEL|Windows|macOS|NGINX|Apache|LAMP|MERN|MEAN)\b',

            # Tools & Platforms
            r'\b(?:Photoshop|Figma|Sketch|Jira|Confluence|Slack|Teams|Postman|Insomnia|VS Code|IntelliJ|Eclipse|Notion|Linear|Trello|Asana)\b',

            # Mobile Development
            r'\b(?:iOS|Android|React Native|Flutter|Xamarin|Cordova|PhoneGap|Ionic|SwiftUI|UIKit|Jetpack Compose)\b',

            # Testing
            r'\b(?:Jest|Mocha|Cypress|Selenium|Playwright|PyTest|JUnit|TestNG|Cucumber|PHPUnit|RSpec|Capybara|Chai|Sinon|Vitest)\b',

            # CRM / ERP / Business Platforms
            r'\b(?:Dynamics|Dynamics 365|Salesforce|SAP|HubSpot|Shopify|Magento|WordPress|WooCommerce|Stripe|Payment Gateway|Payment Gateways)\b',

            # APIs & Integration
            r'\b(?:gRPC|WebSocket|WebSockets|SOAP|OpenAPI|Swagger|Webhooks|OAuth2|SAML|SSO)\b',
        ]
        
        # Experience patterns
        self.experience_patterns = [
            r'(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|exp)',
            r'(\d+)\+?\s*years?\s*in',
            r'minimum\s+(\d+)\s*years?',
            r'at least\s+(\d+)\s*years?',
            r'over\s+(\d+)\s*years?',
            r'more than\s+(\d+)\s*years?',
            r'(\d+)[-–](\d+)\s*years?'
        ]
        
        # Education patterns
        self.education_patterns = [
            r'(?:Bachelor|Master|PhD|Associate|Diploma|Certificate|B\.S\.|M\.S\.|B\.A\.|M\.A\.|BS|MS|BA|MA|Doctorate|Graduate)',
            r'(?:University|College|Institute|School)\s+(?:degree|diploma|education)',
            r'(?:Computer Science|Engineering|Mathematics|Physics|Business|Economics|Marketing|Finance)'
        ]
        
        # Location patterns
        self.location_patterns = [
            r'(?:remote|work from home|wfh|distributed|anywhere)',
            r'(?:on-site|onsite|office|in-person)',
            r'(?:hybrid|flexible|mixed)',
            r'(?:relocation|willing to relocate|must relocate)',
            r'([A-Z][a-z]+,\s*[A-Z]{2,3})',  # City, State/Country
        ]
        
        # Required vs Nice-to-have indicators
        self.required_indicators = [
            'required', 'must have', 'essential', 'mandatory', 'necessary',
            'critical', 'vital', 'key', 'core', 'fundamental', 'strong',
            'minimum', 'at a minimum', 'you will need', 'what you\'ll need',
            'qualifications', 'should possess', 'proficiency'
        ]

        self.nice_to_have_indicators = [
            'nice to have', 'preferred', 'bonus', 'plus', 'advantage',
            'desirable', 'ideal', 'would be great', 'a plus', 'beneficial',
            'not essential', 'but not required', 'really beneficial',
            'would be really', 'experience of', 'a bonus'
        ]

    def preprocess_text(self, text: str) -> str:
        """Clean and preprocess text for better parsing"""
        # Convert to lowercase for processing (but keep original for extraction)
        text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
        text = re.sub(r'[^\w\s\.\,\(\)\-\+\#\/]', ' ', text)  # Remove special chars but keep some punctuation (including / for CI/CD)
        return text.strip()

    def extract_skills_with_context(self, text: str) -> Dict[str, List[str]]:
        """Extract skills and categorize them as required vs nice-to-have"""
        required_skills = set()
        nice_to_have_skills = set()
        
        # Split text into sections for better analysis
        sections = self.split_into_sections(text)
        
        for section_name, section_text in sections.items():
            skills_in_section = self.extract_skills_from_text(section_text)
            
            # Determine if this section indicates required or nice-to-have
            section_lower = section_text.lower()
            
            is_required_section = any(indicator in section_lower for indicator in self.required_indicators)
            is_nice_to_have_section = any(indicator in section_lower for indicator in self.nice_to_have_indicators)
            
            # Categorize skills based on section context
            for skill in skills_in_section:
                # Check immediate context around the skill
                skill_context = self.get_skill_context(section_text, skill)
                
                if any(indicator in skill_context.lower() for indicator in self.nice_to_have_indicators):
                    nice_to_have_skills.add(skill)
                elif any(indicator in skill_context.lower() for indicator in self.required_indicators) or is_required_section:
                    required_skills.add(skill)
                elif is_nice_to_have_section:
                    nice_to_have_skills.add(skill)
                else:
                    # Default to required if context is unclear
                    required_skills.add(skill)
        
        return {
            "required": list(required_skills),
            "nice_to_have": list(nice_to_have_skills)
        }

    def split_into_sections(self, text: str) -> Dict[str, str]:
        """Split job description into logical sections"""
        sections = {"full_text": text}

        # Common section headers — colon is optional, also match newline-based headers
        section_patterns = [
            (r'(?:requirements|required|qualifications|what you.ll need|must have|minimum|at a minimum|essential skills|key skills|skills required)[:\s]*\n', 'requirements'),
            (r'(?:nice to have|preferred|bonus|desirable|beneficial|not essential|would be great|really beneficial)[:\s]*\n', 'nice_to_have'),
            (r'(?:experience|background)[:\s]*\n', 'experience'),
            (r'(?:education|degree)[:\s]*\n', 'education'),
            (r'(?:responsibilities|duties|role|what you.ll do|the role|about the role)[:\s]*\n', 'responsibilities'),
            (r'(?:benefits|perks|what.s on offer|the package|compensation|salary)[:\s]*\n', 'benefits'),
        ]

        for pattern, section_name in section_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                start = match.end()
                # Find next section or end of text
                next_section_start = len(text)
                for next_pattern, _ in section_patterns:
                    next_match = re.search(next_pattern, text[start:], re.IGNORECASE)
                    if next_match:
                        next_section_start = min(next_section_start, start + next_match.start())

                sections[section_name] = text[start:next_section_start].strip()

        return sections

    def extract_skills_from_text(self, text: str) -> List[str]:
        """Extract technical skills from text using patterns"""
        skills = set()
        
        for pattern in self.skills_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                normalized = match.strip()
                if normalized and len(normalized) > 1:  # Filter out single characters
                    skills.add(normalized)
        
        return list(skills)

    def get_skill_context(self, text: str, skill: str, window: int = 50) -> str:
        """Get text context around a skill mention"""
        skill_lower = skill.lower()
        text_lower = text.lower()
        
        index = text_lower.find(skill_lower)
        if index == -1:
            return ""
            
        start = max(0, index - window)
        end = min(len(text), index + len(skill) + window)
        
        return text[start:end]

    def extract_experience_requirements(self, text: str) -> Dict[str, Optional[int]]:
        """Extract experience requirements from job description"""
        min_years = None
        max_years = None
        
        for pattern in self.experience_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    # Range pattern (e.g., "3-5 years")
                    try:
                        years = [int(x) for x in match if x.isdigit()]
                        if len(years) == 2:
                            min_years = min(years) if min_years is None else min(min_years, min(years))
                            max_years = max(years) if max_years is None else max(max_years, max(years))
                    except ValueError:
                        continue
                else:
                    # Single number pattern
                    try:
                        years = int(match)
                        min_years = years if min_years is None else min(min_years, years)
                        if max_years is None:
                            max_years = years
                    except ValueError:
                        continue
        
        return {
            "min_years": min_years,
            "max_years": max_years
        }

    def extract_education_requirements(self, text: str) -> List[str]:
        """Extract education requirements"""
        education_reqs = []
        
        for pattern in self.education_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if match not in education_reqs:
                    education_reqs.append(match)
        
        return education_reqs

    def extract_location_requirements(self, text: str) -> List[str]:
        """Extract location and work arrangement requirements"""
        location_reqs = []
        
        for pattern in self.location_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, str) and match.strip():
                    location_reqs.append(match.strip())
        
        return location_reqs

    def calculate_skills_similarity(self, skills1: List[str], skills2: List[str], threshold: float = 0.8) -> Dict[str, Any]:
        """Calculate similarity between skill sets using fuzzy matching"""
        if not skills1 or not skills2:
            return {"similarity": 0.0, "matches": [], "similarity_details": {}}
        
        matches = []
        similarity_details = {}
        
        for skill1 in skills1:
            best_match = None
            best_ratio = 0.0
            
            for skill2 in skills2:
                ratio = fuzz.ratio(skill1.lower(), skill2.lower()) / 100.0
                if ratio > best_ratio:
                    best_ratio = ratio
                    best_match = skill2
            
            if best_ratio >= threshold:
                matches.append({
                    "skill1": skill1,
                    "skill2": best_match,
                    "similarity": best_ratio
                })
                similarity_details[skill1] = {"match": best_match, "score": best_ratio}
        
        overall_similarity = len(matches) / max(len(skills1), len(skills2)) if skills1 or skills2 else 0.0
        
        return {
            "similarity": overall_similarity,
            "matches": matches,
            "similarity_details": similarity_details
        }

    def extract_primary_skills_from_title(self, job_title: str) -> List[str]:
        """Extract primary skills from job title using keyword mapping"""
        if not job_title:
            return []

        title_lower = job_title.lower()
        primary_skills: List[str] = []
        matched_keys: set = set()

        for key in self._sorted_title_keys:
            if key in title_lower and key not in matched_keys:
                for skill in self.title_to_primary_skills[key]:
                    if skill not in primary_skills:
                        primary_skills.append(skill)
                matched_keys.add(key)
                # Also mark shorter overlapping keys as matched
                # e.g. if "react native" matched, skip "react"
                for other_key in self._sorted_title_keys:
                    if other_key != key and other_key in key:
                        matched_keys.add(other_key)
                if len(primary_skills) >= 3:
                    break

        return primary_skills[:3]

    def parse_job_description(self, job_description: str, job_title: str = "",
                            job_location: str = "", employment_type: str = "",
                            experience_level: str = "") -> Dict[str, Any]:
        """
        Main method to parse a job description and extract all structured requirements
        """
        # Combine job details with description for more context (strip HTML from rich-text descriptions)
        desc_plain = re.sub(r"<[^>]+>", " ", job_description or "")
        full_text = f"{job_title} {desc_plain} {job_location} {employment_type} {experience_level}"
        
        # Preprocess text
        processed_text = self.preprocess_text(full_text)
        
        # Extract different components
        skills_data = self.extract_skills_with_context(processed_text)
        experience_data = self.extract_experience_requirements(processed_text)
        education_reqs = self.extract_education_requirements(processed_text)
        location_reqs = self.extract_location_requirements(processed_text)
        
        # Extract primary skills from title
        primary_skills = self.extract_primary_skills_from_title(job_title)

        # Calculate some useful metrics
        total_skills = len(skills_data["required"]) + len(skills_data["nice_to_have"])

        return {
            "required_skills": skills_data["required"],
            "nice_to_have_skills": skills_data["nice_to_have"],
            "primary_skills": primary_skills,
            "min_experience_years": experience_data["min_years"],
            "max_experience_years": experience_data["max_years"],
            "education_requirements": education_reqs,
            "location_requirements": location_reqs,
            "parsing_metadata": {
                "total_skills_found": total_skills,
                "required_skills_count": len(skills_data["required"]),
                "nice_to_have_skills_count": len(skills_data["nice_to_have"]),
                "has_experience_requirements": experience_data["min_years"] is not None,
                "has_education_requirements": len(education_reqs) > 0,
                "has_location_requirements": len(location_reqs) > 0,
                "text_length": len(processed_text),
                "parsing_version": "1.0"
            }
        }

    async def parse_job_description_async(self, job_description: str, job_title: str = "", 
                                        job_location: str = "", employment_type: str = "",
                                        experience_level: str = "") -> Dict[str, Any]:
        """Async version of parse_job_description for better performance in web apps"""
        return self.parse_job_description(job_description, job_title, job_location, employment_type, experience_level)