import Foundation

struct HeroStat: Identifiable {
  let label: String
  let value: String
  var id: String { label }
}

struct HeroSection {
  let name: String
  let headline: String
  let intro: String
  let location: String
  let badge: String
  let ctaTitle: String
  let ctaURL: URL
  let secondaryTitle: String
  let secondaryURL: URL
  let valueStatement: String
  let stats: [HeroStat]
}
