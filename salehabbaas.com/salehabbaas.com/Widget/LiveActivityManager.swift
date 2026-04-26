// Live Activity manager for the main app target.
// PortfolioSessionAttributes is declared in SalehAbbaasLiveActivity.swift.
// This manager intentionally reuses that single definition to avoid drift.

import Foundation

#if canImport(ActivityKit)
import ActivityKit

// MARK: - Live Activity Manager

enum PortfolioLiveActivityManager {
  @available(iOS 16.1, *)
  static func start(goal: String, completedToday: Int, totalToday: Int, streakDays: Int) {
    let attributes = PortfolioSessionAttributes(userName: "Saleh Abbaas")
    let state = PortfolioSessionAttributes.ContentState(
      currentGoal: goal,
      completedToday: completedToday,
      totalToday: totalToday,
      streakDays: streakDays,
      sessionLabel: "Active Session"
    )
    let content = ActivityContent(
      state: state,
      staleDate: Calendar.current.date(byAdding: .hour, value: 1, to: Date())
    )
    _ = try? Activity<PortfolioSessionAttributes>.request(attributes: attributes, content: content)
  }

  @available(iOS 16.1, *)
  static func updateAll(completedToday: Int, totalToday: Int) async {
    for activity in Activity<PortfolioSessionAttributes>.activities {
      let updated = PortfolioSessionAttributes.ContentState(
        currentGoal: activity.content.state.currentGoal,
        completedToday: completedToday,
        totalToday: totalToday,
        streakDays: activity.content.state.streakDays,
        sessionLabel: activity.content.state.sessionLabel
      )
      let content = ActivityContent(state: updated, staleDate: Date().addingTimeInterval(3600))
      await activity.update(content)
    }
  }

  @available(iOS 16.1, *)
  static func endAll() async {
    for activity in Activity<PortfolioSessionAttributes>.activities {
      if #available(iOS 16.2, *) {
        let content = ActivityContent(
          state: activity.content.state,
          staleDate: activity.content.staleDate
        )
        await activity.end(content, dismissalPolicy: .immediate)
      } else {
        await activity.end(dismissalPolicy: .immediate)
      }
    }
  }
}

#endif // canImport(ActivityKit)
