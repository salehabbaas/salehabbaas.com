import SwiftUI

struct SettingsFeatureView: View {
  @Bindable var appState: AppState

  @State private var healthSummaryFieldCount = 0
  @State private var errorText = ""

  var body: some View {
    SAPageContainer(title: "Settings") {
      Text("Access, integrations, reminders, visibility, and health.")

      if !errorText.isEmpty {
        Text(errorText)
          .foregroundStyle(.red)
          .font(.footnote)
      }

      HStack {
        StatCard(label: "Health Summary", value: String(healthSummaryFieldCount))
      }
    }
    .task {
      do {
        let summary = try await appState.adminBFF.fetchAdminSummary(path: "api/admin/settings/health")
        healthSummaryFieldCount = summary.raw.count
        errorText = ""
      } catch {
        errorText = "Unable to load settings health: \(error.localizedDescription)"
      }
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
