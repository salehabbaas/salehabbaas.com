import SwiftUI

struct AdminHubView: View {
  let colorMode: PortfolioColorMode
  @Environment(\.dismiss) private var dismiss

  @State private var selectedTab: AdminTab = .notifications
  @State private var isLoading = false

  private var auth: AdminAuthManager { AdminAuthManager.shared }

  var body: some View {
    NavigationStack {
      ZStack {
        PortfolioPageBackgroundView(tab: .connect, colorMode: colorMode)
          .ignoresSafeArea()

        VStack(spacing: 0) {
          tabPicker
          tabContent
        }
      }
      .navigationTitle("Admin Panel")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("Close") { dismiss() }
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
        }
        ToolbarItem(placement: .topBarTrailing) {
          Button {
            auth.signOut()
            dismiss()
          } label: {
            Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
              .font(.subheadline.weight(.semibold))
              .foregroundStyle(.red)
          }
        }
      }
    }
  }

  private var tabPicker: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 8) {
        ForEach(AdminTab.allCases, id: \.self) { tab in
          Button {
            withAnimation(.snappy(duration: 0.2)) { selectedTab = tab }
          } label: {
            Label(tab.label, systemImage: tab.icon)
              .font(.footnote.weight(.bold))
              .foregroundStyle(selectedTab == tab ? .white : PortfolioTheme.ink(colorMode))
              .padding(.horizontal, 14)
              .padding(.vertical, 9)
              .background(
                selectedTab == tab
                  ? PortfolioTheme.buttonGradient
                  : LinearGradient(colors: [.clear], startPoint: .leading, endPoint: .trailing),
                in: Capsule()
              )
              .overlay(Capsule().strokeBorder(selectedTab == tab ? .clear : PortfolioTheme.border, lineWidth: 1))
          }
        }
      }
      .padding(.horizontal, 18)
      .padding(.vertical, 12)
    }
    .background(.ultraThinMaterial)
    .overlay(alignment: .bottom) {
      Rectangle().fill(PortfolioTheme.divider(colorMode)).frame(height: 1)
    }
  }

  @ViewBuilder
  private var tabContent: some View {
    ScrollView {
      VStack(spacing: 20) {
        switch selectedTab {
        case .notifications:
          NotificationCenterView(colorMode: colorMode)
        case .jobs:
          JobTrackerView(colorMode: colorMode)
        case .bookings:
          AdminBookingsView(colorMode: colorMode)
        case .goals:
          GoalsFeedView(colorMode: colorMode)
        }
      }
      .padding(18)
    }
  }
}

enum AdminTab: String, CaseIterable {
  case notifications, jobs, bookings, goals
  var label: String {
    switch self {
    case .notifications: return "Notifications"
    case .jobs: return "Job Tracker"
    case .bookings: return "Bookings"
    case .goals: return "Goals"
    }
  }
  var icon: String {
    switch self {
    case .notifications: return "bell.fill"
    case .jobs: return "briefcase.fill"
    case .bookings: return "calendar"
    case .goals: return "target"
    }
  }
}
