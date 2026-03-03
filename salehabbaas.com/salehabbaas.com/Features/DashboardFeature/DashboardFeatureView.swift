import SwiftUI

struct DashboardFeatureView: View {
  @Bindable var appState: AppState

  @State private var controlCenterSummaryCount = 0
  @State private var systemInboxSummaryCount = 0
  @State private var systemsSummaryCount = 0
  @State private var logsSummaryCount = 0
  @State private var errorText = ""

  var body: some View {
    SAPageContainer(title: "Dashboard") {
      Text("Control Center, Systems Dashboard, Logs, and System Inbox backed by admin BFF.")

      if !errorText.isEmpty {
        Text(errorText)
          .foregroundStyle(.red)
          .font(.footnote)
      }

      HStack(spacing: 12) {
        StatCard(label: "Control", value: String(controlCenterSummaryCount))
        StatCard(label: "Inbox", value: String(systemInboxSummaryCount))
      }

      HStack(spacing: 12) {
        StatCard(label: "Systems", value: String(systemsSummaryCount))
        StatCard(label: "Logs", value: String(logsSummaryCount))
      }
    }
    .task {
      await refresh()
    }
  }

  private func refresh() async {
    do {
      async let control = appState.adminBFF.fetchAdminSummary(path: "api/admin/control-center")
      async let inbox = appState.adminBFF.fetchAdminSummary(path: "api/admin/system-inbox")
      async let systems = appState.adminBFF.fetchAdminSummary(path: "api/admin/systems-dashboard")
      async let logs = appState.adminBFF.fetchAdminSummary(path: "api/admin/logs")

      let (controlValue, inboxValue, systemsValue, logsValue) = try await (control, inbox, systems, logs)
      controlCenterSummaryCount = controlValue.raw.count
      systemInboxSummaryCount = inboxValue.raw.count
      systemsSummaryCount = systemsValue.raw.count
      logsSummaryCount = logsValue.raw.count
      errorText = ""
    } catch {
      errorText = "Unable to load dashboard summaries: \(error.localizedDescription)"
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
