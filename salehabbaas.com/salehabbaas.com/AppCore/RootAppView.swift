import SwiftUI

struct RootAppView: View {
  @Bindable var appState: AppState
  @Environment(\.horizontalSizeClass) private var horizontalSizeClass

  var body: some View {
    Group {
      if !appState.isAuthenticated {
        AuthGateView(appState: appState)
      } else {
        if horizontalSizeClass == .regular {
          iPadLayout
        } else {
          iPhoneLayout
        }
      }
    }
    .onReceive(NotificationCenter.default.publisher(for: .didRefreshFCMToken)) { note in
      guard let token = note.object as? String else { return }
      Task { await appState.registerPushTokenIfNeeded(token) }
    }
  }

  private var iPhoneLayout: some View {
    TabView {
      NavigationStack {
        PublicFeatureView(route: appState.selectedPublicRoute, appState: appState)
      }
      .tabItem {
        Label("Public", systemImage: "globe")
      }

      NavigationStack {
        adminDetail(for: appState.selectedAdminModule)
      }
      .tabItem {
        Label("Admin", systemImage: "gearshape.2")
      }
    }
  }

  private var iPadLayout: some View {
    NavigationSplitView {
      List {
        Section("Public") {
          ForEach(PublicRoute.allCases) { route in
            Button(route.title) {
              appState.showAdmin = false
              appState.selectedPublicRoute = route
            }
          }
        }

        Section("Admin") {
          ForEach(AdminModule.allCases) { module in
            Button(module.title) {
              appState.showAdmin = true
              appState.selectedAdminModule = module
            }
          }
        }
      }
      .navigationTitle("Saleh App")
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("Sign Out") {
            Task { await appState.signOut() }
          }
        }
      }
      .listStyle(.insetGrouped)
    } detail: {
      if appState.showAdmin {
        adminDetail(for: appState.selectedAdminModule)
      } else {
        PublicFeatureView(route: appState.selectedPublicRoute, appState: appState)
      }
    }
  }

  @ViewBuilder
  private func adminDetail(for module: AdminModule) -> some View {
    switch module {
    case .dashboard:
      DashboardFeatureView(appState: appState)
    case .cms:
      CMSFeatureView(appState: appState)
    case .creator:
      CreatorFeatureView(appState: appState)
    case .linkedin:
      LinkedInFeatureView(appState: appState)
    case .projects:
      ProjectsFeatureView(appState: appState)
    case .resume:
      ResumeStudioFeatureView(appState: appState)
    case .jobs:
      JobsFeatureView(appState: appState)
    case .bookings:
      BookingsFeatureView(appState: appState)
    case .settings:
      SettingsFeatureView(appState: appState)
    case .agent:
      AgentFeatureView(appState: appState)
    case .notifications:
      NotificationsFeatureView(appState: appState)
    }
  }
}

#Preview {
  RootAppView(appState: AppState())
}
