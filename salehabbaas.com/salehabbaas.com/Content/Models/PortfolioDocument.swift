import Foundation

struct PortfolioDocument {
  let profile: HeroSection
  let about: AboutSection
  let skills: SkillsSection
  let experience: [ExperienceItem]
  let focusAreas: [FocusArea]
  let contact: ContactSection
}
