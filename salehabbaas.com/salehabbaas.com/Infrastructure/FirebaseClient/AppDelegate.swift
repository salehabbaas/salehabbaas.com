import Foundation
import UserNotifications

#if canImport(UIKit)
import UIKit
#endif

#if canImport(FirebaseMessaging)
import FirebaseMessaging
#endif

final class AppDelegateBridge: NSObject {
  static let shared = AppDelegateBridge()

  private override init() {
    super.init()
  }
}

#if canImport(UIKit)
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    FirebaseAppService.configure()
    UNUserNotificationCenter.current().delegate = self

    #if canImport(FirebaseMessaging)
    Messaging.messaging().delegate = self
    #endif

    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
      guard granted else { return }
      DispatchQueue.main.async {
        application.registerForRemoteNotifications()
      }
    }
    return true
  }

  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    #if canImport(FirebaseMessaging)
    Messaging.messaging().apnsToken = deviceToken
    #endif
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([.banner, .sound, .badge])
  }
}
#endif

#if canImport(FirebaseMessaging)
extension AppDelegate: MessagingDelegate {
  func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    guard let token = fcmToken, !token.isEmpty else { return }
    NotificationCenter.default.post(name: .didRefreshFCMToken, object: token)
  }
}
#endif

extension Notification.Name {
  static let didRefreshFCMToken = Notification.Name("didRefreshFCMToken")
}
