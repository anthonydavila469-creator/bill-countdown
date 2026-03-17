import SwiftUI
import WidgetKit

// MARK: - Medium Widget V2 — "The Dashboard"
// Top accent bar, giant countdown left, structured bill stack right with accent strips

struct MediumBillsWidgetView: View {
    let payload: DuezoWidgetPayload
    let theme: WidgetTheme

    private var displayBills: [DuezoWidgetPayload.UpcomingBill] {
        Array(payload.upcoming.dropFirst().prefix(3))
    }

    private var heroColor: Color {
        guard let bill = payload.nextBill else { return theme.accentColor }
        return bill.daysLeft < 0 ? Color(hex: 0xef4444) : theme.accentColor
    }

    var body: some View {
        if let bill = payload.nextBill {
            VStack(spacing: 0) {
                // Top accent gradient bar — signature element
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [heroColor, heroColor.opacity(0.3), .clear],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(height: 2.5)
                    .shadow(color: heroColor.opacity(0.6), radius: 6)

                HStack(alignment: .top, spacing: 0) {
                    // LEFT: Hero countdown area
                    VStack(alignment: .leading, spacing: 0) {
                        Spacer(minLength: 0)

                        // Massive countdown number
                        HStack(alignment: .firstTextBaseline, spacing: 2) {
                            Text("\(abs(bill.daysLeft))")
                                .font(.system(size: 54, weight: .black, design: .rounded))
                                .foregroundColor(.white)
                                .shadow(color: heroColor.opacity(0.4), radius: 14)
                                .shadow(color: heroColor.opacity(0.15), radius: 30)
                                .minimumScaleFactor(0.5)
                                .lineLimit(1)

                            VStack(alignment: .leading, spacing: 0) {
                                Text(bill.daysLeft < 0 ? "DAYS" : bill.daysLeft == 1 ? "DAY" : "DAYS")
                                    .font(.system(size: 9, weight: .ultraLight))
                                    .foregroundColor(.white.opacity(0.25))
                                    .tracking(2)
                                Text(bill.daysLeft < 0 ? "LATE" : "LEFT")
                                    .font(.system(size: 9, weight: .ultraLight))
                                    .foregroundColor(.white.opacity(0.25))
                                    .tracking(2)
                            }
                        }

                        // Vendor name
                        Text(bill.vendor.uppercased())
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white.opacity(0.85))
                            .lineLimit(1)
                            .tracking(0.5)

                        // Amount + date
                        HStack(spacing: 4) {
                            Text("$\(bill.amount, specifier: "%.2f")")
                                .font(.system(size: 13, weight: .heavy, design: .monospaced))
                                .foregroundColor(heroColor)

                            Circle()
                                .fill(Color.white.opacity(0.15))
                                .frame(width: 3, height: 3)

                            Text(formatISODate(bill.dueDate))
                                .font(.system(size: 9, weight: .medium))
                                .foregroundColor(.white.opacity(0.3))
                        }

                        Spacer(minLength: 0)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.leading, 14)

                    // Vertical divider — gradient fade
                    Rectangle()
                        .fill(
                            LinearGradient(
                                colors: [.clear, Color.white.opacity(0.12), .clear],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .frame(width: 0.5)
                        .padding(.vertical, 10)

                    // RIGHT: Total + bill stack
                    VStack(alignment: .trailing, spacing: 5) {
                        // Total due — top right
                        HStack(spacing: 4) {
                            Text("TOTAL")
                                .font(.system(size: 7, weight: .medium))
                                .foregroundColor(.white.opacity(0.25))
                                .tracking(1.5)
                            Text("$\(payload.totals.totalDue, specifier: "%.2f")")
                                .font(.system(size: 14, weight: .black, design: .monospaced))
                                .foregroundColor(theme.isWarm ? .white : theme.accentColor)
                        }
                        .padding(.top, 4)

                        Spacer(minLength: 0)

                        // Bill rows with accent strips
                        ForEach(displayBills) { item in
                            MediumBillRowV2(bill: item, theme: theme)
                        }

                        Spacer(minLength: 0)
                    }
                    .frame(width: 152)
                    .padding(.trailing, 10)
                }
            }
            .containerBackground(for: .widget) {
                WidgetBackground(theme: theme, isOverdue: bill.daysLeft < 0)
            }
        }
    }
}

// MARK: - Medium Bill Row V2 — Accent Strip Style

private struct MediumBillRowV2: View {
    let bill: DuezoWidgetPayload.UpcomingBill
    let theme: WidgetTheme

    private var stripColor: Color {
        switch bill.urgency {
        case .critical: return Color(hex: 0xef4444)
        case .soon:     return Color(hex: 0xfb923c)
        case .later:    return Color(hex: 0x22c55e)
        }
    }

    private var dueLabel: String {
        switch bill.daysLeft {
        case ..<0:  return "LATE"
        case 0:     return "TODAY"
        case 1:     return "1D"
        default:    return "\(bill.daysLeft)D"
        }
    }

    var body: some View {
        HStack(spacing: 0) {
            // Colored urgency accent strip
            RoundedRectangle(cornerRadius: 1)
                .fill(stripColor)
                .frame(width: 2.5, height: 28)
                .shadow(color: stripColor.opacity(0.5), radius: 3)

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 0) {
                    Text(bill.vendor)
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundColor(.white.opacity(0.9))
                        .lineLimit(1)

                    Spacer(minLength: 4)

                    Text(dueLabel)
                        .font(.system(size: 8, weight: .heavy))
                        .foregroundColor(theme.isWarm ? .white.opacity(0.7) : stripColor)
                        .tracking(0.5)
                }

                HStack(spacing: 0) {
                    Text(formatISODate(bill.dueDate))
                        .font(.system(size: 8, weight: .medium))
                        .foregroundColor(.white.opacity(0.3))

                    Spacer(minLength: 4)

                    Text("$\(bill.amount, specifier: "%.2f")")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(.white.opacity(0.85))
                }
            }
            .padding(.leading, 7)
        }
        .padding(.vertical, 4)
        .padding(.trailing, 4)
        .background(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(Color.white.opacity(theme.isWarm ? 0.10 : 0.05))
        )
    }
}

#Preview("Medium", as: .systemMedium) {
    DuezoWidget()
} timeline: {
    DuezoEntry.placeholder
}
