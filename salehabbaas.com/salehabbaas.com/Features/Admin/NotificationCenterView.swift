import SwiftUI

struct NotificationCenterView: View {
  let colorMode: PortfolioColorMode

  @State private var notifications: [AdminNotification] = []
  @State private var isLoading = false
  @State private var unreadCount = 0

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack {
        VStack(alignment: .leading, spacing: 2) {
          Text("Notifications")
            .font(.headline.weight(.bold))
            .foregroundStyle(PortfolioTheme.ink(colorMode))
          if unreadCount > 0 {
            Text("\(unreadCount) unread")
              .font(.footnote.weight(.bold))
              .foregroundStyle(PortfolioTheme.accent(colorMode))
          }
        }
        Spacer()
        Button {
          Task { await loadNotifications() }
        } label: {
          Image(systemName: "arrow.clockwise")
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(PortfolioTheme.accent(colorMode))
        }
        .disabled(isLoading)
      }

      if isLoading && notifications.isEmpty {
        ProgressView()
          .frame(maxWidth: .infinity)
          .padding(.vertical, 30)
      } else if notifications.isEmpty {
        emptyState
      } else {
        ForEach(notifications) { notification in
          NotificationRow(
            notification: notification,
            colorMode: colorMode,
            onMarkRead: { await markRead(id: notification.id) }
          )
        }
      }
    }
    .task { await loadNotifications() }
  }

  private var emptyState: some View {
    VStack(spacing: 10) {
      Image(systemName: "bell.slash.fill")
        .font(.system(size: 28))
        .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
      Text("No notifications")
        .font(.subheadline.weight(.medium))
        .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 30)
  }

  @MainActor
  private func loadNotifications() async {
    isLoading = true
    do {
      await AdminAuthManager.shared.ensureValidToken()
      let response = try await APIClient.shared.fetchAdminNotifications()
      notifications = response.notifications ?? []
      unreadCount = response.unreadCount ?? 0
    } catch {
      print("[Notifications] \(error.localizedDescription)")
    }
    isLoading = false
  }

  @MainActor
  private func markRead(id: String) async {
    do {
      try await APIClient.shared.markNotificationRead(id: id)
      if let idx = notifications.firstIndex(where: { $0.id == id }) {
        notifications[idx] = AdminNotification(
          id: id,
          module: notifications[idx].module,
          title: notifications[idx].title,
          body: notifications[idx].body,
          priority: notifications[idx].priority,
          state: "read",
          ctaUrl: notifications[idx].ctaUrl,
          createdAt: notifications[idx].createdAt
        )
        unreadCount = max(0, unreadCount - 1)
      }
    } catch {
      print("[Notifications] markRead error: \(error.localizedDescription)")
    }
  }
}

// MARK: - Notification Row

private struct NotificationRow: View {
  let notification: AdminNotification
  let colorMode: PortfolioColorMode
  let onMarkRead: () async -> Void

  var body: some View {
    HStack(alignment: .top, spacing: 12) {
      Circle()
        .fill(priorityColor)
        .frame(width: 8, height: 8)
        .padding(.top, 6)

      VStack(alignment: .leading, spacing: 5) {
        HStack {
          Text(notification.title ?? "")
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(PortfolioTheme.ink(colorMode))
            .opacity(notification.state == "read" ? 0.6 : 1)
          Spacer()
          if let module = notification.module {
            Text(module.capitalized)
              .font(.caption2.weight(.bold))
              .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
              .padding(.horizontal, 7)
              .padding(.vertical, 3)
              .background(.ultraThinMaterial, in: Capsule())
          }
        }

        if let body = notification.body, !body.isEmpty {
          Text(body)
            .font(.footnote.weight(.medium))
            .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
            .lineSpacing(3)
        }

        HStack {
          if let dateStr = notification.createdAt {
            Text(formatDate(dateStr))
              .font(.caption2.weight(.bold))
              .foregroundStyle(PortfolioTheme.secondaryInk(colorMode).opacity(0.7))
          }
          Spacer()
          if notification.state != "read" {
            Button("Mark read") {
              Task { await onMarkRead() }
            }
            .font(.caption2.weight(.bold))
            .foregroundStyle(PortfolioTheme.accent(colorMode))
          }
        }
      }
    }
    .padding(14)
    .background(
      notification.state == "unread"
        ? PortfolioTheme.accent(colorMode).opacity(0.06)
        : Color.clear,
      in: RoundedRectangle(cornerRadius: 16, style: .continuous)
    )
    .overlay(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .strokeBorder(PortfolioTheme.border, lineWidth: 1)
    )
  }

  private var priorityColor: Color {
    switch notification.priority {
    case "critical": return .red
    case "high": return .orange
    case "medium": return PortfolioTheme.accent(colorMode)
    default: return PortfolioTheme.secondaryInk(colorMode)
    }
  }

  private func formatDate(_ str: String) -> String {
    let f = ISO8601DateFormatter()
    guard let d = f.date(from: str) else { return str }
    let rel = RelativeDateTimeFormatter()
    rel.unitsStyle = .abbreviated
    return rel.localizedString(for: d, relativeTo: Date())
  }
}
