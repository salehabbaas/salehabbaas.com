import SwiftUI

struct NotificationsFeatureView: View {
  @Bindable var appState: AppState
  @State private var unreadCount = 0

  var body: some View {
    SAPageContainer(title: "Notifications") {
      Text("In-app notification center and APNs/FCM wiring point.")

      HStack {
        StatCard(label: "Unread", value: String(unreadCount))
      }
    }
    .task {
      unreadCount = await appState.firestore.fetchNotificationCount()
    }
  }
}

private struct StatCard: View {
  let label: String
  let value: String

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(value)
        .font(.title2.bold())
      Text(label)
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .padding(12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(SATheme.cardBackground)
    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
  }
}
