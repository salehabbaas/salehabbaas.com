import SwiftUI

struct ProjectsFeatureView: View {
  @Bindable var appState: AppState

  @State private var summaryCount = 0
  @State private var errorText = ""

  var body: some View {
    SAPageContainer(title: "Projects") {
      Text("Project dashboard, board, tasks, reorder, activity, and project settings.")

      if !errorText.isEmpty {
        Text(errorText)
          .foregroundStyle(.red)
          .font(.footnote)
      }

      HStack {
        StatCard(label: "Summary Fields", value: String(summaryCount))
      }
    }
    .task {
      do {
        let summary = try await appState.adminBFF.fetchAdminSummary(path: "api/admin/projects")
        summaryCount = summary.raw.count
        errorText = ""
      } catch {
        errorText = "Unable to load projects summary: \(error.localizedDescription)"
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
