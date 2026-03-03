import Foundation

#if canImport(FirebaseCore)
import FirebaseCore
import FirebaseAnalytics
import FirebaseCrashlytics
import FirebaseAppCheck
#endif

#if canImport(FirebaseMessaging)
import FirebaseMessaging
#endif

#if canImport(UIKit)
import UIKit
#endif

enum FirebaseAppService {
  static func configure() {
    #if canImport(FirebaseCore)
    if FirebaseApp.app() == nil {
      configureAppCheck()
      FirebaseApp.configure()
      Analytics.setAnalyticsCollectionEnabled(true)
      Crashlytics.crashlytics().setCrashlyticsCollectionEnabled(true)
    }
    #endif
  }

  private static func configureAppCheck() {
    #if canImport(FirebaseAppCheck)
    #if DEBUG
    AppCheck.setAppCheckProviderFactory(AppCheckDebugProviderFactory())
    #else
    AppCheck.setAppCheckProviderFactory(AppAttestProviderFactory())
    #endif
    #endif
  }
}
