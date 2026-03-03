// GENERATED FILE - DO NOT EDIT MANUALLY.
// Run: npm run contracts:generate

import Foundation

public enum ContractConstants {
  public static let apiVersion = "2026-03-01"
}

public struct ContractApiEnvelope<T: Decodable>: Decodable {
  public let summary: T
  public let apiVersion: String
}

public enum AdminModuleKeyContract: String, Codable, CaseIterable {
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
}
