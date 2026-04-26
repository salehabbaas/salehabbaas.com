import SwiftUI

struct ResumeDownloadView: View {
  let colorMode: PortfolioColorMode

  @State private var showShareSheet = false
  @State private var showPreview = false

  private var resumeURL: URL? {
    Bundle.main.url(forResource: "SalehAbbaas_SoftwareEngineer", withExtension: "pdf")
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack(spacing: 12) {
        Image(systemName: "doc.text.fill")
          .font(.system(size: 28, weight: .semibold))
          .foregroundStyle(PortfolioTheme.accent(colorMode))

        VStack(alignment: .leading, spacing: 4) {
          Text("Resume")
            .font(.headline.weight(.bold))
            .foregroundStyle(PortfolioTheme.ink(colorMode))
          Text("SalehAbbaas_SoftwareEngineer.pdf")
            .font(.footnote.weight(.medium))
            .foregroundStyle(PortfolioTheme.secondaryInk(colorMode))
        }
      }

      HStack(spacing: 12) {
        Button {
          showPreview = true
        } label: {
          Label("Preview", systemImage: "eye.fill")
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(PortfolioSecondaryButtonStyle(colorMode: colorMode))

        Button {
          showShareSheet = true
        } label: {
          Label("Share", systemImage: "square.and.arrow.up")
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(PortfolioPrimaryButtonStyle(colorMode: colorMode))
      }
    }
    .portfolioPanel(colorMode: colorMode)
    .sheet(isPresented: $showShareSheet) {
      if let url = resumeURL {
        ShareSheet(items: [url])
      }
    }
    .sheet(isPresented: $showPreview) {
      if let url = resumeURL {
        PDFPreviewView(url: url, colorMode: colorMode)
      }
    }
  }
}

// MARK: - Share Sheet

struct ShareSheet: UIViewControllerRepresentable {
  let items: [Any]

  func makeUIViewController(context: Context) -> UIActivityViewController {
    UIActivityViewController(activityItems: items, applicationActivities: nil)
  }

  func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

// MARK: - PDF Preview

struct PDFPreviewView: View {
  let url: URL
  let colorMode: PortfolioColorMode

  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      PDFKitView(url: url)
        .navigationTitle("Resume")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .topBarTrailing) {
            Button("Done") { dismiss() }
              .font(.subheadline.weight(.semibold))
          }
        }
    }
  }
}

// MARK: - PDFKit Wrapper

import PDFKit

struct PDFKitView: UIViewRepresentable {
  let url: URL

  func makeUIView(context: Context) -> PDFView {
    let view = PDFView()
    view.autoScales = true
    view.displayMode = .singlePageContinuous
    view.displayDirection = .vertical
    view.document = PDFDocument(url: url)
    return view
  }

  func updateUIView(_ uiView: PDFView, context: Context) {}
}
