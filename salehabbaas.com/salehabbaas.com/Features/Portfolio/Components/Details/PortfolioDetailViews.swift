import SwiftUI

struct PortfolioStatStrip: View {
  let stat: HeroStat

  var body: some View {
    HStack(alignment: .firstTextBaseline) {
      Text(stat.value)
        .font(.system(.title2, design: .serif, weight: .bold))
        .foregroundStyle(PortfolioTheme.ink)

      Spacer(minLength: 10)

      Text(stat.label)
        .font(.system(.footnote, design: .rounded, weight: .bold))
        .foregroundStyle(PortfolioTheme.secondaryInk)
        .multilineTextAlignment(.trailing)
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 14)
    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: 20, style: .continuous)
        .stroke(PortfolioTheme.border, lineWidth: 1)
    )
  }
}

struct PortfolioBulletList: View {
  let items: [String]

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      ForEach(items, id: \.self) { item in
        HStack(alignment: .top, spacing: 10) {
          Circle()
            .fill(PortfolioTheme.accentStrong)
            .frame(width: 7, height: 7)
            .padding(.top, 7)

          Text(item)
            .font(.system(.subheadline, design: .rounded, weight: .medium))
            .foregroundStyle(PortfolioTheme.ink.opacity(0.9))
            .lineSpacing(5)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
      }
    }
  }
}

struct PortfolioEducationCard: View {
  let education: EducationEntry

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(education.institution)
        .font(.system(.headline, design: .serif, weight: .bold))
        .foregroundStyle(PortfolioTheme.ink)

      Text("\(education.degree) in \(education.field)")
        .font(.system(.subheadline, design: .rounded, weight: .semibold))
        .foregroundStyle(PortfolioTheme.secondaryInk)

      Text(education.period)
        .font(.system(.footnote, design: .rounded, weight: .bold))
        .foregroundStyle(PortfolioTheme.accentStrong)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.vertical, 12)
    .overlay(alignment: .top) {
      Rectangle()
        .fill(PortfolioTheme.divider)
        .frame(height: 1)
    }
  }
}

struct PortfolioLanguageRow: View {
  let language: LanguageEntry

  var body: some View {
    HStack(alignment: .firstTextBaseline) {
      Text(language.name)
        .font(.system(.headline, design: .rounded, weight: .semibold))
        .foregroundStyle(PortfolioTheme.ink)

      Spacer(minLength: 12)

      Text(language.level)
        .font(.system(.footnote, design: .rounded, weight: .bold))
        .foregroundStyle(PortfolioTheme.secondaryInk)
        .multilineTextAlignment(.trailing)
    }
    .padding(.vertical, 8)
    .overlay(alignment: .top) {
      Rectangle()
        .fill(PortfolioTheme.divider)
        .frame(height: 1)
    }
  }
}

struct PortfolioCertificationRow: View {
  let certification: CertificationEntry

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(alignment: .top, spacing: 12) {
        Image(systemName: "checkmark.seal.fill")
          .font(.system(size: 16, weight: .bold))
          .foregroundStyle(PortfolioTheme.accentStrong)
          .padding(.top, 2)

        VStack(alignment: .leading, spacing: 4) {
          Text(certification.title)
            .font(.system(.subheadline, design: .rounded, weight: .semibold))
            .foregroundStyle(PortfolioTheme.ink)
            .lineSpacing(5)
            .frame(maxWidth: .infinity, alignment: .leading)

          Text("\(certification.issuer) • Issued \(certification.issued)\(expirationSuffix)")
            .font(.system(.footnote, design: .rounded, weight: .bold))
            .foregroundStyle(PortfolioTheme.secondaryInk)
            .lineSpacing(4)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
      }

      if !certification.relatedSkills.isEmpty {
        Text(certification.relatedSkills.joined(separator: " • "))
          .font(.system(.footnote, design: .rounded, weight: .medium))
          .foregroundStyle(PortfolioTheme.secondaryInk)
          .lineSpacing(4)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
    }
    .padding(.vertical, 8)
    .overlay(alignment: .top) {
      Rectangle()
        .fill(PortfolioTheme.divider)
        .frame(height: 1)
    }
  }

  private var expirationSuffix: String {
    guard let expires = certification.expires, !expires.isEmpty else { return "" }
    return " • Expires \(expires)"
  }
}

struct PortfolioSkillSectionHeader: View {
  let group: SkillCategory

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(group.title)
        .font(.system(.title3, design: .serif, weight: .bold))
        .foregroundStyle(PortfolioTheme.ink)

      Text("\(group.items.count) capabilities aligned to this area")
        .font(.system(.footnote, design: .rounded, weight: .bold))
        .foregroundStyle(PortfolioTheme.secondaryInk)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

struct PortfolioExperienceKindBadge: View {
  let kind: ExperienceKind

  var body: some View {
    Label(kind.title, systemImage: kind.iconName)
      .font(.system(.caption2, design: .rounded, weight: .bold))
      .foregroundStyle(PortfolioTheme.accentStrong)
      .padding(.horizontal, 10)
      .padding(.vertical, 6)
      .background(.ultraThinMaterial, in: Capsule())
      .overlay(Capsule().stroke(PortfolioTheme.border, lineWidth: 1))
  }
}
