import Foundation
import UserNotifications
import UIKit

@Observable
final class PushNotificationManager: NSObject {
  static let shared = PushNotificationManager()

  private(set) var isRegistered = false
  private(set) var permissionStatus: UNAuthorizationStatus = .notDetermined
  private(set) var deviceToken: String?

  override private init() {
    super.init()
  }

  @MainActor
  func requestPermission() async -> Bool {
    let center = UNUserNotificationCenter.current()
    do {
      let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])
      if granted {
        UIApplication.shared.registerForRemoteNotifications()
      }
      await refreshStatus()
      return granted
    } catch {
      return false
    }
  }

  @MainActor
  func refreshStatus() async {
    let settings = await UNUserNotificationCenter.current().notificationSettings()
    permissionStatus = settings.authorizationStatus
    isRegistered = settings.authorizationStatus == .authorized
  }

  func handleDeviceToken(_ tokenData: Data) {
    let token = tokenData.map { String(format: "%02.2hhx", $0) }.joined()
    deviceToken = token
    Task { await registerTokenWithServer(token) }
  }

  func handleRegistrationError(_ error: Error) {
    print("[Push] Registration error: \(error.localizedDescription)")
  }

  private func registerTokenWithServer(_ token: String) async {
    do {
      let request = PushTokenRequest(
        token: token,
        platform: "ios",
        bundleId: Bundle.main.bundleIdentifier ?? "com.salehabbaas"
      )
      _ = try await APIClient.shared.registerPushToken(request)
    } catch {
      print("[Push] Failed to register token: \(error.localizedDescription)")
    }
  }
}

// MARK: - UNUserNotificationCenterDelegate

extension PushNotificationManager: UNUserNotificationCenterDelegate {
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification
  ) async -> UNNotificationPresentationOptions {
    [.banner, .badge, .sound]
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse
  ) async {
    let userInfo = response.notification.request.content.userInfo
    if let urlString = userInfo["ctaUrl"] as? String, let url = URL(string: urlString) {
      await MainActor.run {
        NotificationCenter.default.post(
          name: .pushNotificationTapped,
          object: nil,
          userInfo: ["url": url]
        )
      }
    }
  }
}

extension Notification.Name {
  static let pushNotificationTapped = Notification.Name("pushNotificationTapped")
}
