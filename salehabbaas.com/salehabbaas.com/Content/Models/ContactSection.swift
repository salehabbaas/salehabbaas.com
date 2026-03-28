import Foundation

struct ContactLink: Identifiable {
  let title: String
  let subtitle: String
  let url: URL
  var id: String { title + subtitle }
}

struct ContactSection {
  let intro: String
  let email: ContactLink
  let website: ContactLink
  let linkedin: ContactLink
  let socialLinks: [ContactLink]

  var allLinks: [ContactLink] {
    [email, website, linkedin] + socialLinks
  }
}
