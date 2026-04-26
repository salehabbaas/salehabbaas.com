import SwiftUI

struct ContactFormView: View {
  let colorMode: PortfolioColorMode

  @State private var name = ""
  @State private var email = ""
  @State private var subject = ""
  @State private var message = ""
  @State private var isSubmitting = false
  @State private var showSuccess = false
  @State private var errorMessage: String?

  var body: some View {
    VStack(alignment: .leading, spacing: 18) {
      Text("Send a Message")
        .font(.title3.weight(.bold))
        .foregroundStyle(PortfolioTheme.ink(colorMode))

      Text("I'll get back to you as soon as possible.")
        .font(.subheadline.weight(.medium))
        .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))

      VStack(spacing: 14) {
        ContactTextField(
          label: "Name",
          text: $name,
          icon: "person.fill",
          colorMode: colorMode
        )

        ContactTextField(
          label: "Email",
          text: $email,
          icon: "envelope.fill",
          colorMode: colorMode,
          keyboardType: .emailAddress,
          textContentType: .emailAddress
        )

        ContactTextField(
          label: "Subject",
          text: $subject,
          icon: "text.alignleft",
          colorMode: colorMode
        )

        ContactTextEditor(
          label: "Message",
          text: $message,
          colorMode: colorMode
        )
      }

      if let error = errorMessage {
        HStack(spacing: 6) {
          Image(systemName: "exclamationmark.triangle.fill")
            .font(.footnote)
          Text(error)
            .font(.footnote.weight(.medium))
        }
        .foregroundStyle(.red)
      }

      if showSuccess {
        HStack(spacing: 6) {
          Image(systemName: "checkmark.circle.fill")
            .font(.footnote)
          Text("Message sent successfully!")
            .font(.footnote.weight(.medium))
        }
        .foregroundStyle(.green)
      }

      Button {
        Task { await submitForm() }
      } label: {
        HStack(spacing: 8) {
          if isSubmitting {
            ProgressView()
              .tint(.white)
              .scaleEffect(0.8)
          }
          Text(isSubmitting ? "Sending..." : "Send Message")
        }
        .frame(maxWidth: .infinity)
      }
      .buttonStyle(PortfolioPrimaryButtonStyle(colorMode: colorMode))
      .disabled(!isFormValid || isSubmitting)
      .opacity(isFormValid ? 1 : 0.5)
    }
    .portfolioPanel(colorMode: colorMode)
  }

  private var isFormValid: Bool {
    !name.trimmingCharacters(in: .whitespaces).isEmpty &&
    email.contains("@") &&
    !subject.trimmingCharacters(in: .whitespaces).isEmpty &&
    message.trimmingCharacters(in: .whitespaces).count >= 10
  }

  @MainActor
  private func submitForm() async {
    isSubmitting = true
    errorMessage = nil
    showSuccess = false

    do {
      let request = ContactFormRequest(
        name: name.trimmingCharacters(in: .whitespaces),
        email: email.trimmingCharacters(in: .whitespaces),
        subject: subject.trimmingCharacters(in: .whitespaces),
        message: message.trimmingCharacters(in: .whitespaces)
      )
      let response = try await APIClient.shared.submitContactForm(request)
      if response.success == true {
        showSuccess = true
        name = ""
        email = ""
        subject = ""
        message = ""
      } else {
        errorMessage = response.error ?? "Failed to send message"
      }
    } catch {
      errorMessage = error.localizedDescription
    }

    isSubmitting = false
  }
}

// MARK: - Form Components

private struct ContactTextField: View {
  let label: String
  @Binding var text: String
  let icon: String
  let colorMode: PortfolioColorMode
  var keyboardType: UIKeyboardType = .default
  var textContentType: UITextContentType?

  var body: some View {
    HStack(spacing: 10) {
      Image(systemName: icon)
        .font(.system(size: 14, weight: .semibold))
        .foregroundStyle(PortfolioTheme.accentStrong(colorMode))
        .frame(width: 20)

      TextField(label, text: $text)
        .font(.subheadline.weight(.medium))
        .foregroundStyle(PortfolioTheme.ink(colorMode))
        .keyboardType(keyboardType)
        .textContentType(textContentType)
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
}

private struct ContactTextEditor: View {
  let label: String
  @Binding var text: String
  let colorMode: PortfolioColorMode

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(label)
        .font(.footnote.weight(.bold))
        .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))

      TextEditor(text: $text)
        .font(.subheadline.weight(.medium))
        .foregroundStyle(PortfolioTheme.ink(colorMode))
        .scrollContentBackground(.hidden)
        .frame(minHeight: 100, maxHeight: 180)
        .padding(12)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
          RoundedRectangle(cornerRadius: 14, style: .continuous)
            .strokeBorder(PortfolioTheme.border, lineWidth: 1)
        )
    }
  }
}
