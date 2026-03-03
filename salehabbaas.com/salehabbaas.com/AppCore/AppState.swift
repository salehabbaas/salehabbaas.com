import Foundation
import Observation

@MainActor
@Observable
final class AppState {
  var showAdmin = true
  var selectedPublicRoute: PublicRoute = .home
  var selectedAdminModule: AdminModule = .dashboard

  let authStore: AuthStore
  let firestore: FirestoreDataClient
  let adminBFF: AdminBFFClient
  let mobileContent: MobileContentClient
  private var lastRegisteredPushToken = ""

  init() {
    let authStore = AuthStore()
    self.authStore = authStore
    firestore = FirestoreDataClient(authStore: authStore)
    adminBFF = AdminBFFClient(authStore: authStore)
    mobileContent = MobileContentClient(authStore: authStore)
  }

  var isAuthenticated: Bool {
    authStore.isAuthenticated
  }

  func signOut() async {
    await authStore.signOut()
  }

  func registerPushTokenIfNeeded(_ token: String) async {
    guard isAuthenticated else { return }
    guard !token.isEmpty, token != lastRegisteredPushToken else { return }
    do {
      try await adminBFF.registerPushToken(token)
      lastRegisteredPushToken = token
    } catch {
      // Keep retry path simple by leaving the token unregistered.
    }
  }
}

enum PublicRoute: String, CaseIterable, Hashable, Identifiable {
  case home
  case about
  case experience
  case projects
  case services
  case certificates
  case blog
  case creator
  case contact
  case bookMeeting
  case aiNews
  case publicStatement

  var id: String { rawValue }

  var title: String {
    switch self {
    case .home: return "Home"
    case .about: return "About"
    case .experience: return "Experience"
    case .projects: return "Projects"
    case .services: return "Services"
    case .certificates: return "Certificates"
    case .blog: return "Blog"
    case .creator: return "Creator"
    case .contact: return "Contact"
    case .bookMeeting: return "Book Meeting"
    case .aiNews: return "AI News"
    case .publicStatement: return "Public Statement"
    }
  }
}

enum AdminModule: String, CaseIterable, Hashable, Identifiable {
  case dashboard
  case cms
  case creator
  case linkedin
  case projects
  case resume
  case jobs
  case bookings
  case settings
  case agent
  case notifications

  var id: String { rawValue }

  var title: String {
    switch self {
    case .dashboard: return "Dashboard"
    case .cms: return "CMS"
    case .creator: return "Creator"
    case .linkedin: return "LinkedIn"
    case .projects: return "Projects"
    case .resume: return "Resume Studio"
    case .jobs: return "Jobs"
    case .bookings: return "Bookings"
    case .settings: return "Settings"
    case .agent: return "Agent"
    case .notifications: return "Notifications"
    }
  }
}
