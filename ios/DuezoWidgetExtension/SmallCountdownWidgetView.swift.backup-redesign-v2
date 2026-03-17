import SwiftUI
import WidgetKit

// MARK: - Small Widget V2 — "The Beacon"
// Asymmetric layout with massive countdown number, left accent strip, no ring

struct SmallCountdownWidgetView: View {
    let payload: DuezoWidgetPayload
    let theme: WidgetTheme

    private var heroColor: Color {
        guard let bill = payload.nextBill else { return theme.accentColor }
        return bill.daysLeft < 0 ? Color(hex: 0xef4444) : theme.accentColor
    }

    var body: some View {
        if let bill = payload.nextBill {
            ZStack(alignment: .leading) {
                // Left accent strip — full height, neon glow
                HStack(spacing: 0) {
                    RoundedRectangle(cornerRadius: 1.5)
                        .fill(
                            LinearGradient(
                                colors: [heroColor, heroColor.opacity(0.2)],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .frame(width: 3.5)
                        .shadow(color: heroColor.opacity(0.7), radius: 8)
                        .shadow(color: heroColor.opacity(0.3), radius: 16)
                    Spacer()
                }

                VStack(alignment: .leading, spacing: 0) {
                    // Top: status indicator
                    HStack(spacing: 5) {
                        Circle()
                            .fill(heroColor)
                            .frame(width: 5, height: 5)
                            .shadow(color: heroColor, radius: 4)
                        Text(bill.daysLeft < 0 ? "OVERDUE" : "NEXT DUE")
                            .font(.system(size: 8, weight: .semibold))
                            .foregroundColor(.white.opacity(0.4))
                            .tracking(2)
                    }
                    .padding(.leading, 16)
                    .padding(.top, 2)

                    Spacer(minLength: 0)

                    // HERO: Massive countdown number — THE focal point
                    HStack(alignment: .firstTextBaseline, spacing: 3) {
                        Text("\(abs(bill.daysLeft))")
                            .font(.system(size: 62, weight: .black, design: .rounded))
                            .foregroundColor(.white)
                            .shadow(color: heroColor.opacity(0.5), radius: 20)
                            .shadow(color: heroColor.opacity(0.2), radius: 40)
                            .minimumScaleFactor(0.5)
                            .lineLimit(1)

                        VStack(alignment: .leading, spacing: 1) {
                            Text(bill.daysLeft == 1 ? "DAY" : "DAYS")
                                .font(.system(size: 10, weight: .ultraLight))
                                .foregroundColor(.white.opacity(0.25))
                                .tracking(2.5)
                            Text(bill.daysLeft < 0 ? "LATE" : "LEFT")
                                .font(.system(size: 10, weight: .ultraLight))
                                .foregroundColor(.white.opacity(0.25))
                                .tracking(2.5)
                        }
                    }
                    .padding(.leading, 16)

                    Spacer(minLength: 0)

                    // Bottom: vendor + amount + date
                    VStack(alignment: .leading, spacing: 3) {
                        Text(bill.vendor.uppercased())
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white.opacity(0.85))
                            .lineLimit(1)
                            .tracking(0.5)

                        HStack(spacing: 5) {
                            Text("$\(bill.amount, specifier: "%.2f")")
                                .font(.system(size: 14, weight: .heavy, design: .monospaced))
                                .foregroundColor(heroColor)

                            Circle()
                                .fill(Color.white.opacity(0.15))
                                .frame(width: 3, height: 3)

                            Text(formatISODate(bill.dueDate))
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(.white.opacity(0.3))
                        }
                    }
                    .padding(.leading, 16)
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
