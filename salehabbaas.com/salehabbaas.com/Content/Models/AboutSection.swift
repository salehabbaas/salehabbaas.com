import Foundation

struct AboutFact: Identifiable {
  let title: String
  let value: String
  let icon: String
  var id: String { title }
}

struct EducationEntry: Identifiable {
  let institution: String
  let degree: String
  let field: String
  let period: String
  var id: String { institution + degree }
}

struct AboutSection {
  let summary: String
  let mission: String
  let magic: [String]
  let bringingToLife: [String]
  let principles: [String]
  let identityFacts: [AboutFact]
  let education: [EducationEntry]
}
