import SwiftUI

struct HomePageView: View {
  let content: PortfolioDocument
  let isRegularWidth: Bool
  let heroVisible: Bool
  let size: CGSize

  var body: some View {
    VStack(alignment: .leading, spacing: 22) {
      HomeHeroRedesign(
        profile: content.profile,
        isRegularWidth: isRegularWidth,
        heroVisible: heroVisible,
        size: size
      )

      HomeImpactSection(stats: content.profile.stats)

      HomeLatestSummarySection(content: content)

      HomeProfessionalSummarySection()
    }
  }
}

private struct HomeHeroRedesign: View {
  let profile: HeroSection
  let isRegularWidth: Bool
  let heroVisible: Bool
  let size: CGSize
  @State private var portraitFloating = false
  @State private var auraPulse = false

  private var portraitSize: CGFloat {
    isRegularWidth ? min(248, size.width * 0.25) : min(164, size.width * 0.37)
  }

  var body: some View {
    Group {
      if isRegularWidth {
        HStack(alignment: .center, spacing: 24) {
          copy
            .frame(maxWidth: .infinity, alignment: .leading)
          portrait
            .frame(width: portraitSize, height: portraitSize)
        }
      } else {
        VStack(alignment: .leading, spacing: 34) {
          portrait
            .frame(maxWidth: .infinity, alignment: .center)
          copy
        }
      }
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
    .scaleEffect(heroVisible ? 1 : 0.98)
    .opacity(heroVisible ? 1 : 0.4)
    .animation(.snappy(duration: 0.55, extraBounce: 0.05), value: heroVisible)
  }

  private var copy: some View {
    VStack(alignment: .leading, spacing: 14) {
      Text(profile.intro)
        .font(.system(.body, design: .rounded, weight: .medium))
        .foregroundStyle(PortfolioTheme.ink.opacity(0.9))
        .lineSpacing(6)

      Label(profile.location, systemImage: "mappin.and.ellipse")
        .font(.system(.subheadline, design: .rounded, weight: .semibold))
        .foregroundStyle(PortfolioTheme.secondaryInk)
        .lineLimit(2)
    }
  }

  private var portrait: some View {
    VStack(spacing: 8) {
      VStack(spacing: 2) {
        Text("Software Engineer")
          .font(.system(.callout, design: .rounded, weight: .bold))
          .foregroundStyle(PortfolioTheme.accentStrong)

        Text(profile.name)
          .font(.system(.title3, design: .serif, weight: .bold))
          .foregroundStyle(PortfolioTheme.ink)
      }

      ZStack {
        Circle()
          .fill(PortfolioTheme.accent.opacity(auraPulse ? 0.22 : 0.10))
          .frame(width: portraitSize * (auraPulse ? 1.20 : 1.08), height: portraitSize * (auraPulse ? 1.20 : 1.08))
          .blur(radius: auraPulse ? 14 : 8)

        Circle()
          .fill(PortfolioTheme.accentStrong.opacity(auraPulse ? 0.16 : 0.08))
          .frame(width: portraitSize * (auraPulse ? 1.10 : 1.03), height: portraitSize * (auraPulse ? 1.10 : 1.03))
          .blur(radius: auraPulse ? 10 : 6)

        Image("SalehPortrait")
          .resizable()
          .scaledToFill()
          .frame(width: portraitSize, height: portraitSize)
          .offset(y: 4)
          .scaleEffect(1.08)
          .clipShape(Circle())
          .shadow(color: PortfolioTheme.shadow.opacity(0.25), radius: 16, x: 0, y: 8)

        VStack(spacing: 0) {
          Spacer()

          Image("SalehLogo")
            .resizable()
            .scaledToFit()
            .frame(width: portraitSize * 0.26)
            .offset(y: portraitSize * 0.14)
        }
        .frame(width: portraitSize, height: portraitSize)
      }
    }
    .offset(y: (isRegularWidth ? 3 : 4) + (portraitFloating ? 2 : 0))
    .animation(.easeInOut(duration: 2.6).repeatForever(autoreverses: true), value: portraitFloating)
    .animation(.easeInOut(duration: 2.2).repeatForever(autoreverses: true), value: auraPulse)
    .task {
      portraitFloating = true
      auraPulse = true
    }
  }
}

private struct HomeImpactSection: View {
  let stats: [HeroStat]

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Impact At A Glance")
        .font(.system(.title3, design: .serif, weight: .bold))
        .foregroundStyle(PortfolioTheme.ink)

      VStack(spacing: 0) {
        ForEach(Array(stats.enumerated()), id: \.element.id) { index, stat in
          HStack(alignment: .firstTextBaseline, spacing: 14) {
            Text(stat.value)
              .font(.system(size: 24, weight: .bold, design: .rounded))
              .foregroundStyle(PortfolioTheme.accent)
              .frame(width: 84, alignment: .leading)

            Text(stat.label)
              .font(.system(.subheadline, design: .rounded, weight: .semibold))
              .foregroundStyle(PortfolioTheme.ink)
              .frame(maxWidth: .infinity, alignment: .leading)
          }
          .padding(.vertical, 12)

          if index != stats.count - 1 {
            Divider()
              .overlay(PortfolioTheme.divider)
          }
        }
      }
      .padding(.horizontal, 2)
    }
    .padding(18)
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

private struct HomeProfessionalSummarySection: View {
  private let topics: [(icon: String, title: String)] = [
    ("chevron.left.forwardslash.chevron.right", "Software Engineering"),
    ("cpu.fill", "Applied AI"),
    ("cloud.fill", "Cloud Architecture"),
    ("lock.shield.fill", "Cybersecurity"),
    ("cross.case.fill", "Healthcare Systems"),
    ("server.rack", "Databases & Data Systems"),
    ("arrow.triangle.branch", "System Integration")
  ]

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      Text("Professional Summary")
        .font(.system(.title3, design: .serif, weight: .bold))
        .foregroundStyle(PortfolioTheme.ink)

      Text("I’m a Software Engineer and Full-Stack Engineer building practical products and scalable systems. I combine engineering execution with AI, cloud, cybersecurity, and data-oriented architecture to deliver systems that are reliable, secure, and production-ready.")
        .font(.system(.subheadline, design: .rounded, weight: .medium))
        .foregroundStyle(PortfolioTheme.secondaryInk)
        .lineSpacing(5)

      Text("Open to full-time roles and freelance projects, with hands-on delivery across product engineering, healthcare integrations, secure platforms, and cloud-native software.")
        .font(.system(.subheadline, design: .rounded, weight: .semibold))
        .foregroundStyle(PortfolioTheme.ink.opacity(0.88))
        .lineSpacing(5)

      LazyVGrid(columns: [GridItem(.adaptive(minimum: 170), spacing: 10)], spacing: 10) {
        ForEach(topics, id: \.title) { topic in
          HStack(spacing: 8) {
            Image(systemName: topic.icon)
              .font(.system(size: 12, weight: .bold))
              .foregroundStyle(PortfolioTheme.accentStrong)

            Text(topic.title)
              .font(.system(.footnote, design: .rounded, weight: .bold))
              .foregroundStyle(PortfolioTheme.ink)
              .lineLimit(1)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, 12)
          .padding(.vertical, 9)
          .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
              .stroke(PortfolioTheme.border, lineWidth: 1)
          )
        }
      }
    }
    .padding(18)
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

private struct HomeLatestSummarySection: View {
  let content: PortfolioDocument

  private var ottawaHospitalRole: ExperienceItem? {
    content.experience.first { $0.kind == .work && $0.organization.lowercased().contains("ottawa hospital") }
  }

  private var bestProject: ExperienceItem? {
    content.experience.first { $0.kind == .project && $0.organization.lowercased().contains("salehabbaas.com") }
      ?? content.experience.first { $0.kind == .project }
  }

  private var topCertifications: [CertificationEntry] {
    Array(content.skills.certifications.prefix(3))
  }

  private var bachelorDegree: EducationEntry? {
    content.about.education.first
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      Text("Latest Summary")
        .font(.system(.title3, design: .serif, weight: .bold))
        .foregroundStyle(PortfolioTheme.ink)

      if let role = ottawaHospitalRole {
        summaryRow(
          icon: "building.2.fill",
          title: "Last Job (Ottawa Hospital)",
          detail: "\(role.role) • \(role.period)"
        )
      }

      if let project = bestProject {
        summaryRow(
          icon: "sparkles.rectangle.stack.fill",
          title: "Best Project",
          detail: "\(project.organization) • \(project.role)"
        )
      }

      if !topCertifications.isEmpty {
        summaryRow(
          icon: "checkmark.seal.fill",
          title: "Main Certifications",
          detail: topCertifications.map(\.title).joined(separator: " • ")
        )
      }

      if let degree = bachelorDegree {
        summaryRow(
          icon: "graduationcap.fill",
          title: "Bachelor Degree",
          detail: "\(degree.degree) in \(degree.field) • \(degree.institution)"
        )
      }
    }
    .padding(18)
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

  private func summaryRow(icon: String, title: String, detail: String) -> some View {
    HStack(alignment: .top, spacing: 10) {
      Image(systemName: icon)
        .font(.system(size: 13, weight: .bold))
        .foregroundStyle(PortfolioTheme.accentStrong)
        .frame(width: 22, height: 22)

      VStack(alignment: .leading, spacing: 3) {
        Text(title)
          .font(.system(.subheadline, design: .rounded, weight: .bold))
          .foregroundStyle(PortfolioTheme.ink)

        Text(detail)
          .font(.system(.footnote, design: .rounded, weight: .medium))
          .foregroundStyle(PortfolioTheme.secondaryInk)
          .lineSpacing(3)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }
}

#Preview {
  HomePageView(content: .saleh, isRegularWidth: false, heroVisible: true, size: CGSize(width: 390, height: 844))
}
