import SwiftUI

struct PublicFeatureView: View {
  let route: PublicRoute
  @Bindable var appState: AppState

  @State private var snapshot: PublicSnapshotDTO?
  @State private var errorText = ""

  var body: some View {
    SAPageContainer(title: route.title) {
      if !errorText.isEmpty {
        Text(errorText)
          .foregroundStyle(.red)
          .font(.footnote)

        Button("Retry") {
          Task { await load() }
        }
        .buttonStyle(.bordered)
      }

      if let snapshot {
        Text(snapshot.profile.headline)
          .foregroundStyle(.secondary)
        routeContent(snapshot: snapshot)
      } else {
        Text("No content loaded yet.")
          .foregroundStyle(.secondary)
      }
    }
    .task {
      await load()
    }
  }

  @ViewBuilder
  private func routeContent(snapshot: PublicSnapshotDTO) -> some View {
    switch route {
    case .home, .about, .publicStatement:
      Text(snapshot.profile.bio)
        .font(.body)
      HStack(spacing: 12) {
        StatCard(label: "Projects", value: String(snapshot.projects.count))
        StatCard(label: "Blog", value: String(snapshot.blogPosts.count))
        StatCard(label: "AI News", value: String(snapshot.aiNews.count))
      }
    case .projects:
      ForEach(snapshot.projects.prefix(10)) { project in
        VStack(alignment: .leading, spacing: 6) {
          Text(project.title).font(.headline)
          Text(project.description).font(.subheadline).foregroundStyle(.secondary)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SATheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
      }
    case .blog:
      ForEach(snapshot.blogPosts.prefix(10)) { post in
        VStack(alignment: .leading, spacing: 6) {
          Text(post.title).font(.headline)
          Text(post.excerpt).font(.subheadline).foregroundStyle(.secondary)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SATheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
      }
    case .aiNews, .creator:
      ForEach(snapshot.aiNews.prefix(12)) { item in
        VStack(alignment: .leading, spacing: 4) {
          Text(item.contentTitle).font(.headline)
          Text("\(item.platform.uppercased()) • \(item.slug)").font(.caption).foregroundStyle(.secondary)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SATheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
      }
    case .experience, .services, .certificates, .contact, .bookMeeting:
      Text("This public page is now connected to live website content APIs and will be expanded to full parity UI.")
        .foregroundStyle(.secondary)
    }
  }

  private func load() async {
    do {
      snapshot = try await appState.mobileContent.fetchPublicSnapshot()
      errorText = ""
    } catch {
      errorText = "Unable to load public content from API (\(error.localizedDescription)). Falling back to Firestore."
      snapshot = await loadFallbackSnapshot()
      if snapshot == nil {
        errorText = "Unable to load public content from API and Firestore."
      }
    }
  }

  private func loadFallbackSnapshot() async -> PublicSnapshotDTO? {
    let profile = await appState.firestore.fetchPublicProfile()
    let projects = await appState.firestore.fetchPublicProjects()
    let blogPosts = await appState.firestore.fetchPublicBlogPosts()
    let aiNews = await appState.firestore.fetchPublicAINews()

    if profile.headline.isEmpty && projects.isEmpty && blogPosts.isEmpty && aiNews.isEmpty {
      return nil
    }

    return PublicSnapshotDTO(
      apiVersion: "fallback-firestore",
      profile: profile,
      projects: projects,
      blogPosts: blogPosts,
      aiNews: aiNews
    )
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
