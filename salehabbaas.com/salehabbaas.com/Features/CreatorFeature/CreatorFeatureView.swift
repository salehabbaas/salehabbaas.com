import SwiftUI

struct CreatorFeatureView: View {
  @Bindable var appState: AppState
  @State private var snapshot: CreatorAdminSnapshotDTO?
  @State private var errorText = ""

  var body: some View {
    SAPageContainer(title: "Creator") {
      Text("Creator workflows backed by Firestore collections.")

      if !errorText.isEmpty {
        Text(errorText)
          .foregroundStyle(.red)
          .font(.footnote)
      }

      if let snapshot {
        HStack(spacing: 12) {
          StatCard(label: "Content Items", value: String(snapshot.contentItems.count))
          StatCard(label: "Variants", value: String(snapshot.variants.count))
        }

        ForEach(snapshot.variants.prefix(10)) { variant in
          VStack(alignment: .leading, spacing: 4) {
            Text(variant.contentTitle).font(.headline)
            Text("\(variant.platform.uppercased()) • \(variant.visibility)")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
          .padding(12)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(SATheme.cardBackground)
          .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
      } else {
        ProgressView("Loading Creator data...")
      }
    }
    .task {
      await load()
    }
  }

  private func load() async {
    do {
      snapshot = try await appState.mobileContent.fetchCreatorSnapshot()
      errorText = ""
    } catch {
      errorText = "Unable to load creator data: \(error.localizedDescription)"
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
