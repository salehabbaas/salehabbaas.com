import SwiftUI

enum PortfolioVisuals {
  static func accentColor(for index: Int) -> Color {
    let palette: [Color] = [
      Color(red: 0.25, green: 0.54, blue: 0.84),
      Color(red: 0.60, green: 0.45, blue: 0.84),
      Color(red: 0.20, green: 0.64, blue: 0.62),
      Color(red: 0.78, green: 0.52, blue: 0.24)
    ]
    return palette[index % palette.count]
  }

  static func meshColors(for tab: PortfolioNavigationTab, colorMode: PortfolioColorMode) -> [Color] {
    let accent = accentColor(for: tab.accentIndex)
    let warm = PortfolioTheme.accentStrong
    let opacityBoost = colorMode == .dark ? 0.34 : 0.16

    return [
      PortfolioTheme.softBackground,
      accent.opacity(opacityBoost),
      PortfolioTheme.softBackground,
      warm.opacity(colorMode == .dark ? 0.22 : 0.10),
      PortfolioTheme.softBackground,
      accent.opacity(colorMode == .dark ? 0.20 : 0.08),
      PortfolioTheme.softBackground,
      warm.opacity(colorMode == .dark ? 0.16 : 0.08),
      PortfolioTheme.softBackground
    ]
  }

  static func focusAreaIcon(for title: String) -> String {
    switch title.lowercased() {
    case let value where value.contains("ai"):
      return "sparkles.rectangle.stack.fill"
    case let value where value.contains("cloud") || value.contains("healthcare"):
      return "cross.case.circle.fill"
    case let value where value.contains("integration") || value.contains("interoperability"):
      return "point.3.connected.trianglepath.dotted"
    case let value where value.contains("analytics"):
      return "chart.xyaxis.line"
    default:
      return "square.stack.3d.up.fill"
    }
  }

  // Alias for ConnectPageView
  static func socialIcon(for title: String) -> String { linkIcon(for: title) }

  static func linkIcon(for title: String) -> String {
    switch title.lowercased() {
    case "email":
      return "envelope.fill"
    case "website":
      return "globe"
    case "linkedin":
      return "person.crop.square.fill"
    case "youtube":
      return "play.rectangle.fill"
    case "instagram":
      return "camera.fill"
    case "tiktok":
      return "music.note.tv.fill"
    case "x":
      return "bubble.left.and.bubble.right.fill"
    default:
      return "arrow.up.right.square.fill"
    }
  }
}
