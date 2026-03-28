import Foundation

enum ContactContentFixture {
  static let saleh = ContactSection(
    intro: "I build full-stack software products and scalable systems across AI, cloud, cybersecurity, databases, and healthcare integrations. I’m open to software engineering roles and freelance project collaborations; the best starting point is email or LinkedIn.",
    email: .init(title: "Email", subtitle: "salehabbaas97@gmail.com", url: URL(string: "mailto:salehabbaas97@gmail.com")!),
    website: .init(title: "Website", subtitle: "salehabbaas.com", url: URL(string: "https://salehabbaas.com")!),
    linkedin: .init(title: "LinkedIn", subtitle: "linkedin.com/in/salehabbaas", url: URL(string: "https://www.linkedin.com/in/salehabbaas")!),
    socialLinks: [
      .init(title: "YouTube", subtitle: "youtube.com/@salehabbaas", url: URL(string: "https://youtube.com/@salehabbaas")!)
    ]
  )
}
