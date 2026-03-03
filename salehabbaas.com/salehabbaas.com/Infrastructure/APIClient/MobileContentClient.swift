import Foundation

struct PublicProfileDTO: Codable {
  let name: String
  let headline: String
  let bio: String
  let location: String?
  let email: String?
}

struct PublicProjectDTO: Codable, Identifiable {
  let id: String
  let slug: String
  let title: String
  let description: String
  let status: String
}

struct PublicBlogDTO: Codable, Identifiable {
  let id: String
  let slug: String
  let title: String
  let excerpt: String
  let publishedAt: String?
}

struct PublicCreatorNewsDTO: Codable, Identifiable {
  let id: String
  let contentTitle: String
  let platform: String
  let slug: String
  let publishedAt: String?
}

struct PublicSnapshotDTO: Codable {
  let apiVersion: String
  let profile: PublicProfileDTO
  let projects: [PublicProjectDTO]
  let blogPosts: [PublicBlogDTO]
  let aiNews: [PublicCreatorNewsDTO]
}

struct CMSAdminSnapshotDTO: Codable {
  let apiVersion: String
  let profile: PublicProfileDTO
  let projects: [PublicProjectDTO]
  let blogPosts: [PublicBlogDTO]
}

struct CreatorContentItemDTO: Codable, Identifiable {
  let id: String
  let title: String
  let pillar: String
  let type: String
  let status: String
}

struct CreatorVariantDTO: Codable, Identifiable {
  let id: String
  let contentTitle: String
  let platform: String
  let visibility: String
  let slug: String
  let publishedAt: String?
}

struct CreatorAdminSnapshotDTO: Codable {
  let apiVersion: String
  let contentItems: [CreatorContentItemDTO]
  let variants: [CreatorVariantDTO]
}

struct ResumeAdminDocDTO: Codable, Identifiable {
  let id: String
  let title: String
  let type: String
  let updatedAt: String?
}

struct ResumeAdminSnapshotDTO: Codable {
  let apiVersion: String
  let documents: [ResumeAdminDocDTO]
}

struct JobsAdminJobDTO: Codable, Identifiable {
  let id: String
  let company: String
  let title: String
  let status: String
  let updatedAt: String?
}

struct JobsAdminSnapshotDTO: Codable {
  let apiVersion: String
  let jobs: [JobsAdminJobDTO]
}

struct BookingAdminDTO: Codable, Identifiable {
  let id: String
  let name: String
  let meetingTypeLabel: String
  let startAt: String
  let status: String
}

struct BookingsAdminSnapshotDTO: Codable {
  let apiVersion: String
  let bookings: [BookingAdminDTO]
}

struct MobileContentClient {
  let baseURL: URL
  let authStore: AuthStore

  init(baseURL: URL? = nil, authStore: AuthStore) {
    if let baseURL {
      self.baseURL = baseURL
    } else if
      let configured = Bundle.main.object(forInfoDictionaryKey: "MOBILE_API_BASE_URL") as? String,
      let url = URL(string: configured),
      !configured.isEmpty
    {
      self.baseURL = url
    } else {
      #if DEBUG
      self.baseURL = URL(string: "http://127.0.0.1:3000")!
      #else
      self.baseURL = URL(string: "https://salehabbaas.com")!
      #endif
    }
    self.authStore = authStore
  }

  func fetchPublicSnapshot() async throws -> PublicSnapshotDTO {
    try await send(path: "api/mobile/public", method: "GET", requiresAuth: false)
  }

  func fetchCMSSnapshot() async throws -> CMSAdminSnapshotDTO {
    try await send(path: "api/mobile/admin/cms", method: "GET", requiresAuth: true)
  }

  func fetchCreatorSnapshot() async throws -> CreatorAdminSnapshotDTO {
    try await send(path: "api/mobile/admin/creator", method: "GET", requiresAuth: true)
  }

  func fetchResumeSnapshot() async throws -> ResumeAdminSnapshotDTO {
    try await send(path: "api/mobile/admin/resume", method: "GET", requiresAuth: true)
  }

  func fetchJobsSnapshot() async throws -> JobsAdminSnapshotDTO {
    try await send(path: "api/mobile/admin/jobs", method: "GET", requiresAuth: true)
  }

  func fetchBookingsSnapshot() async throws -> BookingsAdminSnapshotDTO {
    try await send(path: "api/mobile/admin/bookings", method: "GET", requiresAuth: true)
  }

  private func send<T: Decodable>(path: String, method: String, requiresAuth: Bool) async throws -> T {
    var request = URLRequest(url: baseURL.appendingPathComponent(path))
    request.httpMethod = method
    request.setValue("application/json", forHTTPHeaderField: "Accept")

    if requiresAuth {
      let token = await authStore.idToken()
      guard !token.isEmpty else { throw URLError(.userAuthenticationRequired) }
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
      throw URLError(.badServerResponse)
    }

    return try JSONDecoder().decode(T.self, from: data)
  }
}
