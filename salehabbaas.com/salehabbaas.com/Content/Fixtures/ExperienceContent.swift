import Foundation

enum ExperienceContentFixture {
  static let saleh: [ExperienceItem] = [
    .init(
      kind: .project,
      period: "March 2026 - Present",
      role: "AI-Powered Developer Portfolio & Productivity Platform",
      organization: "SalehAbbaas.com",
      location: "Remote",
      summary: "Designed and developed a full-stack personal platform that centralizes project documentation, professional workflows, and AI-assisted productivity systems in one scalable application.",
      bullets: [
        "Implemented a modular project management system with Kanban boards, tasks, subtasks, comments, and activity tracking.",
        "Built an AI-assisted job tracking flow that extracts structured job data from links, emails, and descriptions.",
        "Developed SA Panel for goals, project oversight, and personal productivity control.",
        "Integrated Firebase services for authentication, real-time storage, and serverless cloud functions.",
        "Implemented smart content extraction for URL and text inputs to generate structured records automatically.",
        "Delivered a modern responsive UI using Next.js and Tailwind CSS with scalable frontend architecture patterns."
      ],
      associatedWith: "Personal platform and portfolio engineering",
      repositoryURL: URL(string: "https://github.com/salehabbaas/salehabbaas.com"),
      skills: ["TypeScript", "Full-Stack Development", "Firebase", "System Architecture", "React.js", "Next.js", "Tailwind CSS", "REST APIs", "Cloud Functions", "Web Development"]
    ),
    .init(
      kind: .work,
      period: "January 2022 - Present",
      role: "Co-Founder",
      organization: "Artelo",
      location: "Ontario, Canada",
      summary: "Driving technical strategy and product development for an augmented reality platform focused on tourism and event experiences through immersive mobile technology.",
      bullets: [
        "Designed and developed the iOS application using Swift and ARKit, delivering interactive, location-aware AR experiences integrated with real-world environments.",
        "Architected scalable backend and cloud infrastructure to support user authentication, content management, real-time data delivery, and analytics.",
        "Implemented geolocation services, mapping integrations, and dynamic content rendering for intelligent, context-driven experiences.",
        "Built data models and analytics frameworks to track engagement, performance metrics, and monetization insights.",
        "Led product roadmap planning and cross-functional coordination, aligning technical development with business strategy and market expansion goals."
      ],
      skills: ["Swift (Programming Language)", "ARKit", "Augmented Reality (AR)", "Machine Learning", "Start-up Leadership", "Mobile Applications"]
    ),
    .init(
      kind: .volunteering,
      period: "October 2025 - December 2025",
      role: "Program Coordinator",
      organization: "Hands for Charity",
      location: "Canada",
      summary: "Supported short-term community initiatives focused on service delivery and volunteer coordination.",
      bullets: [
        "Supported coordination of charitable programs and events with organized execution and participant engagement.",
        "Assisted with volunteer coordination and task assignment to improve efficiency and teamwork.",
        "Prepared documentation and follow-up tracking to support project closure and reporting."
      ],
      associatedWith: "Social Services",
      skills: ["Program Coordination", "Volunteer Management", "Community Engagement"]
    ),
    .init(
      kind: .volunteering,
      period: "April 2025 - October 2025",
      role: "Program Coordinator",
      organization: "Human Concern International",
      location: "Canada",
      summary: "Contributed to humanitarian and community programs through operational coordination and stakeholder engagement.",
      bullets: [
        "Coordinated logistics and program activities for timely delivery of community services.",
        "Acted as a liaison between volunteers, partners, and internal teams to improve communication and execution.",
        "Assisted with documentation and reporting to support transparency and program evaluation."
      ],
      associatedWith: "Social Services",
      skills: ["Program Coordination", "Stakeholder Communication", "Reporting"]
    ),
    .init(
      kind: .work,
      period: "December 2024 - September 2025",
      role: "Programmer Analyst",
      organization: "The Ottawa Hospital",
      location: "Ottawa, Ontario, Canada",
      summary: "Supported mission-critical hospital systems by designing, maintaining, and optimizing healthcare integrations in a regulated clinical environment.",
      bullets: [
        "Designed and maintained integration workflows using Rhapsody Integration Engine, Epic Health System, and HL7 standards.",
        "Streamlined incident and change management through ServiceNow, improving response times and operational stability.",
        "Built interactive Power BI dashboards to monitor integration performance, system health, and operational KPIs in real time.",
        "Collaborated with clinical, technical, and support teams to ensure availability, compliance, and continuity of hospital operations."
      ],
      skills: ["ServiceNow", "Rhapsody Health", "Epic Systems", "HL7", "Microsoft Power BI", "Healthcare Analytics"]
    ),
    .init(
      kind: .volunteering,
      period: "August 2024 - April 2025",
      role: "Program Coordinator",
      organization: "Islamic Relief Canada",
      location: "Canada",
      summary: "Supported community-focused initiatives aimed at strengthening outreach, engagement, and program delivery.",
      bullets: [
        "Coordinated community programs and initiatives aligned with organizational objectives.",
        "Supported planning, scheduling, and reporting activities to improve accountability.",
        "Collaborated closely with volunteers and stakeholders to strengthen community relationships."
      ],
      associatedWith: "Social Services",
      skills: ["Program Coordination", "Community Outreach", "Stakeholder Collaboration"]
    ),
    .init(
      kind: .work,
      period: "July 2024 - December 2024",
      role: "Senior Software Engineer",
      organization: "Arab Hospitals Group",
      location: "Ramallah, Palestine",
      summary: "Led the design and delivery of AI-enabled, cloud-based healthcare systems supporting reliable, interoperable, and data-driven patient care.",
      bullets: [
        "Designed and implemented advanced APIs integrating Hospital Information Systems with external platforms using HL7, FHIR, and DICOM.",
        "Enhanced medical imaging and interoperability workflows, streamlining PACS processes and improving clinician accessibility.",
        "Developed and deployed AI models for predictive hospital resource allocation.",
        "Contributed to enterprise healthcare modernization initiatives aligned with operational, security, and compliance requirements."
      ],
      skills: ["HL7", "FHIR", "DICOM", "Amazon Web Services (AWS)", "System Integration Testing", "Cloud Infrastructure"]
    ),
    .init(
      kind: .project,
      period: "July 2024 - December 2024",
      role: "Machine Learning for Hospital Resource Optimization",
      organization: "Arab Hospitals Group",
      location: "Ramallah, Palestine",
      summary: "Developed machine learning models to predict bed occupancy and improve hospital resource allocation efficiency.",
      bullets: [
        "Built predictive models for occupancy forecasting using healthcare operational data.",
        "Improved allocation efficiency and decision support for hospital operations.",
        "Translated model output into actionable planning insights for stakeholders."
      ],
      associatedWith: "Associated with Arab Hospitals Group",
      skills: ["Machine Learning", "Predictive Modeling", "Python (Programming Language)", "Healthcare Analytics", "Data Analysis"]
    ),
    .init(
      kind: .project,
      period: "July 2023 - December 2024",
      role: "Integration of Medical Devices with HIS",
      organization: "Arab Hospitals Group",
      location: "Ramallah, Palestine",
      summary: "Integrated medical devices with HIS using FHIR, HL7, and ASTM to enable reliable data exchange between clinical systems and machines.",
      bullets: [
        "Built and maintained interfaces for EHR, lab, radiology, and related clinical systems.",
        "Implemented standards-based integrations to improve continuity across HIS workflows.",
        "Improved patient care delivery through more consistent data movement and system interoperability."
      ],
      associatedWith: "Associated with Arab Hospitals Group",
      skills: ["HIS", "LIS", "ASTM", "HL7", "FHIR", "REST APIs", "Healthcare", "Amazon Web Services (AWS)"]
    ),
    .init(
      kind: .project,
      period: "July 2023 - July 2024",
      role: "Medical Imaging System - PACS",
      organization: "Arab Hospitals Group",
      location: "Ramallah, Palestine",
      summary: "Designed and implemented a PACS solution using Oracle Apex across three facilities, improving imaging data accessibility and secure sharing.",
      bullets: [
        "Implemented PACS workflows for imaging access and cross-facility data sharing.",
        "Improved speed and availability of patient imaging data for clinicians.",
        "Supported compliance requirements for patient privacy and data security."
      ],
      associatedWith: "Associated with Arab Hospitals Group",
      skills: ["Picture Archiving and Communication System (PACS)", "Oracle apex", "DICOM", "Data Security", "Healthcare Information Technology (HIT)"]
    ),
    .init(
      kind: .work,
      period: "July 2023 - June 2024",
      role: "Software Engineer",
      organization: "Arab Hospitals Group",
      location: "Ramallah, Palestine",
      summary: "Built and deployed production-grade healthcare software focused on system integration, automation, and intelligent data processing.",
      bullets: [
        "Built backend APIs connecting HIS platforms with external systems and medical devices, improving data accuracy and reducing manual workflows.",
        "Developed an AI-powered speech-to-text system to automate doctor note transcription.",
        "Designed and implemented PACS enhancements that improved medical imaging accessibility and cross-facility collaboration.",
        "Delivered analytics and reporting solutions to support clinical and operational insights."
      ],
      skills: ["HIS", "Electronic Medical Record (EMR)", "FHIR", "REST APIs", "Oracle apex", "DICOM"]
    ),
    .init(
      kind: .work,
      period: "July 2022 - December 2023",
      role: "Information Technology Programmer",
      organization: "World Health Organization",
      location: "Ramallah, Palestine",
      summary: "Supported national and regional health programs by designing, integrating, and maintaining data collection and health information systems.",
      bullets: [
        "Designed and implemented digital health data collection systems to improve accuracy, consistency, and reporting efficiency.",
        "Integrated multiple health platforms and databases, streamlining workflows and enabling unified health analytics.",
        "Diagnosed and resolved DHIS2 system issues, developing custom scripts and enhancements tailored to operational needs.",
        "Delivered analytics and Power BI dashboards for large-scale public-health decision-making and reporting."
      ],
      skills: ["Integrated Systems", "Data Integration", "RDBMS", "SQL", "Microsoft Power BI"]
    ),
    .init(
      kind: .work,
      period: "July 2022 - July 2023",
      role: "Cyber Security Engineer",
      organization: "Unipal General Trading Company",
      location: "Ramallah, Palestine",
      summary: "Managed enterprise security operations to protect systems, networks, and applications against evolving threats.",
      bullets: [
        "Administered endpoint protection and threat detection platforms, including CrowdStrike Falcon.",
        "Managed web application firewalls and network security tools using Fortinet.",
        "Handled security incidents and response activities, improving detection, containment, and remediation processes.",
        "Strengthened organizational security posture through prevention and incident-management best practices."
      ],
      skills: ["Cybersecurity", "Crowdstrike Falcon", "Fortinet", "Web Application Firewall", "SEIM", "Network Security"]
    ),
    .init(
      kind: .project,
      period: "December 2021 - December 2022",
      role: "Data Engineering for Healthcare Research",
      organization: "World Health Organization",
      location: "Ramallah, Palestine",
      summary: "Led integration of relational database systems for health research, improving accessibility for thousands of users and enabling more efficient analysis.",
      bullets: [
        "Integrated RDBMS data flows for research and health statistics analysis.",
        "Improved data accessibility and reporting quality for large user groups.",
        "Supported analytics enablement for public-health decisions."
      ],
      associatedWith: "Associated with World Health Organization",
      skills: ["Data Integration", "SQL", "RDBMS", "Data Engineering", "Microsoft Power BI"]
    ),
    .init(
      kind: .work,
      period: "December 2020 - July 2022",
      role: "Health Registries and Surveillance Systems Officer",
      organization: "World Health Organization",
      location: "Ramallah, Palestine",
      summary: "Supported health registries and surveillance systems across public-health programs with a focus on reporting continuity and data quality.",
      bullets: [
        "Worked within multi-stakeholder public-health environments where data accuracy and system reliability directly affected program reporting.",
        "Contributed to surveillance and registry workflows that strengthened operational visibility and large-scale health-system coordination."
      ],
      skills: ["Health Registries", "Integrated Systems", "Computer Information Systems", "IT Development"]
    ),
    .init(
      kind: .work,
      period: "April 2019 - December 2019",
      role: "Support Operation Officer",
      organization: "Hadara Technologies",
      location: "Ramallah, Palestine",
      summary: "Provided technical and network support for enterprise clients, ensuring service reliability and operational continuity.",
      bullets: [
        "Supported network and service operations, maintaining availability and performance across corporate environments.",
        "Diagnosed and resolved customer technical issues, improving response times and customer satisfaction.",
        "Assisted with network administration and security tasks, supporting WAN infrastructure and access controls.",
        "Worked directly with customers and internal teams to keep service delivery and issue resolution smooth."
      ],
      skills: ["Network Administration", "Network Switches", "Wide Area Network (WAN)", "Networking", "Office 365"]
    )
  ]
}
