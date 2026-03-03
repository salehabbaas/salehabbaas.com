import SwiftUI

struct ContentView: View {
  @State private var appState = AppState()

  var body: some View {
    RootAppView(appState: appState)
  }
}

#Preview {
  ContentView()
}
