import Foundation

// MARK: - Public Content Response

struct MobilePublicResponse: Codable {
  let apiVersion: String?
  let profile: APIProfile?
  let experiences: [APIExperience]?
  let projects: [APIProject]?
  let services: [APIService]?
  let certificates: [APICertificate]?
  let blogPosts: [APIBlogPost]?
  let socialLinks: [APISocialLink]?
  let aiNews: [APIAINewsItem]?
  let goals: [APIPublicGoal]?
  let bookingEnabled: Bool?
  let bookingMeetingTypes: [APIMeetingType]?
}

struct APIProfile: Codable {
  let name: String?
  let headline: String?
  let bio: String?
  let location: String?
  let email: String?
  let resumeUrl: String?
  let avatarUrl: String?
}

struct APIExperience: Codable, Identifiable {
  let id: String
  let company: String?
  let role: String?
  let startDate: String?
  let endDate: String?
  let summary: String?
  let achievements: [String]?
  let sortOrder: Int?
  let status: String?
}

struct APIProject: Codable, Identifiable {
  let id: String
  let slug: String?
  let title: String?
  let description: String?
  let longDescription: String?
  let tags: [String]?
  let coverImage: String?
  let projectUrl: String?
  let status: String?
  let sortOrder: Int?
}

struct APIService: Codable, Identifiable {
  let id: String
  let title: String?
  let detail: String?
  let sortOrder: Int?
}

struct APICertificate: Codable, Identifiable {
  let id: String
  let title: String?
  let issuer: String?
  let year: String?
  let credentialUrl: String?
  let imageUrl: String?
  let sortOrder: Int?
}

struct APISocialLink: Codable, Identifiable {
  let id: String
  let label: String?
  let url: String?
  let sortOrder: Int?
}

struct APIBlogPost: Codable, Identifiable {
  let id: String
  let slug: String?
  let title: String?
  let excerpt: String?
  let body: String?
  let tags: [String]?
  let coverImage: String?
  let status: String?
  let publishedAt: String?
}

struct APIAINewsItem: Codable, Identifiable {
  var id: String { slug ?? UUID().uuidString }
  let slug: String?
  let title: String?
  let excerpt: String?
  let platform: String?
  let visibility: String?
  let publishedAt: String?
}

struct APIPublicGoal: Codable, Identifiable {
  let id: String
  let title: String?
  let notes: String?
  let status: String?
  let tags: [String]?
  let color: String?
  let priority: String?
  let plannedDate: String?
  let completedAt: String?
  let learning: APIGoalLearning?
}

struct APIGoalLearning: Codable {
  let learningArea: String?
  let learningOutcome: String?
  let difficulty: String?
  let studyType: String?
  let resourceLink: String?
  let timeBoxMinutes: Int?
}

// MARK: - Booking

struct BookingAvailabilityResponse: Codable {
  let enabled: Bool?
  let timezone: String?
  let meetingTypes: [APIMeetingType]?
  let days: [APIAvailabilityDay]?
}

struct APIMeetingType: Codable, Identifiable {
  let id: String
  let label: String
  let durationMinutes: Int
}

struct APIAvailabilityDay: Codable, Identifiable {
  var id: String { date }
  let date: String
  let slots: [String]
}

struct CreateBookingRequest: Codable {
  let name: String
  let email: String
  let reason: String
  let timezone: String
  let meetingTypeId: String
  let startAt: String
  let source: String
}

struct CreateBookingResponse: Codable {
  let success: Bool?
  let bookingId: String?
  let error: String?
}

// MARK: - Contact Form

struct ContactFormRequest: Codable {
  let name: String
  let email: String
  let subject: String
  let message: String
}

struct ContactFormResponse: Codable {
  let success: Bool?
  let error: String?
}

// MARK: - Goals

struct PublicGoalsResponse: Codable {
  let goals: [APIPublicGoal]?
  let stats: APIGoalStats?
}

struct APIGoalStats: Codable {
  let currentStreak: Int?
  let longestStreak: Int?
  let totalCompleted: Int?
  let totalMinutes: Int?
}

// MARK: - Push Notifications

struct PushTokenRequest: Codable {
  let token: String
  let platform: String
  let bundleId: String
}

struct PushTokenResponse: Codable {
  let success: Bool?
}

// MARK: - Firebase Auth

struct FirebaseSignInRequest: Codable {
  let email: String
  let password: String
  let returnSecureToken: Bool
}

struct FirebaseAuthResponse: Codable {
  let idToken: String
  let refreshToken: String
  let expiresIn: String
  let localId: String
  let email: String
  let displayName: String?
}

struct FirebaseRefreshResponse: Codable {
  let id_token: String
  let refresh_token: String
  let expires_in: String
  let user_id: String
}

struct FirebaseAuthErrorWrapper: Codable {
  let error: FirebaseAuthError
}

struct FirebaseAuthError: Codable {
  let message: String
  let code: Int?
}

// MARK: - Admin Responses

struct AdminJobsResponse: Codable {
  let apiVersion: String?
  let jobs: [AdminJob]?
  let companies: [AdminCompany]?
  let links: [AdminResumeLink]?
}

struct AdminJob: Codable, Identifiable {
  let id: String
  let title: String?
  let company: String?
  let companyId: String?
  let status: String?
  let source: String?
  let location: String?
  let appliedAt: String?
  let followUpAt: String?
  let salary: String?
  let notes: String?
  let url: String?
  let response: String?
  let createdAt: String?
  let updatedAt: String?
}

struct AdminCompany: Codable, Identifiable {
  let id: String
  let name: String?
  let category: String?
  let website: String?
  let notes: String?
}

struct AdminResumeLink: Codable, Identifiable {
  var id: String { jobId + (resumeId ?? "") }
  let jobId: String
  let resumeId: String?
  let resumeTitle: String?
}

struct AdminBookingsResponse: Codable {
  let apiVersion: String?
  let settings: APIBookingSettings?
  let bookings: [AdminBooking]?
  let blockedSlots: [APIBlockedSlot]?
}

struct APIBookingSettings: Codable {
  let enabled: Bool?
  let timezone: String?
  let slotDurationMinutes: Int?
  let maxDaysAhead: Int?
  let workDays: [Int]?
  let dayStartHour: Int?
  let dayEndHour: Int?
  let meetingTypes: [APIMeetingType]?
}

struct AdminBooking: Codable, Identifiable {
  let id: String
  let name: String?
  let email: String?
  let reason: String?
  let timezone: String?
  let meetingTypeId: String?
  let meetingTypeLabel: String?
  let startAt: String?
  let endAt: String?
  let status: String?
  let createdAt: String?
}

struct APIBlockedSlot: Codable, Identifiable {
  let id: String
  let startAt: String?
  let endAt: String?
  let reason: String?
}

struct AdminCMSResponse: Codable {
  let apiVersion: String?
  let profile: APIProfile?
  let experiences: [APIExperience]?
  let projects: [APIProject]?
  let services: [APIService]?
  let certificates: [APICertificate]?
  let blogPosts: [APIBlogPost]?
  let socialLinks: [APISocialLink]?
}

struct AdminNotificationsResponse: Codable {
  let apiVersion: String?
  let notifications: [AdminNotification]?
  let unreadCount: Int?
}

struct AdminNotification: Codable, Identifiable {
  let id: String
  let module: String?
  let title: String?
  let body: String?
  let priority: String?
  let state: String?
  let ctaUrl: String?
  let createdAt: String?
}

struct NotificationActionRequest: Codable {
  let action: String
  let notificationId: String
}

struct GenericResponse: Codable {
  let success: Bool?
}
