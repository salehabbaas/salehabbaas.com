import Foundation

struct FocusArea: Identifiable {
  let title: String
  let summary: String
  let tags: [String]
  var id: String { title }
}
