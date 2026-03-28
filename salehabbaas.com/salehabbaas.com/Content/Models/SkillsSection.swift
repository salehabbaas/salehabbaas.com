import Foundation

struct SkillCategory: Identifiable {
  let title: String
  let items: [String]
  var id: String { title }
}

struct LanguageEntry: Identifiable {
  let name: String
  let level: String
  var id: String { name }
}

struct CertificationEntry: Identifiable {
  let title: String
  let issuer: String
  let issued: String
  let expires: String?
  let relatedSkills: [String]

  var id: String { [title, issuer, issued].joined(separator: "|") }
}

struct SkillsSection {
  let topSkills: [String]
  let groups: [SkillCategory]
  let languages: [LanguageEntry]
  let certifications: [CertificationEntry]
}
