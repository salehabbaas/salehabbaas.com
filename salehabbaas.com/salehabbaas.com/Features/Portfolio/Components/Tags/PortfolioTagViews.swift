import SwiftUI

struct PortfolioFlexibleTagCloud: View {
  let tags: [String]
  let columns: Int

  private var gridItems: [GridItem] {
    Array(repeating: GridItem(.flexible(), spacing: 10, alignment: .leading), count: max(columns, 1))
  }

  var body: some View {
    LazyVGrid(columns: gridItems, alignment: .leading, spacing: 10) {
      ForEach(tags, id: \.self) { tag in
        Text(tag)
          .font(.system(.footnote, design: .rounded, weight: .bold))
          .foregroundStyle(PortfolioTheme.ink)
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, 14)
          .padding(.vertical, 12)
          .background(PortfolioTheme.chipGradient, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
          .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
              .stroke(PortfolioTheme.border, lineWidth: 1)
          )
      }
    }
  }
}
