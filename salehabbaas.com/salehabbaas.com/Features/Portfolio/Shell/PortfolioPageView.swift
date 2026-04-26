import SwiftUI

struct PortfolioPageView: View {
  let tab: PortfolioNavigationTab
  let content: PortfolioDocument
  let colorMode: PortfolioColorMode
  let isRegularWidth: Bool
  let heroVisible: Bool
  let size: CGSize
  let footerHeight: CGFloat
  var maxContentWidth: CGFloat? = nil

  var body: some View {
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 28) {
        switch tab {
        case .home:
          HomePageView(content: content, isRegularWidth: isRegularWidth, heroVisible: heroVisible, size: size)
        case .about:
          AboutPageView(content: content, isRegularWidth: isRegularWidth, colorMode: colorMode)
        case .skills:
          SkillsPageView(content: content, isRegularWidth: isRegularWidth)
        case .experience:
          ExperiencePageView(content: content)
        case .focus:
          FocusPageView(content: content, isRegularWidth: isRegularWidth)
        case .connect:
          ConnectPageView(contact: content.contact, colorMode: colorMode)
        }
      }
      .frame(maxWidth: maxContentWidth ?? .infinity, alignment: .leading)
      .frame(maxWidth: .infinity, alignment: .center)
      .padding(.horizontal, isRegularWidth ? 28 : 18)
      .padding(.top, 26)
      .padding(.bottom, footerHeight + 28)
      .frame(minHeight: size.height, alignment: .top)
    }
    .scrollBounceBehavior(.basedOnSize)
    .scrollClipDisabled()
  }
}

#Preview {
  PortfolioPageView(
    tab: .connect,
    content: .saleh,
    colorMode: .light,
    isRegularWidth: false,
    heroVisible: true,
    size: CGSize(width: 390, height: 844),
    footerHeight: 88
  )
}
