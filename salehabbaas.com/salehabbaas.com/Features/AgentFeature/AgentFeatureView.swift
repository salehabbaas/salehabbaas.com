import SwiftUI

struct AgentFeatureView: View {
  @Bindable var appState: AppState
  @State private var prompt = "Summarize admin priorities for today."
  @State private var output = ""
  @State private var isLoading = false

  var body: some View {
    SAPageContainer(title: "Agent") {
      Text("Native agent workspace connected to `/api/admin/agent`.")
      TextField("Prompt", text: $prompt)
        .textFieldStyle(.roundedBorder)

      Button {
        Task { await runAgent() }
      } label: {
        if isLoading {
          ProgressView()
        } else {
          Text("Run Agent")
        }
      }
      .buttonStyle(.borderedProminent)
      .tint(SATheme.brand)
      .disabled(prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isLoading)

      if !output.isEmpty {
        Text(output)
          .font(.footnote)
          .foregroundStyle(.secondary)
          .textSelection(.enabled)
      }
    }
  }

  private func runAgent() async {
    isLoading = true
    defer { isLoading = false }

    do {
      let payload: [String: Any] = [
        "messages": [["role": "user", "content": prompt]],
        "execute": false,
        "maxActions": 2
      ]
      let response = try await appState.adminBFF.postObject(path: "api/admin/agent", body: payload)
      if
        let text = response["output"]?.stringValue,
        !text.isEmpty
      {
        output = text
      } else if
        let object = response["output"]?.objectValue,
        let text = object["text"]?.stringValue,
        !text.isEmpty
      {
        output = text
      } else {
        output = "Agent responded with \(response.count) fields."
      }
    } catch {
      output = "Agent request failed: \(error.localizedDescription)"
    }
  }
}
