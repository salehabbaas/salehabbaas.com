import SwiftUI

struct JobsFeatureView: View {
  @Bindable var appState: AppState
  @State private var snapshot: JobsAdminSnapshotDTO?
  @State private var errorText = ""

  var body: some View {
    SAPageContainer(title: "Jobs") {
      Text("Job tracker, company detail, imports, and resume links.")

      if !errorText.isEmpty {
        Text(errorText)
          .foregroundStyle(.red)
          .font(.footnote)
      }

      if let snapshot {
        HStack(spacing: 12) {
          StatCard(label: "Jobs", value: String(snapshot.jobs.count))
          StatCard(
            label: "Interviewing",
            value: String(snapshot.jobs.filter { $0.status == "interviewing" }.count)
          )
        }

        ForEach(snapshot.jobs.prefix(14)) { job in
          VStack(alignment: .leading, spacing: 4) {
            Text(job.title).font(.headline)
            Text("\(job.company) • \(job.status)").font(.caption).foregroundStyle(.secondary)
          }
          .padding(12)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(SATheme.cardBackground)
          .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
      } else {
        ProgressView("Loading jobs...")
      }
    }
    .task {
      await load()
    }
  }

  private func load() async {
    do {
      snapshot = try await appState.mobileContent.fetchJobsSnapshot()
      errorText = ""
    } catch {
      errorText = "Unable to load jobs data: \(error.localizedDescription)"
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
