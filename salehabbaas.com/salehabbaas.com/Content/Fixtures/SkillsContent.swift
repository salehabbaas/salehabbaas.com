import Foundation

enum SkillsContentFixture {
  static let saleh = SkillsSection(
    topSkills: [
      "TypeScript",
      "Full-Stack Development",
      "Firebase",
      "System Architecture",
      "HL7",
      "FHIR",
      "Machine Learning",
      "Amazon Web Services (AWS)"
    ],
    groups: buildGroups(),
    languages: [
      .init(name: "English", level: "Professional Working"),
      .init(name: "Arabic", level: "Native or Bilingual"),
      .init(name: "French", level: "Elementary")
    ],
    certifications: [
      .init(
        title: "What to Post on LinkedIn to Stand Out",
        issuer: "LinkedIn",
        issued: "January 2026",
        expires: nil,
        relatedSkills: ["Personal Branding", "Social Media Content Creation"]
      ),
      .init(
        title: "Rock Your LinkedIn Profile",
        issuer: "LinkedIn",
        issued: "January 2026",
        expires: nil,
        relatedSkills: ["LinkedIn", "Professional Networking"]
      ),
      .init(
        title: "AWS Cloud Practitioner Essentials",
        issuer: "Amazon Web Services (AWS)",
        issued: "November 2025",
        expires: nil,
        relatedSkills: ["Cloud Computing", "Cloud Security", "Amazon Web Services (AWS)"]
      ),
      .init(
        title: "Cloud Computing: Understanding Core Concepts",
        issuer: "LinkedIn",
        issued: "October 2025",
        expires: nil,
        relatedSkills: ["Cloud Computing"]
      ),
      .init(
        title: "AI Fundamentals",
        issuer: "IBM",
        issued: "November 2024",
        expires: nil,
        relatedSkills: ["Machine Learning", "Artificial Intelligence (AI)"]
      ),
      .init(
        title: "Health-Tech and Al",
        issuer: "Techlinic",
        issued: "April 2024",
        expires: nil,
        relatedSkills: ["HL7", "Artificial Intelligence (AI)"]
      ),
      .init(
        title: "ETERNUS DX & AF Administration",
        issuer: "Fujitsu",
        issued: "September 2023",
        expires: "September 2023",
        relatedSkills: ["Cloud Storage", "Infrastructure Administration"]
      ),
      .init(
        title: "An Applied Multidisciplinary Learning Journey in Data Science - Python",
        issuer: "Birzeit University",
        issued: "June 2023",
        expires: nil,
        relatedSkills: ["Healthcare Analytics", "Data Analysis", "Predictive Modeling", "Python (Programming Language)"]
      ),
      .init(
        title: "React JS Web Development",
        issuer: "Experts Turnkey Solutions",
        issued: "June 2022",
        expires: nil,
        relatedSkills: ["React.js", "REST APIs"]
      ),
      .init(
        title: "Tracker Conguration - Level 1",
        issuer: "DHIS2",
        issued: "June 2022",
        expires: nil,
        relatedSkills: ["Integrated Systems", "Data Integration"]
      ),
      .init(
        title: "DHIS2_101: DHIS Fundamentals",
        issuer: "DHIS2",
        issued: "June 2022",
        expires: nil,
        relatedSkills: ["Integrated Systems", "Healthcare Analytics"]
      ),
      .init(
        title: "Certified Ethical Hacker (CEH)",
        issuer: "Cystack",
        issued: "November 2022",
        expires: "November 2022",
        relatedSkills: ["SEIM", "Network Security", "Web Application Firewall", "Cybersecurity"]
      ),
      .init(
        title: "DHIS2 Events Fundamentals",
        issuer: "DHIS2",
        issued: "June 2021",
        expires: nil,
        relatedSkills: ["Data Integration", "Healthcare"]
      ),
      .init(
        title: "Oracle Database 12c R2 Administration Certified Associate",
        issuer: "Experts Turnkey Solutions",
        issued: "September 2019",
        expires: nil,
        relatedSkills: ["SQL", "RDBMS"]
      ),
      .init(
        title: "Cisco Certified Network Associate Routing and Switching (CCNA)",
        issuer: "Experts Turnkey Solutions",
        issued: "September 2019",
        expires: nil,
        relatedSkills: ["Network Security", "Network Switches", "Network Administration", "Wide Area Network (WAN)"]
      )
    ]
  )

  private static func buildGroups() -> [SkillCategory] {
    let categoryOrder: [(String, [String])] = [
      (
        "Platform And Product Engineering",
        [
          "TypeScript",
          "Full-Stack Development",
          "Firebase",
          "System Architecture",
          "Tailwind CSS",
          "Web Development",
          "Cloud Functions",
          "Software Engineering",
          "Engineering",
          "REST APIs",
          "React.js",
          "Next.js",
          "JavaScript",
          "Enterprise Software",
          "Mobile Applications",
          "React JS Web Development"
        ]
      ),
      (
        "Cloud And Infrastructure",
        [
          "Cloud Computing",
          "Cloud Computing & Cloud-Native Systems",
          "Cloud Infrastructure",
          "Cloud Storage",
          "Cloud Security",
          "Amazon Web Services (AWS)",
          "AWS Cloud Practitioner Essentials",
          "Cloud Functions",
          "Office 365"
        ]
      ),
      (
        "Healthcare Systems And Interoperability",
        [
          "Healthcare",
          "Healthcare Systems Integration (HL7, FHIR, APIs)",
          "HIS",
          "LIS",
          "HL7",
          "HL7 Standards",
          "FHIR",
          "ASTM",
          "DICOM",
          "Picture Archiving and Communication System (PACS)",
          "Healthcare Information Technology (HIT)",
          "Electronic Medical Record (EMR)",
          "Rhapsody Health",
          "Mirth",
          "Epic Systems",
          "Epic",
          "Integrated Systems",
          "System Integration Testing",
          "ServiceNow",
          "Oracle apex"
        ]
      ),
      (
        "Data And AI",
        [
          "Applied Artificial Intelligence (AI) & Machine Learning",
          "Artificial Intelligence (AI)",
          "AI Fundamentals",
          "Machine Learning",
          "Predictive Modeling",
          "Data Analysis",
          "Data Engineering",
          "Data Engineering & Analytics",
          "Data Integration",
          "RDBMS",
          "SQL",
          "Python (Programming Language)",
          "Microsoft Power BI",
          "Healthcare Analytics"
        ]
      ),
      (
        "Security And Networking",
        [
          "Cybersecurity",
          "Network Security",
          "Network Security Implementation",
          "Cyber Security Risk",
          "Security Architecture Design",
          "Data Security",
          "Web Application Firewall",
          "Fortinet",
          "Crowdstrike Falcon",
          "SEIM",
          "Certified Ethical Hacker (CEH)",
          "Cisco Certified Network Associate Routing and Switching (CCNA)",
          "Network Switches",
          "Network Administration",
          "Wide Area Network (WAN)",
          "Networking"
        ]
      ),
      (
        "Leadership And Community",
        [
          "Start-up Leadership",
          "Start-up Ventures",
          "Venture Capital",
          "Professional Networking",
          "LinkedIn",
          "Social Media Content Creation",
          "Personal Branding",
          "Computer Information Systems",
          "IT Development",
          "Program Coordination",
          "Stakeholder Collaboration"
        ]
      ),
      (
        "Mobile And Immersive",
        [
          "Swift (Programming Language)",
          "ARKit",
          "Augmented Reality (AR)"
        ]
      )
    ]

    var used = Set<String>()
    var categories: [SkillCategory] = []

    for (title, items) in categoryOrder {
      var uniqueItems: [String] = []
      for item in items {
        let canonical = canonicalSkillName(item)
        let key = normalizedKey(canonical)
        guard !used.contains(key) else { continue }
        used.insert(key)
        uniqueItems.append(canonical)
      }

      guard !uniqueItems.isEmpty else { continue }
      categories.append(.init(title: title, items: uniqueItems))
    }

    return categories
  }

  private static func canonicalSkillName(_ raw: String) -> String {
    let trimmed = raw
      .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
      .trimmingCharacters(in: .whitespacesAndNewlines)

    let key = normalizedKey(trimmed)
    switch key {
    case "react js":
      return "React.js"
    case "cloud functions":
      return "Cloud Functions"
    case "python programming language":
      return "Python (Programming Language)"
    case "swift programming language":
      return "Swift (Programming Language)"
    default:
      return trimmed
    }
  }

  private static func normalizedKey(_ value: String) -> String {
    value
      .lowercased()
      .replacingOccurrences(of: "[^a-z0-9]+", with: " ", options: .regularExpression)
      .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
      .trimmingCharacters(in: .whitespacesAndNewlines)
  }
}
