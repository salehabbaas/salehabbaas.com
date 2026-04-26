//
//  SalehAbbaasWidgetBundle.swift
//  SalehAbbaasWidget
//
//  Created by Saleh Abbas on 2026-03-29.
//

import WidgetKit
import SwiftUI
#if canImport(ActivityKit)
import ActivityKit
#endif

@main
struct SalehAbbaasWidgets: WidgetBundle {
    var body: some Widget {
        SalehAbbaasWidget()
        SalehAbbaasWidgetControl()
    }
}
