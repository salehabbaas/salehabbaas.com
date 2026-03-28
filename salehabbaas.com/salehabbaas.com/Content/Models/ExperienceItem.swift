import Foundation

enum ExperienceKind: String {
  case work
  case project
  case volunteering

  var title: String {
    switch self {
    case .work:
      return "Work"
    case .project:
      return "Project"
    case .volunteering:
      return "Volunteering"
    }
  }

  var iconName: String {
    switch self {
    case .work:
      return "briefcase.fill"
    case .project:
      return "hammer.fill"
    case .volunteering:
      return "heart.fill"
    }
  }
}

struct ExperienceItem: Identifiable {
  let kind: ExperienceKind
  let period: String
  let role: String
  let organization: String
  let location: String
  let summary: String
  let bullets: [String]
  let associatedWith: String?
  let repositoryURL: URL?
  let skills: [String]

  var id: String { [kind.rawValue, period, role, organization].joined(separator: "|") }

  init(
    kind: ExperienceKind = .work,
    period: String,
    role: String,
    organization: String,
    location: String,
    summary: String,
    bullets: [String],
    associatedWith: String? = nil,
    repositoryURL: URL? = nil,
    skills: [String] = []
  ) {
    self.kind = kind
    self.period = period
    self.role = role
    self.organization = organization
    self.location = location
    self.summary = summary
    self.bullets = bullets
    self.associatedWith = associatedWith
    self.repositoryURL = repositoryURL
    self.skills = skills
  }
}
