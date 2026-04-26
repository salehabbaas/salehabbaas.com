import Foundation
import SwiftUI
import WidgetKit

@Observable
final class AdminAuthManager {
  static let shared = AdminAuthManager()

  private(set) var isAuthenticated = false
  private(set) var isLoading = false
  private(set) var userEmail: String?
  private(set) var userId: String?
  private(set) var errorMessage: String?

  private var refreshToken: String? {
    get { KeychainHelper.load(key: "admin_refresh_token") }
    set {
      if let value = newValue {
        KeychainHelper.save(key: "admin_refresh_token", value: value)
      } else {
        KeychainHelper.delete(key: "admin_refresh_token")
      }
    }
  }

  private var tokenExpiry: Date?
  private let widgetDefaults = UserDefaults(suiteName: "group.com.salehabbaas.widget")

  private init() {
    if let token = refreshToken {
      Task { await restoreSession(refreshToken: token) }
    }
  }

  @MainActor
  func signIn(email: String, password: String) async {
    isLoading = true
    errorMessage = nil

    do {
      let response = try await APIClient.shared.signInWithEmail(email: email, password: password)
      applyAuth(response)
    } catch let error as APIError {
      errorMessage = error.errorDescription
    } catch {
      errorMessage = error.localizedDescription
    }

    isLoading = false
  }

  @MainActor
  func signOut() {
    isAuthenticated = false
    userEmail = nil
    userId = nil
    refreshToken = nil
    tokenExpiry = nil
    APIClient.shared.authToken = nil
    syncWidgetSession(idToken: nil, email: nil)
    ContentProvider.shared.clearAdminGoals()
  }

  func ensureValidToken() async {
    guard isAuthenticated else { return }
    if let expiry = tokenExpiry, Date() < expiry.addingTimeInterval(-120) { return }
    guard let token = refreshToken else { return }
    await restoreSession(refreshToken: token)
  }

  @MainActor
  private func restoreSession(refreshToken token: String) async {
    do {
      let response = try await APIClient.shared.refreshToken(token)
      APIClient.shared.authToken = response.id_token
      refreshToken = response.refresh_token
      userId = response.user_id
      tokenExpiry = Date().addingTimeInterval(Double(response.expires_in) ?? 3600)
      isAuthenticated = true
      syncWidgetSession(idToken: response.id_token, email: userEmail)
    } catch {
      signOut()
    }
  }

  private func applyAuth(_ response: FirebaseAuthResponse) {
    APIClient.shared.authToken = response.idToken
    refreshToken = response.refreshToken
    userEmail = response.email
    userId = response.localId
    tokenExpiry = Date().addingTimeInterval(Double(response.expiresIn) ?? 3600)
    isAuthenticated = true
    syncWidgetSession(idToken: response.idToken, email: response.email)
  }

  private func syncWidgetSession(idToken: String?, email: String?) {
    if let idToken {
      widgetDefaults?.set(true, forKey: "widget.admin.isAuthenticated")
      widgetDefaults?.set(idToken, forKey: "widget.admin.idToken")
    } else {
      widgetDefaults?.set(false, forKey: "widget.admin.isAuthenticated")
      widgetDefaults?.removeObject(forKey: "widget.admin.idToken")
    }

    if let email, !email.isEmpty {
      widgetDefaults?.set(email, forKey: "widget.admin.email")
    } else {
      widgetDefaults?.removeObject(forKey: "widget.admin.email")
    }

    widgetDefaults?.set(Date().timeIntervalSince1970, forKey: "widget.admin.lastSessionSync")
    WidgetCenter.shared.reloadAllTimelines()
  }
}

// MARK: - Keychain Helper

private enum KeychainHelper {
  static func save(key: String, value: String) {
    guard let data = value.data(using: .utf8) else { return }
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrAccount as String: key,
      kSecAttrService as String: "com.salehabbaas.admin"
    ]
    SecItemDelete(query as CFDictionary)
    var add = query
    add[kSecValueData as String] = data
    SecItemAdd(add as CFDictionary, nil)
  }

  static func load(key: String) -> String? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrAccount as String: key,
      kSecAttrService as String: "com.salehabbaas.admin",
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne
    ]
    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    guard status == errSecSuccess, let data = result as? Data else { return nil }
    return String(data: data, encoding: .utf8)
  }

  static func delete(key: String) {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrAccount as String: key,
      kSecAttrService as String: "com.salehabbaas.admin"
    ]
    SecItemDelete(query as CFDictionary)
  }
}
