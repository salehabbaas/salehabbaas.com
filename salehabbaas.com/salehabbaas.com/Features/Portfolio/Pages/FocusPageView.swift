import SwiftUI

struct FocusPageView: View {
  let content: PortfolioDocument
  let isRegularWidth: Bool
  @State private var expandedFocusAreas: Set<String> = []

  var body: some View {
    VStack(spacing: 16) {
      ForEach(Array(content.focusAreas.enumerated()), id: \.element.id) { index, area in
        PortfolioSectionSurface(accent: PortfolioVisuals.accentColor(for: index)) {
          VStack(alignment: .leading, spacing: 10) {
            Label(area.title, systemImage: PortfolioVisuals.focusAreaIcon(for: area.title))
              .font(.system(.title3, design: .serif, weight: .bold))
              .foregroundStyle(PortfolioTheme.ink)

            Text(area.summary)
              .font(.system(.subheadline, design: .rounded, weight: .medium))
              .foregroundStyle(PortfolioTheme.ink.opacity(0.86))
              .lineSpacing(6)

            DisclosureGroup(
              isExpanded: Binding(
                get: { expandedFocusAreas.contains(area.id) },
                set: { isExpanded in
                  if isExpanded {
                    expandedFocusAreas.insert(area.id)
                  } else {
                    expandedFocusAreas.remove(area.id)
                  }
                }
              )
            ) {
              PortfolioFlexibleTagCloud(tags: area.tags, columns: isRegularWidth ? 3 : 2)
                .padding(.top, 8)
            } label: {
              Text("Show focus details")
                .font(.system(.footnote, design: .rounded, weight: .bold))
                .foregroundStyle(PortfolioTheme.accent)
            }
            .tint(PortfolioTheme.accent)
          }
        }
      }
    }
  }
}

#Preview {
  FocusPageView(content: .saleh, isRegularWidth: false)
}
