import Foundation

enum HeroContentFixture {
  static let saleh = HeroSection(
    name: "Saleh Abbaas",
    headline: "Software Engineer | Full-Stack Engineer | AI / Cloud Systems | SalehAbbaas.com",
    intro: "I build full-stack software products and scalable platforms with practical experience in AI, cloud systems, databases, cybersecurity, and healthcare integrations.",
    location: "Ottawa, Ontario, Canada",
    badge: "Software Engineer • Full-Stack • AI • Cloud",
    ctaTitle: "Email Saleh",
    ctaURL: URL(string: "mailto:salehabbaas97@gmail.com")!,
    secondaryTitle: "View LinkedIn",
    secondaryURL: URL(string: "https://www.linkedin.com/in/salehabbaas")!,
    valueStatement: "I focus on building reliable full-stack systems that deliver measurable outcomes, from architecture and integrations to secure deployment and product execution.",
    stats: [
      .init(label: "Years Building", value: "6+"),
      .init(label: "Languages", value: "3"),
      .init(label: "Certifications", value: "15"),
      .init(label: "Featured Projects", value: "5+")
    ]
  )
}
