import SwiftUI

enum SATheme {
  static let brand = Color(red: 0.06, green: 0.47, blue: 0.64)
  static let accent = Color(red: 0.95, green: 0.45, blue: 0.14)
  static let pageBackground = Color(red: 0.96, green: 0.97, blue: 0.98)
  static let cardBackground = Color.white
}

struct SAPageContainer<Content: View>: View {
  let title: String
  @ViewBuilder let content: Content

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        Text(title)
          .font(.largeTitle.bold())
          .foregroundStyle(SATheme.brand)

        content
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(20)
    }
    .background(SATheme.pageBackground)
  }
}
