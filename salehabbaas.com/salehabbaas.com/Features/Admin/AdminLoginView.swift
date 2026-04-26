import SwiftUI

struct AdminLoginView: View {
  let colorMode: PortfolioColorMode
  @Environment(\.dismiss) private var dismiss

  @State private var email = ""
  @State private var password = ""
  @FocusState private var focusedField: LoginField?

  private var auth: AdminAuthManager { AdminAuthManager.shared }

  var body: some View {
    NavigationStack {
      ZStack {
        PortfolioPageBackgroundView(tab: .home, colorMode: colorMode)
          .ignoresSafeArea()

        ScrollView {
          VStack(spacing: 28) {
            Spacer(minLength: 40)

            // Logo + title
            VStack(spacing: 14) {
              Image("SalehPortrait")
                .resizable()
                .scaledToFill()
                .frame(width: 72, height: 72)
                .clipShape(Circle())
                .overlay(Circle().strokeBorder(PortfolioTheme.border, lineWidth: 1))

              VStack(spacing: 4) {
                Text("Admin Panel")
                  .font(.title3.weight(.bold))
                  .foregroundStyle(PortfolioTheme.ink(colorMode))
                Text("Sign in to manage your portfolio")
                  .font(.subheadline.weight(.medium))
                  .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
              }
            }

            // Form
            VStack(spacing: 14) {
              loginField(
                label: "Email",
                text: $email,
                icon: "envelope.fill",
                type: .emailAddress,
                contentType: .emailAddress,
                field: .email
              )

              loginField(
                label: "Password",
                text: $password,
                icon: "lock.fill",
                type: .default,
                contentType: .password,
                field: .password,
                isSecure: true
              )

              if let error = auth.errorMessage {
                HStack(spacing: 6) {
                  Image(systemName: "exclamationmark.triangle.fill")
                    .font(.footnote)
                  Text(error)
                    .font(.footnote.weight(.medium))
                }
                .foregroundStyle(.red)
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
              }

              Button {
                focusedField = nil
                Task {
                  await auth.signIn(email: email, password: password)
                  if auth.isAuthenticated { dismiss() }
                }
              } label: {
                HStack(spacing: 8) {
                  if auth.isLoading {
                    ProgressView().tint(.white).scaleEffect(0.85)
                  }
                  Text(auth.isLoading ? "Signing in..." : "Sign In")
                }
                .frame(maxWidth: .infinity)
              }
              .buttonStyle(PortfolioPrimaryButtonStyle(colorMode: colorMode))
              .disabled(!isFormValid || auth.isLoading)
              .opacity(isFormValid ? 1 : 0.5)
            }
            .padding(24)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay(
              RoundedRectangle(cornerRadius: 24, style: .continuous)
                .strokeBorder(PortfolioTheme.border, lineWidth: 1)
            )
            .padding(.horizontal, 18)

            Spacer(minLength: 40)
          }
        }
      }
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("Cancel") { dismiss() }
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
        }
      }
    }
  }

  private func loginField(
    label: String,
    text: Binding<String>,
    icon: String,
    type: UIKeyboardType,
    contentType: UITextContentType,
    field: LoginField,
    isSecure: Bool = false
  ) -> some View {
    HStack(spacing: 10) {
      Image(systemName: icon)
        .font(.system(size: 14, weight: .semibold))
        .foregroundStyle(PortfolioTheme.accentStrong(colorMode))
        .frame(width: 20)
      if isSecure {
        SecureField(label, text: text)
          .font(.subheadline.weight(.medium))
          .foregroundStyle(PortfolioTheme.ink(colorMode))
          .textContentType(contentType)
          .focused($focusedField, equals: field)
          .submitLabel(field == .email ? .next : .go)
          .onSubmit {
            if field == .email {
              focusedField = .password
            } else {
              Task {
                await auth.signIn(email: email, password: password)
              }
            }
          }
      } else {
        TextField(label, text: text)
          .font(.subheadline.weight(.medium))
          .foregroundStyle(PortfolioTheme.ink(colorMode))
          .keyboardType(type)
          .textContentType(contentType)
          .autocorrectionDisabled()
          .textInputAutocapitalization(.never)
          .focused($focusedField, equals: field)
          .submitLabel(.next)
          .onSubmit { focusedField = .password }
      }
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 14)
    .background(PortfolioTheme.softBackground(colorMode).opacity(0.5), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: 14, style: .continuous)
        .strokeBorder(focusedField == field ? PortfolioTheme.accent(colorMode) : PortfolioTheme.border, lineWidth: 1)
    )
    .animation(.snappy(duration: 0.2), value: focusedField)
  }

  private var isFormValid: Bool {
    email.contains("@") && password.count >= 6
  }

  private enum LoginField { case email, password }
}
