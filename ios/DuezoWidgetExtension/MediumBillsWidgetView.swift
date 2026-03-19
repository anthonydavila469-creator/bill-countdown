import SwiftUI
import WidgetKit

// MARK: - Medium Widget — "The Radar"
// Split-panel fintech dashboard. Left: hero countdown with status label.
// Right: upcoming bills with urgency heat indicators.

struct MediumBillsWidgetView: View {
    let payload: DuezoWidgetPayload
    let theme: WidgetTheme

    private var displayBills: [DuezoWidgetPayload.UpcomingBill] {
        Array(payload.upcoming.dropFirst().prefix(3))
    }

    private func statusLabel(_ days: Int) -> String {
        switch days {
        case ..<0:  return "OVERDUE"
        case 0:     return "TODAY"
        case 1:     return "TOMORROW"
        default:    return "UPCOMING"
        }
    }

    private var heroColor: Color {
        guard let bill = payload.nextBill else { return theme.accentColor }
        if bill.daysLeft < 0 { return Color(hex: 0xef4444) }
        if bill.daysLeft <= 2 { return Color(hex: 0xf87171) }
        return theme.accentColor
    }

    var body: some View {
        if let bill = payload.nextBill {
            GeometryReader { geo in
                HStack(spacing: 0) {
                    // LEFT PANEL — Hero countdown
                    ZStack {
                        // Radial glow behind number
                        RadialGradient(
                            colors: [heroColor.opacity(0.25), heroColor.opacity(0.05), .clear],
                            center: .center,
                            startRadius: 0,
                            endRadius: 80
                        )

                        VStack(spacing: 2) {
                            // Status label
                            HStack(spacing: 4) {
                                Circle()
                                    .fill(heroColor)
                                    .frame(width: 5, height: 5)
                                    .shadow(color: heroColor, radius: 4)

                                Text(statusLabel(bill.daysLeft))
                                    .font(.system(size: 9, weight: .heavy, design: .rounded))
                                    .foregroundColor(.white.opacity(0.85))
                                    .tracking(2)
                            }

                            // Hero number with neon shadow
                            ZStack {
                                Text("\(abs(bill.daysLeft))")
                                    .font(.system(size: 44, weight: .black, design: .rounded))
                                    .foregroundColor(heroColor.opacity(0.15))
                                    .blur(radius: 12)

                                Text("\(abs(bill.daysLeft))")
                                    .font(.system(size: 44, weight: .black, design: .rounded))
                                    .foregroundStyle(
                                        LinearGradient(
                                            colors: [.white, .white.opacity(0.85)],
                                            startPoint: .top,
                                            endPoint: .bottom
                                        )
                                    )
                                    .shadow(color: heroColor.opacity(0.5), radius: 16)
                                    .minimumScaleFactor(0.6)
                                    .lineLimit(1)
                            }

                            Text(bill.daysLeft < 0 ? "OVERDUE" : bill.daysLeft == 1 ? "DAY LEFT" : "DAYS LEFT")
                                .font(.system(size: 9, weight: .heavy, design: .rounded))
                                .foregroundColor(.white.opacity(0.75))
                                .tracking(2)

                            // Vendor + amount
                            VStack(spacing: 2) {
                                Text(bill.vendor.uppercased())
                                    .font(.system(size: 11, weight: .bold, design: .rounded))
                                    .foregroundColor(.white.opacity(0.9))
                                    .lineLimit(1)
                                    .tracking(0.5)

                                Text("$\(bill.amount, specifier: "%.2f")")
                                    .font(.system(size: 16, weight: .black, design: .monospaced))
                                    .foregroundColor(heroColor)
                                    .shadow(color: heroColor.opacity(0.4), radius: 6)
                            }
                            .padding(.top, 4)
                        }
                        .padding(.vertical, 10)
                    }
                    .frame(width: geo.size.width * 0.42)

                    // Separator — neon gradient line
                    Rectangle()
                        .fill(
                            LinearGradient(
                                colors: [.clear, heroColor.opacity(0.4), heroColor.opacity(0.15), .clear],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .frame(width: 1)
                        .shadow(color: heroColor.opacity(0.3), radius: 4)
                        .padding(.vertical, 14)

                    // RIGHT PANEL — Bill stack + total
                    VStack(alignment: .leading, spacing: 0) {
                        // Total header
                        HStack(spacing: 0) {
                            VStack(alignment: .leading, spacing: 1) {
                                Text("THIS MONTH")
                                    .font(.system(size: 9, weight: .bold, design: .rounded))
                                    .foregroundColor(.white.opacity(0.75))
                                    .tracking(2)

                                Text("$\(payload.totals.totalDue, specifier: "%.0f")")
                                    .font(.system(size: 22, weight: .black, design: .monospaced))
                                    .foregroundColor(.white)
                            }

                            Spacer()

                            if let delta = payload.totals.deltaVsLastMonth, delta != 0 {
                                DeltaBadge(delta: delta)
                            }
                        }
                        .padding(.bottom, 6)

                        // Bill rows
                        VStack(spacing: 3) {
                            ForEach(displayBills) { item in
                                RadarBillRow(bill: item, theme: theme)
                            }
                        }

                        Spacer(minLength: 0)

                        if payload.upcoming.count > 4 {
                            Text("+\(payload.upcoming.count - 4) more")
                                .font(.system(size: 10, weight: .bold, design: .rounded))
                                .foregroundColor(.white.opacity(0.6))
                                .tracking(0.5)
                                .frame(maxWidth: .infinity, alignment: .trailing)
                        }
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 10)
                }
            }
            .containerBackground(for: .widget) {
                WidgetBackground(theme: theme, isOverdue: bill.daysLeft < 0)
            }
        }
    }
}

// MARK: - Delta Badge — Change vs last month

private struct DeltaBadge: View {
    let delta: Double

    private var isUp: Bool { delta > 0 }
    private var color: Color { isUp ? Color(hex: 0xef4444) : Color(hex: 0x22c55e) }

    var body: some View {
        HStack(spacing: 2) {
            Image(systemName: isUp ? "arrow.up.right" : "arrow.down.right")
                .font(.system(size: 7, weight: .black))
            Text("$\(abs(delta), specifier: "%.0f")")
                .font(.system(size: 9, weight: .black, design: .monospaced))
        }
        .foregroundColor(color)
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .background(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(color.opacity(0.12))
        )
    }
}

// MARK: - Radar Bill Row — Compact with heat dot + urgency bar

private struct RadarBillRow: View {
    let bill: DuezoWidgetPayload.UpcomingBill
    let theme: WidgetTheme

    private var urgencyColor: Color {
        switch bill.urgency {
        case .critical: return Color(hex: 0xef4444)
        case .soon:     return Color(hex: 0xfb923c)
        case .later:    return Color(hex: 0x22c55e)
        }
    }

    var body: some View {
        HStack(spacing: 6) {
            // Heat dot with glow
            Circle()
                .fill(urgencyColor)
                .frame(width: 6, height: 6)
                .shadow(color: urgencyColor.opacity(0.8), radius: 3)

            Text(bill.vendor)
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundColor(.white)
                .lineLimit(1)

            Spacer(minLength: 4)

            VStack(alignment: .trailing, spacing: 1) {
                Text("$\(bill.amount, specifier: "%.2f")")
                    .font(.system(size: 11, weight: .black, design: .monospaced))
                    .foregroundColor(.white.opacity(0.95))

                Text("\(bill.daysLeft)d")
                    .font(.system(size: 9, weight: .heavy, design: .rounded))
                    .foregroundColor(urgencyColor)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .background(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(Color.white.opacity(theme.isWarm ? 0.1 : 0.05))
                .overlay(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(Color.white.opacity(0.04), lineWidth: 0.5)
                )
        )
    }
}

#Preview("Medium", as: .systemMedium) {
    DuezoWidget()
} timeline: {
    DuezoEntry.placeholder
}
