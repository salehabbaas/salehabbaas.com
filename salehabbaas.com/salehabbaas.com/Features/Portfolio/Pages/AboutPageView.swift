import SwiftUI

struct AboutPageView: View {
  let content: PortfolioDocument
  let isRegularWidth: Bool
  let colorMode: PortfolioColorMode

  private var twoColumnGrid: [GridItem] {
    if isRegularWidth {
      return [
        GridItem(.flexible(minimum: 220), spacing: 12, alignment: .topLeading),
        GridItem(.flexible(minimum: 220), spacing: 12, alignment: .topLeading)
      ]
    }

    return [GridItem(.flexible(minimum: 0), spacing: 12, alignment: .topLeading)]
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 20) {
      AboutHeaderBlock(content: content, isRegularWidth: isRegularWidth)

      LazyVGrid(columns: twoColumnGrid, alignment: .leading, spacing: 12) {
        ForEach(content.about.identityFacts) { fact in
          AboutFactTile(fact: fact)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)

      AboutMissionAndMagicBlock(
        mission: content.about.mission,
        magic: content.about.magic,
        bringingToLife: content.about.bringingToLife,
        isRegularWidth: isRegularWidth
      )

      AboutPrinciplesBlock(principles: content.about.principles)

      AboutEducationBlock(education: content.about.education)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

private struct AboutHeaderBlock: View {
  let content: PortfolioDocument
  let isRegularWidth: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      Text("About")
        .font(.system(.caption, design: .rounded, weight: .bold))
        .tracking(1.2)
        .foregroundStyle(PortfolioTheme.accentStrong)

      Text("How I Think, Build, And Deliver")
        .font(.system(size: isRegularWidth ? 38 : 31, weight: .bold, design: .serif))
        .foregroundStyle(PortfolioTheme.ink)
        .fixedSize(horizontal: false, vertical: true)

      Text(content.about.summary)
        .font(.system(.body, design: .rounded, weight: .medium))
        .foregroundStyle(PortfolioTheme.ink.opacity(0.9))
        .lineSpacing(6)
        .fixedSize(horizontal: false, vertical: true)

      Text(content.profile.valueStatement)
        .font(.system(.subheadline, design: .rounded, weight: .semibold))
        .foregroundStyle(PortfolioTheme.secondaryInk)
        .lineSpacing(5)
        .fixedSize(horizontal: false, vertical: true)
    }
    .padding(isRegularWidth ? 24 : 18)
    .overlay(alignment: .top) {
      Rectangle()
        .fill(PortfolioTheme.divider)
        .frame(height: 1)
    }
    .overlay(alignment: .bottom) {
      Rectangle()
        .fill(PortfolioTheme.divider)
        .frame(height: 1)
    }
  }
}

private struct AboutFactTile: View {
  let fact: AboutFact

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(spacing: 10) {
        Image(systemName: fact.icon)
          .font(.system(size: 14, weight: .bold))
          .foregroundStyle(PortfolioTheme.accentStrong)
          .frame(width: 28, height: 28)
          .background(PortfolioTheme.chipGradient, in: Circle())

        Text(fact.title)
          .font(.system(.subheadline, design: .rounded, weight: .bold))
          .foregroundStyle(PortfolioTheme.ink)
          .lineLimit(2)
      }

      Text(fact.value)
        .font(.system(.subheadline, design: .rounded, weight: .medium))
        .foregroundStyle(PortfolioTheme.secondaryInk)
        .lineSpacing(4)
        .fixedSize(horizontal: false, vertical: true)
    }
    .padding(14)
    .frame(maxWidth: .infinity, alignment: .leading)
    .overlay(alignment: .top) {
      Rectangle()
        .fill(PortfolioTheme.divider)
        .frame(height: 1)
    }
    .overlay(alignment: .bottom) {
      Rectangle()
        .fill(PortfolioTheme.divider)
        .frame(height: 1)
    }
  }
}

private struct AboutMissionAndMagicBlock: View {
  let mission: String
  let magic: [String]
  let bringingToLife: [String]
  let isRegularWidth: Bool

  var body: some View {
    Group {
      if isRegularWidth {
        HStack(alignment: .top, spacing: 14) {
          missionColumn
            .frame(maxWidth: .infinity, alignment: .leading)
          executionColumn
            .frame(maxWidth: .infinity, alignment: .leading)
        }
      } else {
        VStack(alignment: .leading, spacing: 14) {
          missionColumn
          executionColumn
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private var missionColumn: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Mission")
        .font(.system(.title3, design: .serif, weight: .bold))
        .foregroundStyle(PortfolioTheme.ink)

      Text(mission)
        .font(.system(.subheadline, design: .rounded, weight: .medium))
        .foregroundStyle(PortfolioTheme.secondaryInk)
        .lineSpacing(5)

      Divider()
        .overlay(PortfolioTheme.divider)

      Text("Bringing It To Life")
        .font(.system(.headline, design: .serif, weight: .bold))
        .foregroundStyle(PortfolioTheme.ink)

      ForEach(bringingToLife, id: \.self) { item in
        AboutBulletRow(icon: "sparkles", text: item)
      }
    }
    .padding(16)
    .overlay(alignment: .top) {
      Rectangle()
        .fill(PortfolioTheme.divider)
        .frame(height: 1)
    }
    .overlay(alignment: .bottom) {
      Rectangle()
        .fill(PortfolioTheme.divider)
        .frame(height: 1)
    }
  }

  private var executionColumn: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("My Magic")
        .font(.system(.title3, design: .serif, weight: .bold))
        .foregroundStyle(PortfolioTheme.ink)

      ForEach(magic, id: \.self) { item in
        AboutBulletRow(icon: "bolt.horizontal.fill", text: item)
      }
    }
    .padding(16)
    .overlay(alignment: .top) {
      Rectangle()
        .fill(PortfolioTheme.divider)
        .frame(height: 1)
    }
    .overlay(alignment: .bottom) {
      Rectangle()
        .fill(PortfolioTheme.divider)
        .frame(height: 1)
    }
  }
}

private struct AboutPrinciplesBlock: View {
  let principles: [String]

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text("Working Principles")
        .font(.system(.title3, design: .serif, weight: .bold))
        .foregroundStyle(PortfolioTheme.ink)

      ForEach(Array(principles.enumerated()), id: \.offset) { index, principle in
        HStack(alignment: .top, spacing: 10) {
          Text("\(index + 1)")
            .font(.system(.footnote, design: .rounded, weight: .bold))
            .foregroundStyle(PortfolioTheme.accentStrong)
            .frame(width: 24, height: 24)
            .background(PortfolioTheme.chipGradient, in: Circle())

          Text(principle)
            .font(.system(.subheadline, design: .rounded, weight: .medium))
            .foregroundStyle(PortfolioTheme.secondaryInk)
            .lineSpacing(4)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, 2)
      }
    }
    .padding(16)
    .overlay(alignment: .top) {
      Rectangle()
        .fill(PortfolioTheme.divider)
        .frame(height: 1)
    }
    .overlay(alignment: .bottom) {
      Rectangle()
        .fill(PortfolioTheme.divider)
        .frame(height: 1)
    }
  }
}

private struct AboutEducationBlock: View {
  let education: [EducationEntry]

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text("Education")
        .font(.system(.title3, design: .serif, weight: .bold))
        .foregroundStyle(PortfolioTheme.ink)

      ForEach(education) { entry in
        VStack(alignment: .leading, spacing: 4) {
          Text(entry.institution)
            .font(.system(.headline, design: .rounded, weight: .bold))
            .foregroundStyle(PortfolioTheme.ink)

          Text("\(entry.degree) in \(entry.field)")
            .font(.system(.subheadline, design: .rounded, weight: .semibold))
            .foregroundStyle(PortfolioTheme.secondaryInk)

          Text(entry.period)
            .font(.system(.footnote, design: .rounded, weight: .bold))
            .foregroundStyle(PortfolioTheme.accentStrong)
        }
        .padding(.vertical, 6)
      }
    }
    .padding(16)
    .frame(maxWidth: .infinity, alignment: .leading)
    .overlay(alignment: .top) {
      Rectangle()
        .fill(PortfolioTheme.divider)
        .frame(height: 1)
    }
    .overlay(alignment: .bottom) {
      Rectangle()
        .fill(PortfolioTheme.divider)
        .frame(height: 1)
    }
  }
}

private struct AboutBulletRow: View {
  let icon: String
  let text: String

  var body: some View {
    HStack(alignment: .top, spacing: 10) {
      Image(systemName: icon)
        .font(.system(size: 11, weight: .bold))
        .foregroundStyle(PortfolioTheme.accent)
        .padding(.top, 4)

      Text(text)
        .font(.system(.subheadline, design: .rounded, weight: .medium))
        .foregroundStyle(PortfolioTheme.secondaryInk)
        .lineSpacing(4)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
  }
}

#Preview {
  AboutPageView(content: .saleh, isRegularWidth: false, colorMode: .light)
}
