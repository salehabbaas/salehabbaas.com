import SwiftUI

struct ResumeStudioFeatureView: View {
  @Bindable var appState: AppState
  @State private var snapshot: ResumeAdminSnapshotDTO?
  @State private var errorText = ""

  var body: some View {
    SAPageContainer(title: "Resume Studio") {
      Text("Document editor, ATS, improve, templates, imports, and exports.")

      if !errorText.isEmpty {
        Text(errorText)
          .foregroundStyle(.red)
          .font(.footnote)
      }

      if let snapshot {
        HStack(spacing: 12) {
          StatCard(label: "Documents", value: String(snapshot.documents.count))
        }

        ForEach(snapshot.documents.prefix(12)) { doc in
          VStack(alignment: .leading, spacing: 4) {
            Text(doc.title).font(.headline)
            Text(doc.type).font(.caption).foregroundStyle(.secondary)
          }
          .padding(12)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(SATheme.cardBackground)
          .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
      } else {
        ProgressView("Loading Resume Studio...")
      }
    }
    .task {
      await load()
    }
  }

  private func load() async {
    do {
      snapshot = try await appState.mobileContent.fetchResumeSnapshot()
      errorText = ""
    } catch {
      errorText = "Unable to load resume data: \(error.localizedDescription)"
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
