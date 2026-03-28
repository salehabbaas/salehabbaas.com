import SwiftUI

struct PortfolioPageBackgroundView: View {
  let tab: PortfolioNavigationTab
  let colorMode: PortfolioColorMode

  var body: some View {
    MeshGradient(
      width: 3,
      height: 3,
      points: [
        .init(x: 0.0, y: 0.0), .init(x: 0.5, y: 0.0), .init(x: 1.0, y: 0.0),
        .init(x: 0.0, y: 0.5), .init(x: 0.5, y: 0.5), .init(x: 1.0, y: 0.5),
        .init(x: 0.0, y: 1.0), .init(x: 0.5, y: 1.0), .init(x: 1.0, y: 1.0)
      ],
      colors: PortfolioVisuals.meshColors(for: tab, colorMode: colorMode)
    )
    .overlay {
      LinearGradient(
        colors: [PortfolioTheme.softBackground.opacity(0.08), PortfolioTheme.softBackground.opacity(0.62)],
        startPoint: .top,
        endPoint: .bottom
      )
    }
  }
}

#Preview {
  PortfolioPageBackgroundView(tab: .home, colorMode: .light)
}
