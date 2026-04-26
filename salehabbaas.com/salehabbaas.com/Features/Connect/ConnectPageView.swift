import SwiftUI

struct ConnectPageView: View {
  let contact: ContactSection
  let colorMode: PortfolioColorMode

  var body: some View {
    VStack(alignment: .leading, spacing: 28) {
      // Intro section
      VStack(alignment: .leading, spacing: 14) {
        Text("Let's Connect")
          .font(.title3.weight(.bold))
          .foregroundStyle(PortfolioTheme.ink(colorMode))

        Text(contact.intro)
          .font(.subheadline.weight(.medium))
          .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
          .lineSpacing(5)

        PortfolioInfoBadge(
          title: "Ottawa, Ontario, Canada",
          icon: "mappin.circle.fill"
        )
      }
      .portfolioPanel(colorMode: colorMode)

      // Contact links
      VStack(alignment: .leading, spacing: 12) {
        contactLinkCard(
          icon: PortfolioVisuals.socialIcon(for: "Email"),
          title: contact.email.title,
          subtitle: contact.email.subtitle,
          url: contact.email.url
        )

        contactLinkCard(
          icon: PortfolioVisuals.socialIcon(for: "Website"),
          title: contact.website.title,
          subtitle: contact.website.subtitle,
          url: contact.website.url
        )

        contactLinkCard(
          icon: PortfolioVisuals.socialIcon(for: "LinkedIn"),
          title: contact.linkedin.title,
          subtitle: contact.linkedin.subtitle,
          url: contact.linkedin.url
        )

        ForEach(contact.socialLinks, id: \.title) { link in
          contactLinkCard(
            icon: PortfolioVisuals.socialIcon(for: link.title),
            title: link.title,
            subtitle: link.subtitle,
            url: link.url
          )
        }
      }

      // Resume download
      ResumeDownloadView(colorMode: colorMode)

      // Contact form
      ContactFormView(colorMode: colorMode)

      // Booking
      BookingView(colorMode: colorMode)
    }
  }

  private func contactLinkCard(icon: String, title: String, subtitle: String, url: URL) -> some View {
    Link(destination: url) {
      HStack(spacing: 14) {
        Image(systemName: icon)
          .font(.system(size: 18, weight: .bold))
          .foregroundStyle(PortfolioTheme.accent(colorMode))
          .frame(width: 40, height: 40)
          .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))

        VStack(alignment: .leading, spacing: 2) {
          Text(title)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(PortfolioTheme.ink(colorMode))
          Text(subtitle)
            .font(.footnote.weight(.medium))
            .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
        }

        Spacer()

        Image(systemName: "arrow.up.right")
          .font(.footnote.weight(.bold))
          .foregroundStyle(PortfolioTheme.accent(colorMode))
      }
      .padding(16)
      .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
      .overlay(
        RoundedRectangle(cornerRadius: 20, style: .continuous)
          .strokeBorder(PortfolioTheme.border, lineWidth: 1)
      )
    }
  }
}
