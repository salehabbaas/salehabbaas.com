import Foundation

enum PortfolioNavigationTab: String, CaseIterable, Identifiable {
  case home
  case about
  case skills
  case experience
  case focus
  case contact

  var id: String { rawValue }

  var title: String {
    switch self {
    case .home: "Home"
    case .about: "About"
    case .skills: "Skills"
    case .experience: "Experience"
    case .focus: "Focus"
    case .contact: "Contact"
    }
  }

  var iconName: String {
    switch self {
    case .home: "sparkles"
    case .about: "person.text.rectangle"
    case .skills: "hammer.fill"
    case .experience: "briefcase.fill"
    case .focus: "scope"
    case .contact: "paperplane.fill"
    }
  }

  var accentIndex: Int {
    switch self {
    case .home: 0
    case .about: 1
    case .skills: 2
    case .experience: 3
    case .focus: 0
    case .contact: 1
    }
  }
}
