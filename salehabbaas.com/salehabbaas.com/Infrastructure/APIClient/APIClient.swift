import Foundation

struct APIClient {
  static let shared = APIClient()

  func get(path: String) async throws -> Data {
    guard let url = URL(string: path, relativeTo: URL(string: "https://salehabbaas.com")) else {
      throw URLError(.badURL)
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    let (data, response) = try await URLSession.shared.data(for: request)

    if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
      throw URLError(.badServerResponse)
    }

    return data
  }
}
