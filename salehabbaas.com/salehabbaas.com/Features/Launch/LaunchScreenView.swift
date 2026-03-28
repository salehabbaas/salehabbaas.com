import SwiftUI

struct LaunchScreenView: View {
  let profile: HeroSection
  let colorMode: PortfolioColorMode
  let onFinish: () -> Void

  @Environment(\.horizontalSizeClass) private var horizontalSizeClass
  @State private var hasStarted = false
  @State private var logoVisible = false
  @State private var textVisible = false
  @State private var glowVisible = false
  @State private var drift = false
  @State private var isDismissing = false

  private var isRegularWidth: Bool {
    horizontalSizeClass == .regular
  }

  var body: some View {
    GeometryReader { proxy in
      ZStack {
        LaunchBackgroundView(size: proxy.size, colorMode: colorMode, isRegularWidth: isRegularWidth, drift: drift)
          .ignoresSafeArea()

        VStack(spacing: isRegularWidth ? 28 : 22) {
          Spacer(minLength: 0)

          LaunchLogoMarkView(isRegularWidth: isRegularWidth, logoVisible: logoVisible, glowVisible: glowVisible, drift: drift)

          VStack(spacing: 10) {
            Text(profile.name)
              .font(.system(size: isRegularWidth ? 42 : 34, weight: .bold, design: .serif))
              .foregroundStyle(PortfolioTheme.ink)

            Text("Software Engineer")
              .font(.system(size: isRegularWidth ? 17 : 15, weight: .semibold, design: .rounded))
              .foregroundStyle(PortfolioTheme.secondaryInk)
              .multilineTextAlignment(.center)
              .padding(.horizontal, 24)

            Text("Opening portfolio")
              .font(.system(.footnote, design: .rounded, weight: .bold))
              .foregroundStyle(PortfolioTheme.accentStrong)
              .tracking(1.4)
              .padding(.top, 6)
          }
          .opacity(textVisible ? 1 : 0)
          .offset(y: textVisible ? 0 : 24)

          LaunchProgressBarView(isRegularWidth: isRegularWidth, textVisible: textVisible)
            .opacity(textVisible ? 1 : 0)
            .offset(y: textVisible ? 0 : 18)

          Spacer(minLength: 0)
        }
        .padding(.horizontal, 24)
      }
    }
    .opacity(isDismissing ? 0 : 1)
    .scaleEffect(isDismissing ? 1.04 : 1)
    .task {
      guard !hasStarted else { return }
      hasStarted = true

      withAnimation(.bouncy(duration: 0.9, extraBounce: 0.14)) {
        logoVisible = true
      }

      withAnimation(.easeInOut(duration: 2.4).repeatForever(autoreverses: true)) {
        glowVisible = true
        drift = true
      }

      try? await Task.sleep(for: .milliseconds(240))
      withAnimation(.smooth(duration: 0.7, extraBounce: 0)) {
        textVisible = true
      }

      try? await Task.sleep(for: .milliseconds(2050))
      withAnimation(.smooth(duration: 0.45, extraBounce: 0)) {
        isDismissing = true
      }

      try? await Task.sleep(for: .milliseconds(340))
      onFinish()
    }
  }
}

#Preview {
  LaunchScreenView(profile: PortfolioDocument.saleh.profile, colorMode: .light) {}
}
