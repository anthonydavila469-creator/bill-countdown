import SwiftUI
import WidgetKit

// MARK: - Small Widget V3 — "The Beacon"
// Dramatic countdown with thick neon accent strip, SF Symbol status, massive hero number

struct SmallCountdownWidgetView: View {
    let payload: DuezoWidgetPayload
    let theme: WidgetTheme

    private var heroColor: Color {
        guard let bill = payload.nextBill else { return theme.accentColor }
        return bill.daysLeft < 0 ? Color(hex: 0xef4444) : theme.accentColor
    }

    private var statusIcon: String {
        guard let bill = payload.nextBill else { return "clock" }
        if bill.daysLeft < 0 { return "flame.fill" }
        if bill.daysLeft == 0 { return "exclamationmark.triangle.fill" }
        if bill.daysLeft <= 3 { return "clock.badge.exclamationmark" }
        return "clock"
    }

    var body: some View {
        if let bill = payload.nextBill {
            ZStack(alignment: .leading) {
                // Left accent strip — thick neon glow bar
                HStack(spacing: 0) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(
                            LinearGradient(
                                colors: [heroColor, heroColor.opacity(0.6), heroColor.opacity(0.1)],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .frame(width: 4.5)
                        .shadow(color: heroColor.opacity(0.9), radius: 12)
                        .shadow(color: heroColor.opacity(0.5), radius: 24)
                        .shadow(color: heroColor.opacity(0.2), radius: 40)
                    Spacer()
                }

                VStack(alignment: .leading, spacing: 0) {
                    // Top: SF Symbol status indicator + label
                    HStack(spacing: 5) {
                        Image(systemName: statusIcon)
                            .font(.system(size: 8, weight: .bold))
                            .foregroundColor(heroColor)
                            .shadow(color: heroColor.opacity(0.8), radius: 4)

                        Text(bill.daysLeft < 0 ? "OVERDUE" : bill.daysLeft == 0 ? "DUE TODAY" : "NEXT DUE")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundColor(.white.opacity(0.45))
                            .tracking(2.5)
                    }
                    .padding(.leading, 18)
                    .padding(.top, 2)

                    Spacer(minLength: 0)

                    // HERO: Massive countdown number — THE focal point
                    HStack(alignment: .firstTextBaseline, spacing: 3) {
                        Text("\(abs(bill.daysLeft))")
                            .font(.system(size: 64, weight: .black, design: .rounded))
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [.white, .white.opacity(0.85)],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                            )
                            .shadow(color: heroColor.opacity(0.6), radius: 24)
                            .shadow(color: heroColor.opacity(0.3), radius: 48)
                            .minimumScaleFactor(0.5)
                            .lineLimit(1)

                        VStack(alignment: .leading, spacing: 1) {
                            Text(bill.daysLeft == 1 ? "DAY" : "DAYS")
                                .font(.system(size: 10, weight: .thin))
                                .foregroundColor(.white.opacity(0.3))
                                .tracking(3)
                            Text(bill.daysLeft < 0 ? "LATE" : "LEFT")
                                .font(.system(size: 10, weight: .thin))
                                .foregroundColor(.white.opacity(0.3))
                                .tracking(3)
                        }
                    }
                    .padding(.leading, 18)

                    Spacer(minLength: 0)

                    // Bottom: vendor + amount + date in frosted pill
                    VStack(alignment: .leading, spacing: 4) {
                        Text(bill.vendor.uppercased())
                            .font(.system(size: 12, weight: .heavy))
                            .foregroundColor(.white.opacity(0.9))
                            .lineLimit(1)
                            .tracking(1)

                        HStack(spacing: 6) {
                            Text("$\(bill.amount, specifier: "%.2f")")
                                .font(.system(size: 15, weight: .black, design: .monospaced))
                                .foregroundColor(heroColor)
                                .shadow(color: heroColor.opacity(0.4), radius: 6)

                            Rectangle()
                                .fill(Color.white.opacity(0.15))
                                .frame(width: 0.5, height: 12)

                            Text(formatISODate(bill.dueDate))
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(.white.opacity(0.35))
                        }
                    }
                    .padding(.leading, 18)
                    .padding(.bottom, 6)
                }
                .padding(.vertical, 6)
            }
            .containerBackground(for: .widget) {
                WidgetBackground(theme: theme, isOverdue: bill.daysLeft < 0)
            }
        }
    }
}

#Preview("Small", as: .systemSmall) {
    DuezoWidget()
} timeline: {
    DuezoEntry.placeholder
}
