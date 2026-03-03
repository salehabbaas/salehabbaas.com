import Foundation
import Observation

#if canImport(FirebaseAuth)
import FirebaseAuth
#endif

@MainActor
@Observable
final class AuthStore {
  var isAuthenticated = false
  var uid = ""
  var email = ""
  var isLoading = false
  var errorMessage = ""

  init() {
    startListening()
  }

  func signIn(email: String, password: String) async {
    errorMessage = ""
    isLoading = true
    defer { isLoading = false }

    #if canImport(FirebaseAuth)
    do {
      _ = try await Auth.auth().signIn(withEmail: email, password: password)
    } catch {
      errorMessage = error.localizedDescription
    }
    #else
    errorMessage = "FirebaseAuth SDK is not linked yet."
    #endif
  }

  func signOut() async {
    errorMessage = ""
    #if canImport(FirebaseAuth)
    do {
      try Auth.auth().signOut()
    } catch {
      errorMessage = error.localizedDescription
    }
    #else
    isAuthenticated = false
    uid = ""
    email = ""
    #endif
  }

  func idToken(forceRefresh: Bool = false) async -> String {
    #if canImport(FirebaseAuth)
    guard let user = Auth.auth().currentUser else { return "" }
    return (try? await user.getIDTokenResult(forcingRefresh: forceRefresh).token) ?? ""
    #else
    return ""
    #endif
  }

  private func startListening() {
    #if canImport(FirebaseAuth)
    _ = Auth.auth().addStateDidChangeListener { [weak self] _, user in
      guard let self else { return }
      self.isAuthenticated = user != nil
      self.uid = user?.uid ?? ""
      self.email = user?.email ?? ""
    }
    #endif
  }
}
