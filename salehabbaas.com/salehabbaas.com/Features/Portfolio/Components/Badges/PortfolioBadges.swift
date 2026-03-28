import SwiftUI

struct PortfolioInfoBadge: View {
  let title: String
  let icon: String

  var body: some View {
    Label {
      Text(title)
        .font(.system(.footnote, design: .rounded, weight: .bold))
        .foregroundStyle(PortfolioTheme.ink)
    } icon: {
      Image(systemName: icon)
        .font(.system(size: 13, weight: .bold))
        .foregroundStyle(PortfolioTheme.accentStrong)
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 10)
    .background(.ultraThinMaterial, in: Capsule())
    .overlay(Capsule().stroke(PortfolioTheme.border, lineWidth: 1))
  }
}

struct PortfolioLinkedInBadge: View {
  var body: some View {
    ZStack {
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .fill(Color(red: 0.0, green: 0.47, blue: 0.71))

      Text("in")
        .font(.system(size: 18, weight: .black, design: .rounded))
        .foregroundStyle(Color.white)
    }
    .shadow(color: PortfolioTheme.shadow.opacity(0.18), radius: 8, x: 0, y: 4)
  }
}
