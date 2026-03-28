import SwiftUI

struct HeaderBarView: View {
  let content: PortfolioDocument
  let selectedTab: PortfolioNavigationTab
  let isRegularWidth: Bool
  @Binding var colorMode: PortfolioColorMode

  var body: some View {
    VStack(spacing: 0) {
      HStack(spacing: 10) {
        HStack(spacing: 10) {
          Image("SalehLogo")
            .resizable()
            .scaledToFit()
            .frame(width: isRegularWidth ? 56 : 42, height: isRegularWidth ? 56 : 42)

          Text(content.profile.name)
            .font(.system(isRegularWidth ? .headline : .subheadline, design: .serif, weight: .bold))
            .foregroundStyle(PortfolioTheme.ink)
        }

        Spacer(minLength: 0)

        if isRegularWidth {
          Text(selectedTab.title)
            .font(.system(.caption, design: .rounded, weight: .semibold))
            .foregroundStyle(PortfolioTheme.secondaryInk)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(.ultraThinMaterial, in: Capsule())
            .overlay(Capsule().stroke(PortfolioTheme.border, lineWidth: 1))
        }

        if isRegularWidth {
          Link(destination: content.contact.email.url) {
            Label("Email Saleh", systemImage: "envelope.fill")
          }
          .buttonStyle(PortfolioPrimaryButtonStyle())

          Link(destination: content.contact.linkedin.url) {
            PortfolioLinkedInBadge()
              .frame(width: 40, height: 40)
          }
          .buttonStyle(.plain)
          .accessibilityLabel("Open LinkedIn")
        } else {
          HStack(spacing: 8) {
            Link(destination: content.contact.email.url) {
              Image(systemName: "envelope.fill")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(Color.white)
                .frame(width: 40, height: 40)
                .background(PortfolioTheme.buttonGradient, in: Circle())
            }
            .buttonStyle(.plain)

            Link(destination: content.contact.linkedin.url) {
              PortfolioLinkedInBadge()
                .frame(width: 40, height: 40)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Open LinkedIn")
          }
        }

        Button {
          var updated = colorMode
          updated.toggle()
          colorMode = updated
        } label: {
          Image(systemName: colorMode.iconName)
            .font(.system(size: 15, weight: .bold))
            .foregroundStyle(PortfolioTheme.ink)
            .frame(width: 40, height: 40)
            .background(.ultraThinMaterial, in: Circle())
            .overlay(Circle().stroke(PortfolioTheme.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(colorMode.title)
      }
    }
    .padding(.horizontal, isRegularWidth ? 22 : 14)
    .padding(.top, 8)
    .padding(.bottom, 10)
    .background(.ultraThinMaterial)
    .overlay(alignment: .bottom) {
      Rectangle()
        .fill(PortfolioTheme.border)
        .frame(height: 1)
    }
  }
}

#Preview {
  HeaderBarView(content: .saleh, selectedTab: .home, isRegularWidth: false, colorMode: .constant(.light))
}
