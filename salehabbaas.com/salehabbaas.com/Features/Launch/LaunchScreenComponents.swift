import SwiftUI

struct LaunchLogoMarkView: View {
  let isRegularWidth: Bool
  let logoVisible: Bool
  let glowVisible: Bool
  let drift: Bool

  var body: some View {
    ZStack {
      Circle()
        .fill(
          RadialGradient(
            colors: [PortfolioTheme.accent.opacity(glowVisible ? 0.42 : 0.18), .clear],
            center: .center,
            startRadius: 20,
            endRadius: isRegularWidth ? 180 : 130
          )
        )
        .frame(width: isRegularWidth ? 320 : 220, height: isRegularWidth ? 320 : 220)
        .blur(radius: glowVisible ? 10 : 24)
        .scaleEffect(glowVisible ? 1.06 : 0.86)

      Circle()
        .stroke(Color.white.opacity(0.16), lineWidth: 1)
        .frame(width: isRegularWidth ? 198 : 146, height: isRegularWidth ? 198 : 146)
        .scaleEffect(drift ? 1.05 : 0.95)
        .opacity(0.85)

      Circle()
        .stroke(PortfolioTheme.accentStrong.opacity(0.34), lineWidth: 1)
        .frame(width: isRegularWidth ? 238 : 176, height: isRegularWidth ? 238 : 176)
        .scaleEffect(drift ? 0.94 : 1.06)
        .rotationEffect(.degrees(drift ? 8 : -8))

      Image("SalehLogo")
        .resizable()
        .scaledToFit()
        .frame(width: isRegularWidth ? 144 : 108, height: isRegularWidth ? 144 : 108)
        .scaleEffect(logoVisible ? 1 : 0.68)
        .rotationEffect(.degrees(logoVisible ? 0 : -10))
        .shadow(color: PortfolioTheme.shadow.opacity(0.26), radius: 22, x: 0, y: 14)
    }
    .opacity(logoVisible ? 1 : 0.18)
    .offset(y: logoVisible ? 0 : 18)
  }
}

struct LaunchProgressBarView: View {
  let isRegularWidth: Bool
  let textVisible: Bool

  var body: some View {
    Capsule()
      .fill(Color.white.opacity(0.16))
      .frame(width: isRegularWidth ? 220 : 170, height: 6)
      .overlay(alignment: .leading) {
        Capsule()
          .fill(PortfolioTheme.buttonGradient)
          .frame(width: isRegularWidth ? 220 : 170, height: 6)
          .scaleEffect(x: textVisible ? 1 : 0.15, y: 1, anchor: .leading)
      }
      .clipShape(Capsule())
      .shadow(color: PortfolioTheme.shadow.opacity(0.18), radius: 10, x: 0, y: 4)
  }
}

struct LaunchBackgroundView: View {
  let size: CGSize
  let colorMode: PortfolioColorMode
  let isRegularWidth: Bool
  let drift: Bool

  var body: some View {
    ZStack {
      MeshGradient(
        width: 3,
        height: 3,
        points: [
          .init(x: 0.0, y: 0.0), .init(x: 0.5, y: 0.0), .init(x: 1.0, y: 0.0),
          .init(x: 0.0, y: 0.5), .init(x: 0.5, y: 0.5), .init(x: 1.0, y: 0.5),
          .init(x: 0.0, y: 1.0), .init(x: 0.5, y: 1.0), .init(x: 1.0, y: 1.0)
        ],
        colors: [
          PortfolioTheme.softBackground,
          PortfolioTheme.accent.opacity(colorMode == .dark ? 0.34 : 0.18),
          PortfolioTheme.softBackground,
          PortfolioTheme.accentStrong.opacity(colorMode == .dark ? 0.26 : 0.14),
          PortfolioTheme.softBackground,
          PortfolioTheme.accent.opacity(colorMode == .dark ? 0.22 : 0.12),
          PortfolioTheme.softBackground,
          PortfolioTheme.accentStrong.opacity(colorMode == .dark ? 0.22 : 0.10),
          PortfolioTheme.softBackground
        ]
      )

      Circle()
        .fill(PortfolioTheme.accent.opacity(colorMode == .dark ? 0.20 : 0.12))
        .frame(width: isRegularWidth ? size.width * 0.44 : size.width * 0.58)
        .blur(radius: 38)
        .offset(x: drift ? size.width * 0.16 : -size.width * 0.08, y: -size.height * 0.24)

      Circle()
        .fill(PortfolioTheme.accentStrong.opacity(colorMode == .dark ? 0.16 : 0.10))
        .frame(width: isRegularWidth ? size.width * 0.38 : size.width * 0.52)
        .blur(radius: 44)
        .offset(x: drift ? -size.width * 0.18 : size.width * 0.12, y: size.height * 0.22)

      LinearGradient(
        colors: [PortfolioTheme.softBackground.opacity(0.06), PortfolioTheme.softBackground.opacity(0.76)],
        startPoint: .top,
        endPoint: .bottom
      )
    }
    .animation(.easeInOut(duration: 2.8), value: drift)
  }
}
