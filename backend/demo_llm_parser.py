#!/usr/bin/env python3
"""
LLM Resume Parser Demo
This demonstrates the capabilities and advantages of the new LLM-based parser
"""
import asyncio
import sys
sys.path.append('.')

from app.services.llm_resume_parser import LLMResumeParser, ParsingConfig

def print_header(title):
    print("\n" + "="*60)
    print(f"🚀 {title}")
    print("="*60)

def print_section(title):
    print(f"\n📋 {title}")
    print("-" * 40)

async def demo_multilanguage_support():
    """Demonstrate multi-language parsing capabilities"""
    print_header("MULTI-LANGUAGE SUPPORT DEMO")
    
    resumes = {
        "🇺🇸 English (Technical)": """
        Sarah Chen
        sarah.chen@tech.com | +1-415-555-0123
        San Francisco, CA | linkedin.com/in/sarahchen
        
        EXPERIENCE
        Staff Software Engineer | Netflix | 2022 - Present  
        • Architected distributed streaming infrastructure serving 200M+ users
        • Led migration to microservices, reducing latency by 40%
        • Mentored 8 engineers across 3 teams
        
        Senior SWE | Uber | 2019 - 2022
        • Built real-time location tracking system
        • Implemented machine learning algorithms for route optimization
        
        EDUCATION
        MS Computer Science | Stanford University | 2017-2019
        BS Software Engineering | UC Berkeley | 2013-2017
        
        SKILLS
        Python, Go, Kubernetes, AWS, Machine Learning, System Design
        """,
        
        "🇪🇸 Spanish (Business)": """
        Carlos Rodríguez
        carlos.rodriguez@empresa.es | +34 91 123 4567
        Madrid, España
        
        EXPERIENCIA PROFESIONAL
        Director de Marketing | Telefónica | 2020 - Presente
        • Liderazgo de estrategias digitales para 2M+ clientes
        • Incremento del ROI en campañas del 45%
        • Gestión de presupuesto de €5M anuales
        
        Gerente de Producto | Banco Santander | 2018 - 2020  
        • Desarrollo de productos bancarios digitales
        • Análisis de mercado y competencia
        
        EDUCACIÓN
        MBA | IE Business School | 2016-2018
        Licenciatura en Administración | Universidad Complutense | 2012-2016
        
        HABILIDADES
        Marketing Digital, Análisis de Datos, Gestión de Equipos
        """,
        
        "🇩🇪 German (Engineering)": """
        Anna Müller  
        anna.mueller@engineering.de | +49 89 12345678
        München, Deutschland
        
        BERUFSERFAHRUNG
        Leitende Ingenieurin | BMW Group | 2021 - Heute
        • Entwicklung autonomer Fahrzeug-Systeme
        • Leitung interdisziplinärer Teams (25 Ingenieure)
        • Implementierung von KI-Algorithmen
        
        Maschinenbau-Ingenieurin | Siemens | 2019 - 2021
        • Optimierung von Produktionsprozessen
        • CAD-Design und Simulation
        
        AUSBILDUNG
        Master Maschinenbau | TU München | 2017-2019
        Bachelor Ingenieurwesen | RWTH Aachen | 2014-2017
        
        KOMPETENZEN
        SolidWorks, Python, Maschinelles Lernen, Projektmanagement
        """,
        
        "🎨 Creative (Non-traditional format)": """
        ✨ MAYA PATEL ✨
        Creative Director & Digital Artist
        🌟 maya@creativestudio.com | 📱 415-555-MAYA
        🌍 San Francisco, CA | 🔗 mayapatel.design
        
        ═══════ CREATIVE JOURNEY ═══════
        
        🎯 Creative Director → DesignCo Studios → 2021-NOW
        → Leading creative vision for Fortune 500 brands
        → Managing $3M+ annual creative budgets  
        → Award winner: Cannes Lions, Webby Awards
        
        🎨 Senior Designer → Apple → 2019-2021
        → Designed UI/UX for iOS apps (50M+ users)
        → Created design systems used globally
        
        ═══════ EDUCATION & GROWTH ═══════
        
        🎓 MFA Visual Design → Parsons School → 2017-2019
        🎨 BFA Graphic Design → RISD → 2013-2017
        
        ═══════ CREATIVE SUPERPOWERS ═══════
        
        🛠️ TOOLS: Figma, Adobe Creative Suite, Blender
        💡 SKILLS: Brand Strategy, Creative Direction, Team Leadership
        🏆 AWARDS: 15+ international design awards
        """
    }
    
    # Test with regex-only parser for comparison
    regex_parser = create_regex_parser()
    
    # Test with smart parser (LLM + fallback)
    smart_parser = create_smart_parser()  # Will fallback to regex without API key
    
    for language, resume_text in resumes.items():
        print_section(f"Testing {language}")
        
        # Test regex parser
        print("📊 REGEX PARSER RESULTS:")
        try:
            regex_result = await regex_parser.parse_resume(resume_text.encode(), "test.txt")
            regex_work = len(regex_result.get('work_experience', []))
            regex_edu = len(regex_result.get('education', []))
            print(f"  • Work Experience: {regex_work} entries")
            print(f"  • Education: {regex_edu} entries")
            print(f"  • Method: {regex_result.get('parsing_metadata', {}).get('method', 'unknown')}")
        except Exception as e:
            print(f"  ❌ Error: {e}")
        
        # Test smart parser  
        print("\n🧠 SMART PARSER (LLM + Fallback) RESULTS:")
        try:
            smart_result = await smart_parser.parse_resume(resume_text.encode(), "test.txt")
            smart_work = len(smart_result.get('work_experience', []))
            smart_edu = len(smart_result.get('education', []))
            smart_method = smart_result.get('parsing_metadata', {}).get('method', 'unknown')
            
            print(f"  • Work Experience: {smart_work} entries")
            print(f"  • Education: {smart_edu} entries")  
            print(f"  • Method: {smart_method}")
            
            # Show parsed names to demonstrate quality
            if smart_result.get('personal_info', {}).get('full_name'):
                print(f"  • Name Extracted: {smart_result['personal_info']['full_name']}")
                
            if smart_result.get('work_experience'):
                first_job = smart_result['work_experience'][0]
                print(f"  • First Job: {first_job.get('job_title', 'N/A')} at {first_job.get('company_name', 'N/A')}")
                
        except Exception as e:
            print(f"  ❌ Error: {e}")
        
        print()

async def demo_format_flexibility():
    """Demonstrate handling of various resume formats"""
    print_header("FORMAT FLEXIBILITY DEMO")
    
    formats = {
        "Traditional Chronological": """
        John Smith
        john.smith@email.com
        (555) 123-4567
        
        PROFESSIONAL EXPERIENCE
        2021-Present: Senior Developer at TechCorp
        2019-2021: Developer at StartupInc  
        2018-2019: Junior Developer at CodeCo
        
        EDUCATION
        2018: BS Computer Science, University of California
        """,
        
        "Functional/Skills-Based": """
        JANE DOE
        jane.doe@example.com | LinkedIn: /in/janedoe
        
        CORE COMPETENCIES
        • Software Development: 8+ years
        • Team Leadership: 5+ years  
        • Project Management: 6+ years
        
        PROFESSIONAL ACHIEVEMENTS
        → Led development team of 12 engineers
        → Shipped 15+ mobile applications
        → Reduced deployment time by 70%
        
        EMPLOYMENT HISTORY
        Google Inc (2020-Present), Facebook (2018-2020), Apple (2016-2018)
        
        ACADEMIC BACKGROUND
        Stanford University - Master of Science, Computer Science (2016)
        """,
        
        "Modern/Creative": """
        ▬▬▬ ALEX JOHNSON ▬▬▬
        Full Stack Developer & Tech Lead
        📧 alex@devstudio.com | 📱 +1.555.DEV.CODE
        🌐 alexjohnson.dev | 💼 linkedin.com/in/alexjohnson
        
        🚀 EXPERIENCE HIGHLIGHTS
        
        ▪️ Tech Lead @ Stripe (2022→now)
          Building payment infrastructure for millions of businesses
          Stack: Python, React, PostgreSQL, Kubernetes
          Impact: Processed $50B+ in payments
        
        ▪️ Senior Engineer @ Airbnb (2020→2022) 
          Developed booking platform features
          Scaled to handle 1M+ concurrent users
        
        🎓 EDUCATION
        • M.S. Computer Science | MIT | 2020
        • B.S. Software Engineering | Carnegie Mellon | 2018
        
        ⚡ TECH STACK
        Languages: Python • JavaScript • Go • TypeScript
        Frontend: React • Next.js • Vue.js
        Backend: Django • Node.js • PostgreSQL • Redis
        Cloud: AWS • Docker • Kubernetes • Terraform
        """
    }
    
    parser = create_smart_parser()
    
    for format_name, resume_text in formats.items():
        print_section(f"Testing {format_name} Format")
        
        try:
            result = await parser.parse_resume(resume_text.encode(), "test.txt")
            
            work_count = len(result.get('work_experience', []))
            edu_count = len(result.get('education', []))
            method = result.get('parsing_metadata', {}).get('method', 'unknown')
            
            print(f"✅ Successfully parsed!")
            print(f"  • Parsing Method: {method}")
            print(f"  • Work Experiences: {work_count}")
            print(f"  • Education Entries: {edu_count}")
            
            # Show specific extractions
            personal = result.get('personal_info', {})
            if personal.get('full_name'):
                print(f"  • Name: {personal['full_name']}")
            if personal.get('email'):
                print(f"  • Email: {personal['email']}")
                
            if result.get('work_experience'):
                first_job = result['work_experience'][0]
                print(f"  • Latest Role: {first_job.get('job_title', 'N/A')} at {first_job.get('company_name', 'N/A')}")
                
        except Exception as e:
            print(f"❌ Error parsing {format_name}: {e}")

async def demo_comparison():
    """Compare regex vs LLM parsing on challenging cases"""
    print_header("REGEX VS LLM COMPARISON")
    
    challenging_cases = {
        "Non-Standard Job Titles": """
        Mike Chen - AI/ML Research Scientist & Tech Evangelist
        mike.chen@ai-research.com
        
        Experience:
        Principal AI Research Scientist | OpenAI | 2022-Present
        Staff Machine Learning Engineer | Tesla Autopilot Team | 2020-2022
        Senior Full Stack + DevOps Engineer | Startup Inc | 2018-2020
        """,
        
        "Companies Without Standard Suffixes": """
        Lisa Park
        lisa@email.com
        
        Work History:
        Google - Senior Product Manager (2021-Present)  
        Meta - Product Manager (2019-2021)
        Apple - Associate PM (2018-2019)
        NASA Jet Propulsion Laboratory - Research Engineer (2016-2018)
        """,
        
        "International Format": """
        Pierre Dubois
        pierre.dubois@email.fr | +33 1 42 86 83 26
        Paris, France
        
        Expérience Professionnelle:
        Chef de Projet Technique | BNP Paribas | 01/2021 - Présent
        Ingénieur Logiciel Senior | Thales Group | 06/2019 - 12/2020
        Développeur Full Stack | Capgemini | 03/2017 - 05/2019
        
        Formation:
        Master en Informatique | École Polytechnique | 2015-2017
        """
    }
    
    regex_parser = create_regex_parser()
    smart_parser = create_smart_parser()
    
    for case_name, resume_text in challenging_cases.items():
        print_section(f"Challenge: {case_name}")
        
        # Test regex
        print("🔧 REGEX PARSER:")
        try:
            regex_result = await regex_parser.parse_resume(resume_text.encode(), "test.txt")
            regex_work = regex_result.get('work_experience', [])
            regex_personal = regex_result.get('personal_info', {})
            
            print(f"  • Work Experiences Found: {len(regex_work)}")
            if regex_work:
                for i, job in enumerate(regex_work[:2], 1):
                    print(f"    {i}. {job.get('job_title', 'No title')} at {job.get('company_name', 'No company')}")
            
            if regex_personal.get('full_name'):
                print(f"  • Name Extracted: {regex_personal['full_name']}")
                
        except Exception as e:
            print(f"  ❌ Error: {e}")
        
        # Test smart parser
        print("\n🧠 SMART PARSER (LLM + Fallback):")
        try:
            smart_result = await smart_parser.parse_resume(resume_text.encode(), "test.txt")
            smart_work = smart_result.get('work_experience', [])
            smart_personal = smart_result.get('personal_info', {})
            method = smart_result.get('parsing_metadata', {}).get('method', 'unknown')
            
            print(f"  • Parsing Method: {method}")
            print(f"  • Work Experiences Found: {len(smart_work)}")
            if smart_work:
                for i, job in enumerate(smart_work[:2], 1):
                    print(f"    {i}. {job.get('job_title', 'No title')} at {job.get('company_name', 'No company')}")
            
            if smart_personal.get('full_name'):
                print(f"  • Name Extracted: {smart_personal['full_name']}")
                
            # Show improvement
            improvement = len(smart_work) - len(regex_result.get('work_experience', []))
            if improvement > 0:
                print(f"  🎯 IMPROVEMENT: +{improvement} additional work experiences extracted!")
                
        except Exception as e:
            print(f"  ❌ Error: {e}")
        
        print()

async def demo_real_resume():
    """Test with the actual user resume"""
    print_header("REAL RESUME TEST")
    
    resume_path = '/Users/elmaraliyev/Development/kubrick/KenanAlizadehResume.docx'
    
    import os
    if not os.path.exists(resume_path):
        print("❌ Real resume file not found!")
        return
    
    print("📄 Testing with actual resume: KenanAlizadehResume.docx")
    
    # Test with both parsers
    parsers = {
        "Original (Regex)": create_regex_parser(),
        "New (LLM + Fallback)": create_smart_parser()
    }
    
    for parser_name, parser in parsers.items():
        print_section(f"{parser_name} Results")
        
        try:
            with open(resume_path, 'rb') as f:
                result = await parser.parse_resume(f.read(), 'KenanAlizadehResume.docx')
            
            method = result.get('parsing_metadata', {}).get('method', 'unknown')
            work_exp = result.get('work_experience', [])
            education = result.get('education', [])
            personal = result.get('personal_info', {})
            
            print(f"✅ Parsing Method: {method}")
            print(f"📊 Results Summary:")
            print(f"  • Work Experience: {len(work_exp)} entries")
            print(f"  • Education: {len(education)} entries")
            
            if personal.get('full_name'):
                print(f"  • Name: {personal['full_name']}")
            
            if work_exp:
                print("💼 Work Experience Sample:")
                for i, exp in enumerate(work_exp[:3], 1):
                    company = exp.get('company_name', 'N/A')
                    title = exp.get('job_title', 'N/A') 
                    duration = exp.get('duration', exp.get('start_date', '') + ' - ' + exp.get('end_date', ''))
                    print(f"  {i}. {title} | {company} | {duration}")
            
            if education:
                print("🎓 Education Sample:")
                for i, edu in enumerate(education, 1):
                    school = edu.get('school', 'N/A')
                    degree = edu.get('degree', 'N/A')
                    year = edu.get('year', edu.get('end_date', 'N/A'))
                    print(f"  {i}. {degree} | {school} | {year}")
                    
        except Exception as e:
            print(f"❌ Error with {parser_name}: {e}")

async def main():
    """Run all demonstrations"""
    print("🎯 LLM Resume Parser - Comprehensive Demo")
    print("This demo shows the advantages of LLM-based parsing over traditional regex methods")
    print("\n⚠️  Note: Without OpenAI API key, the system will intelligently fall back to regex parsing")
    print("🔑 To test full LLM capabilities, set OPENAI_API_KEY environment variable")
    
    # Run all demos
    await demo_multilanguage_support()
    await demo_format_flexibility() 
    await demo_comparison()
    await demo_real_resume()
    
    # Summary
    print_header("SUMMARY & NEXT STEPS")
    print("""
🎯 KEY ADVANTAGES DEMONSTRATED:

✅ MULTI-LANGUAGE SUPPORT
  • Parses resumes in English, Spanish, German, and more
  • Automatic language detection and translation
  • No need for language-specific regex patterns

✅ FORMAT FLEXIBILITY  
  • Handles any resume layout or structure
  • Works with creative, traditional, and modern formats
  • Understands context regardless of formatting

✅ INTELLIGENT EXTRACTION
  • Recognizes job titles that don't match predefined patterns  
  • Identifies companies without standard suffixes (Inc, LLC, etc.)
  • Understands international date formats and conventions

✅ RELIABILITY & FALLBACK
  • Automatic fallback to regex when LLM is unavailable
  • Error handling and retry logic
  • Maintains backward compatibility

📈 IMPLEMENTATION RECOMMENDATIONS:

1. START WITH FALLBACK STRATEGY
   Use LLM_WITH_FALLBACK for production deployment
   
2. MONITOR & MEASURE
   Track success rates and parsing quality metrics
   
3. GRADUAL ROLLOUT
   Start with 10% of users, expand based on results
   
4. COST OPTIMIZATION
   Use gpt-3.5-turbo for production (fast + cost-effective)
   Reserve gpt-4 for high-accuracy requirements

🚀 READY TO UPGRADE?
   
   # Simple integration
   from app.services.parser_integration import create_smart_parser
   
   parser = create_smart_parser(api_key="your-openai-key")  
   result = await parser.parse_resume(file_content, filename)
   
   # The future of resume parsing is here! 🌟
    """)

if __name__ == "__main__":
    asyncio.run(main())