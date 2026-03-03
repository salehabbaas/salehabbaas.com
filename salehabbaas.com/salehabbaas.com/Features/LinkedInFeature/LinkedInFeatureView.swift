import SwiftUI

struct LinkedInFeatureView: View {
  @Bindable var appState: AppState
  @State private var profileFieldCount = 0
  @State private var postsCount = 0
  @State private var errorText = ""

  var body: some View {
    SAPageContainer(title: "LinkedIn Studio") {
      Text("LinkedIn profile/posts, refine and publish via BFF endpoints.")

      if !errorText.isEmpty {
        Text(errorText)
          .foregroundStyle(.red)
          .font(.footnote)
      }

      HStack(spacing: 12) {
        StatCard(label: "Profile Fields", value: String(profileFieldCount))
        StatCard(label: "Posts", value: String(postsCount))
      }
    }
    .task {
      do {
        async let profile = appState.adminBFF.getObject(path: "api/admin/linkedin/profile")
        async let posts = appState.adminBFF.getObject(path: "api/admin/linkedin/posts")
        let (profileObject, postsObject) = try await (profile, posts)
        profileFieldCount = profileObject["config"]?.objectValue?.count ?? 0
        postsCount = postsObject["posts"]?.arrayValue?.count ?? 0
        errorText = ""
      } catch {
        errorText = "Unable to load LinkedIn Studio data: \(error.localizedDescription)"
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
