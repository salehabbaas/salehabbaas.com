import SwiftUI

struct BookingsFeatureView: View {
  @Bindable var appState: AppState
  @State private var snapshot: BookingsAdminSnapshotDTO?
  @State private var errorText = ""

  var body: some View {
    SAPageContainer(title: "Bookings") {
      Text("Booking management and slot controls.")

      if !errorText.isEmpty {
        Text(errorText)
          .foregroundStyle(.red)
          .font(.footnote)
      }

      if let snapshot {
        HStack {
          StatCard(label: "Bookings", value: String(snapshot.bookings.count))
        }

        ForEach(snapshot.bookings.prefix(12)) { booking in
          VStack(alignment: .leading, spacing: 4) {
            Text(booking.name).font(.headline)
            Text("\(booking.meetingTypeLabel) • \(booking.status)").font(.caption).foregroundStyle(.secondary)
          }
          .padding(12)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(SATheme.cardBackground)
          .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
      } else {
        ProgressView("Loading bookings...")
      }
    }
    .task {
      await load()
    }
  }

  private func load() async {
    do {
      snapshot = try await appState.mobileContent.fetchBookingsSnapshot()
      errorText = ""
    } catch {
      errorText = "Unable to load bookings data: \(error.localizedDescription)"
    }
  }
}

private struct StatCard: View {
  let label: String
  let value: String

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(value)
        .font(.title2.bold())
      Text(label)
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .padding(12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(SATheme.cardBackground)
    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
  }
}
