import SwiftUI

struct JobTrackerView: View {
  let colorMode: PortfolioColorMode

  @State private var jobs: [AdminJob] = []
  @State private var isLoading = false
  @State private var selectedStatus: String = "All"
  @State private var searchText = ""

  private let statuses = ["All", "applied", "screening", "interview", "offer", "rejected", "withdrawn"]

  private var filtered: [AdminJob] {
    jobs.filter { job in
      let statusMatch = selectedStatus == "All" || (job.status ?? "").lowercased() == selectedStatus
      let searchMatch = searchText.isEmpty ||
        (job.title ?? "").localizedCaseInsensitiveContains(searchText) ||
        (job.company ?? "").localizedCaseInsensitiveContains(searchText)
      return statusMatch && searchMatch
    }
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      // Header
      HStack {
        VStack(alignment: .leading, spacing: 2) {
          Text("Job Tracker")
            .font(.headline.weight(.bold))
            .foregroundStyle(PortfolioTheme.ink(colorMode))
          Text("\(jobs.count) applications tracked")
            .font(.footnote.weight(.medium))
            .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
        }
        Spacer()
        Button {
          Task { await loadJobs() }
        } label: {
          Image(systemName: "arrow.clockwise")
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(PortfolioTheme.accent(colorMode))
        }
        .disabled(isLoading)
      }

      // Stats strip
      if !jobs.isEmpty {
        statsStrip
      }

      // Search bar
      HStack(spacing: 10) {
        Image(systemName: "magnifyingglass")
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
        TextField("Search jobs...", text: $searchText)
          .font(.subheadline.weight(.medium))
          .foregroundStyle(PortfolioTheme.ink(colorMode))
        if !searchText.isEmpty {
          Button { searchText = "" } label: {
            Image(systemName: "xmark.circle.fill")
              .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
          }
        }
      }
      .padding(.horizontal, 14)
      .padding(.vertical, 11)
      .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
      .overlay(
        RoundedRectangle(cornerRadius: 12, style: .continuous)
          .strokeBorder(PortfolioTheme.border, lineWidth: 1)
      )

      // Status filter
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 8) {
          ForEach(statuses, id: \.self) { status in
            Button {
              withAnimation(.snappy(duration: 0.2)) { selectedStatus = status }
            } label: {
              HStack(spacing: 5) {
                if status != "All" {
                  Circle()
                    .fill(statusColor(status))
                    .frame(width: 6, height: 6)
                }
                Text(status == "All" ? "All" : status.capitalized)
                  .font(.caption2.weight(.bold))
              }
              .foregroundStyle(selectedStatus == status ? .white : PortfolioTheme.ink(colorMode))
              .padding(.horizontal, 12)
              .padding(.vertical, 7)
              .background(
                selectedStatus == status
                  ? PortfolioTheme.buttonGradient
                  : LinearGradient(colors: [.clear], startPoint: .leading, endPoint: .trailing),
                in: Capsule()
              )
              .overlay(Capsule().strokeBorder(selectedStatus == status ? .clear : PortfolioTheme.border, lineWidth: 1))
            }
          }
        }
        .padding(.horizontal, 2)
      }

      // Jobs list
      if isLoading && jobs.isEmpty {
        ProgressView()
          .frame(maxWidth: .infinity)
          .padding(.vertical, 30)
      } else if filtered.isEmpty {
        Text("No jobs found.")
          .font(.subheadline.weight(.medium))
          .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
          .frame(maxWidth: .infinity)
          .padding(.vertical, 20)
      } else {
        ForEach(filtered) { job in
          JobCard(job: job, colorMode: colorMode)
        }
      }
    }
    .task { await loadJobs() }
  }

  private var statsStrip: some View {
    let counts = Dictionary(grouping: jobs, by: { $0.status ?? "unknown" })
      .mapValues(\.count)

    return ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 10) {
        ForEach([("applied", "paperplane.fill"), ("interview", "person.2.fill"), ("offer", "star.fill"), ("rejected", "xmark.circle.fill")], id: \.0) { (status, icon) in
          VStack(spacing: 3) {
            Image(systemName: icon)
              .font(.system(size: 11, weight: .bold))
              .foregroundStyle(statusColor(status))
            Text("\(counts[status] ?? 0)")
              .font(.headline.weight(.bold))
              .foregroundStyle(PortfolioTheme.ink(colorMode))
            Text(status.capitalized)
              .font(.caption2.weight(.bold))
              .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
          }
          .frame(minWidth: 60)
          .padding(.vertical, 10)
          .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
          .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
              .strokeBorder(PortfolioTheme.border, lineWidth: 1)
          )
        }
      }
      .padding(.horizontal, 2)
    }
  }

  @MainActor
  private func loadJobs() async {
    isLoading = true
    do {
      await AdminAuthManager.shared.ensureValidToken()
      let response = try await APIClient.shared.fetchAdminJobs()
      jobs = response.jobs ?? []
    } catch {
      print("[JobTracker] \(error.localizedDescription)")
    }
    isLoading = false
  }

  private func statusColor(_ status: String) -> Color {
    switch status.lowercased() {
    case "applied": return .blue
    case "screening": return .cyan
    case "interview": return .orange
    case "offer": return .green
    case "rejected": return .red
    case "withdrawn": return .gray
    default: return PortfolioTheme.accent(.dark)
    }
  }
}

// MARK: - Job Card

private struct JobCard: View {
  let job: AdminJob
  let colorMode: PortfolioColorMode

  @State private var isExpanded = false

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Button {
        withAnimation(.snappy(duration: 0.25)) { isExpanded.toggle() }
      } label: {
        HStack(alignment: .top, spacing: 12) {
          VStack(alignment: .leading, spacing: 4) {
            Text(job.title ?? "Unknown Role")
              .font(.subheadline.weight(.semibold))
              .foregroundStyle(PortfolioTheme.ink(colorMode))
            Text(job.company ?? "Unknown Company")
              .font(.footnote.weight(.medium))
              .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
          }
          Spacer()
          statusBadge
          Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
        }
      }
      .buttonStyle(.plain)

      if isExpanded {
        Divider().opacity(0.4)
        VStack(alignment: .leading, spacing: 8) {
          if let location = job.location {
            infoRow(icon: "mappin.fill", text: location)
          }
          if let applied = job.appliedAt {
            infoRow(icon: "calendar", text: "Applied: \(formatDate(applied))")
          }
          if let followUp = job.followUpAt {
            infoRow(icon: "alarm.fill", text: "Follow up: \(formatDate(followUp))")
          }
          if let salary = job.salary, !salary.isEmpty {
            infoRow(icon: "dollarsign.circle.fill", text: salary)
          }
          if let notes = job.notes, !notes.isEmpty {
            Text(notes)
              .font(.footnote.weight(.medium))
              .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
              .lineSpacing(3)
              .padding(.top, 2)
          }
          if let urlStr = job.url, let url = URL(string: urlStr) {
            Link(destination: url) {
              Label("View Job", systemImage: "arrow.up.right.square")
                .font(.footnote.weight(.bold))
                .foregroundStyle(PortfolioTheme.accent(colorMode))
            }
          }
        }
      }
    }
    .padding(14)
    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .strokeBorder(PortfolioTheme.border, lineWidth: 1)
    )
  }

  private var statusBadge: some View {
    Text((job.status ?? "unknown").capitalized)
      .font(.caption2.weight(.bold))
      .foregroundStyle(.white)
      .padding(.horizontal, 9)
      .padding(.vertical, 4)
      .background(statusColor, in: Capsule())
  }

  private var statusColor: Color {
    switch (job.status ?? "").lowercased() {
    case "applied": return .blue
    case "screening": return .cyan
    case "interview": return .orange
    case "offer": return .green
    case "rejected": return .red
    default: return .gray
    }
  }

  private func infoRow(icon: String, text: String) -> some View {
    HStack(spacing: 6) {
      Image(systemName: icon)
        .font(.system(size: 11, weight: .semibold))
        .foregroundStyle(PortfolioTheme.accentStrong(colorMode))
        .frame(width: 14)
      Text(text)
        .font(.footnote.weight(.medium))
        .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
    }
  }

  private func formatDate(_ str: String) -> String {
    let f = ISO8601DateFormatter()
    guard let d = f.date(from: str) else {
      // Try simple date format
      let df = DateFormatter()
      df.dateFormat = "yyyy-MM-dd"
      guard let d2 = df.date(from: str) else { return str }
      df.dateFormat = "MMM d, yyyy"
      return df.string(from: d2)
    }
    let df = DateFormatter()
    df.dateFormat = "MMM d, yyyy"
    return df.string(from: d)
  }
}

// MARK: - Admin Bookings View

struct AdminBookingsView: View {
  let colorMode: PortfolioColorMode

  @State private var bookings: [AdminBooking] = []
  @State private var isLoading = false

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack {
        VStack(alignment: .leading, spacing: 2) {
          Text("Bookings")
            .font(.headline.weight(.bold))
            .foregroundStyle(PortfolioTheme.ink(colorMode))
          Text("\(bookings.count) total")
            .font(.footnote.weight(.medium))
            .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
        }
        Spacer()
        Button { Task { await loadBookings() } } label: {
          Image(systemName: "arrow.clockwise")
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(PortfolioTheme.accent(colorMode))
        }
        .disabled(isLoading)
      }

      if isLoading && bookings.isEmpty {
        ProgressView().frame(maxWidth: .infinity).padding(.vertical, 30)
      } else if bookings.isEmpty {
        Text("No bookings yet.")
          .font(.subheadline.weight(.medium))
          .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
          .frame(maxWidth: .infinity).padding(.vertical, 20)
      } else {
        ForEach(bookings) { booking in
          BookingAdminCard(booking: booking, colorMode: colorMode)
        }
      }
    }
    .task { await loadBookings() }
  }

  @MainActor
  private func loadBookings() async {
    isLoading = true
    do {
      await AdminAuthManager.shared.ensureValidToken()
      let response = try await APIClient.shared.fetchAdminBookings()
      bookings = (response.bookings ?? []).sorted {
        ($0.startAt ?? "") > ($1.startAt ?? "")
      }
    } catch { print("[AdminBookings] \(error)") }
    isLoading = false
  }
}

private struct BookingAdminCard: View {
  let booking: AdminBooking
  let colorMode: PortfolioColorMode

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text(booking.name ?? "Guest")
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(PortfolioTheme.ink(colorMode))
        Spacer()
        Text((booking.status ?? "confirmed").capitalized)
          .font(.caption2.weight(.bold))
          .foregroundStyle(booking.status == "confirmed" ? .green : .gray)
          .padding(.horizontal, 8).padding(.vertical, 3)
          .background((booking.status == "confirmed" ? Color.green : Color.gray).opacity(0.15), in: Capsule())
      }
      if let email = booking.email {
        Text(email)
          .font(.footnote.weight(.medium))
          .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
      }
      if let start = booking.startAt {
        HStack(spacing: 5) {
          Image(systemName: "calendar")
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(PortfolioTheme.accent(colorMode))
          Text(formatDateTime(start))
            .font(.footnote.weight(.medium))
            .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
          if let label = booking.meetingTypeLabel {
            Text("· \(label)")
              .font(.footnote.weight(.medium))
              .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
          }
        }
      }
      if let reason = booking.reason, !reason.isEmpty {
        Text(reason)
          .font(.footnote.weight(.medium))
          .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
          .lineLimit(2)
      }
    }
    .padding(14)
    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(PortfolioTheme.border, lineWidth: 1))
  }

  private func formatDateTime(_ iso: String) -> String {
    let f = ISO8601DateFormatter()
    guard let d = f.date(from: iso) else { return iso }
    let df = DateFormatter()
    df.dateFormat = "EEE, MMM d 'at' h:mm a"
    return df.string(from: d)
  }
}
