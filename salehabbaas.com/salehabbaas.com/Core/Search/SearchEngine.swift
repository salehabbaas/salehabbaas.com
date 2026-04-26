import Foundation

struct SearchResult: Identifiable {
  let id = UUID()
  let title: String
  let subtitle: String
  let category: SearchCategory
  let matchScore: Double
}

enum SearchCategory: String, CaseIterable {
  case skills = "Skills"
  case experience = "Experience"
  case projects = "Projects"
  case certifications = "Certifications"
  case focus = "Focus Areas"
  case blog = "Blog"
  case goals = "Goals"

  var icon: String {
    switch self {
    case .skills: return "hammer.fill"
    case .experience: return "briefcase.fill"
    case .projects: return "folder.fill"
    case .certifications: return "checkmark.seal.fill"
    case .focus: return "scope"
    case .blog: return "doc.text.fill"
    case .goals: return "target"
    }
  }
}

@Observable
final class SearchEngine {
  var query = ""
  var results: [SearchResult] = []
  var selectedCategory: SearchCategory?

  private var contentProvider: ContentProvider?

  func bind(to provider: ContentProvider) {
    contentProvider = provider
  }

  func search() {
    let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    guard trimmed.count >= 2 else {
      results = []
      return
    }

    var allResults: [SearchResult] = []

    if let provider = contentProvider {
      // Search skills
      let doc = provider.document
      for group in doc.skills.groups {
        for item in group.items where item.lowercased().contains(trimmed) {
          allResults.append(SearchResult(
            title: item,
            subtitle: group.title,
            category: .skills,
            matchScore: item.lowercased() == trimmed ? 1.0 : 0.8
          ))
        }
      }

      // Search experience
      for exp in doc.experience {
        let searchable = [exp.role, exp.organization, exp.summary].joined(separator: " ").lowercased()
        if searchable.contains(trimmed) {
          allResults.append(SearchResult(
            title: exp.role,
            subtitle: exp.organization,
            category: .experience,
            matchScore: exp.role.lowercased().contains(trimmed) ? 0.9 : 0.6
          ))
        }
        for bullet in exp.bullets where bullet.lowercased().contains(trimmed) {
          allResults.append(SearchResult(
            title: exp.role,
            subtitle: String(bullet.prefix(80)),
            category: .experience,
            matchScore: 0.5
          ))
          break
        }
      }

      // Search certifications
      for cert in doc.skills.certifications {
        let searchable = [cert.title, cert.issuer].joined(separator: " ").lowercased()
        if searchable.contains(trimmed) {
          allResults.append(SearchResult(
            title: cert.title,
            subtitle: cert.issuer,
            category: .certifications,
            matchScore: cert.title.lowercased().contains(trimmed) ? 0.9 : 0.6
          ))
        }
      }

      // Search focus areas
      for area in doc.focusAreas {
        let searchable = ([area.title, area.summary] + area.tags).joined(separator: " ").lowercased()
        if searchable.contains(trimmed) {
          allResults.append(SearchResult(
            title: area.title,
            subtitle: area.summary,
            category: .focus,
            matchScore: area.title.lowercased().contains(trimmed) ? 0.9 : 0.5
          ))
        }
      }

      // Search blog posts
      for post in provider.blogPosts {
        let searchable = [post.title ?? "", post.excerpt ?? ""].joined(separator: " ").lowercased()
        if searchable.contains(trimmed) {
          allResults.append(SearchResult(
            title: post.title ?? "",
            subtitle: post.excerpt ?? "",
            category: .blog,
            matchScore: 0.7
          ))
        }
      }

      // Search goals
      if AdminAuthManager.shared.isAuthenticated {
        for goal in provider.publicGoals {
          let searchable = ([goal.title ?? ""] + (goal.tags ?? [])).joined(separator: " ").lowercased()
          if searchable.contains(trimmed) {
            allResults.append(SearchResult(
              title: goal.title ?? "",
              subtitle: goal.tags?.joined(separator: ", ") ?? "",
              category: .goals,
              matchScore: 0.6
            ))
          }
        }
      }

      // Search projects
      for proj in provider.projects {
        let searchable = [proj.title ?? "", proj.description ?? ""].joined(separator: " ").lowercased()
        if searchable.contains(trimmed) {
          allResults.append(SearchResult(
            title: proj.title ?? "",
            subtitle: proj.description ?? "",
            category: .projects,
            matchScore: 0.7
          ))
        }
      }
    }

    // Filter by category if selected
    if let category = selectedCategory {
      allResults = allResults.filter { $0.category == category }
    }

    // Sort by score and deduplicate by title
    var seen = Set<String>()
    results = allResults
      .sorted { $0.matchScore > $1.matchScore }
      .filter { seen.insert($0.title).inserted }
  }
}
