import SwiftUI

enum PortfolioColorMode: String {
  case light
  case dark

  var colorScheme: ColorScheme {
    switch self {
    case .light: .light
    case .dark: .dark
    }
  }

  var iconName: String {
    switch self {
    case .light: "moon.stars.fill"
    case .dark: "sun.max.fill"
    }
  }

  var title: String {
    switch self {
    case .light: "Dark Mode"
    case .dark: "Light Mode"
    }
  }

  mutating func toggle() {
    self = self == .light ? .dark : .light
  }
}
