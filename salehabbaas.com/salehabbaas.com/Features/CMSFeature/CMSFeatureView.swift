import SwiftUI

struct CMSFeatureView: View {
  @Bindable var appState: AppState

  @State private var snapshot: CMSAdminSnapshotDTO?
  @State private var errorText = ""

  var body: some View {
    SAPageContainer(title: "CMS") {
      Text("Profile, projects, blog, experience, services, certificates, social, and media.")

      if !errorText.isEmpty {
        Text(errorText)
          .foregroundStyle(.red)
          .font(.footnote)
      }

      if let snapshot {
        HStack(spacing: 12) {
          StatCard(label: "Profile", value: snapshot.profile.name.isEmpty ? "Missing" : "Ready")
          StatCard(label: "Projects", value: String(snapshot.projects.count))
          StatCard(label: "Blog", value: String(snapshot.blogPosts.count))
        }

        ForEach(snapshot.blogPosts.prefix(8)) { post in
          VStack(alignment: .leading, spacing: 4) {
            Text(post.title).font(.headline)
            Text(post.excerpt).font(.subheadline).foregroundStyle(.secondary)
          }
          .padding(12)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(SATheme.cardBackground)
          .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
      } else {
        ProgressView("Loading CMS...")
      }
    }
    .task {
      await load()
    }
  }

  private func load() async {
    do {
      snapshot = try await appState.mobileContent.fetchCMSSnapshot()
      errorText = ""
    } catch {
      errorText = "Unable to load CMS data: \(error.localizedDescription)"
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
