import SwiftUI
import WidgetKit

// MARK: - Small Widget — "The Pulse"
// Massive typography hero. The countdown number IS the widget.
// Asymmetric layout with neon edge glow and frosted info strip.

struct SmallCountdownWidgetView: View {
    let payload: DuezoWidgetPayload
    let theme: WidgetTheme

    private var bill: DuezoWidgetPayload.WidgetBill? { payload.nextBill }

    private var heroColor: Color {
        guard let bill = bill else { return theme.accentColor }
        if bill.daysLeft < 0 { return Color(hex: 0xef4444) }
        if bill.daysLeft <= 2 { return Color(hex: 0xf87171) }
        return theme.accentColor
    }

    private var daysText: String {
        guard let bill = bill else { return "—" }
        return "\(abs(bill.daysLeft))"
    }

    var body: some View {
        if let bill = bill {
            GeometryReader { geo in
                ZStack {
                    // Background radial glow — centered on the number
                    RadialGradient(
                        colors: [heroColor.opacity(0.25), heroColor.opacity(0.05), .clear],
                        center: .center,
                        startRadius: 0,
                        endRadius: geo.size.width * 0.7
                    )

                    VStack(spacing: 0) {
                        // Top status row
                        HStack(spacing: 4) {
                            Circle()
                                .fill(heroColor)
                                .frame(width: 5, height: 5)
                                .shadow(color: heroColor, radius: 4)

                            Text(statusLabel(bill.daysLeft))
                                .font(.system(size: 9, weight: .heavy, design: .rounded))
                                .foregroundColor(.white.opacity(0.85))
                                .tracking(2)

                            Spacer()

                            if bill.isAutopay == true {
                                Image(systemName: "arrow.triangle.2.circlepath")
                                    .font(.system(size: 8, weight: .bold))
                                    .foregroundColor(.white.opacity(0.6))
                            }
                        }
                        .padding(.horizontal, 14)
                        .padding(.top, 12)

                        Spacer(minLength: 0)

                        // HERO NUMBER — massive, centered, impossible to miss
                        ZStack {
                            // Neon text shadow layer
                            Text(daysText)
                                .font(.system(size: 72, weight: .black, design: .rounded))
                                .foregroundColor(heroColor.opacity(0.15))
                                .blur(radius: 16)

                            Text(daysText)
                                .font(.system(size: 72, weight: .black, design: .rounded))
                                .foregroundStyle(
                                    LinearGradient(
                                        colors: [.white, .white.opacity(0.8)],
                                        startPoint: .top,
                                        endPoint: .bottom
                                    )
                                )
                                .shadow(color: heroColor.opacity(0.5), radius: 20)
                                .minimumScaleFactor(0.6)
                                .lineLimit(1)
                        }

                        // Unit label
                        Text(unitLabel(bill.daysLeft))
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundColor(.white.opacity(0.7))
                            .tracking(6)
                            .padding(.top, -8)

                        Spacer(minLength: 0)

                        // Bottom frosted info strip
                        HStack(spacing: 0) {
                            Text(bill.vendor.uppercased())
                                .font(.system(size: 10, weight: .bold, design: .rounded))
                                .foregroundColor(.white.opacity(0.95))
                                .lineLimit(1)
                                .tracking(0.5)

                            Spacer(minLength: 6)

                            Text("$\(bill.amount, specifier: "%.2f")")
                                .font(.system(size: 13, weight: .black, design: .monospaced))
                                .foregroundColor(heroColor)
                                .shadow(color: heroColor.opacity(0.5), radius: 6)
                        }
                        .padding(.horizontal, 14)
                        .padding(.bottom, 12)
                    }

                    // Decorative edge glow — top-left corner accent
                    VStack {
                        HStack {
                            Circle()
                                .fill(heroColor.opacity(0.2))
                                .frame(width: 60, height: 60)
                                .blur(radius: 30)
                                .offset(x: -20, y: -20)
                            Spacer()
                        }
                        Spacer()
                    }
                }
            }
            .containerBackground(for: .widget) {
                WidgetBackground(theme: theme, isOverdue: bill.daysLeft < 0)
            }
        }
    }

    private func statusLabel(_ days: Int) -> String {
        switch days {
        case ..<0:  return "OVERDUE"
        case 0:     return "TODAY"
        case 1:     return "TOMORROW"
        default:    return "UPCOMING"
        }
    }

    private func unitLabel(_ days: Int) -> String {
        if days < 0 { return "LATE" }
        return days == 1 ? "DAY" : "DAYS"
    }
}

#Preview("Small", as: .systemSmall) {
    DuezoWidget()
} timeline: {
    DuezoEntry.placeholder
}
