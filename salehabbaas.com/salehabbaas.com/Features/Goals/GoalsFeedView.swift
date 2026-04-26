import SwiftUI

struct GoalsFeedView: View {
  let colorMode: PortfolioColorMode
  @Environment(ContentProvider.self) private var content

  @State private var selectedStatus: GoalStatusFilter = .all
  @State private var showLearningOnly = false
  @State private var isLoading = false
  @State private var hasLoadedOnce = false

  private var filtered: [APIPublicGoal] {
    content.publicGoals.filter { goal in
      let statusMatch: Bool
      switch selectedStatus {
      case .all: statusMatch = goal.status != "done" || showCompleted
      case .active: statusMatch = goal.status == "today" || goal.status == "this_week"
      case .inbox: statusMatch = goal.status == "inbox"
      case .done: statusMatch = goal.status == "done"
      }
      let learningMatch = !showLearningOnly || goal.learning != nil
      return statusMatch && learningMatch
    }
  }

  private var showCompleted: Bool { selectedStatus == .done || selectedStatus == .all }

  var body: some View {
    VStack(alignment: .leading, spacing: 28) {
      // Header stats
      if let stats = content.goalStats {
        statsHeader(stats)
      }

      // Filters
      filtersSection

      // Goals list
      if isLoading && filtered.isEmpty {
        ProgressView()
          .frame(maxWidth: .infinity)
          .padding(.vertical, 30)
      } else if filtered.isEmpty {
        emptyState
      } else {
        VStack(alignment: .leading, spacing: 12) {
          ForEach(filtered) { goal in
            GoalStickerCard(goal: goal, colorMode: colorMode)
          }
        }
      }
    }
    .task { await loadGoalsIfNeeded() }
  }

  @MainActor
  private func loadGoalsIfNeeded(force: Bool = false) async {
    if isLoading { return }
    if hasLoadedOnce && !force { return }
    isLoading = true
    await AdminAuthManager.shared.ensureValidToken()
    await content.loadAdminGoals()
    hasLoadedOnce = true
    isLoading = false
  }

  private func statsHeader(_ stats: APIGoalStats) -> some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Milestones & Goals")
        .font(.title3.weight(.bold))
        .foregroundStyle(PortfolioTheme.ink(colorMode))
      Text("What I'm currently building and learning.")
        .font(.subheadline.weight(.medium))
        .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))

      HStack(spacing: 10) {
        statChip(value: "\(stats.currentStreak ?? 0)", label: "Day Streak", icon: "flame.fill")
        statChip(value: "\(stats.totalCompleted ?? 0)", label: "Completed", icon: "checkmark.circle.fill")
        statChip(value: formatMinutes(stats.totalMinutes ?? 0), label: "Study Time", icon: "clock.fill")
      }
    }
    .portfolioPanel(colorMode: colorMode)
  }

  private func statChip(value: String, label: String, icon: String) -> some View {
    VStack(spacing: 4) {
      Image(systemName: icon)
        .font(.system(size: 13, weight: .bold))
        .foregroundStyle(PortfolioTheme.accentStrong(colorMode))
      Text(value)
        .font(.headline.weight(.bold))
        .foregroundStyle(PortfolioTheme.ink(colorMode))
      Text(label)
        .font(.caption2.weight(.bold))
        .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 12)
    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: 14, style: .continuous)
        .strokeBorder(PortfolioTheme.border, lineWidth: 1)
    )
  }

  private var filtersSection: some View {
    VStack(alignment: .leading, spacing: 10) {
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 8) {
          ForEach(GoalStatusFilter.allCases, id: \.self) { filter in
            Button {
              withAnimation(.snappy(duration: 0.2)) { selectedStatus = filter }
            } label: {
              Text(filter.label)
                .font(.footnote.weight(.bold))
                .foregroundStyle(selectedStatus == filter ? .white : PortfolioTheme.ink(colorMode))
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(
                  selectedStatus == filter
                    ? PortfolioTheme.buttonGradient
                    : LinearGradient(colors: [.clear], startPoint: .leading, endPoint: .trailing),
                  in: Capsule()
                )
                .overlay(
                  Capsule().strokeBorder(
                    selectedStatus == filter ? Color.clear : PortfolioTheme.border,
                    lineWidth: 1
                  )
                )
            }
          }

          Toggle(isOn: $showLearningOnly) {
            Label("Learning", systemImage: "book.fill")
              .font(.footnote.weight(.bold))
          }
          .toggleStyle(ChipToggleStyle(colorMode: colorMode))
        }
        .padding(.horizontal, 2)
      }
    }
  }

  private var emptyState: some View {
    VStack(spacing: 12) {
      Image(systemName: "target")
        .font(.system(size: 32))
        .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
      Text("No goals in this category.")
        .font(.subheadline.weight(.medium))
        .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 30)
  }

  private func formatMinutes(_ mins: Int) -> String {
    if mins >= 60 { return "\(mins / 60)h" }
    return "\(mins)m"
  }
}

// MARK: - Goal Sticker Card

private struct GoalStickerCard: View {
  let goal: APIPublicGoal
  let colorMode: PortfolioColorMode

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .top, spacing: 10) {
        Circle()
          .fill(goalColor)
          .frame(width: 10, height: 10)
          .padding(.top, 5)

        VStack(alignment: .leading, spacing: 4) {
          Text(goal.title ?? "")
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(PortfolioTheme.ink(colorMode))
            .lineSpacing(3)

          if let notes = goal.notes, !notes.isEmpty {
            Text(notes)
              .font(.footnote.weight(.medium))
              .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
              .lineSpacing(3)
              .lineLimit(2)
          }
        }

        Spacer()

        statusBadge
      }

      HStack(spacing: 8) {
        if let learning = goal.learning {
          if let area = learning.learningArea {
            GoalTag(text: area, icon: "book.fill", colorMode: colorMode)
          }
          if let type = learning.studyType {
            GoalTag(text: type.capitalized, icon: "sparkles", colorMode: colorMode)
          }
        }

        if let priority = goal.priority, priority != "medium" {
          GoalTag(text: priority.capitalized, icon: priorityIcon(priority), colorMode: colorMode)
        }

        ForEach((goal.tags ?? []).prefix(2), id: \.self) { tag in
          GoalTag(text: tag, colorMode: colorMode)
        }

        Spacer()

        if let date = goal.plannedDate {
          Text(formatDate(date))
            .font(.caption2.weight(.bold))
            .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
        }
      }
    }
    .padding(16)
    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .strokeBorder(PortfolioTheme.border, lineWidth: 1)
    )
  }

  private var statusBadge: some View {
    let (icon, color) = statusInfo
    return Image(systemName: icon)
      .font(.system(size: 13, weight: .bold))
      .foregroundStyle(color)
  }

  private var statusInfo: (String, Color) {
    switch goal.status {
    case "today": return ("bolt.fill", .orange)
    case "this_week": return ("calendar", .blue)
    case "done": return ("checkmark.circle.fill", .green)
    default: return ("tray.fill", PortfolioTheme.secondaryInk(colorMode))
    }
  }

  private var goalColor: Color {
    let hex = goal.color ?? "#6B7280"
    return Color(hex: hex) ?? .gray
  }

  private func priorityIcon(_ p: String) -> String {
    switch p {
    case "high": return "flame.fill"
    case "low": return "minus.circle.fill"
    default: return "circle.fill"
    }
  }

  private func formatDate(_ str: String) -> String {
    let f = DateFormatter()
    f.dateFormat = "yyyy-MM-dd"
    guard let d = f.date(from: str) else { return str }
    f.dateFormat = "MMM d"
    return f.string(from: d)
  }
}

private struct GoalTag: View {
  let text: String
  var icon: String? = nil
  let colorMode: PortfolioColorMode

  var body: some View {
    HStack(spacing: 4) {
      if let icon {
        Image(systemName: icon)
          .font(.system(size: 9, weight: .bold))
      }
      Text(text)
        .font(.caption2.weight(.bold))
    }
    .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
    .padding(.horizontal, 8)
    .padding(.vertical, 4)
    .background(.ultraThinMaterial, in: Capsule())
    .overlay(Capsule().strokeBorder(PortfolioTheme.border, lineWidth: 0.5))
  }
}

// MARK: - Supporting Types

enum GoalStatusFilter: String, CaseIterable {
  case all, active, inbox, done
  var label: String {
    switch self {
    case .all: return "All"
    case .active: return "Active"
    case .inbox: return "Inbox"
    case .done: return "Done"
    }
  }
}

struct ChipToggleStyle: ToggleStyle {
  let colorMode: PortfolioColorMode
  func makeBody(configuration: Configuration) -> some View {
    Button {
      configuration.isOn.toggle()
    } label: {
      configuration.label
        .font(.footnote.weight(.bold))
        .foregroundStyle(configuration.isOn ? .white : PortfolioTheme.ink(colorMode))
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(
          configuration.isOn
            ? PortfolioTheme.buttonGradient
            : LinearGradient(colors: [.clear], startPoint: .leading, endPoint: .trailing),
          in: Capsule()
        )
        .overlay(
          Capsule().strokeBorder(
            configuration.isOn ? Color.clear : PortfolioTheme.border,
            lineWidth: 1
          )
        )
    }
  }
}

// MARK: - Color from Hex

extension Color {
  init?(hex: String) {
    let h = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    var int: UInt64 = 0
    Scanner(string: h).scanHexInt64(&int)
    let r, g, b: Double
    switch h.count {
    case 6:
      r = Double((int >> 16) & 0xFF) / 255
      g = Double((int >> 8) & 0xFF) / 255
      b = Double(int & 0xFF) / 255
    default: return nil
    }
    self.init(red: r, green: g, blue: b)
  }
}
