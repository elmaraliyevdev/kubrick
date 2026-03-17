# 🎯 AI Matching Algorithm Implementation Plan

> **Project**: Kubrick HR - AI-Powered Resume Scanner & Ranker  
> **Feature**: Core AI Matching & Ranking System  
> **Status**: Planning Complete - Ready for Development  
> **Date**: September 2025  

## 📋 Executive Summary

Transform Kubrick HR from a basic candidate management system into a true AI-powered resume scanner by implementing intelligent job-to-candidate matching with scoring, ranking, and gap analysis.

**Current State**: ~40% complete (strong foundation, missing core AI features)  
**Target**: Production-ready AI matching system  
**Timeline**: 4 weeks (phased approach)  

---

## 🏗️ Architecture Design

### Core Components Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Job Parser     │    │ Matching Engine │    │  Score Storage  │
│ - Extract skills│    │ - Calculate     │    │ - Cache results │
│ - Find keywords │───►│   similarities  │───►│ - Track changes │
│ - Analyze reqs  │    │ - Apply weights │    │ - Fast lookups  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Service Layer Design
1. **`JobDescriptionParser`** - Extract structured requirements from JD text
2. **`CandidateMatchingService`** - Core matching algorithm implementation  
3. **`MatchScoreCalculator`** - Scoring logic with configurable weights
4. **`MatchingCacheService`** - Performance optimization layer

---

## 🎯 Scoring Methodology

### Score Breakdown (100 points total)
```
Skills Match           → 40 points (40%)
├─ Required skills     → 25 points (exact/fuzzy matches)
├─ Nice-to-have       → 10 points (bonus skills)  
└─ Extra skills       → 5 points (additional value)

Experience Level       → 25 points (25%)
├─ Years of experience → 15 points (vs. job requirements)
└─ Relevant experience → 10 points (domain/industry match)

Education Match        → 15 points (15%)
├─ Degree level       → 10 points (Bachelor/Master/PhD alignment)
└─ Field relevance    → 5 points (CS, Engineering, Business, etc.)

Additional Factors     → 20 points (20%)
├─ Location match     → 8 points (city/remote alignment)
├─ Salary alignment   → 7 points (expectation vs. offer)
└─ Work arrangement   → 5 points (remote/hybrid/onsite)
```

### Scoring Tiers & Actions
- **🟢 Excellent Match (80-100)**: Strong fit, interview immediately
- **🟡 Good Match (60-79)**: Potential fit, review carefully  
- **🔴 Poor Match (0-59)**: Not recommended

### Skills Matching Algorithm
- **Primary**: TF-IDF similarity for semantic matching
- **Secondary**: Fuzzy string matching for variations ("React.js" vs "ReactJS")
- **Enhancement**: Synonym detection ("JavaScript" = "JS")

---

## 🗄️ Database Schema Design

### New Tables

#### `job_requirements`
```sql
CREATE TABLE job_requirements (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    required_skills JSONB,           -- ["Python", "React", "SQL"]
    nice_to_have_skills JSONB,       -- ["Docker", "AWS", "GraphQL"] 
    min_experience_years INTEGER,    -- 3
    max_experience_years INTEGER,    -- 8
    education_requirements JSONB,    -- ["Bachelor in CS", "Master preferred"]
    location_requirements JSONB,     -- ["Remote OK", "US timezone"]
    parsed_at TIMESTAMP DEFAULT NOW(),
    needs_reparsing BOOLEAN DEFAULT FALSE,
    
    INDEX idx_job_requirements_job_id (job_id),
    INDEX idx_job_requirements_parsed_at (parsed_at)
);
```

#### `candidate_job_matches`
```sql
CREATE TABLE candidate_job_matches (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    
    -- Scores
    overall_score DECIMAL(5,2),      -- 0.00 - 100.00
    skills_score DECIMAL(5,2),       -- 0.00 - 40.00
    experience_score DECIMAL(5,2),   -- 0.00 - 25.00
    education_score DECIMAL(5,2),    -- 0.00 - 15.00
    additional_score DECIMAL(5,2),   -- 0.00 - 20.00
    
    -- Detailed breakdown
    match_details JSONB,             -- Detailed analysis data
    skills_matched JSONB,            -- ["Python", "React"]
    skills_missing JSONB,            -- ["Docker", "Kubernetes"]
    skills_extra JSONB,              -- ["Ruby", "Vue.js"]
    
    -- Metadata
    calculated_at TIMESTAMP DEFAULT NOW(),
    needs_recalculation BOOLEAN DEFAULT FALSE,
    calculation_version VARCHAR(10) DEFAULT '1.0',
    
    -- Constraints & Indexes
    UNIQUE(candidate_id, job_id),
    INDEX idx_matches_job_score (job_id, overall_score DESC),
    INDEX idx_matches_candidate_score (candidate_id, overall_score DESC),
    INDEX idx_matches_calculated_at (calculated_at)
);
```

#### `matching_algorithm_config`
```sql
CREATE TABLE matching_algorithm_config (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id),
    
    -- Scoring weights (should sum to 100)
    skills_weight INTEGER DEFAULT 40,
    experience_weight INTEGER DEFAULT 25,
    education_weight INTEGER DEFAULT 15,
    additional_weight INTEGER DEFAULT 20,
    
    -- Algorithm settings
    fuzzy_match_threshold DECIMAL(3,2) DEFAULT 0.8,  -- 0.8 = 80% similarity
    skills_match_algorithm VARCHAR(20) DEFAULT 'tfidf',
    enable_synonym_matching BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(organization_id)
);
```

---

## 🔌 API Design

### New Endpoints

#### Job Requirements Management
```python
POST   /api/jobs/{job_id}/parse-requirements
       → Parse JD text and extract structured requirements
       
GET    /api/jobs/{job_id}/requirements  
       → Get parsed job requirements
       
PUT    /api/jobs/{job_id}/requirements
       → Update job requirements manually
```

#### Matching & Scoring  
```python
POST   /api/jobs/{job_id}/calculate-matches
       → Calculate match scores for all candidates
       
GET    /api/jobs/{job_id}/ranked-candidates
       → Get candidates ranked by match score with pagination
       
POST   /api/jobs/{job_id}/bulk-score
       → Recalculate all scores (after job changes)
       
GET    /api/candidates/{candidate_id}/job-matches  
       → Get job matches for specific candidate
```

#### Match Analysis
```python
GET    /api/matches/{candidate_id}/{job_id}
       → Detailed match analysis with breakdown
       
GET    /api/matches/{candidate_id}/{job_id}/skills-gap
       → Skills gap analysis (matched/missing/extra)
```

### Request/Response Examples

#### Calculate Matches Request
```json
POST /api/jobs/123/calculate-matches
{
    "recalculate_existing": false,
    "candidate_ids": [1, 2, 3],  // optional: specific candidates
    "background": true           // optional: run in background
}
```

#### Ranked Candidates Response  
```json
GET /api/jobs/123/ranked-candidates?page=1&limit=20

{
    "total": 47,
    "page": 1,
    "limit": 20,
    "candidates": [
        {
            "candidate_id": 15,
            "candidate": {
                "id": 15,
                "first_name": "Sarah",
                "last_name": "Johnson",
                "email": "sarah@example.com",
                "experience_years": 5
            },
            "match_score": {
                "overall": 87.5,
                "skills": 34.0,
                "experience": 22.0,
                "education": 13.5,
                "additional": 18.0,
                "tier": "excellent"
            },
            "skills_summary": {
                "matched": ["Python", "React", "PostgreSQL"],
                "missing": ["Docker"],
                "extra": ["Vue.js", "GraphQL"]
            },
            "calculated_at": "2025-09-10T14:30:00Z"
        }
    ]
}
```

---

## 🎨 Frontend Integration

### New Components

#### `RankedCandidatesList.tsx`
- Display candidates sorted by match score
- Color-coded score badges (Green/Yellow/Red)
- Pagination and filtering
- Quick action buttons (Interview, Reject, View Details)

#### `MatchScoreCard.tsx`  
- Detailed score breakdown visualization
- Progress bars for each score component
- Skills matched/missing/extra lists
- Match explanation text

#### `SkillsComparisonView.tsx`
- Side-by-side job requirements vs candidate skills
- Visual gap analysis with highlighting
- Suggestions for skill development

#### `ScoringFilters.tsx`
- Filter by score ranges (Excellent/Good/Poor)
- Filter by specific skill matches
- Sort options (Score, Date, Experience)

### Enhanced Existing Components

#### Jobs Page Updates
```typescript
// Add to JobsDataTable
- "Calculate Matches" button per job
- Match count indicator (47 matches)
- Last calculated timestamp
```

#### Job Detail Page Updates
```typescript
// Add new sections:
- Ranked candidates list (top section)
- Job requirements summary (parsed)
- Match calculation controls
```

#### Candidate Detail Updates
```typescript  
// Add new sections:
- Job matches list with scores
- Best match highlights  
- Skills gap analysis
```

---

## 🚀 Implementation Roadmap

### **Phase 1: Foundation (Week 1)**
**Goal**: Database models and job parsing

- [ ] Create database migrations for new tables
- [ ] Build `JobDescriptionParser` service with TF-IDF
- [ ] Implement basic skills extraction from job descriptions
- [ ] Add `/parse-requirements` API endpoint
- [ ] Unit tests for parsing logic

**Deliverable**: Jobs can be parsed to extract structured requirements

### **Phase 2: Core Algorithm (Week 2)**  
**Goal**: Working match calculation system

- [ ] Implement `MatchScoreCalculator` with weighted scoring
- [ ] Build `CandidateMatchingService` with TF-IDF matching
- [ ] Create matching API endpoints
- [ ] Add bulk processing capabilities
- [ ] Performance optimization and caching

**Deliverable**: Candidates can be scored and ranked for jobs

### **Phase 3: Frontend Integration (Week 3)**
**Goal**: User-facing ranking and analysis

- [ ] Build `RankedCandidatesList` component
- [ ] Create `MatchScoreCard` with detailed breakdown
- [ ] Add ranking to job detail pages
- [ ] Implement skills gap visualization
- [ ] Add filtering and sorting controls

**Deliverable**: Recruiters can view ranked candidates with explanations

### **Phase 4: Optimization & Polish (Week 4)**
**Goal**: Production-ready performance and UX

- [ ] Add Redis caching layer
- [ ] Implement auto-recalculation triggers
- [ ] Add progress indicators for long operations
- [ ] Polish UI with animations and micro-interactions
- [ ] Performance monitoring and alerts

**Deliverable**: Fast, reliable, production-ready matching system

---

## ⚙️ Technical Implementation Details

### **Technology Stack**

#### Phase 1 Stack (Minimal)
```python
Backend Dependencies:
- scikit-learn          # TF-IDF vectorization
- python-Levenshtein   # Fuzzy string matching  
- nltk                 # Text preprocessing
- numpy                # Numerical computations

Frontend Dependencies:
- @tanstack/react-table # Enhanced data tables
- recharts             # Score visualization charts
- lucide-react         # Additional icons
```

#### Phase 3+ Stack (Enhanced)
```python
Additional Backend:
- redis                # Caching layer
- celery               # Background job processing
- sentence-transformers # ML embeddings (future)

Additional Frontend:  
- framer-motion        # Smooth animations
- react-window         # Virtual scrolling
```

### **Performance Targets**

#### Response Time Expectations
- Single match calculation: < 500ms
- Job with 50 candidates: < 2 seconds
- Bulk upload (20 resumes): < 30 seconds (background)
- Major job update: Background processing

#### Scalability Thresholds
- **< 1000 candidates**: Current approach sufficient
- **1000-5000 candidates**: Add Redis caching  
- **5000+ candidates**: Add background processing
- **10000+ candidates**: Consider ML optimization

### **Matching Algorithm Details**

#### Skills Matching Process
```python
def calculate_skills_match(job_skills, candidate_skills):
    # 1. Normalize skills (lowercase, remove punctuation)
    job_normalized = normalize_skills(job_skills)
    candidate_normalized = normalize_skills(candidate_skills)
    
    # 2. Create TF-IDF vectors
    vectorizer = TfidfVectorizer()
    job_vector = vectorizer.fit_transform([' '.join(job_normalized)])
    candidate_vector = vectorizer.transform([' '.join(candidate_normalized)])
    
    # 3. Calculate cosine similarity
    similarity = cosine_similarity(job_vector, candidate_vector)[0][0]
    
    # 4. Apply fuzzy matching for missed skills
    fuzzy_matches = find_fuzzy_matches(job_skills, candidate_skills, threshold=0.8)
    
    # 5. Combine scores with weights
    return weighted_score(similarity, fuzzy_matches)
```

#### Experience Scoring Logic
```python
def calculate_experience_score(required_years, candidate_years):
    if candidate_years >= required_years:
        # Perfect match or overqualified
        return min(25, 15 + (candidate_years - required_years) * 2)
    else:
        # Underqualified - penalty based on gap
        gap_penalty = (required_years - candidate_years) * 3
        return max(0, 15 - gap_penalty)
```

---

## 🔧 Configuration & Customization

### **Algorithm Configuration**
Organizations can customize scoring weights and thresholds:

```python
# Default configuration (can be overridden per organization)
DEFAULT_CONFIG = {
    "weights": {
        "skills": 40,
        "experience": 25, 
        "education": 15,
        "additional": 20
    },
    "thresholds": {
        "fuzzy_match": 0.8,
        "excellent_score": 80,
        "good_score": 60
    },
    "features": {
        "synonym_matching": True,
        "education_flexibility": True,
        "location_weight_reduction": 0.5  # Remote-friendly
    }
}
```

### **Skills Synonyms Database**
```python
SKILL_SYNONYMS = {
    "javascript": ["js", "javascript", "ecmascript"],
    "react": ["react.js", "reactjs", "react js"],
    "python": ["python3", "py", "python programming"],
    "postgresql": ["postgres", "psql", "postgresql database"],
    # Expandable...
}
```

---

## 📊 Success Metrics & Monitoring

### **Key Performance Indicators**

#### Algorithm Performance
- Average match calculation time
- Cache hit ratio (target: >80%)
- Background job processing time
- API endpoint response times

#### User Engagement  
- Match score utilization rate
- Filter usage patterns
- Interview conversion rate by score tier
- User satisfaction with match quality

#### Business Impact
- Time-to-hire reduction
- Interview-to-hire conversion improvement
- Recruiter efficiency metrics
- Candidate quality scores

### **Monitoring Dashboard**
Track algorithm performance and business impact:
- Real-time matching statistics
- Score distribution charts
- Performance bottleneck alerts
- User behavior analytics

---

## 🔄 Future Enhancement Roadmap

### **Phase 5: Machine Learning (Month 2)**
- Replace TF-IDF with sentence embeddings
- Implement learning from recruiter feedback
- Industry-specific model fine-tuning
- Predictive candidate success scoring

### **Phase 6: Advanced Features (Month 3)**
- AI-generated interview questions based on gaps
- Automated candidate pitch generation
- Diversity and bias detection
- Multi-language support (Azerbaijani, Russian, Turkish)

### **Phase 7: Enterprise Features (Month 4)**
- ATS integrations (Greenhouse, Lever, etc.)
- White-labeling capabilities
- Advanced reporting and analytics
- Team collaboration features

---

## ✅ Acceptance Criteria

### **Phase 1 Complete When:**
- [ ] Job descriptions can be parsed automatically
- [ ] Required skills are extracted accurately (>85% precision)
- [ ] API endpoints return structured job requirements
- [ ] Database stores parsed data efficiently

### **Phase 2 Complete When:**
- [ ] Candidates receive accurate match scores (0-100)
- [ ] Score breakdown shows all 4 components
- [ ] Bulk scoring processes 50 candidates in <30 seconds
- [ ] Match explanations are human-readable

### **Phase 3 Complete When:**
- [ ] Recruiters can view ranked candidate lists
- [ ] Score cards show detailed breakdowns
- [ ] Skills gap analysis is visually clear
- [ ] Filtering and sorting work smoothly

### **Phase 4 Complete When:**
- [ ] System handles 1000+ candidates without slowdown
- [ ] Match scores update automatically on data changes
- [ ] UI is responsive and polished
- [ ] Error handling is comprehensive

---

## 📚 Documentation & Resources

### **Additional Documentation**
- API Documentation (Swagger/OpenAPI)
- Database Schema Diagrams  
- Algorithm Testing & Validation Results
- User Interface Mockups & Wireframes
- Performance Benchmarking Reports

### **External Resources**
- TF-IDF Algorithm Reference
- Fuzzy String Matching Best Practices
- PostgreSQL JSONB Performance Optimization
- React Performance Optimization Guide

---

**📝 Plan Status**: ✅ **Complete - Ready for Implementation**  
**👥 Stakeholders**: Development Team, Product Owner  
**🔄 Last Updated**: September 10, 2025  
**📋 Next Action**: Begin Phase 1 - Database Models & Migrations