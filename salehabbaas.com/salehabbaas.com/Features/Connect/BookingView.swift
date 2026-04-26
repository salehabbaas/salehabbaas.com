import SwiftUI

struct BookingView: View {
  let colorMode: PortfolioColorMode
  @Environment(ContentProvider.self) private var content

  @State private var selectedMeetingType: APIMeetingType?
  @State private var selectedDate: String?
  @State private var selectedSlot: String?
  @State private var name = ""
  @State private var email = ""
  @State private var reason = ""
  @State private var isSubmitting = false
  @State private var showSuccess = false
  @State private var errorMessage: String?
  @State private var step = 0

  private var availability: BookingAvailabilityResponse? {
    content.bookingAvailability
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 18) {
      HStack {
        Text("Book a Meeting")
          .font(.title3.weight(.bold))
          .foregroundStyle(PortfolioTheme.ink(colorMode))
        Spacer()
        if step > 0 && !showSuccess {
          Button("Back") { withAnimation(.snappy) { step -= 1 } }
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(PortfolioTheme.accent(colorMode))
        }
      }

      if showSuccess {
        successView
      } else if availability == nil {
        loadingView
      } else if availability?.enabled == false {
        disabledView
      } else {
        switch step {
        case 0: meetingTypeStep
        case 1: dateStep
        case 2: slotStep
        case 3: detailsStep
        default: EmptyView()
        }
      }
    }
    .portfolioPanel(colorMode: colorMode)
  }

  // MARK: - Steps

  private var meetingTypeStep: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Select meeting type")
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))

      ForEach(availability?.meetingTypes ?? [], id: \.id) { type in
        Button {
          selectedMeetingType = type
          withAnimation(.snappy) { step = 1 }
        } label: {
          HStack {
            VStack(alignment: .leading, spacing: 4) {
              Text(type.label)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(PortfolioTheme.ink(colorMode))
              Text("\(type.durationMinutes) minutes")
                .font(.footnote.weight(.medium))
                .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
            }
            Spacer()
            Image(systemName: "chevron.right")
              .font(.footnote.weight(.bold))
              .foregroundStyle(PortfolioTheme.accent(colorMode))
          }
          .padding(16)
          .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
          .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
              .strokeBorder(PortfolioTheme.border, lineWidth: 1)
          )
        }
      }
    }
  }

  private var dateStep: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Pick a date")
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))

      let days = (availability?.days ?? []).filter { !$0.slots.isEmpty }
      if days.isEmpty {
        Text("No available dates at the moment.")
          .font(.subheadline.weight(.medium))
          .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
      } else {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 100), spacing: 10)], spacing: 10) {
          ForEach(days) { day in
            Button {
              selectedDate = day.date
              withAnimation(.snappy) { step = 2 }
            } label: {
              Text(formatDate(day.date))
                .font(.footnote.weight(.bold))
                .foregroundStyle(PortfolioTheme.ink(colorMode))
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                  RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(selectedDate == day.date ? PortfolioTheme.accent(colorMode) : PortfolioTheme.border, lineWidth: 1)
                )
            }
          }
        }
      }
    }
  }

  private var slotStep: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Pick a time")
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))

      let slots = (availability?.days ?? []).first(where: { $0.date == selectedDate })?.slots ?? []
      if slots.isEmpty {
        Text("No slots available for this date.")
          .font(.subheadline.weight(.medium))
          .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
      } else {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 90), spacing: 10)], spacing: 10) {
          ForEach(slots, id: \.self) { slot in
            Button {
              selectedSlot = slot
              withAnimation(.snappy) { step = 3 }
            } label: {
              Text(formatTime(slot))
                .font(.footnote.weight(.bold))
                .foregroundStyle(PortfolioTheme.ink(colorMode))
                .padding(.vertical, 10)
                .frame(maxWidth: .infinity)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                  RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(selectedSlot == slot ? PortfolioTheme.accent(colorMode) : PortfolioTheme.border, lineWidth: 1)
                )
            }
          }
        }
      }
    }
  }

  private var detailsStep: some View {
    VStack(alignment: .leading, spacing: 14) {
      if let type = selectedMeetingType, let slot = selectedSlot {
        HStack(spacing: 8) {
          Image(systemName: "calendar")
            .foregroundStyle(PortfolioTheme.accent(colorMode))
          Text("\(type.label) — \(formatDateTime(slot))")
            .font(.footnote.weight(.bold))
            .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
        }
      }

      bookingTextField(label: "Your Name", text: $name, icon: "person.fill")
      bookingTextField(label: "Your Email", text: $email, icon: "envelope.fill")

      VStack(alignment: .leading, spacing: 6) {
        Text("What would you like to discuss?")
          .font(.footnote.weight(.bold))
          .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
        TextEditor(text: $reason)
          .font(.subheadline.weight(.medium))
          .foregroundStyle(PortfolioTheme.ink(colorMode))
          .scrollContentBackground(.hidden)
          .frame(minHeight: 80, maxHeight: 140)
          .padding(12)
          .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
          .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
              .strokeBorder(PortfolioTheme.border, lineWidth: 1)
          )
      }

      if let error = errorMessage {
        Text(error)
          .font(.footnote.weight(.medium))
          .foregroundStyle(.red)
      }

      Button {
        Task { await submitBooking() }
      } label: {
        HStack(spacing: 8) {
          if isSubmitting {
            ProgressView().tint(.white).scaleEffect(0.8)
          }
          Text(isSubmitting ? "Booking..." : "Confirm Booking")
        }
        .frame(maxWidth: .infinity)
      }
      .buttonStyle(PortfolioPrimaryButtonStyle(colorMode: colorMode))
      .disabled(!isDetailsValid || isSubmitting)
      .opacity(isDetailsValid ? 1 : 0.5)
    }
  }

  // MARK: - Other Views

  private var loadingView: some View {
    HStack(spacing: 10) {
      ProgressView()
      Text("Loading availability...")
        .font(.subheadline.weight(.medium))
        .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
    }
  }

  private var disabledView: some View {
    VStack(spacing: 8) {
      Image(systemName: "calendar.badge.minus")
        .font(.system(size: 28))
        .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
      Text("Booking is currently unavailable.")
        .font(.subheadline.weight(.medium))
        .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 20)
  }

  private var successView: some View {
    VStack(spacing: 12) {
      Image(systemName: "checkmark.circle.fill")
        .font(.system(size: 44))
        .foregroundStyle(.green)
      Text("Meeting Booked!")
        .font(.headline.weight(.bold))
        .foregroundStyle(PortfolioTheme.ink(colorMode))
      Text("You'll receive a confirmation shortly.")
        .font(.subheadline.weight(.medium))
        .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))

      Button("Book Another") {
        reset()
      }
      .buttonStyle(PortfolioSecondaryButtonStyle(colorMode: colorMode))
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 12)
  }

  // MARK: - Helpers

  private func bookingTextField(label: String, text: Binding<String>, icon: String) -> some View {
    HStack(spacing: 10) {
      Image(systemName: icon)
        .font(.system(size: 14, weight: .semibold))
        .foregroundStyle(PortfolioTheme.accentStrong(colorMode))
        .frame(width: 20)
      TextField(label, text: text)
        .font(.subheadline.weight(.medium))
        .foregroundStyle(PortfolioTheme.ink(colorMode))
        .autocorrectionDisabled()
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 14)
    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: 14, style: .continuous)
        .strokeBorder(PortfolioTheme.border, lineWidth: 1)
    )
  }

  private var isDetailsValid: Bool {
    !name.trimmingCharacters(in: .whitespaces).isEmpty &&
    email.contains("@") &&
    reason.trimmingCharacters(in: .whitespaces).count >= 3
  }

  @MainActor
  private func submitBooking() async {
    guard let meetingType = selectedMeetingType, let slot = selectedSlot else { return }
    isSubmitting = true
    errorMessage = nil

    do {
      let request = CreateBookingRequest(
        name: name.trimmingCharacters(in: .whitespaces),
        email: email.trimmingCharacters(in: .whitespaces),
        reason: reason.trimmingCharacters(in: .whitespaces),
        timezone: TimeZone.current.identifier,
        meetingTypeId: meetingType.id,
        startAt: slot,
        source: "mobile"
      )
      let response = try await APIClient.shared.createBooking(request)
      if response.success == true {
        showSuccess = true
      } else {
        errorMessage = response.error ?? "Booking failed"
      }
    } catch {
      errorMessage = error.localizedDescription
    }
    isSubmitting = false
  }

  private func reset() {
    step = 0
    selectedMeetingType = nil
    selectedDate = nil
    selectedSlot = nil
    name = ""
    email = ""
    reason = ""
    showSuccess = false
    errorMessage = nil
  }

  private func formatDate(_ iso: String) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US")
    formatter.dateFormat = "yyyy-MM-dd"
    guard let date = formatter.date(from: iso) else { return iso }
    formatter.dateFormat = "EEE, MMM d"
    return formatter.string(from: date)
  }

  private func formatTime(_ iso: String) -> String {
    let formatter = ISO8601DateFormatter()
    guard let date = formatter.date(from: iso) else { return iso }
    let display = DateFormatter()
    display.dateFormat = "h:mm a"
    return display.string(from: date)
  }

  private func formatDateTime(_ iso: String) -> String {
    let formatter = ISO8601DateFormatter()
    guard let date = formatter.date(from: iso) else { return iso }
    let display = DateFormatter()
    display.dateFormat = "EEE, MMM d 'at' h:mm a"
    return display.string(from: date)
  }
}
