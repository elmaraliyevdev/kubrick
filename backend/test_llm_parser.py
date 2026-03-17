#!/usr/bin/env python3
"""
Test script to demonstrate the LLM-based resume parser capabilities
"""
import asyncio
import json
import os
import sys
sys.path.append('.')

from app.services.llm_resume_parser import LLMResumeParser, ParsingConfig


async def test_llm_parser_with_sample_resumes():
    """Test the LLM parser with various resume formats"""
    
    # Sample resumes in different formats and languages
    test_resumes = {
        "english_technical": """
        Alex Chen
        alex.chen@email.com | (555) 123-4567
        Seattle, WA | linkedin.com/in/alexchen | github.com/alexchen
        
        PROFESSIONAL EXPERIENCE
        
        Senior Full Stack Developer | Microsoft | March 2021 - Present
        • Architected and developed scalable web applications using React, Node.js, and Azure
        • Led cross-functional team of 8 engineers, resulting in 40% faster delivery cycles
        • Implemented microservices architecture serving 2M+ daily active users
        • Mentored 3 junior developers, with 100% retention rate
        
        Software Engineer II | Amazon | June 2019 - February 2021
        • Built distributed systems using Java, AWS Lambda, and DynamoDB
        • Optimized database queries, reducing response time by 60%
        • Developed CI/CD pipelines using Jenkins and Docker
        
        Junior Developer | Startup Inc | August 2018 - May 2019
        • Created responsive web interfaces using React and TypeScript
        • Integrated third-party APIs and payment systems (Stripe, PayPal)
        
        EDUCATION
        
        Master of Science in Computer Science | University of Washington | 2016-2018
        GPA: 3.8/4.0 | Relevant Coursework: Machine Learning, Distributed Systems
        
        Bachelor of Science in Software Engineering | UC San Diego | 2012-2016
        Magna Cum Laude | GPA: 3.7/4.0
        
        TECHNICAL SKILLS
        Programming Languages: JavaScript, Python, Java, TypeScript, Go
        Frameworks: React, Node.js, Express, Django, Spring Boot
        Databases: PostgreSQL, MongoDB, Redis, DynamoDB
        Cloud: AWS, Azure, Docker, Kubernetes
        Tools: Git, Jenkins, Jira, VS Code
        
        PROJECTS
        E-commerce Platform (2021)
        • Built full-stack application with React frontend and Node.js backend
        • Implemented secure payment processing and user authentication
        • Technologies: React, Node.js, PostgreSQL, Stripe API
        """,
        
        "spanish_business": """
        Isabella Rodriguez
        isabella.rodriguez@correo.es | +34 91 123 4567
        Madrid, España | linkedin.com/in/isabella-rodriguez
        
        EXPERIENCIA PROFESIONAL
        
        Gerente de Marketing Digital | BBVA | Enero 2020 - Presente
        • Liderazgo de estrategias de marketing digital para 500K+ clientes
        • Incremento del ROI en campañas digitales del 35%
        • Gestión de presupuesto anual de €2M
        • Supervisión de equipo de 12 especialistas en marketing
        
        Especialista en Marketing | Santander Bank | Marzo 2018 - Diciembre 2019
        • Desarrollo de campañas multicanal para productos bancarios
        • Análisis de métricas y KPIs usando Google Analytics y Tableau
        • Colaboración con equipos de producto y ventas
        
        Analista de Marketing Junior | Telefónica | Junio 2016 - Febrero 2018
        • Investigación de mercado y análisis competitivo
        • Creación de contenido para redes sociales
        • Apoyo en eventos corporativos y ferias comerciales
        
        EDUCACIÓN
        
        MBA en Administración de Empresas | IE Business School | 2014-2016
        Especialización en Marketing Digital | Calificación: Sobresaliente
        
        Licenciatura en Comunicación | Universidad Complutense Madrid | 2010-2014
        Mención en Publicidad y Relaciones Públicas
        
        HABILIDADES
        Marketing Digital: SEM, SEO, Social Media Marketing, Email Marketing
        Analytics: Google Analytics, Tableau, Power BI, Adobe Analytics
        Herramientas: Salesforce, HubSpot, Mailchimp, Hootsuite
        Idiomas: Español (nativo), Inglés (avanzado), Francés (intermedio)
        """,
        
        "german_engineering": """
        Hans Müller
        hans.mueller@email.de | +49 30 12345678
        Berlin, Deutschland
        
        BERUFSERFAHRUNG
        
        Leitender Maschinenbauingenieur | Siemens AG | Januar 2019 - Heute
        • Entwicklung fortschrittlicher Automatisierungssysteme
        • Projektleitung für Industrieanlagen im Wert von €50M+
        • Führung interdisziplinärer Teams mit 15 Ingenieuren
        • Implementierung von Industrie 4.0 Lösungen
        
        Maschinenbauingenieur | BMW Group | Juni 2016 - Dezember 2018
        • Design und Optimierung von Produktionslinien
        • Reduzierung der Fertigungskosten um 20%
        • CAD-Modellierung mit SolidWorks und AutoCAD
        
        Junior Ingenieur | Volkswagen | September 2014 - Mai 2016
        • Unterstützung bei der Entwicklung von Fahrzeugkomponenten
        • Qualitätssicherung und Testverfahren
        
        AUSBILDUNG
        
        Master of Science Maschinenbau | TU München | 2012-2014
        Schwerpunkt: Automatisierungstechnik | Note: 1,5
        
        Bachelor of Engineering | RWTH Aachen | 2009-2012
        Maschinenbau | Note: 1,8
        
        KENNTNISSE
        CAD-Software: SolidWorks, AutoCAD, CATIA V5
        Programmierung: Python, MATLAB, C++
        Automatisierung: PLC, SCADA, HMI
        Sprachen: Deutsch (Muttersprache), Englisch (fließend)
        """,
        
        "creative_portfolio": """
        Maya Patel
        Creative Director & UX Designer
        maya@creativestudio.com | 415-555-0199
        San Francisco, CA | mayapatel.design | @mayacreates
        
        ═══════════════════════════════════════════════════
        
        🎨 CREATIVE EXPERIENCE
        
        Creative Director | Design Studio SF | 2020 - Present
        → Leading creative vision for 50+ client projects annually
        → Managed $2M+ creative budgets across tech and fashion brands
        → Built design system adopted by 500+ designers globally
        → Awards: Webby Winner 2023, CSS Design Awards
        
        Senior UX Designer | Airbnb | 2018 - 2020
        → Redesigned host onboarding flow, increasing conversion 34%
        → Conducted user research with 1000+ participants globally
        → Mentored 6 junior designers across product teams
        
        Product Designer | Dropbox | 2016 - 2018
        → Shipped mobile app redesign to 500M+ users
        → Collaborated with engineering on React Native implementation
        → Established accessibility guidelines company-wide
        
        🎓 EDUCATION & TRAINING
        
        M.F.A. Interaction Design | Art Center College | 2014-2016
        Thesis: "Emotional Design in Digital Spaces"
        
        B.A. Visual Communication | Parsons School | 2010-2014
        Summa Cum Laude | Dean's List 4 years
        
        ⚡ SKILLS & EXPERTISE
        
        Design Tools: Figma, Sketch, Adobe Creative Suite, Principle
        Prototyping: InVision, Framer, After Effects
        Research: User Interviews, A/B Testing, Analytics
        Languages: English, Hindi, Spanish
        
        🏆 NOTABLE PROJECTS
        
        EcoTracker App (2023)
        • Sustainability tracking app with 100K+ downloads
        • Winner: Apple Design Awards Finalist
        • Impact: 50% increase in user eco-consciousness
        
        FinTech Dashboard Redesign (2022) 
        • B2B financial platform serving 10,000+ businesses
        • Reduced task completion time by 45%
        • Featured in UX Design Weekly
        """
    }
    
    # Test configuration
    config = ParsingConfig(
        model="gpt-3.5-turbo",
        temperature=0.1,
        max_tokens=2500,
        fallback_to_regex=True
    )
    
    parser = LLMResumeParser(config=config)
    
    print("🚀 Testing LLM-Based Resume Parser")
    print("=" * 50)
    
    for resume_type, resume_text in test_resumes.items():
        print(f"\n📄 Testing: {resume_type.upper().replace('_', ' ')}")
        print("-" * 30)
        
        try:
            result = await parser.parse_resume_with_llm(resume_text)
            
            # Display key results
            if 'error' in result:
                print(f"❌ Error: {result['error']}")
                if 'details' in result:
                    print(f"Details: {result['details']}")
            else:
                print("✅ Parsing successful!")
                
                # Personal Info
                personal = result.get('personal_info', {})
                if personal:
                    print(f"👤 Name: {personal.get('full_name', 'N/A')}")
                    print(f"📧 Email: {personal.get('email', 'N/A')}")
                    print(f"📍 Location: {personal.get('location', 'N/A')}")
                
                # Work Experience
                work_exp = result.get('work_experience', [])
                print(f"💼 Work Experience: {len(work_exp)} entries")
                for i, exp in enumerate(work_exp[:2], 1):  # Show first 2
                    print(f"  {i}. {exp.get('job_title', 'N/A')} at {exp.get('company_name', 'N/A')}")
                    print(f"     📅 {exp.get('start_date', 'N/A')} - {exp.get('end_date', 'N/A')}")
                
                # Education
                education = result.get('education', [])
                print(f"🎓 Education: {len(education)} entries")
                for i, edu in enumerate(education, 1):
                    print(f"  {i}. {edu.get('degree', 'N/A')} - {edu.get('school', 'N/A')}")
                
                # Skills
                skills = result.get('skills', {})
                if skills:
                    tech_skills = skills.get('technical_skills', [])
                    if tech_skills:
                        print(f"🛠️ Technical Skills: {', '.join(tech_skills[:5])}{'...' if len(tech_skills) > 5 else ''}")
                
                # Parsing metadata
                metadata = result.get('parsing_metadata', {})
                if metadata:
                    print(f"🤖 Method: {metadata.get('method', 'N/A')}")
                    print(f"🌍 Language: {metadata.get('language', 'N/A')}")
                    print(f"🎯 Strategy: {metadata.get('strategy', 'N/A')}")
            
        except Exception as e:
            print(f"❌ Test failed: {e}")
        
        print()


async def test_with_actual_resume():
    """Test with the actual user resume"""
    print("\n" + "=" * 50)
    print("🧪 Testing with Actual Resume File")
    print("=" * 50)
    
    resume_path = '/Users/elmaraliyev/Development/kubrick/KenanAlizadehResume.docx'
    
    if not os.path.exists(resume_path):
        print("❌ Resume file not found!")
        return
    
    config = ParsingConfig(
        model="gpt-3.5-turbo",
        temperature=0.1,
        fallback_to_regex=True
    )
    
    parser = LLMResumeParser(config=config)
    
    try:
        with open(resume_path, 'rb') as f:
            result = await parser.parse_resume(f.read(), 'KenanAlizadehResume.docx')
        
        if 'error' in result:
            print(f"❌ Error: {result['error']}")
            if 'parsing_metadata' in result and result['parsing_metadata'].get('method') == 'regex_fallback':
                print("🔄 Fell back to regex parsing")
        else:
            print("✅ LLM parsing successful!")
            
            # Display results in structured format
            personal = result.get('personal_info', {})
            if personal.get('full_name'):
                print(f"\n👤 {personal['full_name']}")
                if personal.get('email'):
                    print(f"📧 {personal['email']}")
                if personal.get('location'):
                    print(f"📍 {personal['location']}")
            
            work_exp = result.get('work_experience', [])
            if work_exp:
                print(f"\n💼 WORK EXPERIENCE ({len(work_exp)} entries):")
                for i, exp in enumerate(work_exp, 1):
                    print(f"  {i}. {exp.get('job_title', 'N/A')}")
                    print(f"     🏢 {exp.get('company_name', 'N/A')}")
                    print(f"     📅 {exp.get('start_date', 'N/A')} - {exp.get('end_date', 'N/A')}")
                    if exp.get('description'):
                        desc = exp['description'][:100] + "..." if len(exp['description']) > 100 else exp['description']
                        print(f"     📝 {desc}")
                    print()
            
            education = result.get('education', [])
            if education:
                print(f"🎓 EDUCATION ({len(education)} entries):")
                for i, edu in enumerate(education, 1):
                    print(f"  {i}. {edu.get('degree', 'N/A')}")
                    print(f"     🏫 {edu.get('school', 'N/A')}")
                    if edu.get('end_date'):
                        print(f"     📅 {edu.get('end_date', 'N/A')}")
                    print()
            
            skills = result.get('skills', {})
            for skill_type in ['technical_skills', 'soft_skills', 'languages']:
                skill_list = skills.get(skill_type, [])
                if skill_list:
                    icons = {'technical_skills': '🛠️', 'soft_skills': '🧠', 'languages': '🌍'}
                    print(f"{icons.get(skill_type, '📋')} {skill_type.replace('_', ' ').title()}: {', '.join(skill_list)}")
            
            metadata = result.get('parsing_metadata', {})
            print(f"\n🤖 Parsing Method: {metadata.get('method', 'N/A')}")
            if metadata.get('language'):
                print(f"🌍 Detected Language: {metadata['language']}")
            if metadata.get('strategy'):
                print(f"🎯 Strategy Used: {metadata['strategy']}")
    
    except Exception as e:
        print(f"❌ Test failed: {e}")


async def main():
    """Main test runner"""
    print("🧪 LLM Resume Parser - Proof of Concept")
    print("=" * 60)
    print("This parser can handle:")
    print("✅ Multiple languages (English, Spanish, German, etc.)")
    print("✅ Various resume formats and styles")
    print("✅ Different industries and job types")
    print("✅ Creative and non-traditional layouts")
    print("✅ Automatic fallback to regex parsing")
    print("=" * 60)
    
    # Test with sample resumes
    await test_llm_parser_with_sample_resumes()
    
    # Test with actual resume
    await test_with_actual_resume()
    
    print("\n" + "=" * 60)
    print("🎯 Key Advantages of LLM-Based Parsing:")
    print("• Language agnostic - works with any language")
    print("• Format flexible - handles any resume layout") 
    print("• Industry adaptable - understands context")
    print("• Intelligent extraction - no rigid regex patterns")
    print("• Fallback support - reliable with backup parsing")
    print("• Extensible - easy to add new capabilities")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())