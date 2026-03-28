import SwiftUI

struct PortfolioShellView: View {
  let content: PortfolioDocument
  @Binding var colorMode: PortfolioColorMode

  @Environment(\.horizontalSizeClass) private var horizontalSizeClass
  @Namespace private var tabNamespace
  @State private var selectedTab: PortfolioNavigationTab = .home
  @State private var heroVisible = false
  @State private var footerHeight: CGFloat = 88

  private var isRegularWidth: Bool {
    horizontalSizeClass == .regular
  }

  var body: some View {
    GeometryReader { proxy in
      ZStack {
        PortfolioPageBackgroundView(tab: selectedTab, colorMode: colorMode)
          .ignoresSafeArea()
          .animation(.easeInOut(duration: 0.45), value: selectedTab)

        TabView(selection: $selectedTab) {
          ForEach(PortfolioNavigationTab.allCases) { tab in
            PortfolioPageView(
              tab: tab,
              content: content,
              colorMode: colorMode,
              isRegularWidth: isRegularWidth,
              heroVisible: heroVisible,
              size: proxy.size,
              footerHeight: footerHeight
            )
            .tag(tab)
          }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
      }
      .safeAreaInset(edge: .top, spacing: 0) {
        HeaderBarView(content: content, selectedTab: selectedTab, isRegularWidth: isRegularWidth, colorMode: $colorMode)
      }
      .overlay(alignment: .bottom) {
        BottomNavigationBarView(selectedTab: $selectedTab, isRegularWidth: isRegularWidth, namespace: tabNamespace) { newHeight in
          footerHeight = newHeight
        }
      }
    }
    .tint(PortfolioTheme.accent)
    .task {
      guard !heroVisible else { return }
      try? await Task.sleep(for: .milliseconds(140))
      withAnimation(.snappy(duration: 0.6, extraBounce: 0.08)) {
        heroVisible = true
      }
    }
  }
}

#Preview {
  PortfolioShellView(content: .saleh, colorMode: .constant(.light))
}
