import SwiftUI

enum Urgency {
    case critical, soon, later

    var color: Color {
        switch self {
        case .critical: return .red
        case .soon:     return .orange
        case .later:    return .green
        }
    }
}
