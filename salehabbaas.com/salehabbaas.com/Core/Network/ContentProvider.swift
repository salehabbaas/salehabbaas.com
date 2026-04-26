import Foundation
import WidgetKit

@Observable
final class ContentProvider {
  static let shared = ContentProvider()

  private(set) var document: PortfolioDocument = .saleh
  private(set) var blogPosts: [APIBlogPost] = []
  private(set) var projects: [APIProject] = []
  private(set) var publicGoals: [APIPublicGoal] = []
  private(set) var goalStats: APIGoalStats?
  private(set) var bookingAvailability: BookingAvailabilityResponse?
  private(set) var isLoading = false
  private(set) var lastError: String?
  private(set) var isOffline = false
  private(set) var lastRefresh: Date?

  private let cache = CacheManager.shared

  private init() {}

  @MainActor
  func loadAll() async {
    isLoading = true
    lastError = nil
    publicGoals = []
    goalStats = nil

    // Try loading from cache first for instant display
    await loadFromCache()

    // Then fetch fresh data from API
    await withTaskGroup(of: Void.self) { group in
      group.addTask { await self.fetchPublicContent() }
      group.addTask { await self.fetchBookingAvailability() }
    }

    isLoading = false
    lastRefresh = Date()
    syncWidgetData()
  }

  // MARK: - Widget Data Sync

  private func syncWidgetData() {
    let defaults = UserDefaults(suiteName: "group.com.salehabbaas.widget")
    let latestGoal = publicGoals.first(where: { $0.status == "today" || $0.status == "this_week" })?.title
      ?? publicGoals.first?.title
      ?? "Building scalable full-stack platforms"
    defaults?.set(latestGoal, forKey: "widget.latestGoal")
    defaults?.set(goalStats?.totalCompleted ?? 0, forKey: "widget.totalCompleted")
    defaults?.set(goalStats?.currentStreak ?? 0, forKey: "widget.currentStreak")
    defaults?.set(blogPosts.first?.title ?? "", forKey: "widget.latestBlogTitle")
    defaults?.set(true, forKey: "widget.availableForWork")
    WidgetCenter.shared.reloadAllTimelines()
  }

  @MainActor
  func refresh() async {
    await loadAll()
  }

  @MainActor
  func clearAdminGoals() {
    publicGoals = []
    goalStats = nil
  }

  // MARK: - Public Content

  @MainActor
  private func fetchPublicContent() async {
    do {
      let response = try await APIClient.shared.fetchPublicContent()
      applyPublicResponse(response)
      await cache.save(response, forKey: CacheKey.publicContent)
      isOffline = false
    } catch {
      lastError = error.localizedDescription
      isOffline = true
    }
  }

  @MainActor
  private func fetchBookingAvailability() async {
    do {
      let response = try await APIClient.shared.fetchBookingAvailability()
      bookingAvailability = response
      await cache.save(response, forKey: CacheKey.bookingAvailability)
    } catch {
      // Use cached version
    }
  }

  @MainActor
  func loadAdminGoals() async {
    await fetchAdminGoals()
  }

  @MainActor
  private func fetchAdminGoals() async {
    do {
      let response = try await APIClient.shared.fetchAdminGoals()
      publicGoals = response.goals ?? []
      goalStats = response.stats
      await cache.save(response, forKey: CacheKey.publicGoals)
    } catch {
      if let cached: PublicGoalsResponse = await cache.loadEvenIfExpired(forKey: CacheKey.publicGoals, as: PublicGoalsResponse.self) {
        publicGoals = cached.goals ?? []
        goalStats = cached.stats
      }
    }
  }

  // MARK: - Cache Loading

  private func loadFromCache() async {
    if let cached: MobilePublicResponse = await cache.loadEvenIfExpired(forKey: CacheKey.publicContent, as: MobilePublicResponse.self) {
      await MainActor.run { applyPublicResponse(cached) }
    }
    if let cached: BookingAvailabilityResponse = await cache.loadEvenIfExpired(forKey: CacheKey.bookingAvailability, as: BookingAvailabilityResponse.self) {
      await MainActor.run { bookingAvailability = cached }
    }
  }

  // MARK: - Mapping API → PortfolioDocument

  @MainActor
  private func applyPublicResponse(_ response: MobilePublicResponse) {
    blogPosts = response.blogPosts ?? []
    projects = response.projects ?? []

    // Update profile from API if available
    if let profile = response.profile, let name = profile.name, !name.isEmpty {
      var hero = document.profile
      hero = HeroSection(
        name: profile.name ?? hero.name,
        headline: profile.headline ?? hero.headline,
        intro: profile.bio ?? hero.intro,
        location: profile.location ?? hero.location,
        badge: hero.badge,
        ctaTitle: hero.ctaTitle,
        ctaURL: hero.ctaURL,
        secondaryTitle: hero.secondaryTitle,
        secondaryURL: hero.secondaryURL,
        valueStatement: hero.valueStatement,
        stats: hero.stats
      )
      document = PortfolioDocument(
        profile: hero,
        about: document.about,
        skills: document.skills,
        experience: document.experience,
        focusAreas: document.focusAreas,
        contact: document.contact
      )
    }
  }
}
