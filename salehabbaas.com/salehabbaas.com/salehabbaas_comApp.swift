import SwiftUI

#if canImport(UIKit)
import UIKit
#endif

@main
struct salehabbaas_comApp: App {
  #if canImport(UIKit)
  @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
  #endif

  var body: some Scene {
    WindowGroup {
      ContentView()
    }
  }
}
