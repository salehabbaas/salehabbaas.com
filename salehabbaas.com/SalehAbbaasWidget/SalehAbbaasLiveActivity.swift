// NOTE: This file belongs in the Widget Extension target (same target as SalehAbbaasWidget.swift).
// Live Activities require ActivityKit framework linked to the Widget Extension target.
// In Xcode: select the SalehAbbaasWidget target → Build Phases → Link Binary With Libraries → add ActivityKit.

import WidgetKit
import SwiftUI

#if canImport(ActivityKit)
import ActivityKit

// MARK: - Live Activity Attributes (must match LiveActivityManager.swift in the main app)

struct PortfolioSessionAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var currentGoal: String
    var completedToday: Int
    var totalToday: Int
    var streakDays: Int
    var sessionLabel: String
  }

  var userName: String
}

// MARK: - Live Activity Views

@available(iOS 16.1, *)
struct PortfolioLiveActivityView: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: PortfolioSessionAttributes.self) { context in
      HStack(spacing: 14) {
        Image(systemName: "target")
          .font(.system(size: 22, weight: .bold))
          .foregroundStyle(.white)

        VStack(alignment: .leading, spacing: 3) {
          Text(context.state.currentGoal)
            .font(.system(.caption, design: .rounded, weight: .semibold))
            .foregroundStyle(.white)
            .lineLimit(2)

          HStack(spacing: 10) {
            Label("\(context.state.completedToday)/\(context.state.totalToday) today", systemImage: "checkmark.circle.fill")
              .font(.system(.caption2, design: .rounded, weight: .bold))
              .foregroundStyle(.white.opacity(0.8))

            Label("\(context.state.streakDays)d", systemImage: "flame.fill")
              .font(.system(.caption2, design: .rounded, weight: .bold))
              .foregroundStyle(.white.opacity(0.8))
          }
        }

        Spacer()

        ZStack {
          Circle()
            .stroke(.white.opacity(0.25), lineWidth: 3)
          Circle()
            .trim(from: 0, to: progress(context.state))
            .stroke(.white, style: StrokeStyle(lineWidth: 3, lineCap: .round))
            .rotationEffect(.degrees(-90))
        }
        .frame(width: 32, height: 32)
      }
      .padding(14)
      .background(
        LinearGradient(
          colors: [Color(red: 0.13, green: 0.41, blue: 0.68), Color(red: 0.25, green: 0.54, blue: 0.84)],
          startPoint: .leading,
          endPoint: .trailing
        )
      )
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Label("\(context.state.streakDays)d streak", systemImage: "flame.fill")
            .font(.system(.caption2, design: .rounded, weight: .bold))
            .foregroundStyle(.orange)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text("\(context.state.completedToday)/\(context.state.totalToday)")
            .font(.system(.caption, design: .rounded, weight: .bold))
            .foregroundStyle(.white)
        }
        DynamicIslandExpandedRegion(.center) {
          Text(context.state.currentGoal)
            .font(.system(.caption2, design: .rounded, weight: .semibold))
            .foregroundStyle(.white.opacity(0.9))
            .lineLimit(1)
        }
        DynamicIslandExpandedRegion(.bottom) {
          ProgressView(value: progress(context.state))
            .progressViewStyle(.linear)
            .tint(.white)
            .padding(.horizontal)
        }
      } compactLeading: {
        Image(systemName: "target")
          .font(.system(size: 12, weight: .bold))
          .foregroundStyle(.blue)
      } compactTrailing: {
        Text("\(context.state.completedToday)/\(context.state.totalToday)")
          .font(.system(.caption2, design: .rounded, weight: .bold))
          .foregroundStyle(.white)
      } minimal: {
        Image(systemName: "target")
          .font(.system(size: 12, weight: .bold))
          .foregroundStyle(.blue)
      }
    }
  }

  private func progress(_ state: PortfolioSessionAttributes.ContentState) -> Double {
    guard state.totalToday > 0 else { return 0 }
    return Double(state.completedToday) / Double(state.totalToday)
  }
}

#endif // canImport(ActivityKit)
