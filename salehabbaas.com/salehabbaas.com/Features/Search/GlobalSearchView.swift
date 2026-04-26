import SwiftUI

struct GlobalSearchView: View {
  let colorMode: PortfolioColorMode
  @Environment(\.dismiss) private var dismiss
  @Environment(ContentProvider.self) private var content

  @State private var engine = SearchEngine()
  @FocusState private var isSearchFocused: Bool

  var body: some View {
    NavigationStack {
      VStack(spacing: 0) {
        searchBar

        if engine.query.count >= 2 {
          categoryPicker
          resultsList
        } else {
          suggestionsView
        }

        Spacer()
      }
      .background(PortfolioTheme.softBackground(colorMode).ignoresSafeArea())
      .toolbar(.hidden, for: .navigationBar)
    }
    .onAppear {
      engine.bind(to: content)
      isSearchFocused = true
    }
    .onChange(of: engine.query) { _, _ in
      engine.search()
    }
  }

  // MARK: - Search Bar

  private var searchBar: some View {
    HStack(spacing: 12) {
      HStack(spacing: 10) {
        Image(systemName: "magnifyingglass")
          .font(.system(size: 15, weight: .semibold))
          .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))

        TextField("Search skills, experience, projects...", text: $engine.query)
          .font(.subheadline.weight(.medium))
          .foregroundStyle(PortfolioTheme.ink(colorMode))
          .focused($isSearchFocused)
          .submitLabel(.search)

        if !engine.query.isEmpty {
          Button {
            engine.query = ""
            engine.results = []
          } label: {
            Image(systemName: "xmark.circle.fill")
              .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
          }
        }
      }
      .padding(.horizontal, 14)
      .padding(.vertical, 12)
      .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
      .overlay(
        RoundedRectangle(cornerRadius: 14, style: .continuous)
          .strokeBorder(PortfolioTheme.border, lineWidth: 1)
      )

      Button("Cancel") {
        dismiss()
      }
      .font(.subheadline.weight(.semibold))
      .foregroundStyle(PortfolioTheme.accent(colorMode))
    }
    .padding(.horizontal, 18)
    .padding(.vertical, 14)
    .background(.ultraThinMaterial)
    .overlay(alignment: .bottom) {
      Rectangle()
        .fill(PortfolioTheme.divider(colorMode))
        .frame(height: 1)
    }
  }

  // MARK: - Category Picker

  private var categoryPicker: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 8) {
        categoryChip(label: "All", selected: engine.selectedCategory == nil) {
          engine.selectedCategory = nil
          engine.search()
        }
        ForEach(SearchCategory.allCases, id: \.self) { cat in
          categoryChip(
            label: cat.rawValue,
            icon: cat.icon,
            selected: engine.selectedCategory == cat
          ) {
            engine.selectedCategory = engine.selectedCategory == cat ? nil : cat
            engine.search()
          }
        }
      }
      .padding(.horizontal, 18)
      .padding(.vertical, 10)
    }
    .background(.ultraThinMaterial)
  }

  private func categoryChip(label: String, icon: String? = nil, selected: Bool, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      HStack(spacing: 5) {
        if let icon {
          Image(systemName: icon)
            .font(.system(size: 10, weight: .bold))
        }
        Text(label)
          .font(.footnote.weight(.bold))
      }
      .foregroundStyle(selected ? .white : PortfolioTheme.ink(colorMode))
      .padding(.horizontal, 12)
      .padding(.vertical, 7)
      .background(selected ? PortfolioTheme.buttonGradient : LinearGradient(colors: [.clear], startPoint: .leading, endPoint: .trailing), in: Capsule())
      .overlay(Capsule().strokeBorder(selected ? Color.clear : PortfolioTheme.border, lineWidth: 1))
    }
  }

  // MARK: - Results

  private var resultsList: some View {
    ScrollView {
      LazyVStack(alignment: .leading, spacing: 0) {
        if engine.results.isEmpty {
          Text("No results for \"\(engine.query)\"")
            .font(.subheadline.weight(.medium))
            .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 40)
        } else {
          Text("\(engine.results.count) results")
            .font(.footnote.weight(.bold))
            .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
            .padding(.horizontal, 18)
            .padding(.top, 14)
            .padding(.bottom, 8)

          ForEach(engine.results) { result in
            SearchResultRow(result: result, query: engine.query, colorMode: colorMode)
            Divider()
              .padding(.leading, 58)
          }
        }
      }
    }
  }

  // MARK: - Suggestions

  private var suggestionsView: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        Text("Quick Search")
          .font(.footnote.weight(.bold))
          .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
          .padding(.horizontal, 18)
          .padding(.top, 18)

        let suggestions = ["Swift", "Firebase", "AI", "Healthcare", "TypeScript", "Cloud", "HL7", "React"]
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 100), spacing: 10)], spacing: 10) {
          ForEach(suggestions, id: \.self) { term in
            Button {
              engine.query = term
              engine.search()
            } label: {
              Text(term)
                .font(.footnote.weight(.bold))
                .foregroundStyle(PortfolioTheme.ink(colorMode))
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .frame(maxWidth: .infinity)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                  RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(PortfolioTheme.border, lineWidth: 1)
                )
            }
          }
        }
        .padding(.horizontal, 18)
      }
    }
  }
}

// MARK: - Search Result Row

private struct SearchResultRow: View {
  let result: SearchResult
  let query: String
  let colorMode: PortfolioColorMode

  var body: some View {
    HStack(spacing: 14) {
      Image(systemName: result.category.icon)
        .font(.system(size: 15, weight: .bold))
        .foregroundStyle(PortfolioTheme.accent(colorMode))
        .frame(width: 36, height: 36)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10, style: .continuous))

      VStack(alignment: .leading, spacing: 3) {
        HighlightedText(text: result.title, highlight: query, colorMode: colorMode)
          .font(.subheadline.weight(.semibold))

        if !result.subtitle.isEmpty {
          Text(result.subtitle)
            .font(.footnote.weight(.medium))
            .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
            .lineLimit(1)
        }
      }

      Spacer()

      Text(result.category.rawValue)
        .font(.caption2.weight(.bold))
        .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(.ultraThinMaterial, in: Capsule())
    }
    .padding(.horizontal, 18)
    .padding(.vertical, 12)
    .contentShape(Rectangle())
  }
}

// MARK: - Highlighted Text

private struct HighlightedText: View {
  let text: String
  let highlight: String
  let colorMode: PortfolioColorMode

  var body: some View {
    let lower = text.lowercased()
    let hlower = highlight.lowercased()

    if let range = lower.range(of: hlower) {
      let before = String(text[text.startIndex..<range.lowerBound])
      let match = String(text[range])
      let after = String(text[range.upperBound...])

      return Text(before)
        .foregroundStyle(PortfolioTheme.ink(colorMode))
        + Text(match)
        .foregroundStyle(PortfolioTheme.accent(colorMode))
        .fontWeight(.bold)
        + Text(after)
        .foregroundStyle(PortfolioTheme.ink(colorMode))
    }

    return Text(text)
      .foregroundStyle(PortfolioTheme.ink(colorMode))
      + Text("") + Text("")
  }
}
