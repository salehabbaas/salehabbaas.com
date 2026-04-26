import Foundation
import SwiftUI
import WidgetKit

// MARK: - Entry

struct AdminPanelWidgetEntry: TimelineEntry {
  let date: Date
  let isAuthenticated: Bool
  let adminEmail: String
  let unreadNotifications: Int
  let latestNotificationTitle: String
  let activeJobs: Int
  let interviewJobs: Int
  let offerJobs: Int
  let upcomingBookings: Int
  let nextBookingStartAt: String
  let activeGoals: Int
  let completedGoals: Int
  let currentStreak: Int
  let totalMinutes: Int
  let highlightGoal: String
  let updatedAtText: String

  static var unauthenticated: AdminPanelWidgetEntry {
    AdminPanelWidgetEntry(
      date: Date(),
      isAuthenticated: false,
      adminEmail: "",
      unreadNotifications: 0,
      latestNotificationTitle: "",
      activeJobs: 0,
      interviewJobs: 0,
      offerJobs: 0,
      upcomingBookings: 0,
      nextBookingStartAt: "",
      activeGoals: 0,
      completedGoals: 0,
      currentStreak: 0,
      totalMinutes: 0,
      highlightGoal: "",
      updatedAtText: "Sign in required"
    )
  }
}

// MARK: - Provider

struct AdminPanelWidgetProvider: TimelineProvider {
  private let defaults = UserDefaults(suiteName: "group.com.salehabbaas.widget")
  private let summaryKey = "widget.admin.summary.v1"

  func placeholder(in context: Context) -> AdminPanelWidgetEntry {
    AdminPanelWidgetEntry(
      date: Date(),
      isAuthenticated: true,
      adminEmail: "admin@salehabbaas.com",
      unreadNotifications: 4,
      latestNotificationTitle: "New booking from Alex",
      activeJobs: 11,
      interviewJobs: 3,
      offerJobs: 1,
      upcomingBookings: 5,
      nextBookingStartAt: Date().addingTimeInterval(60 * 60).ISO8601Format(),
      activeGoals: 6,
      completedGoals: 43,
      currentStreak: 9,
      totalMinutes: 1130,
      highlightGoal: "Finalize admin mobile rollout",
      updatedAtText: "Just now"
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (AdminPanelWidgetEntry) -> Void) {
    if context.isPreview {
      completion(placeholder(in: context))
      return
    }
    Task {
      completion(await fetchEntry())
    }
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<AdminPanelWidgetEntry>) -> Void) {
    Task {
      let entry = await fetchEntry()
      let refreshMinutes = entry.isAuthenticated ? 10 : 30
      let next = Calendar.current.date(byAdding: .minute, value: refreshMinutes, to: Date()) ?? Date().addingTimeInterval(600)
      completion(Timeline(entries: [entry], policy: .after(next)))
    }
  }

  private func fetchEntry() async -> AdminPanelWidgetEntry {
    let token = defaults?.string(forKey: "widget.admin.idToken") ?? ""
    let email = defaults?.string(forKey: "widget.admin.email") ?? ""
    if token.isEmpty {
      return .unauthenticated
    }

    do {
      let response = try await fetchAdminSummary(token: token)
      let entry = entryFromResponse(response, fallbackEmail: email)
      if let encoded = try? JSONEncoder().encode(response) {
        defaults?.set(encoded, forKey: summaryKey)
      }
      return entry
    } catch WidgetFetchError.unauthorized {
      defaults?.set(false, forKey: "widget.admin.isAuthenticated")
      defaults?.removeObject(forKey: "widget.admin.idToken")
      return .unauthenticated
    } catch {
      guard
        let data = defaults?.data(forKey: summaryKey),
        let cached = try? JSONDecoder().decode(AdminWidgetSummaryResponse.self, from: data)
      else {
        return .unauthenticated
      }
      return entryFromResponse(cached, fallbackEmail: email)
    }
  }

  private func fetchAdminSummary(token: String) async throws -> AdminWidgetSummaryResponse {
    guard let url = URL(string: "https://salehabbaas.com/api/mobile/admin/widget") else {
      throw WidgetFetchError.invalidURL
    }

    var request = URLRequest(url: url)
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.timeoutInterval = 20

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse else { throw WidgetFetchError.invalidResponse }
    if http.statusCode == 401 { throw WidgetFetchError.unauthorized }
    guard (200...299).contains(http.statusCode) else {
      throw WidgetFetchError.http(http.statusCode)
    }
    return try JSONDecoder().decode(AdminWidgetSummaryResponse.self, from: data)
  }

  private func entryFromResponse(_ response: AdminWidgetSummaryResponse, fallbackEmail: String) -> AdminPanelWidgetEntry {
    let nextBookingText = relativeDateText(fromISO: response.bookings.nextStartAt)
    let updatedAtText = relativeDateText(fromISO: response.updatedAt)
    return AdminPanelWidgetEntry(
      date: Date(),
      isAuthenticated: true,
      adminEmail: response.user.email.isEmpty ? fallbackEmail : response.user.email,
      unreadNotifications: response.notifications.unreadCount,
      latestNotificationTitle: response.notifications.latestTitle,
      activeJobs: response.jobs.active,
      interviewJobs: response.jobs.interviews,
      offerJobs: response.jobs.offers,
      upcomingBookings: response.bookings.upcoming,
      nextBookingStartAt: nextBookingText,
      activeGoals: response.goals.active,
      completedGoals: response.goals.completed,
      currentStreak: response.goals.currentStreak,
      totalMinutes: response.goals.totalMinutes,
      highlightGoal: response.goals.highlight,
      updatedAtText: updatedAtText
    )
  }

  private func relativeDateText(fromISO value: String) -> String {
    guard let date = parseISODate(value) else { return "—" }
    let relative = RelativeDateTimeFormatter()
    relative.unitsStyle = .short
    return relative.localizedString(for: date, relativeTo: Date())
  }

  private func parseISODate(_ value: String) -> Date? {
    let raw = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !raw.isEmpty else { return nil }

    let isoWithFractional = ISO8601DateFormatter()
    isoWithFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let parsed = isoWithFractional.date(from: raw) {
      return parsed
    }

    let isoStandard = ISO8601DateFormatter()
    isoStandard.formatOptions = [.withInternetDateTime]
    if let parsed = isoStandard.date(from: raw) {
      return parsed
    }

    // Firestore/JSON can return fractional seconds with excessive precision; trim to milliseconds.
    let normalized = raw.replacingOccurrences(
      of: "(\\.\\d{3})\\d*(Z)$",
      with: "$1$2",
      options: .regularExpression
    )
    return isoWithFractional.date(from: normalized) ?? isoStandard.date(from: normalized)
  }
}

private enum WidgetFetchError: Error {
  case invalidURL
  case invalidResponse
  case unauthorized
  case http(Int)
}

// MARK: - API DTOs

private struct AdminWidgetSummaryResponse: Codable {
  let updatedAt: String
  let user: AdminWidgetUser
  let notifications: AdminWidgetNotifications
  let jobs: AdminWidgetJobs
  let bookings: AdminWidgetBookings
  let goals: AdminWidgetGoals
}

private struct AdminWidgetUser: Codable {
  let uid: String
  let email: String
}

private struct AdminWidgetNotifications: Codable {
  let unreadCount: Int
  let latestTitle: String
}

private struct AdminWidgetJobs: Codable {
  let total: Int
  let active: Int
  let interviews: Int
  let offers: Int
}

private struct AdminWidgetBookings: Codable {
  let upcoming: Int
  let nextStartAt: String
}

private struct AdminWidgetGoals: Codable {
  let active: Int
  let completed: Int
  let currentStreak: Int
  let totalMinutes: Int
  let highlight: String
}

// MARK: - Views

struct SalehAbbaasWidgetEntryView: View {
  let entry: AdminPanelWidgetEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    switch family {
    case .systemSmall:
      if entry.isAuthenticated {
        AdminSmallWidgetView(entry: entry)
      } else {
        AdminLockedWidgetView()
      }
    case .systemMedium:
      if entry.isAuthenticated {
        AdminMediumWidgetView(entry: entry)
      } else {
        AdminLockedWidgetView()
      }
    default:
      if entry.isAuthenticated {
        AdminMediumWidgetView(entry: entry)
      } else {
        AdminLockedWidgetView()
      }
    }
  }
}

private struct AdminLockedWidgetView: View {
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        Image(systemName: "lock.shield.fill")
          .font(.system(size: 16, weight: .bold))
        Text("Admin Widget")
          .font(.system(.caption, design: .rounded, weight: .bold))
        Spacer()
      }

      Spacer()

      Text("Sign in to Admin in the app to unlock live metrics.")
        .font(.system(.caption, design: .rounded, weight: .semibold))
        .lineLimit(3)
        .foregroundStyle(.white.opacity(0.92))

      Text("Open App")
        .font(.system(.caption2, design: .rounded, weight: .bold))
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(.white.opacity(0.18), in: Capsule())
    }
    .foregroundStyle(.white)
    .padding(14)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .background(widgetBackground)
  }
}

private struct AdminSmallWidgetView: View {
  let entry: AdminPanelWidgetEntry

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Label("Admin Live", systemImage: "bolt.fill")
          .font(.system(size: 11, weight: .bold, design: .rounded))
          .foregroundStyle(.white.opacity(0.95))
        Spacer()
        Text(entry.updatedAtText)
          .font(.system(size: 10, weight: .semibold, design: .rounded))
          .foregroundStyle(.white)
          .padding(.horizontal, 7)
          .padding(.vertical, 3)
          .background(.white.opacity(0.16), in: Capsule())
      }

      HStack(spacing: 6) {
        compactMetric(value: "\(entry.unreadNotifications)", label: "Unread")
        compactMetric(value: "\(entry.activeJobs)", label: "Jobs")
        compactMetric(value: "\(entry.upcomingBookings)", label: "Book")
      }

      Spacer(minLength: 0)

      Text(entry.highlightGoal.isEmpty ? "No active goal" : entry.highlightGoal)
        .font(.system(size: 11, weight: .semibold, design: .rounded))
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .foregroundStyle(.white.opacity(0.9))

      Text("Next \(entry.nextBookingStartAt)")
        .font(.system(size: 10, weight: .medium, design: .rounded))
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .foregroundStyle(.white.opacity(0.86))
    }
    .padding(12)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .background(widgetBackground)
  }

  private func compactMetric(value: String, label: String) -> some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(value)
        .font(.system(size: 14, weight: .bold, design: .rounded))
      Text(label)
        .font(.system(size: 10, weight: .semibold, design: .rounded))
        .foregroundStyle(.white.opacity(0.74))
    }
    .foregroundStyle(.white)
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 8)
    .padding(.vertical, 6)
    .background(.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
  }
}

private struct AdminMediumWidgetView: View {
  let entry: AdminPanelWidgetEntry

  var body: some View {
    VStack(alignment: .leading, spacing: 9) {
      HStack {
        Label("Admin Reminders", systemImage: "bell.badge.fill")
          .font(.system(size: 12, weight: .bold, design: .rounded))
          .foregroundStyle(.white.opacity(0.95))
          .lineLimit(1)
          .minimumScaleFactor(0.8)
        Spacer()
        Text("\(entry.unreadNotifications) unread")
          .font(.system(size: 11, weight: .semibold, design: .rounded))
          .foregroundStyle(.white.opacity(0.9))
          .lineLimit(1)
          .padding(.horizontal, 8)
          .padding(.vertical, 4)
          .background(.white.opacity(0.14), in: Capsule())
      }

      HStack {
        reminderPanel(
          icon: "bell.fill",
          title: "Latest Alert",
          content: entry.latestNotificationTitle.isEmpty ? "No recent alerts" : entry.latestNotificationTitle,
          footer: entry.unreadNotifications > 0 ? "\(entry.unreadNotifications) pending" : "All caught up"
        )
        reminderPanel(
          icon: "calendar",
          title: "Next Booking",
          content: entry.nextBookingStartAt == "—" ? "No booking scheduled" : entry.nextBookingStartAt,
          footer: entry.upcomingBookings > 0 ? "\(entry.upcomingBookings) upcoming" : "No upcoming meetings"
        )
      }

      reminderPanel(
        icon: "target",
        title: "Goal Focus",
        content: entry.highlightGoal.isEmpty ? "No active goal yet" : entry.highlightGoal,
        footer: "Streak \(entry.currentStreak)d • \(entry.totalMinutes)m tracked"
      )
    }
    .padding(12)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .background(widgetBackground)
  }

  private func reminderPanel(icon: String, title: String, content: String, footer: String) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack(spacing: 5) {
        Image(systemName: icon)
          .font(.system(size: 10, weight: .bold))
        Text(title)
          .font(.system(size: 10, weight: .bold, design: .rounded))
          .lineLimit(1)
      }
      .foregroundStyle(.white.opacity(0.82))

      Text(content)
        .font(.system(size: 13, weight: .semibold, design: .rounded))
        .lineLimit(2)
        .minimumScaleFactor(0.75)
        .foregroundStyle(.white.opacity(0.97))

      Text(footer)
        .font(.system(size: 10, weight: .medium, design: .rounded))
        .lineLimit(1)
        .minimumScaleFactor(0.72)
        .foregroundStyle(.white.opacity(0.75))
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 10)
    .padding(.vertical, 8)
    .background(.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
  }

}

private var widgetBackground: some View {
  LinearGradient(
    colors: [
      Color(red: 0.09, green: 0.14, blue: 0.32),
      Color(red: 0.11, green: 0.31, blue: 0.56),
      Color(red: 0.14, green: 0.53, blue: 0.66)
    ],
    startPoint: .topLeading,
    endPoint: .bottomTrailing
  )
}

// MARK: - Widget

struct SalehAbbaasWidget: Widget {
  let kind = "SalehAbbaasWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: AdminPanelWidgetProvider()) { entry in
      SalehAbbaasWidgetEntryView(entry: entry)
        .containerBackground(.clear, for: .widget)
    }
    .configurationDisplayName("Admin Dashboard")
    .description("Secure live admin summary for jobs, bookings, notifications, and goals.")
    .supportedFamilies([.systemSmall, .systemMedium])
    .contentMarginsDisabled()
  }
}
