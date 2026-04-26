import Foundation

actor CacheManager {
  static let shared = CacheManager()

  private let cacheDirectory: URL
  private let maxAge: TimeInterval = 60 * 60 * 24 // 24 hours

  private init() {
    let paths = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)
    cacheDirectory = paths[0].appendingPathComponent("SalehAbbaasCache", isDirectory: true)
    try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
  }

  func save<T: Codable>(_ data: T, forKey key: String) {
    let url = fileURL(for: key)
    guard let payload = try? JSONEncoder().encode(data) else { return }

    let envelope: [String: Any] = [
      "timestamp": Date().timeIntervalSince1970,
      "payload": payload.base64EncodedString()
    ]

    guard let encoded = try? JSONSerialization.data(withJSONObject: envelope, options: []) else { return }
    try? encoded.write(to: url, options: .atomic)
  }

  func load<T: Codable>(forKey key: String, as type: T.Type) -> T? {
    let url = fileURL(for: key)
    guard let data = try? Data(contentsOf: url) else { return nil }
    guard
      let envelope = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
      let timestamp = envelope["timestamp"] as? TimeInterval,
      let payloadBase64 = envelope["payload"] as? String,
      let payloadData = Data(base64Encoded: payloadBase64)
    else {
      return nil
    }

    guard Date().timeIntervalSince1970 - timestamp < maxAge else {
      try? FileManager.default.removeItem(at: url)
      return nil
    }

    return try? JSONDecoder().decode(T.self, from: payloadData)
  }

  func loadEvenIfExpired<T: Codable>(forKey key: String, as type: T.Type) -> T? {
    let url = fileURL(for: key)
    guard let data = try? Data(contentsOf: url) else { return nil }
    guard
      let envelope = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
      let payloadBase64 = envelope["payload"] as? String,
      let payloadData = Data(base64Encoded: payloadBase64)
    else {
      return nil
    }
    return try? JSONDecoder().decode(T.self, from: payloadData)
  }

  func invalidate(forKey key: String) {
    let url = fileURL(for: key)
    try? FileManager.default.removeItem(at: url)
  }

  func clearAll() {
    try? FileManager.default.removeItem(at: cacheDirectory)
    try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
  }

  private func fileURL(for key: String) -> URL {
    let safe = key.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? key
    return cacheDirectory.appendingPathComponent(safe + ".json")
  }
}

// MARK: - Cache Keys

enum CacheKey {
  static let publicContent = "public_content"
  static let bookingAvailability = "booking_availability"
  static let publicGoals = "public_goals"
  static let adminJobs = "admin_jobs"
  static let adminBookings = "admin_bookings"
  static let adminNotifications = "admin_notifications"
}
