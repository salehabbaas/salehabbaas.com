import SwiftUI

struct PortfolioShellView: View {
  let content: PortfolioDocument
  @Binding var colorMode: PortfolioColorMode
  var onSearchTap: (() -> Void)? = nil
  var onAdminTap: (() -> Void)? = nil

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
      if useTabletWorkspaceLayout(for: proxy.size) {
        tabletWorkspace(proxy: proxy)
      } else {
        phoneShell(proxy: proxy)
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

  private func useTabletWorkspaceLayout(for size: CGSize) -> Bool {
    isRegularWidth && size.width >= 700
  }

  @ViewBuilder
  private func phoneShell(proxy: GeometryProxy) -> some View {
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
            isRegularWidth: false,
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
      HeaderBarView(
        content: content,
        selectedTab: selectedTab,
        isRegularWidth: false,
        colorMode: $colorMode,
        onSearchTap: onSearchTap,
        onAdminTap: onAdminTap
      )
    }
    .overlay(alignment: .bottom) {
      BottomNavigationBarView(selectedTab: $selectedTab, isRegularWidth: false, namespace: tabNamespace) { newHeight in
        footerHeight = newHeight
      }
    }
  }

  @ViewBuilder
  private func tabletWorkspace(proxy: GeometryProxy) -> some View {
    let railWidth = max(220, min(280, proxy.size.width * 0.24))
    let availableContentWidth = max(360, proxy.size.width - railWidth - 48)
    let useRegularMetrics = availableContentWidth >= 720
    let maxContentWidth = min(1040, max(520, availableContentWidth - 24))

    ZStack {
      PortfolioPageBackgroundView(tab: selectedTab, colorMode: colorMode)
        .ignoresSafeArea()
        .animation(.easeInOut(duration: 0.45), value: selectedTab)

      HStack(spacing: 0) {
        tabletNavigationRail(width: railWidth)

        VStack(spacing: 14) {
          HeaderBarView(
            content: content,
            selectedTab: selectedTab,
            isRegularWidth: useRegularMetrics,
            colorMode: $colorMode,
            onSearchTap: onSearchTap,
            onAdminTap: onAdminTap
          )
          .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
          .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
              .stroke(PortfolioTheme.border, lineWidth: 1)
          )

          PortfolioPageView(
            tab: selectedTab,
            content: content,
            colorMode: colorMode,
            isRegularWidth: useRegularMetrics,
            heroVisible: heroVisible,
            size: proxy.size,
            footerHeight: 0,
            maxContentWidth: maxContentWidth
          )
          .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 30, style: .continuous))
          .overlay(
            RoundedRectangle(cornerRadius: 30, style: .continuous)
              .stroke(PortfolioTheme.border, lineWidth: 1)
          )
        }
        .padding(18)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
      }
    }
  }

  private func tabletNavigationRail(width: CGFloat) -> some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 10) {
        Image("SalehLogo")
          .resizable()
          .scaledToFit()
          .frame(width: 44, height: 44)

        VStack(alignment: .leading, spacing: 2) {
          Text(content.profile.name)
            .font(.system(.headline, design: .serif, weight: .bold))
            .foregroundStyle(PortfolioTheme.ink)
            .lineLimit(1)
          Text("Software Engineer")
            .font(.system(.caption, design: .rounded, weight: .semibold))
            .foregroundStyle(PortfolioTheme.secondaryInk)
            .lineLimit(1)
        }
      }
      .padding(.bottom, 8)

      ForEach(PortfolioNavigationTab.allCases) { tab in
        railButton(for: tab)
      }

      Spacer(minLength: 0)

      HStack(spacing: 10) {
        Button {
          onSearchTap?()
        } label: {
          Label("Search", systemImage: "magnifyingglass")
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(PortfolioSecondaryButtonStyle())

        Button {
          var updated = colorMode
          updated.toggle()
          colorMode = updated
        } label: {
          Image(systemName: colorMode.iconName)
            .font(.system(size: 14, weight: .bold))
            .frame(width: 40, height: 40)
        }
        .buttonStyle(.plain)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
          RoundedRectangle(cornerRadius: 12, style: .continuous)
            .stroke(PortfolioTheme.border, lineWidth: 1)
        )
        .accessibilityLabel(colorMode.title)
      }

      Button {
        onAdminTap?()
      } label: {
        Label("Admin Panel", systemImage: "gearshape.fill")
          .frame(maxWidth: .infinity)
      }
      .buttonStyle(PortfolioPrimaryButtonStyle())
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 18)
    .frame(width: width)
    .frame(maxHeight: .infinity, alignment: .top)
    .background(.ultraThinMaterial)
    .overlay(alignment: .trailing) {
      Rectangle()
        .fill(PortfolioTheme.divider)
        .frame(width: 1)
    }
  }

  private func railButton(for tab: PortfolioNavigationTab) -> some View {
    let isSelected = selectedTab == tab
    return Button {
      withAnimation(.snappy(duration: 0.25)) {
        selectedTab = tab
      }
    } label: {
      HStack(spacing: 10) {
        Image(systemName: tab.iconName)
          .font(.system(size: 14, weight: .bold))
          .frame(width: 18)
        Text(tab.title)
          .font(.system(.subheadline, design: .rounded, weight: .semibold))
          .lineLimit(1)
        Spacer()
      }
      .foregroundStyle(isSelected ? Color.white : PortfolioTheme.ink)
      .padding(.horizontal, 12)
      .padding(.vertical, 11)
      .background(
        RoundedRectangle(cornerRadius: 14, style: .continuous)
          .fill(isSelected ? AnyShapeStyle(PortfolioTheme.buttonGradient) : AnyShapeStyle(PortfolioTheme.chipGradient))
      )
      .overlay(
        RoundedRectangle(cornerRadius: 14, style: .continuous)
          .stroke(isSelected ? Color.white.opacity(0.15) : PortfolioTheme.border, lineWidth: 1)
      )
    }
    .buttonStyle(.plain)
  }
}

#Preview {
  PortfolioShellView(content: .saleh, colorMode: .constant(.light))
}
