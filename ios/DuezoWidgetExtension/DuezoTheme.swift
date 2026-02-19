import SwiftUI

enum DuezoTheme: String, CaseIterable, Codable {
    case pink, sky, emerald, midnight, wine, onyx, amethyst, ocean, sunset, ember, cosmic

    var tint: Color {
        switch self {
        case .pink:     return Color(red: 0.95, green: 0.42, blue: 0.78)
        case .sky:      return Color(red: 0.45, green: 0.65, blue: 1.00)
        case .emerald:  return Color(red: 0.20, green: 0.85, blue: 0.65)
        case .midnight: return Color(red: 0.20, green: 0.38, blue: 0.95)
        case .wine:     return Color(red: 0.62, green: 0.18, blue: 0.35)
        case .onyx:     return Color(red: 0.20, green: 0.20, blue: 0.22)
        case .amethyst: return Color(red: 0.55, green: 0.25, blue: 0.95)
        case .ocean:    return Color(red: 0.05, green: 0.72, blue: 0.72)
        case .sunset:   return Color(red: 0.98, green: 0.55, blue: 0.20)
        case .ember:    return Color(red: 0.98, green: 0.55, blue: 0.20)
        case .cosmic:   return Color(red: 0.55, green: 0.25, blue: 0.95)
        }
    }

    var accent: Color { tint }

    static func current() -> DuezoTheme {
        guard let defaults = UserDefaults(suiteName: DuezoWidgetStore.appGroupId),
              let raw = defaults.string(forKey: DuezoWidgetStore.themeKey),
              let theme = DuezoTheme(rawValue: raw) else {
            return .emerald
        }
        return theme
    }
}
