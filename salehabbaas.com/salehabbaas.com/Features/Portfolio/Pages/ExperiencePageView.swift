import SwiftUI

struct ExperiencePageView: View {
  let content: PortfolioDocument
  @State private var expandedEntries: Set<String> = []
  
  private var experienceEntries: [ExperienceItem] {
    content.experience.filter { $0.kind == .work && !isStartupEntry($0) }
  }
  
  private var startupEntries: [ExperienceItem] {
    content.experience.filter { $0.kind == .work && isStartupEntry($0) }
  }
  
  private var volunteeringEntries: [ExperienceItem] {
    content.experience.filter { $0.kind == .volunteering }
  }
  
  private var projectEntries: [ExperienceItem] {
    content.experience.filter { $0.kind == .project }
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 22) {
      experienceSection
      projectsSection
      startupSection
      volunteeringSection
    }
  }
  
  private var experienceSection: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Experience")
        .font(.system(.title2, design: .serif, weight: .bold))
        .foregroundStyle(PortfolioTheme.ink)
      
      VStack(spacing: 18) {
        ForEach(Array(experienceEntries.enumerated()), id: \.element.id) { index, entry in
          experienceCard(entry: entry, index: index)
        }
      }
    }
  }
  
  private var projectsSection: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Projects")
        .font(.system(.title2, design: .serif, weight: .bold))
        .foregroundStyle(PortfolioTheme.ink)
      
      VStack(spacing: 18) {
        ForEach(Array(projectEntries.enumerated()), id: \.element.id) { index, entry in
          experienceCard(entry: entry, index: index + experienceEntries.count)
        }
      }
    }
  }
  
  private var startupSection: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Startup Experience")
        .font(.system(.title2, design: .serif, weight: .bold))
        .foregroundStyle(PortfolioTheme.ink)
      
      VStack(spacing: 18) {
        ForEach(Array(startupEntries.enumerated()), id: \.element.id) { index, entry in
          experienceCard(entry: entry, index: index + experienceEntries.count + projectEntries.count)
        }
      }
    }
  }
  
  private var volunteeringSection: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Volunteering")
        .font(.system(.title2, design: .serif, weight: .bold))
        .foregroundStyle(PortfolioTheme.ink)
      
      VStack(spacing: 18) {
        ForEach(Array(volunteeringEntries.enumerated()), id: \.element.id) { index, entry in
          experienceCard(entry: entry, index: index + experienceEntries.count + projectEntries.count + startupEntries.count)
        }
      }
    }
  }
  
  private func isStartupEntry(_ entry: ExperienceItem) -> Bool {
    entry.organization.localizedCaseInsensitiveContains("Artelo")
  }
  
  @ViewBuilder
  private func experienceCard(entry: ExperienceItem, index: Int) -> some View {
    PortfolioSectionSurface(accent: PortfolioVisuals.accentColor(for: index)) {
      HStack(alignment: .top, spacing: 18) {
        VStack(spacing: 10) {
          Image(systemName: entry.kind.iconName)
            .font(.system(size: 20, weight: .bold))
            .foregroundStyle(PortfolioTheme.accentStrong)
            .frame(width: 54, height: 54)
            .background(.ultraThinMaterial, in: Circle())

          Rectangle()
            .fill(PortfolioTheme.border)
            .frame(width: 2)
        }
        .frame(width: 56)

        VStack(alignment: .leading, spacing: 10) {
          HStack(alignment: .center, spacing: 8) {
            PortfolioExperienceKindBadge(kind: entry.kind)

            if let associatedWith = entry.associatedWith, !associatedWith.isEmpty {
              Label(associatedWith, systemImage: "building.2.fill")
                .font(.system(.caption2, design: .rounded, weight: .bold))
                .foregroundStyle(PortfolioTheme.secondaryInk)
                .lineLimit(2)
            }
          }

          Text(entry.period.uppercased())
            .font(.system(.caption, design: .rounded, weight: .bold))
            .tracking(1.6)
            .foregroundStyle(PortfolioTheme.secondaryInk)

          Text(entry.role)
            .font(.system(.title3, design: .serif, weight: .bold))
            .foregroundStyle(PortfolioTheme.ink)

          Text(entry.organization)
            .font(.system(.subheadline, design: .rounded, weight: .semibold))
            .foregroundStyle(PortfolioTheme.accentStrong)

          Label(entry.location, systemImage: "mappin.circle.fill")
            .font(.system(.footnote, design: .rounded, weight: .bold))
            .foregroundStyle(PortfolioTheme.secondaryInk)

          if let repositoryURL = entry.repositoryURL {
            Link(destination: repositoryURL) {
              Label("Repository", systemImage: "arrow.up.right.square.fill")
                .font(.system(.footnote, design: .rounded, weight: .bold))
            }
            .tint(PortfolioTheme.accent)
          }

          Text(entry.summary)
            .font(.system(.subheadline, design: .rounded, weight: .medium))
            .foregroundStyle(PortfolioTheme.ink.opacity(0.86))
            .lineSpacing(6)
          
          DisclosureGroup(
            isExpanded: Binding(
              get: { expandedEntries.contains(entry.id) },
              set: { isExpanded in
                if isExpanded {
                  expandedEntries.insert(entry.id)
                } else {
                  expandedEntries.remove(entry.id)
                }
              }
            )
          ) {
            VStack(alignment: .leading, spacing: 12) {
              PortfolioBulletList(items: entry.bullets)

              if !entry.skills.isEmpty {
                PortfolioFlexibleTagCloud(tags: entry.skills, columns: 2)
              }
            }
            .padding(.top, 10)
          } label: {
            Text("More details")
              .font(.system(.footnote, design: .rounded, weight: .bold))
              .foregroundStyle(PortfolioTheme.accent)
          }
          .tint(PortfolioTheme.accent)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
    }
  }
}

#Preview {
  ExperiencePageView(content: .saleh)
}
