import Foundation

enum AboutContentFixture {
  static let saleh = AboutSection(
    summary: "I’m a Software Engineer and Full-Stack Engineer building practical products and platforms across AI, cloud, cybersecurity, databases, and healthcare systems integration. I focus on real delivery, clear architecture, and maintainable solutions that scale.",
    mission: "Design and deliver full-stack, AI-enabled, cloud-ready systems that improve decisions, accelerate delivery, and support real business and product outcomes across multiple domains.",
    magic: [
      "Building production-ready full-stack systems",
      "Applying AI to operational workflows",
      "Integrating complex systems with healthcare standards",
      "Turning fragmented data into usable decisions",
      "Designing scalable cloud architectures",
      "Balancing reliability, security, and speed of delivery",
      "Collaborating across technical and non-technical teams",
      "Leading platform direction from architecture to execution",
      "Structuring complex initiatives into actionable plans",
      "Driving outcomes that hold up in real-world constraints"
    ],
    bringingToLife: [
      "Working with stakeholders to identify true business and clinical pain points",
      "Designing and building cloud-based software platforms",
      "Applying AI and analytics to improve outcomes and efficiency",
      "Integrating systems through HL7, FHIR, APIs, and workflow standards",
      "Measuring impact with dashboards, KPIs, and platform observability",
      "Supporting community programs through operational coordination and reporting"
    ],
    principles: [
      "Start with people, systems, and constraints before choosing technology.",
      "Build AI-driven and cloud-based software that remains secure, reliable, and measurable.",
      "Translate complexity clearly across technical, business, and operational teams."
    ],
    identityFacts: [
      .init(title: "Current Base", value: "Ottawa, Ontario, Canada", icon: "mappin.circle.fill"),
      .init(title: "Core Domains", value: "Software engineering, full-stack products, AI, cloud, cybersecurity, and databases", icon: "cross.case.circle.fill"),
      .init(title: "Languages", value: "English, Arabic, French", icon: "text.bubble.fill"),
      .init(title: "Strength", value: "Full-stack execution, AI integration, cloud delivery, and secure engineering", icon: "gearshape.2.fill")
    ],
    education: [
      .init(
        institution: "An Najah National University",
        degree: "Bachelor's degree",
        field: "Management Information Systems",
        period: "September 2014 - September 2018"
      )
    ]
  )
}
