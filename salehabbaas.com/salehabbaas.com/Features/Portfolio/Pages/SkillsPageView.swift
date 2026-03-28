import SwiftUI

struct SkillsPageView: View {
  let content: PortfolioDocument
  let isRegularWidth: Bool
  @State private var expandedGroups: Set<String> = []
  @State private var certificationsExpanded = false

  var body: some View {
    VStack(spacing: 16) {
      PortfolioSectionSurface(accent: Color(red: 0.25, green: 0.54, blue: 0.84)) {
        VStack(alignment: .leading, spacing: 10) {
          Text("Top Skills")
            .font(.system(.title3, design: .serif, weight: .bold))
            .foregroundStyle(PortfolioTheme.ink)

          PortfolioFlexibleTagCloud(tags: content.skills.topSkills, columns: isRegularWidth ? 3 : 2)
        }
      }

      ForEach(Array(content.skills.groups.enumerated()), id: \.element.id) { index, group in
        PortfolioSectionSurface(accent: PortfolioVisuals.accentColor(for: index)) {
          VStack(alignment: .leading, spacing: 10) {
            PortfolioSkillSectionHeader(group: group)

            DisclosureGroup(
              isExpanded: Binding(
                get: { expandedGroups.contains(group.id) },
                set: { isExpanded in
                  if isExpanded {
                    expandedGroups.insert(group.id)
                  } else {
                    expandedGroups.remove(group.id)
                  }
                }
              )
            ) {
              PortfolioFlexibleTagCloud(tags: group.items, columns: isRegularWidth ? 3 : 2)
                .padding(.top, 8)
            } label: {
              Text("Show capabilities")
                .font(.system(.footnote, design: .rounded, weight: .bold))
                .foregroundStyle(PortfolioTheme.accent)
            }
            .tint(PortfolioTheme.accent)
          }
        }
      }

      Group {
        if isRegularWidth {
          HStack(alignment: .top, spacing: 20) {
            languagesSection
            certificationsSection
          }
        } else {
          VStack(alignment: .leading, spacing: 16) {
            languagesSection
            certificationsSection
          }
        }
      }
    }
  }

  private var languagesSection: some View {
    PortfolioSectionSurface(accent: Color(red: 0.18, green: 0.64, blue: 0.60)) {
      VStack(alignment: .leading, spacing: 10) {
        Text("Languages")
          .font(.system(.title3, design: .serif, weight: .bold))
          .foregroundStyle(PortfolioTheme.ink)

        ForEach(content.skills.languages) { language in
          PortfolioLanguageRow(language: language)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }

  private var certificationsSection: some View {
    PortfolioSectionSurface(accent: Color(red: 0.78, green: 0.52, blue: 0.24)) {
      VStack(alignment: .leading, spacing: 10) {
        Text("Certifications")
          .font(.system(.title3, design: .serif, weight: .bold))
          .foregroundStyle(PortfolioTheme.ink)

        DisclosureGroup(isExpanded: $certificationsExpanded) {
          VStack(alignment: .leading, spacing: 0) {
            ForEach(content.skills.certifications) { certification in
              PortfolioCertificationRow(certification: certification)
            }
          }
          .padding(.top, 8)
        } label: {
          Text("Show certifications")
            .font(.system(.footnote, design: .rounded, weight: .bold))
            .foregroundStyle(PortfolioTheme.accent)
        }
        .tint(PortfolioTheme.accent)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }
}

#Preview {
  SkillsPageView(content: .saleh, isRegularWidth: false)
}
