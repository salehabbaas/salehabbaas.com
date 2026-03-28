import SwiftUI

struct PortfolioSectionSurface<Content: View>: View {
  let accent: Color
  let content: Content

  init(accent: Color, @ViewBuilder content: () -> Content) {
    self.accent = accent
    self.content = content()
  }

  var body: some View {
    content
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(.vertical, 14)
      .padding(.horizontal, 6)
      .overlay(alignment: .leading) {
        RoundedRectangle(cornerRadius: 2, style: .continuous)
          .fill(
            LinearGradient(
              colors: [accent.opacity(0.95), accent.opacity(0.20)],
              startPoint: .top,
              endPoint: .bottom
            )
          )
          .frame(width: 4)
          .padding(.vertical, 8)
      }
      .overlay(alignment: .top) {
        Rectangle()
          .fill(PortfolioTheme.divider)
          .frame(height: 1)
      }
      .overlay(alignment: .bottom) {
        Rectangle()
          .fill(PortfolioTheme.divider)
          .frame(height: 1)
      }
  }
}
