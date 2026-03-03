import Foundation

struct APIEnvelope<T: Decodable>: Decodable {
  let summary: T
  let apiVersion: String
}

struct AnySummary: Decodable {
  let raw: [String: JSONValue]

  init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()
    raw = try container.decode([String: JSONValue].self)
  }
}

enum JSONValue: Decodable {
  case string(String)
  case number(Double)
  case bool(Bool)
  case object([String: JSONValue])
  case array([JSONValue])
  case null

  init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()

    if container.decodeNil() { self = .null }
    else if let value = try? container.decode(Bool.self) { self = .bool(value) }
    else if let value = try? container.decode(Double.self) { self = .number(value) }
    else if let value = try? container.decode(String.self) { self = .string(value) }
    else if let value = try? container.decode([String: JSONValue].self) { self = .object(value) }
    else if let value = try? container.decode([JSONValue].self) { self = .array(value) }
    else {
      throw DecodingError.typeMismatch(
        JSONValue.self,
        .init(codingPath: decoder.codingPath, debugDescription: "Unsupported JSON value")
      )
    }
  }
}

extension JSONValue {
  var objectValue: [String: JSONValue]? {
    if case let .object(value) = self { return value }
    return nil
  }

  var arrayValue: [JSONValue]? {
    if case let .array(value) = self { return value }
    return nil
  }

  var stringValue: String? {
    if case let .string(value) = self { return value }
    return nil
  }

  var anyValue: Any {
    switch self {
    case let .string(value): return value
    case let .number(value): return value
    case let .bool(value): return value
    case let .object(value): return value.mapValues { $0.anyValue }
    case let .array(value): return value.map { $0.anyValue }
    case .null: return NSNull()
    }
  }
}

struct AdminBFFClient {
  let baseURL: URL
  let authStore: AuthStore

  init(baseURL: URL = URL(string: "https://salehabbaas.com")!, authStore: AuthStore) {
    self.baseURL = baseURL
    self.authStore = authStore
  }

  func fetchAdminSummary(path: String) async throws -> AnySummary {
    let data = try await send(path: path, method: "GET")
    return try JSONDecoder().decode(APIEnvelope<AnySummary>.self, from: data).summary
  }

  func mobileBootstrap() async throws {
    _ = try await send(path: "api/admin/mobile/bootstrap", method: "POST", forceRefreshToken: true)
  }

  func getObject(path: String) async throws -> [String: JSONValue] {
    let data = try await send(path: path, method: "GET")
    return try JSONDecoder().decode([String: JSONValue].self, from: data)
  }

  func postObject(path: String, body: [String: Any], forceRefreshToken: Bool = false) async throws -> [String: JSONValue] {
    let payload = try JSONSerialization.data(withJSONObject: body)
    let data = try await send(path: path, method: "POST", jsonBody: payload, forceRefreshToken: forceRefreshToken)
    return try JSONDecoder().decode([String: JSONValue].self, from: data)
  }

  func registerPushToken(_ token: String) async throws {
    _ = try await postObject(
      path: "api/admin/settings/push-token",
      body: [
        "token": token,
        "platform": "ios"
      ]
    )
  }

  private func send(
    path: String,
    method: String,
    jsonBody: Data? = nil,
    forceRefreshToken: Bool = false
  ) async throws -> Data {
    let token = await authStore.idToken(forceRefresh: forceRefreshToken)
    guard !token.isEmpty else { throw URLError(.userAuthenticationRequired) }

    var request = URLRequest(url: baseURL.appendingPathComponent(path))
    request.httpMethod = method
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    if let jsonBody {
      request.httpBody = jsonBody
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    }

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
      throw URLError(.badServerResponse)
    }
    return data
  }
}
