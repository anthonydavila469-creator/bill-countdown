import SwiftUI
import WidgetKit

struct MediumBillsWidgetView: View {
    let payload: DuezoWidgetPayload
    let theme: WidgetTheme

    private var displayBills: [DuezoWidgetPayload.UpcomingBill] {
        Array(payload.upcoming.dropFirst().prefix(3))
    }

    var body: some View {
        if let bill = payload.nextBill {
            HStack(spacing: 10) {
                // Left: Countdown ring + vendor info
                VStack(spacing: 4) {
                    Spacer(minLength: 0)

                    CountdownRing(days: bill.daysLeft, size: 62, lineWidth: 5, theme: theme)

                    Text(bill.vendor)
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .lineLimit(1)

                    Text("$\(bill.amount, specifier: "%.2f")")
                        .font(.system(size: 14, weight: .heavy, design: .rounded))
                        .foregroundColor(.white.opacity(0.95))
                        .lineLimit(1)

                    Text("Due \(formatISODate(bill.dueDate))")
                        .font(.system(size: 9, weight: .medium, design: .rounded))
                        .foregroundColor(.white.opacity(0.4))
                        .lineLimit(1)

                    Spacer(minLength: 0)
                }
                .frame(width: 110)

                // Right: TOTAL DUE + amount + bill rows
                VStack(alignment: .trailing, spacing: 3) {
                    Spacer(minLength: 0)

                    // TOTAL DUE header + amount
                    VStack(alignment: .trailing, spacing: 1) {
                        Text("TOTAL DUE")
                            .font(.system(size: 7, weight: .bold, design: .rounded))
                            .foregroundColor(theme.isWarm ? .white.opacity(0.7) : Color(hex: 0xF5A623))
                            .tracking(1)
                        Text("$\(payload.totals.totalDue, specifier: "%.2f")")
                            .font(.system(size: 13, weight: .black, design: .rounded))
                            .foregroundColor(.white)
                    }
                    .padding(.bottom, 2)

                    // Bill rows in glass cards
                    ForEach(displayBills) { item in
                        MediumBillRow(bill: item, theme: theme)
                    }

                    Spacer(minLength: 0)
                }
            }
            .padding(10)
            .containerBackground(for: .widget) {
                WidgetBackground(theme: theme)
            }
        }
    }
}

// MARK: - Medium Bill Row

private struct MediumBillRow: View {
    let bill: DuezoWidgetPayload.UpcomingBill
    let theme: WidgetTheme

    private var urgencyDotColor: Color {
        switch bill.urgency {
        case .critical: return Color(hex: 0xef4444)
        case .soon:     return Color(hex: 0xf97316)
        case .later:    return Color(hex: 0x22c55e)
        }
    }

    private var dueLabel: String {
        switch bill.daysLeft {
        case ..<0:  return "OVERDUE"
        case 0:     return "DUE TODAY"
        case 1:     return "TOMORROW"
        default:    return "DUE IN \(bill.daysLeft) DAYS"
        }
    }

    var body: some View {
        GlassCard(cornerRadius: 8, isWarmTheme: theme.isWarm) {
            HStack(spacing: 6) {
                Circle()
                    .fill(urgencyDotColor)
                    .frame(width: 6, height: 6)

                VStack(alignment: .leading, spacing: 1) {
                    Text(bill.vendor)
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Text(formatISODate(bill.dueDate))
                        .font(.system(size: 8, weight: .medium, design: .rounded))
                        .foregroundColor(.white.opacity(0.45))
                }

                Spacer(minLength: 0)

                VStack(alignment: .trailing, spacing: 1) {
                    Text("$\(bill.amount, specifier: "%.2f")")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundColor(.white)

                    Text(dueLabel)
                        .font(.system(size: 7, weight: .bold, design: .rounded))
                        .foregroundColor(theme.isWarm ? .white.opacity(0.85) : urgencyDotColor)
                        .tracking(0.3)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
        }
    }
}

#Preview("Medium", as: .systemMedium) {
    DuezoWidget()
} timeline: {
    DuezoEntry.placeholder
}
