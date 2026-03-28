import SwiftUI

struct ContactPageView: View {
  let content: PortfolioDocument
  private let startupLink = URL(string: "https://www.artelo.ai")!

  var body: some View {
    VStack(alignment: .leading, spacing: 22) {
      PortfolioSectionSurface(accent: Color(red: 0.78, green: 0.52, blue: 0.24)) {
        VStack(alignment: .leading, spacing: 16) {
          Text(content.contact.intro)
            .font(.system(.body, design: .rounded, weight: .medium))
            .foregroundStyle(PortfolioTheme.ink.opacity(0.88))
            .lineSpacing(7)

          Label(content.profile.location, systemImage: "mappin.and.ellipse")
            .font(.system(.subheadline, design: .rounded, weight: .semibold))
            .foregroundStyle(PortfolioTheme.secondaryInk)
        }
      }

      VStack(spacing: 16) {
        ForEach(Array(content.contact.allLinks.enumerated()), id: \.element.id) { index, link in
          Link(destination: link.url) {
            HStack(alignment: .center, spacing: 16) {
              ZStack {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                  .fill(PortfolioTheme.chipGradient)
                  .frame(width: 64, height: 64)

                Image(systemName: PortfolioVisuals.linkIcon(for: link.title))
                  .font(.system(size: 22, weight: .bold))
                  .foregroundStyle(PortfolioTheme.accentStrong)
              }

              VStack(alignment: .leading, spacing: 6) {
                Text(link.title)
                  .font(.system(.headline, design: .rounded, weight: .semibold))
                  .foregroundStyle(PortfolioTheme.ink)

                Text(link.subtitle)
                  .font(.system(.footnote, design: .rounded, weight: .medium))
                  .foregroundStyle(PortfolioTheme.secondaryInk)
              }
              .frame(maxWidth: .infinity, alignment: .leading)

              Image(systemName: "arrow.up.right")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(PortfolioTheme.secondaryInk)
            }
            .frame(maxWidth: .infinity, minHeight: 104, alignment: .leading)
            .padding(.vertical, 8)
            .overlay(alignment: .top) {
              Rectangle()
                .fill(index == 0 ? Color.clear : PortfolioTheme.divider)
                .frame(height: 1)
            }
          }
          .buttonStyle(.plain)
        }
      }

      PortfolioSectionSurface(accent: Color(red: 0.39, green: 0.56, blue: 0.84)) {
        VStack(alignment: .leading, spacing: 14) {
          Text("Startup")
            .font(.system(.title3, design: .serif, weight: .bold))
            .foregroundStyle(PortfolioTheme.ink)

          Link(destination: startupLink) {
            HStack(spacing: 14) {
              VStack(alignment: .leading, spacing: 4) {
                Text("Artelo")
                  .font(.system(.headline, design: .rounded, weight: .bold))
                  .foregroundStyle(PortfolioTheme.ink)
                Text("artelo.ai")
                  .font(.system(.footnote, design: .rounded, weight: .semibold))
                  .foregroundStyle(PortfolioTheme.secondaryInk)
              }

              Spacer(minLength: 0)

              Image(systemName: "arrow.up.right.square.fill")
                .font(.system(size: 17, weight: .bold))
                .foregroundStyle(PortfolioTheme.accent)
            }
          }
          .buttonStyle(.plain)
        }
      }
    }
  }
}

#Preview {
  ContactPageView(content: .saleh)
}
