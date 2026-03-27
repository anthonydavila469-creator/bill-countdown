import SwiftUI

enum DuezoTheme: String, CaseIterable, Codable {
    case sunrise, haze, aurora, tropical, peach

    var tint: Color {
        switch self {
        case .sunrise:  return Color(red: 0.98, green: 0.57, blue: 0.24)  // #fb923c
        case .haze:     return Color(red: 0.65, green: 0.55, blue: 0.98)  // #a78bfa
        case .aurora:   return Color(red: 0.18, green: 0.83, blue: 0.75)  // #2dd4bf
        case .tropical: return Color(red: 0.22, green: 0.74, blue: 0.97)  // #38bdf8
        case .peach:    return Color(red: 0.96, green: 0.45, blue: 0.71)  // #f472b6
        }
    }

    var accent: Color { tint }

    static func current() -> DuezoTheme {
        guard let defaults = UserDefaults(suiteName: DuezoWidgetStore.appGroupId),
              let raw = defaults.string(forKey: DuezoWidgetStore.themeKey),
              let theme = DuezoTheme(rawValue: raw) else {
            return .haze
        }
        return theme
    }
}
