import SwiftUI

struct AuthGateView: View {
  @Bindable var appState: AppState
  @State private var email = ""
  @State private var password = ""

  var body: some View {
    SAPageContainer(title: "Sign In") {
      Text("Use your Firebase admin credentials.")
        .foregroundStyle(.secondary)

      TextField("Email", text: $email)
        .keyboardType(.emailAddress)
        .textInputAutocapitalization(.never)
        .autocorrectionDisabled(true)
        .textFieldStyle(.roundedBorder)

      SecureField("Password", text: $password)
        .textFieldStyle(.roundedBorder)

      Button {
        Task {
          await appState.authStore.signIn(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password)
          if appState.authStore.isAuthenticated {
            try? await appState.adminBFF.mobileBootstrap()
          }
        }
      } label: {
        if appState.authStore.isLoading {
          ProgressView()
        } else {
          Text("Sign In")
        }
      }
      .buttonStyle(.borderedProminent)
      .tint(SATheme.brand)
      .disabled(appState.authStore.isLoading || email.isEmpty || password.isEmpty)

      if !appState.authStore.errorMessage.isEmpty {
        Text(appState.authStore.errorMessage)
          .foregroundStyle(.red)
          .font(.footnote)
      }
    }
  }
}
