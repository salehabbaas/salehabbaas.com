import AppIntents
import SwiftUI

// MARK: - App Shortcuts Provider

struct SalehAbbaasShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: OpenBookingIntent(),
      phrases: [
        "Book a meeting with \(.applicationName)",
        "Schedule time with \(.applicationName)",
        "Set up a call via \(.applicationName)"
      ],
      shortTitle: "Book a Meeting",
      systemImageName: "calendar.badge.plus"
    )
    AppShortcut(
      intent: ShowContactIntent(),
      phrases: [
        "Contact \(.applicationName)",
        "Show contact info for \(.applicationName)",
        "How do I reach \(.applicationName)"
      ],
      shortTitle: "Contact Saleh",
      systemImageName: "envelope.fill"
    )
    AppShortcut(
      intent: DownloadResumeIntent(),
      phrases: [
        "Download resume from \(.applicationName)",
        "Get \(.applicationName) resume",
        "Share \(.applicationName) CV"
      ],
      shortTitle: "Download Resume",
      systemImageName: "doc.text.fill"
    )
    AppShortcut(
      intent: ShowGoalsIntent(),
      phrases: [
        "Show goals in \(.applicationName)",
        "What is \(.applicationName) working on",
        "Open milestones in \(.applicationName)"
      ],
      shortTitle: "View Goals",
      systemImageName: "target"
    )
  }
}

// MARK: - Open Booking Intent

struct OpenBookingIntent: AppIntent {
  static let title: LocalizedStringResource = "Book a Meeting"
  static let description = IntentDescription("Opens the meeting scheduler.")
  static let openAppWhenRun = true

  func perform() async throws -> some IntentResult {
    await MainActor.run {
      NotificationCenter.default.post(name: .shortcutOpenBooking, object: nil)
    }
    return .result()
  }
}

// MARK: - Show Contact Intent

struct ShowContactIntent: AppIntent {
  static let title: LocalizedStringResource = "Show Contact Info"
  static let description = IntentDescription("Opens the contact page.")
  static let openAppWhenRun = true

  func perform() async throws -> some IntentResult {
    await MainActor.run {
      NotificationCenter.default.post(name: .shortcutOpenContact, object: nil)
    }
    return .result()
  }
}

// MARK: - Download Resume Intent

struct DownloadResumeIntent: AppIntent {
  static let title: LocalizedStringResource = "Download Resume"
  static let description = IntentDescription("Opens the resume for download.")
  static let openAppWhenRun = true

  func perform() async throws -> some IntentResult {
    await MainActor.run {
      NotificationCenter.default.post(name: .shortcutOpenResume, object: nil)
    }
    return .result()
  }
}

// MARK: - Show Goals Intent

struct ShowGoalsIntent: AppIntent {
  static let title: LocalizedStringResource = "View Goals"
  static let description = IntentDescription("Opens the goals feed.")
  static let openAppWhenRun = true

  func perform() async throws -> some IntentResult {
    await MainActor.run {
      NotificationCenter.default.post(name: .shortcutOpenGoals, object: nil)
    }
    return .result()
  }
}

// MARK: - Notification Names

extension Notification.Name {
  static let shortcutOpenBooking = Notification.Name("shortcutOpenBooking")
  static let shortcutOpenContact = Notification.Name("shortcutOpenContact")
  static let shortcutOpenResume = Notification.Name("shortcutOpenResume")
  static let shortcutOpenGoals = Notification.Name("shortcutOpenGoals")
}
