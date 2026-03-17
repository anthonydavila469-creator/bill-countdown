import SwiftUI
import WidgetKit

// MARK: - Medium Widget — "The Radar"
// Split-panel fintech dashboard. Left: dramatic countdown with arc gauge.
// Right: upcoming bills with urgency heat indicators.

struct MediumBillsWidgetView: View {
    let payload: DuezoWidgetPayload
    let theme: WidgetTheme

    private var displayBills: [DuezoWidgetPayload.UpcomingBill] {
        Array(payload.upcoming.dropFirst().prefix(3))
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
                            colors: [heroColor.opacity(0.2), .clear],
                            center: .center,
                            startRadius: 0,
                            endRadius: 80
                        )

                        VStack(spacing: 2) {
                            // Arc gauge
                            ArcGauge(
                                days: bill.daysLeft,
                                color: heroColor,
                                size: 54
                            )

                            // Massive number
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
                                .padding(.top, -6)

                            Text(bill.daysLeft < 0 ? "OVERDUE" : bill.daysLeft == 1 ? "DAY LEFT" : "DAYS LEFT")
                                .font(.system(size: 8, weight: .heavy, design: .rounded))
                                .foregroundColor(.white.opacity(0.35))
                                .tracking(2)

                            // Vendor + amount
                            VStack(spacing: 2) {
                                Text(bill.vendor.uppercased())
                                    .font(.system(size: 10, weight: .bold, design: .rounded))
                                    .foregroundColor(.white.opacity(0.6))
                                    .lineLimit(1)
                                    .tracking(0.5)

                                Text("$\(bill.amount, specifier: "%.2f")")
                                    .font(.system(size: 15, weight: .black, design: .monospaced))
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
                                    .font(.system(size: 7, weight: .bold, design: .rounded))
                                    .foregroundColor(.white.opacity(0.3))
                                    .tracking(2)

                                Text("$\(payload.totals.totalDue, specifier: "%.0f")")
                                    .font(.system(size: 20, weight: .black, design: .monospaced))
                                    .foregroundColor(.white.opacity(0.9))
                            }

                            Spacer()

                            if let delta = payload.totals.deltaVsLastMonth, delta != 0 {
                                DeltaBadge(delta: delta)
                            }
                        }
                        .padding(.bottom, 8)

                        // Bill rows
                        VStack(spacing: 4) {
                            ForEach(displayBills) { item in
                                RadarBillRow(bill: item, theme: theme)
                            }
                        }

                        Spacer(minLength: 0)

                        if payload.upcoming.count > 4 {
                            Text("+\(payload.upcoming.count - 4) more")
                                .font(.system(size: 9, weight: .bold, design: .rounded))
                                .foregroundColor(.white.opacity(0.25))
                                .tracking(0.5)
                                .frame(maxWidth: .infinity, alignment: .trailing)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 12)
                }
            }
            .containerBackground(for: .widget) {
                WidgetBackground(theme: theme, isOverdue: bill.daysLeft < 0)
            }
        }
    }
}

// MARK: - Arc Gauge — Thin decorative half-arc

private struct ArcGauge: View {
    let days: Int
    let color: Color
    let size: CGFloat

    private var progress: Double {
        if days < 0 { return 1.0 }
        if days > 30 { return 1.0 }
        return max(Double(days) / 30.0, 0.05)
    }

    var body: some View {
        ZStack {
            // Track
            Circle()
                .trim(from: 0.15, to: 0.85)
                .stroke(Color.white.opacity(0.06), style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .frame(width: size, height: size)
                .rotationEffect(.degrees(90))

            // Progress
            Circle()
                .trim(from: 0.15, to: 0.15 + (0.7 * progress))
                .stroke(
                    LinearGradient(
                        colors: [color, color.opacity(0.4)],
                        startPoint: .leading,
                        endPoint: .trailing
                    ),
                    style: StrokeStyle(lineWidth: 3, lineCap: .round)
                )
                .frame(width: size, height: size)
                .rotationEffect(.degrees(90))
                .shadow(color: color.opacity(0.6), radius: 6)
        }
        .frame(height: size * 0.55)
        .clipped()
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
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .foregroundColor(.white.opacity(0.85))
                .lineLimit(1)

            Spacer(minLength: 4)

            VStack(alignment: .trailing, spacing: 1) {
                Text("$\(bill.amount, specifier: "%.2f")")
                    .font(.system(size: 10, weight: .black, design: .monospaced))
                    .foregroundColor(.white.opacity(0.7))

                Text("\(bill.daysLeft)d")
                    .font(.system(size: 8, weight: .heavy, design: .rounded))
                    .foregroundColor(urgencyColor.opacity(0.8))
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
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
