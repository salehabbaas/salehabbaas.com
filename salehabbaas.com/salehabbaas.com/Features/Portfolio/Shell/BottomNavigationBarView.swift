import SwiftUI

struct BottomNavigationBarView: View {
  @Binding var selectedTab: PortfolioNavigationTab
  let isRegularWidth: Bool
  let namespace: Namespace.ID
  let onHeightChange: (CGFloat) -> Void

  var body: some View {
    navigationDock
      .padding(.horizontal, isRegularWidth ? 22 : 12)
      .padding(.top, 6)
      .padding(.bottom, 8)
      .onGeometryChange(for: CGFloat.self) { geometry in
        geometry.size.height
      } action: { newValue in
        onHeightChange(newValue)
      }
  }

  private var navigationDock: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 6) {
        ForEach(PortfolioNavigationTab.allCases) { tab in
          navigationButton(for: tab)
        }
      }
      .padding(6)
    }
    .scrollBounceBehavior(.basedOnSize)
    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: 24, style: .continuous)
        .stroke(PortfolioTheme.border, lineWidth: 1)
    )
    .shadow(color: PortfolioTheme.shadow, radius: 10, x: 0, y: 6)
  }

  private func navigationButton(for tab: PortfolioNavigationTab) -> some View {
    let isSelected = selectedTab == tab

    return Button {
      withAnimation(.snappy(duration: 0.35, extraBounce: 0.02)) {
        selectedTab = tab
      }
    } label: {
      VStack(spacing: isSelected ? 4 : 0) {
        Image(systemName: tab.iconName)
          .font(.system(size: 15, weight: .bold))
          .symbolEffect(.bounce.down.byLayer, value: isSelected)

        if isSelected {
          Text(tab.title)
            .font(.system(size: 11, weight: .bold, design: .rounded))
            .lineLimit(1)
            .minimumScaleFactor(0.85)
            .allowsTightening(true)
            .transition(.opacity.combined(with: .move(edge: .bottom)))
        }
      }
      .foregroundStyle(isSelected ? Color.white : PortfolioTheme.ink)
      .frame(minWidth: isSelected ? 72 : 48, minHeight: 48)
      .padding(.horizontal, 8)
      .background {
        RoundedRectangle(cornerRadius: 18, style: .continuous)
          .fill(isSelected ? AnyShapeStyle(PortfolioTheme.buttonGradient) : AnyShapeStyle(PortfolioTheme.chipGradient))
          .matchedGeometryEffect(id: isSelected ? "portfolio-nav-module" : "portfolio-nav-module-\(tab.rawValue)", in: namespace)
      }
      .overlay(
        RoundedRectangle(cornerRadius: 18, style: .continuous)
          .stroke(isSelected ? Color.white.opacity(0.14) : PortfolioTheme.border, lineWidth: 1)
      )
      .shadow(color: isSelected ? PortfolioTheme.shadow.opacity(0.38) : .clear, radius: 8, x: 0, y: 4)
      .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
    .buttonStyle(.plain)
    .accessibilityLabel(tab.title)
  }
}

#Preview {
  @Previewable @Namespace var namespace
  BottomNavigationBarView(selectedTab: .constant(.about), isRegularWidth: false, namespace: namespace, onHeightChange: { _ in })
}
