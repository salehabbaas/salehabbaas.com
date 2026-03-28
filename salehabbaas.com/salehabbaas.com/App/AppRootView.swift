import SwiftUI

struct AppRootView: View {
  @AppStorage("portfolio.colorMode") private var colorModeRawValue = PortfolioColorMode.light.rawValue
  @State private var showsLanding = true

  private var colorMode: Binding<PortfolioColorMode> {
    Binding(
      get: { PortfolioColorMode(rawValue: colorModeRawValue) ?? .light },
      set: { colorModeRawValue = $0.rawValue }
    )
  }

  var body: some View {
    ZStack {
      NavigationStack {
        PortfolioShellView(content: .saleh, colorMode: colorMode)
      }
      .toolbar(.hidden, for: .navigationBar)
      .preferredColorScheme(colorMode.wrappedValue.colorScheme)
      .opacity(showsLanding ? 0 : 1)
      .scaleEffect(showsLanding ? 1.03 : 1)

      if showsLanding {
        LaunchScreenView(profile: PortfolioDocument.saleh.profile, colorMode: colorMode.wrappedValue) {
          withAnimation(.smooth(duration: 0.55, extraBounce: 0)) {
            showsLanding = false
          }
        }
        .transition(.asymmetric(insertion: .opacity, removal: .opacity.combined(with: .scale(scale: 1.02))))
        .zIndex(1)
      }
    }
    .preferredColorScheme(colorMode.wrappedValue.colorScheme)
  }
}

#Preview {
  AppRootView()
}
