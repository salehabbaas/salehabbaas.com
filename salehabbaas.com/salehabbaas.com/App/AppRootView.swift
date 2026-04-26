import SwiftUI

struct AppRootView: View {
  @AppStorage("portfolio.colorMode") private var colorModeRawValue = PortfolioColorMode.light.rawValue
  @State private var showsLanding = true
  @State private var showSearch = false
  @State private var showAdmin = false
  @State private var showAdminLogin = false

  private let content = ContentProvider.shared
  private let auth = AdminAuthManager.shared
  private let push = PushNotificationManager.shared

  private var colorMode: Binding<PortfolioColorMode> {
    Binding(
      get: { PortfolioColorMode(rawValue: colorModeRawValue) ?? .light },
      set: { colorModeRawValue = $0.rawValue }
    )
  }

  var body: some View {
    ZStack {
      NavigationStack {
        PortfolioShellView(
          content: content.document,
          colorMode: colorMode,
          onSearchTap: { showSearch = true },
          onAdminTap: {
            if auth.isAuthenticated {
              showAdmin = true
            } else {
              showAdminLogin = true
            }
          }
        )
      }
      .toolbar(.hidden, for: .navigationBar)
      .preferredColorScheme(colorMode.wrappedValue.colorScheme)
      .opacity(showsLanding ? 0 : 1)
      .scaleEffect(showsLanding ? 1.03 : 1)

      if showsLanding {
        LaunchScreenView(profile: content.document.profile, colorMode: colorMode.wrappedValue) {
          withAnimation(.smooth(duration: 0.55, extraBounce: 0)) {
            showsLanding = false
          }
        }
        .transition(.asymmetric(insertion: .opacity, removal: .opacity.combined(with: .scale(scale: 1.02))))
        .zIndex(1)
      }
    }
    .preferredColorScheme(colorMode.wrappedValue.colorScheme)
    .environment(content)
    .sheet(isPresented: $showSearch) {
      GlobalSearchView(colorMode: colorMode.wrappedValue)
        .preferredColorScheme(colorMode.wrappedValue.colorScheme)
        .environment(content)
    }
    .sheet(isPresented: $showAdminLogin) {
      AdminLoginView(colorMode: colorMode.wrappedValue)
        .preferredColorScheme(colorMode.wrappedValue.colorScheme)
        .environment(content)
        .onDisappear {
          if auth.isAuthenticated { showAdmin = true }
        }
    }
    .sheet(isPresented: $showAdmin) {
      AdminHubView(colorMode: colorMode.wrappedValue)
        .preferredColorScheme(colorMode.wrappedValue.colorScheme)
        .environment(content)
    }
    .task {
      await content.loadAll()
      await push.refreshStatus()
      if push.permissionStatus == .notDetermined {
        _ = await push.requestPermission()
      }
    }
  }
}

#Preview {
  AppRootView()
}
