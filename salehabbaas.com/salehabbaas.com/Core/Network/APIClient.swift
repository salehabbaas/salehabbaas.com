import Foundation

enum APIError: LocalizedError {
  case invalidURL
  case invalidResponse
  case httpError(statusCode: Int, message: String)
  case decodingError(Error)
  case networkError(Error)

  var errorDescription: String? {
    switch self {
    case .invalidURL: return "Invalid URL"
    case .invalidResponse: return "Invalid response"
    case .httpError(let code, let msg): return "HTTP \(code): \(msg)"
    case .decodingError(let err): return "Decoding: \(err.localizedDescription)"
    case .networkError(let err): return err.localizedDescription
    }
  }
}

@Observable
final class APIClient {
  static let shared = APIClient()

  private let baseURL = "https://salehabbaas.com"
  private let session: URLSession
  private let decoder: JSONDecoder

  var authToken: String?

  private init() {
    let config = URLSessionConfiguration.default
    config.timeoutIntervalForRequest = 30
    config.timeoutIntervalForResource = 60
    session = URLSession(configuration: config)

    decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .custom { decoder in
      let container = try decoder.singleValueContainer()
      let str = try container.decode(String.self)
      if let date = ISO8601DateFormatter().date(from: str) { return date }
      let formatter = DateFormatter()
      formatter.locale = Locale(identifier: "en_US_POSIX")
      for fmt in ["yyyy-MM-dd'T'HH:mm:ss.SSSZ", "yyyy-MM-dd'T'HH:mm:ssZ", "yyyy-MM-dd"] {
        formatter.dateFormat = fmt
        if let date = formatter.date(from: str) { return date }
      }
      throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode date: \(str)")
    }
  }

  // MARK: - Public Content

  func fetchPublicContent() async throws -> MobilePublicResponse {
    try await get("/api/mobile/public")
  }

  func fetchBookingAvailability() async throws -> BookingAvailabilityResponse {
    try await get("/api/mobile/bookings/availability")
  }

  func submitContactForm(_ form: ContactFormRequest) async throws -> ContactFormResponse {
    try await post("/api/contact", body: form)
  }

  func createBooking(_ booking: CreateBookingRequest) async throws -> CreateBookingResponse {
    try await post("/api/mobile/bookings", body: booking)
  }

  func fetchAdminGoals() async throws -> PublicGoalsResponse {
    try await authenticatedGet("/api/mobile/goals")
  }

  // MARK: - Push Notifications

  func registerPushToken(_ request: PushTokenRequest) async throws -> PushTokenResponse {
    try await post("/api/mobile/notifications/register", body: request)
  }

  // MARK: - Admin

  func fetchAdminJobs() async throws -> AdminJobsResponse {
    try await authenticatedGet("/api/mobile/admin/jobs")
  }

  func fetchAdminBookings() async throws -> AdminBookingsResponse {
    try await authenticatedGet("/api/mobile/admin/bookings")
  }

  func fetchAdminCMS() async throws -> AdminCMSResponse {
    try await authenticatedGet("/api/mobile/admin/cms")
  }

  func fetchAdminNotifications() async throws -> AdminNotificationsResponse {
    try await authenticatedGet("/api/mobile/admin/notifications")
  }

  func markNotificationRead(id: String) async throws {
    let _: GenericResponse = try await authenticatedPost(
      "/api/mobile/admin/notifications",
      body: NotificationActionRequest(action: "read", notificationId: id)
    )
  }

  // MARK: - Firebase Auth REST API

  func signInWithEmail(email: String, password: String) async throws -> FirebaseAuthResponse {
    let url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyA20Q1oeF4KOML0WpRP7nh48r7biTeOHOk"
    let body = FirebaseSignInRequest(email: email, password: password, returnSecureToken: true)

    var request = URLRequest(url: URL(string: url)!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(body)

    let (data, response) = try await session.data(for: request)
    guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }

    if http.statusCode != 200 {
      let errorMsg = (try? JSONDecoder().decode(FirebaseAuthErrorWrapper.self, from: data))?.error.message ?? "Auth failed"
      throw APIError.httpError(statusCode: http.statusCode, message: errorMsg)
    }

    return try JSONDecoder().decode(FirebaseAuthResponse.self, from: data)
  }

  func refreshToken(_ refreshToken: String) async throws -> FirebaseRefreshResponse {
    let url = "https://securetoken.googleapis.com/v1/token?key=AIzaSyA20Q1oeF4KOML0WpRP7nh48r7biTeOHOk"
    let bodyString = "grant_type=refresh_token&refresh_token=\(refreshToken)"

    var request = URLRequest(url: URL(string: url)!)
    request.httpMethod = "POST"
    request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
    request.httpBody = bodyString.data(using: .utf8)

    let (data, response) = try await session.data(for: request)
    guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
      throw APIError.httpError(statusCode: (response as? HTTPURLResponse)?.statusCode ?? 0, message: "Token refresh failed")
    }

    return try JSONDecoder().decode(FirebaseRefreshResponse.self, from: data)
  }

  // MARK: - Private Helpers

  private func get<T: Decodable>(_ path: String) async throws -> T {
    let url = URL(string: baseURL + path)!
    var request = URLRequest(url: url)
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    return try await execute(request)
  }

  private func post<B: Encodable, T: Decodable>(_ path: String, body: B) async throws -> T {
    let url = URL(string: baseURL + path)!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(body)
    return try await execute(request)
  }

  private func authenticatedGet<T: Decodable>(_ path: String) async throws -> T {
    let url = URL(string: baseURL + path)!
    var request = URLRequest(url: url)
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    if let token = authToken {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }
    return try await execute(request)
  }

  private func authenticatedPost<B: Encodable, T: Decodable>(_ path: String, body: B) async throws -> T {
    let url = URL(string: baseURL + path)!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    if let token = authToken {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }
    request.httpBody = try JSONEncoder().encode(body)
    return try await execute(request)
  }

  private func execute<T: Decodable>(_ request: URLRequest) async throws -> T {
    do {
      let (data, response) = try await session.data(for: request)
      guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }

      guard (200...299).contains(http.statusCode) else {
        let message = (try? JSONDecoder().decode(ErrorResponse.self, from: data))?.error ?? "Request failed"
        throw APIError.httpError(statusCode: http.statusCode, message: message)
      }

      do {
        return try decoder.decode(T.self, from: data)
      } catch {
        throw APIError.decodingError(error)
      }
    } catch let error as APIError {
      throw error
    } catch {
      throw APIError.networkError(error)
    }
  }
}

private struct ErrorResponse: Decodable {
  let error: String
}
