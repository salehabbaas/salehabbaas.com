import SwiftUI
import UIKit

enum PortfolioTheme {
  static let ink = Color(
    uiColor: UIColor { trait in
      trait.userInterfaceStyle == .dark
        ? UIColor(red: 0.95, green: 0.95, blue: 0.97, alpha: 1)
        : UIColor(red: 0.10, green: 0.12, blue: 0.16, alpha: 1)
    }
  )

  static let secondaryInk = Color(
    uiColor: UIColor { trait in
      trait.userInterfaceStyle == .dark
        ? UIColor(red: 0.71, green: 0.74, blue: 0.82, alpha: 1)
        : UIColor(red: 0.33, green: 0.37, blue: 0.47, alpha: 1)
    }
  )

  static let softBackground = Color(
    uiColor: UIColor { trait in
      trait.userInterfaceStyle == .dark
        ? UIColor(red: 0.06, green: 0.07, blue: 0.10, alpha: 1)
        : UIColor(red: 0.98, green: 0.97, blue: 0.95, alpha: 1)
    }
  )

  static let panel = Color(
    uiColor: UIColor { trait in
      trait.userInterfaceStyle == .dark
        ? UIColor(red: 0.11, green: 0.13, blue: 0.18, alpha: 0.76)
        : UIColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 0.78)
    }
  )

  static let elevatedPanel = Color(
    uiColor: UIColor { trait in
      trait.userInterfaceStyle == .dark
        ? UIColor(red: 0.15, green: 0.17, blue: 0.24, alpha: 0.9)
        : UIColor(red: 0.99, green: 0.99, blue: 1.0, alpha: 0.92)
    }
  )

  static let accent = Color(
    uiColor: UIColor { trait in
      trait.userInterfaceStyle == .dark
        ? UIColor(red: 0.43, green: 0.74, blue: 0.95, alpha: 1)
        : UIColor(red: 0.14, green: 0.43, blue: 0.70, alpha: 1)
    }
  )

  static let accentStrong = Color(
    uiColor: UIColor { trait in
      trait.userInterfaceStyle == .dark
        ? UIColor(red: 0.95, green: 0.70, blue: 0.30, alpha: 1)
        : UIColor(red: 0.79, green: 0.58, blue: 0.20, alpha: 1)
    }
  )

  static let border = Color.white.opacity(0.18)
  static let divider = Color(
    uiColor: UIColor { trait in
      trait.userInterfaceStyle == .dark
        ? UIColor.white.withAlphaComponent(0.14)
        : UIColor(red: 0.15, green: 0.20, blue: 0.28, alpha: 0.12)
    }
  )
  static let highlight = Color.white.opacity(0.65)
  static let shadow = Color.black.opacity(0.16)

  static let buttonGradient = LinearGradient(
    colors: [Color(red: 0.13, green: 0.41, blue: 0.68), Color(red: 0.37, green: 0.68, blue: 0.82)],
    startPoint: .topLeading,
    endPoint: .bottomTrailing
  )

  static let chipGradient = LinearGradient(
    colors: [Color.white.opacity(0.26), Color.white.opacity(0.08)],
    startPoint: .topLeading,
    endPoint: .bottomTrailing
  )
}

struct PortfolioPanelModifier: ViewModifier {
  let fill: AnyShapeStyle
  let cornerRadius: CGFloat

  func body(content: Content) -> some View {
    content
      .padding(24)
      .background(fill)
      .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
      .overlay(
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
          .stroke(PortfolioTheme.border, lineWidth: 1)
      )
      .shadow(color: PortfolioTheme.shadow, radius: 16, x: 0, y: 10)
  }
}

extension View {
  func portfolioPanel(fill: some ShapeStyle = PortfolioTheme.panel, cornerRadius: CGFloat = 30) -> some View {
    modifier(PortfolioPanelModifier(fill: AnyShapeStyle(fill), cornerRadius: cornerRadius))
  }
}

struct PortfolioPrimaryButtonStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.system(.subheadline, design: .rounded, weight: .semibold))
      .foregroundStyle(Color.white)
      .padding(.horizontal, 20)
      .padding(.vertical, 14)
      .background(PortfolioTheme.buttonGradient)
      .clipShape(Capsule())
      .shadow(color: PortfolioTheme.shadow, radius: configuration.isPressed ? 6 : 12, x: 0, y: 6)
      .scaleEffect(configuration.isPressed ? 0.98 : 1)
      .animation(.snappy(duration: 0.25), value: configuration.isPressed)
  }
}

struct PortfolioSecondaryButtonStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.system(.subheadline, design: .rounded, weight: .semibold))
      .foregroundStyle(PortfolioTheme.ink)
      .padding(.horizontal, 20)
      .padding(.vertical, 14)
      .background(.ultraThinMaterial)
      .clipShape(Capsule())
      .overlay(
        Capsule()
          .stroke(PortfolioTheme.border, lineWidth: 1)
      )
      .scaleEffect(configuration.isPressed ? 0.98 : 1)
      .animation(.snappy(duration: 0.25), value: configuration.isPressed)
  }
}
