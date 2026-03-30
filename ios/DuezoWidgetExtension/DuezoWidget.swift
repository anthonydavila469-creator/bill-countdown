//
//  DuezoWidget.swift
//  DuezoWidgetExtension
//
//  Created by Anthony Dyess on 2/8/26.
//

import WidgetKit
import SwiftUI

// MARK: - New V1 Payload Models

struct DuezoWidgetPayload: Codable {
    let version: Int
    let generatedAt: TimeInterval
    let currencyCode: String
    let totals: Totals
    let nextBill: WidgetBill?
    let upcoming: [UpcomingBill]

    struct Totals: Codable {
        let totalDue: Double
        let deltaVsLastMonth: Double?
    }

    struct WidgetBill: Codable {
        let id: String
        let vendor: String
        let amount: Double
        let dueDate: String
        let daysLeft: Int
        let isAutopay: Bool?
        let iconKey: String?

        /// Compute daysLeft dynamically from dueDate at render time
        var liveDaysLeft: Int {
            DuezoWidgetPayload.computeDaysLeft(from: dueDate)
        }
    }

    struct UpcomingBill: Codable, Identifiable {
        let id: String
        let vendor: String
        let amount: Double
        let dueDate: String
        let daysLeft: Int
        let urgency: Urgency

        enum Urgency: String, Codable {
            case critical, soon, later
        }

        /// Compute daysLeft dynamically from dueDate at render time
        var liveDaysLeft: Int {
            DuezoWidgetPayload.computeDaysLeft(from: dueDate)
        }

        /// Compute urgency dynamically from live days
        var liveUrgency: Urgency {
            let days = liveDaysLeft
            if days <= 3 { return .critical }
            if days <= 7 { return .soon }
            return .later
        }
    }

    /// Parse a YYYY-MM-DD date string and compute days from today
    static func computeDaysLeft(from dateString: String) -> Int {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone.current
        guard let dueDate = formatter.date(from: dateString) else { return 999 }
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let due = calendar.startOfDay(for: dueDate)
        return calendar.dateComponents([.day], from: today, to: due).day ?? 999
    }
}

// MARK: - Legacy Bill Model (lock screen widgets)

struct Bill: Codable, Identifiable {
    let id: String
    let name: String
    let amount: Double
    let due_date: String
    let is_paid: Bool
    let category: String?

    var dueDate: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        return formatter.date(from: due_date)
    }

    var daysUntilDue: Int {
        guard let dueDate = dueDate else { return 999 }
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let due = calendar.startOfDay(for: dueDate)
        return calendar.dateComponents([.day], from: today, to: due).day ?? 999
    }
}

// MARK: - Widget Store

final class DuezoWidgetStore {
    static let themeKey = "duezo_theme"
    static let payloadKey = "duezo_widget_payload_v1"
    static let updatedKey = "duezo_widget_last_updated"
    static let appGroupId = "group.app.duezo"

    let defaults: UserDefaults

    init() {
        self.defaults = UserDefaults(suiteName: Self.appGroupId) ?? .standard
        NSLog("[DuezoWidget] Store initialized appGroup=%@ usingSharedDefaults=%@", Self.appGroupId, defaults != .standard ? "true" : "false")
    }

    func readTheme() -> String {
        let theme = defaults.string(forKey: Self.themeKey) ?? "haze"
        NSLog("[DuezoWidget] readTheme=%@", theme)
        return theme
    }

    func readPayload() -> DuezoWidgetPayload? {
        guard let json = defaults.string(forKey: Self.payloadKey),
              let data = json.data(using: .utf8) else {
            NSLog("[DuezoWidget] No v1 payload found in shared defaults")
            return nil
        }

        do {
            let payload = try JSONDecoder().decode(DuezoWidgetPayload.self, from: data)
            NSLog("[DuezoWidget] Loaded v1 payload upcomingCount=%d nextBillId=%@", payload.upcoming.count, payload.nextBill?.id ?? "nil")
            return payload
        } catch {
            NSLog("[DuezoWidget] Failed to decode v1 payload: %@", String(describing: error))
            return nil
        }
    }

    var hasSynced: Bool {
        defaults.string(forKey: Self.payloadKey) != nil
            || defaults.data(forKey: "duezo_bills") != nil
    }
}

// MARK: - Timeline Entry

struct DuezoEntry: TimelineEntry {
    let date: Date
    let payload: DuezoWidgetPayload?
    let bills: [Bill]
    let error: String?

    static var placeholder: DuezoEntry {
        let payload = DuezoWidgetPayload(
            version: 1,
            generatedAt: Date().timeIntervalSince1970,
            currencyCode: "USD",
            totals: .init(totalDue: 1685.98, deltaVsLastMonth: 127.00),
            nextBill: .init(id: "1", vendor: "Netflix", amount: 15.99, dueDate: "2026-02-15", daysLeft: 2, isAutopay: false, iconKey: nil),
            upcoming: [
                .init(id: "1", vendor: "Netflix", amount: 15.99, dueDate: "2026-02-15", daysLeft: 2, urgency: .critical),
                .init(id: "2", vendor: "Electric", amount: 145.00, dueDate: "2026-02-18", daysLeft: 5, urgency: .soon),
                .init(id: "3", vendor: "Rent", amount: 1200.00, dueDate: "2026-03-01", daysLeft: 16, urgency: .later),
                .init(id: "4", vendor: "Car Insurance", amount: 189.00, dueDate: "2026-03-05", daysLeft: 20, urgency: .later),
                .init(id: "5", vendor: "Phone", amount: 85.00, dueDate: "2026-03-10", daysLeft: 25, urgency: .later),
                .init(id: "6", vendor: "Gym", amount: 49.99, dueDate: "2026-03-12", daysLeft: 27, urgency: .later),
            ]
        )
        let bills = [
            Bill(id: "1", name: "Netflix", amount: 15.99, due_date: "2026-02-15", is_paid: false, category: "Subscriptions"),
            Bill(id: "2", name: "Electric", amount: 145.00, due_date: "2026-02-18", is_paid: false, category: "Utilities"),
            Bill(id: "3", name: "Rent", amount: 1200.00, due_date: "2026-03-01", is_paid: false, category: "Housing"),
            Bill(id: "4", name: "Car Insurance", amount: 189.00, due_date: "2026-03-05", is_paid: false, category: "Insurance"),
            Bill(id: "5", name: "Phone", amount: 85.00, due_date: "2026-03-10", is_paid: false, category: "Phone"),
            Bill(id: "6", name: "Gym", amount: 49.99, due_date: "2026-03-12", is_paid: false, category: "Health"),
        ]
        return DuezoEntry(date: Date(), payload: payload, bills: bills, error: nil)
    }

    static var empty: DuezoEntry {
        DuezoEntry(date: Date(), payload: nil, bills: [], error: nil)
    }

    static func error(_ message: String) -> DuezoEntry {
        DuezoEntry(date: Date(), payload: nil, bills: [], error: message)
    }
}

// MARK: - Timeline Provider

struct DuezoProvider: TimelineProvider {
    func placeholder(in context: Context) -> DuezoEntry {
        DuezoEntry.placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (DuezoEntry) -> Void) {
        if context.isPreview {
            completion(DuezoEntry.placeholder)
        } else {
            completion(loadEntry())
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DuezoEntry>) -> Void) {
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let entry = loadEntry()
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    private func loadEntry() -> DuezoEntry {
        let store = DuezoWidgetStore()
        NSLog("[DuezoWidget] loadEntry hasSynced=%@ theme=%@", store.hasSynced ? "true" : "false", store.readTheme())

        // Try v1 payload first
        if let payload = store.readPayload() {
            let bills = payloadToLegacyBills(payload)
            return DuezoEntry(date: Date(), payload: payload, bills: bills, error: nil)
        }

        // Fall back to legacy duezo_bills
        if let data = store.defaults.data(forKey: "duezo_bills") {
            do {
                let decoded = try JSONDecoder().decode([Bill].self, from: data)
                let unpaid = decoded
                    .filter { !$0.is_paid }
                    .sorted { ($0.dueDate ?? .distantFuture) < ($1.dueDate ?? .distantFuture) }
                let payload = legacyBillsToPayload(unpaid)
                NSLog("[DuezoWidget] Loaded legacy bills fallback count=%d", unpaid.count)
                return DuezoEntry(date: Date(), payload: payload, bills: unpaid, error: nil)
            } catch {
                NSLog("[DuezoWidget] Failed to decode legacy bills: %@", String(describing: error))
            }
        }

        NSLog("[DuezoWidget] No synced widget data found, returning empty entry")
        return DuezoEntry.empty
    }

    // MARK: Payload ↔ Legacy Converters

    private func payloadToLegacyBills(_ payload: DuezoWidgetPayload) -> [Bill] {
        payload.upcoming.map { item in
            Bill(id: item.id, name: item.vendor, amount: item.amount,
                 due_date: item.dueDate, is_paid: false, category: nil)
        }
    }

    private func legacyBillsToPayload(_ bills: [Bill]) -> DuezoWidgetPayload {
        let totalDue = bills.reduce(0) { $0 + $1.amount }
        let nextBill = bills.first.map { bill in
            DuezoWidgetPayload.WidgetBill(
                id: bill.id, vendor: bill.name, amount: bill.amount,
                dueDate: bill.due_date, daysLeft: bill.daysUntilDue,
                isAutopay: nil, iconKey: nil
            )
        }
        let upcoming: [DuezoWidgetPayload.UpcomingBill] = bills.prefix(6).map { bill in
            let days = bill.daysUntilDue
            let urgency: DuezoWidgetPayload.UpcomingBill.Urgency =
                days <= 2 ? .critical : days <= 7 ? .soon : .later
            return DuezoWidgetPayload.UpcomingBill(
                id: bill.id, vendor: bill.name, amount: bill.amount,
                dueDate: bill.due_date, daysLeft: days, urgency: urgency
            )
        }
        return DuezoWidgetPayload(
            version: 1, generatedAt: Date().timeIntervalSince1970,
            currencyCode: "USD",
            totals: .init(totalDue: totalDue, deltaVsLastMonth: nil),
            nextBill: nextBill, upcoming: upcoming
        )
    }
}

// MARK: - Color Hex Extension

extension Color {
    init(hex: UInt32) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >> 8) & 0xFF) / 255.0
        let b = Double(hex & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Legacy Constants (lock screen widgets)

private let accentOrange = Color(red: 249/255, green: 115/255, blue: 22/255)

// MARK: - Widget Theme System

enum WidgetTheme: String, CaseIterable {
    case sunrise, haze, aurora, tropical, peach

    var tintColor: Color {
        switch self {
        case .sunrise:  return Color(hex: 0xf97316)
        case .haze:     return Color(hex: 0xa78bfa)
        case .aurora:   return Color(hex: 0x14b8a6)
        case .tropical: return Color(hex: 0x38bdf8)
        case .peach:    return Color(hex: 0xec4899)
        }
    }

    var isWarm: Bool {
        switch self {
        case .sunrise: return true
        default: return false
        }
    }

    var tintOpacity: Double { 0.04 }

    var accentColor: Color {
        switch self {
        case .sunrise:  return Color(hex: 0xfb923c)
        case .haze:     return Color(hex: 0xc084fc)
        case .aurora:   return Color(hex: 0x2dd4bf)
        case .tropical: return Color(hex: 0x60a5fa)
        case .peach:    return Color(hex: 0xf472b6)
        }
    }

    var glowColor: Color { accentColor.opacity(0.35) }

    static func current() -> WidgetTheme {
        guard let defaults = UserDefaults(suiteName: DuezoWidgetStore.appGroupId) else {
            NSLog("[DuezoWidget] Can't access App Group for theme")
            return .haze
        }
        let raw = defaults.string(forKey: DuezoWidgetStore.themeKey)
        guard let raw = raw, let theme = WidgetTheme(rawValue: raw) else {
            NSLog("[DuezoWidget] Theme fallback to haze (raw: %@)", raw ?? "nil")
            return .haze
        }
        return theme
    }
}

// MARK: - Urgency Helpers

func urgencyColor(_ days: Int) -> Color {
    switch days {
    case ..<0:   return Color(hex: 0xef4444)
    case 0...3:  return Color(hex: 0xf87171)
    case 4...7:  return Color(hex: 0xfb923c)
    default:     return Color(hex: 0x4ade80)
    }
}

func urgencySecondaryColor(_ days: Int) -> Color {
    switch days {
    case ..<0:   return Color(hex: 0xef4444)
    case 0...3:  return Color(hex: 0xef4444)
    case 4...7:  return Color(hex: 0xf97316)
    default:     return Color(hex: 0x06b6d4)
    }
}

func urgencyProgress(_ days: Int) -> Double {
    if days < 0 { return 0.02 }
    if days > 30 { return 1.0 }
    return Double(days) / 30.0
}

// MARK: - Shared Helpers

/// Format "2026-02-14" → "Feb 14"
func formatISODate(_ iso: String) -> String {
    let parser = DateFormatter()
    parser.dateFormat = "yyyy-MM-dd"
    guard let date = parser.date(from: iso) else { return iso }
    let out = DateFormatter()
    out.dateFormat = "MMM d"
    return out.string(from: date)
}

/// Format a Date → "Feb 14" (used by lock screen widgets)
private func formatDate(_ date: Date) -> String {
    let fmt = DateFormatter()
    fmt.dateFormat = "MMM d"
    return fmt.string(from: date)
}

/// "OVERDUE" / "DUE TODAY" / "DUE TOMORROW" / "DUE IN 5 DAYS"
private func dueInLabel(_ days: Int) -> String {
    switch days {
    case ..<0:  return "OVERDUE"
    case 0:     return "DUE TODAY"
    case 1:     return "DUE TOMORROW"
    default:    return "DUE IN \(days) DAYS"
    }
}

/// Urgency enum → dot color
private func dotColor(for urgency: DuezoWidgetPayload.UpcomingBill.Urgency) -> Color {
    switch urgency {
    case .critical: return Color(hex: 0xef4444)
    case .soon:     return Color(hex: 0xf97316)
    case .later:    return Color(hex: 0x22c55e)
    }
}

// MARK: - Gold Accent Color

private let goldAccent = Color(hex: 0xF5A623)

// MARK: - Frosted Glass Background

struct WidgetBackground: View {
    let theme: WidgetTheme
    var isOverdue: Bool = false
    var cornerRadius: CGFloat = 22

    // Each theme gets a unique rich gradient (opaque, no material)
    private var gradientColors: [Color] {
        switch theme {
        case .sunrise:
            return [Color(hex: 0xf97316), Color(hex: 0xef4444), Color(hex: 0xdb2777)]
        case .haze:
            return [Color(hex: 0x2d1b4e), Color(hex: 0x4c1d95), Color(hex: 0x581c87)]
        case .aurora:
            return [Color(hex: 0x059669), Color(hex: 0x0d9488), Color(hex: 0x0891b2)]
        case .tropical:
            return [Color(hex: 0x1e3a5f), Color(hex: 0x2563eb), Color(hex: 0x0ea5e9)]
        case .peach:
            return [Color(hex: 0xf472b6), Color(hex: 0xc084fc), Color(hex: 0xa78bfa)]
        }
    }

    var body: some View {
        ZStack {
            // Opaque gradient base — NO material, colors show through strong
            LinearGradient(
                colors: gradientColors,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            // Darkening for text readability — stronger on warm/bright themes
            Color.black.opacity(theme.isWarm ? 0.25 : 0.25)

            // Radial glow from center-left (where ring sits)
            RadialGradient(
                colors: [Color.white.opacity(0.15), .clear],
                center: .leading,
                startRadius: 0,
                endRadius: 250
            )

            // Subtle light from top-right
            RadialGradient(
                colors: [Color.white.opacity(0.08), .clear],
                center: .topTrailing,
                startRadius: 0,
                endRadius: 180
            )

            if isOverdue {
                Color.red.opacity(0.2)
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .stroke(
                    LinearGradient(
                        colors: [Color.white.opacity(0.3), Color.white.opacity(0.05)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 0.75
                )
        )
    }
}

/// Frosted glass panel for content sections
struct GlassCard<Content: View>: View {
    var cornerRadius: CGFloat = 12
    var isWarmTheme: Bool = false
    @ViewBuilder let content: () -> Content

    var body: some View {
        content()
            .background(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(Color.white.opacity(isWarmTheme ? 0.12 : 0.06))
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                            .stroke(
                                LinearGradient(
                                    colors: [Color.white.opacity(0.18), Color.white.opacity(0.03)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 0.5
                            )
                    )
            )
    }
}

// MARK: - Countdown Ring (Hero Component)

struct CountdownRing: View {
    let days: Int
    let size: CGFloat
    let lineWidth: CGFloat
    let theme: WidgetTheme
    var showLabel: Bool = true

    private var progress: Double {
        if days < 0 { return 1.0 }
        if days > 30 { return 1.0 }
        return max(Double(days) / 30.0, 0.05)
    }

    private var primaryColor: Color {
        if days < 0 { return Color(hex: 0xef4444) }
        if days <= 2 { return Color(hex: 0xf87171) }
        return theme.accentColor
    }

    private var thickWidth: CGFloat { lineWidth * 1.8 }

    var body: some View {
        ZStack {
            // Subtle outer glow
            Circle()
                .fill(
                    RadialGradient(
                        colors: [primaryColor.opacity(0.2), .clear],
                        center: .center, startRadius: size * 0.2, endRadius: size * 0.7
                    )
                )
                .frame(width: size * 1.3, height: size * 1.3)
                .blur(radius: 10)

            // Track
            Circle()
                .stroke(Color.white.opacity(0.06), lineWidth: thickWidth)
                .frame(width: size, height: size)

            // Progress arc
            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    AngularGradient(
                        colors: [primaryColor, primaryColor.opacity(0.5), primaryColor],
                        center: .center
                    ),
                    style: StrokeStyle(lineWidth: thickWidth, lineCap: .round)
                )
                .frame(width: size, height: size)
                .rotationEffect(.degrees(-90))
                .shadow(color: primaryColor.opacity(0.6), radius: 8)

            // Glowing end cap
            Circle()
                .fill(
                    RadialGradient(
                        colors: [.white, primaryColor],
                        center: .center, startRadius: 0, endRadius: thickWidth * 0.8
                    )
                )
                .frame(width: thickWidth, height: thickWidth)
                .shadow(color: primaryColor, radius: 6)
                .offset(y: -size / 2)
                .rotationEffect(.degrees(-90 + 360 * progress))

            // Number + label
            VStack(spacing: 0) {
                Text("\(abs(days))")
                    .font(.system(size: size * 0.36, weight: .black, design: .rounded))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.white, .white.opacity(0.85)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .shadow(color: primaryColor.opacity(0.5), radius: 10)

                if showLabel {
                    Text(days < 0 ? "LATE" : days == 1 ? "DAY" : "DAYS")
                        .font(.system(size: size * 0.1, weight: .heavy, design: .rounded))
                        .foregroundColor(.white.opacity(0.75))
                        .tracking(2)
                }
            }
        }
    }
}

// MARK: - Home Screen Entry View Router

struct DuezoWidgetEntryView: View {
    var entry: DuezoEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        if let error = entry.error {
            ErrorView(message: error)
        } else if let payload = entry.payload, let _ = payload.nextBill {
            let theme = WidgetTheme.current()
            switch family {
            case .systemSmall:
                SmallCountdownWidgetView(payload: payload, theme: theme)
            case .systemMedium:
                MediumBillsWidgetView(payload: payload, theme: theme)
            case .systemLarge:
                LargeWidgetView(payload: payload, theme: theme)
            default:
                SmallCountdownWidgetView(payload: payload, theme: theme)
            }
        } else {
            PlaceholderView()
        }
    }
}

// MARK: - Large Widget — "The Terminal"
// Full fintech dashboard: hero bill with massive amount, stats strip, bill list with urgency bars.

struct LargeWidgetView: View {
    let payload: DuezoWidgetPayload
    let theme: WidgetTheme

    private var displayBills: [DuezoWidgetPayload.UpcomingBill] {
        let filtered: [DuezoWidgetPayload.UpcomingBill]
        if let nextBill = payload.nextBill, let firstUpcoming = payload.upcoming.first, firstUpcoming.id == nextBill.id {
            filtered = Array(payload.upcoming.dropFirst())
        } else {
            filtered = payload.upcoming
        }
        return Array(filtered.prefix(4))
    }

    private var heroColor: Color {
        guard let bill = payload.nextBill else { return theme.accentColor }
        if bill.liveDaysLeft < 0 { return Color(hex: 0xef4444) }
        if bill.liveDaysLeft <= 2 { return Color(hex: 0xf87171) }
        return theme.accentColor
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // HEADER — brand + total
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 1) {
                    HStack(spacing: 4) {
                        Image(systemName: "bolt.fill")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(theme.accentColor)
                            .shadow(color: theme.accentColor.opacity(0.6), radius: 3)
                        Text("DUEZO")
                            .font(.system(size: 10, weight: .black, design: .rounded))
                            .foregroundColor(.white.opacity(0.8))
                            .tracking(2.5)
                    }
                    Text("\(payload.upcoming.count) bills upcoming")
                        .font(.system(size: 10, weight: .medium, design: .rounded))
                        .foregroundColor(.white.opacity(0.7))
                }

                Spacer()

                // Total due — bold monospaced
                VStack(alignment: .trailing, spacing: 1) {
                    Text("TOTAL")
                        .font(.system(size: 9, weight: .bold, design: .rounded))
                        .foregroundColor(.white.opacity(0.75))
                        .tracking(2)
                    Text("$\(payload.totals.totalDue, specifier: "%.2f")")
                        .font(.system(size: 24, weight: .black, design: .monospaced))
                        .foregroundColor(.white)
                        .shadow(color: theme.accentColor.opacity(0.25), radius: 8)

                    if let delta = payload.totals.deltaVsLastMonth, delta != 0 {
                        HStack(spacing: 3) {
                            Image(systemName: delta > 0 ? "arrow.up.right" : "arrow.down.right")
                                .font(.system(size: 7, weight: .black))
                            Text("$\(abs(delta), specifier: "%.0f")")
                                .font(.system(size: 9, weight: .black, design: .monospaced))
                        }
                        .foregroundColor(delta > 0 ? Color(hex: 0xef4444) : Color(hex: 0x22c55e))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(
                            RoundedRectangle(cornerRadius: 4, style: .continuous)
                                .fill((delta > 0 ? Color(hex: 0xef4444) : Color(hex: 0x22c55e)).opacity(0.1))
                        )
                    }
                }
            }
            .padding(.bottom, 10)

            // HERO BILL — the star of the show
            if let bill = payload.nextBill {
                HStack(spacing: 0) {
                    // Countdown ring
                    CountdownRing(days: bill.liveDaysLeft, size: 72, lineWidth: 5, theme: theme)
                        .padding(.trailing, 12)

                    // Bill info — stacked, fills remaining width
                    VStack(alignment: .leading, spacing: 2) {
                        Text("NEXT DUE")
                            .font(.system(size: 9, weight: .heavy, design: .rounded))
                            .foregroundColor(heroColor.opacity(0.9))
                            .tracking(2)

                        Text(bill.vendor)
                            .font(.system(size: 20, weight: .heavy, design: .rounded))
                            .foregroundColor(.white)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)

                        // Massive amount
                        Text("$\(bill.amount, specifier: "%.2f")")
                            .font(.system(size: 28, weight: .black, design: .monospaced))
                            .foregroundColor(heroColor)
                            .shadow(color: heroColor.opacity(0.4), radius: 10)
                            .minimumScaleFactor(0.7)
                            .lineLimit(1)

                        HStack(spacing: 6) {
                            Text(formatISODate(bill.dueDate))
                                .font(.system(size: 11, weight: .medium, design: .rounded))
                                .foregroundColor(.white.opacity(0.7))

                            if bill.isAutopay == true {
                                HStack(spacing: 2) {
                                    Image(systemName: "arrow.triangle.2.circlepath")
                                        .font(.system(size: 7, weight: .bold))
                                    Text("AUTO")
                                        .font(.system(size: 7, weight: .bold, design: .rounded))
                                        .tracking(1)
                                }
                                .foregroundColor(.white.opacity(0.6))
                            }
                        }
                    }

                    Spacer()
                }
                .padding(.bottom, 10)
            }

            // SEPARATOR — neon gradient line
            Rectangle()
                .fill(
                    LinearGradient(
                        colors: [heroColor.opacity(0.5), heroColor.opacity(0.1), .clear],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .frame(height: 1)
                .shadow(color: heroColor.opacity(0.4), radius: 3)
                .padding(.bottom, 8)

            // BILL LIST — urgency-coded rows
            VStack(spacing: 5) {
                ForEach(displayBills) { bill in
                    LargeBillRow(bill: bill, theme: theme)
                }
            }

            if payload.upcoming.count > displayBills.count + 1 {
                let remaining = payload.upcoming.count - displayBills.count - 1
                HStack {
                    Spacer()
                    Text("+\(remaining) more")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundColor(.white.opacity(0.6))
                        .tracking(0.5)
                }
                .padding(.top, 4)
            }

            Spacer(minLength: 0)
        }
        .padding(14)
        .containerBackground(for: .widget) {
            WidgetBackground(theme: theme, isOverdue: payload.nextBill?.liveDaysLeft ?? 0 < 0)
        }
    }
}

// MARK: - Large Bill Row — Gradient urgency bar + compact layout

struct LargeBillRow: View {
    let bill: DuezoWidgetPayload.UpcomingBill
    let theme: WidgetTheme

    private var urgColor: Color {
        switch bill.urgency {
        case .critical: return Color(hex: 0xef4444)
        case .soon:     return Color(hex: 0xfb923c)
        case .later:    return Color(hex: 0x22c55e)
        }
    }

    var body: some View {
        HStack(spacing: 0) {
            // Urgency heat bar — rounded left edge
            RoundedRectangle(cornerRadius: 2)
                .fill(
                    LinearGradient(
                        colors: [urgColor, urgColor.opacity(0.3)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .frame(width: 3)
                .shadow(color: urgColor.opacity(0.6), radius: 4)
                .padding(.vertical, 6)

            HStack(spacing: 8) {
                // Urgency dot
                Circle()
                    .fill(urgColor)
                    .frame(width: 6, height: 6)
                    .shadow(color: urgColor.opacity(0.7), radius: 3)

                VStack(alignment: .leading, spacing: 1) {
                    Text(bill.vendor)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Text(formatISODate(bill.dueDate))
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundColor(.white.opacity(0.7))
                }

                Spacer(minLength: 4)

                VStack(alignment: .trailing, spacing: 1) {
                    Text("$\(bill.amount, specifier: "%.2f")")
                        .font(.system(size: 17, weight: .black, design: .monospaced))
                        .foregroundColor(.white)

                    Text(dueInLabel(bill.liveDaysLeft))
                        .font(.system(size: 10, weight: .heavy, design: .rounded))
                        .foregroundColor(urgColor)
                        .tracking(0.5)
                }
            }
            .padding(.leading, 8)
            .padding(.trailing, 10)
        }
        .padding(.vertical, 4)
        .background(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color.white.opacity(theme.isWarm ? 0.1 : 0.05))
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .stroke(Color.white.opacity(0.04), lineWidth: 0.5)
                )
        )
    }
}

// MARK: - Placeholder View

struct PlaceholderView: View {
    private var hasSynced: Bool { DuezoWidgetStore().hasSynced }
    private var theme: WidgetTheme { WidgetTheme.current() }

    var body: some View {
        if hasSynced {
            // All clear state — clean, celebratory
            VStack(spacing: 8) {
                Spacer()

                ZStack {
                    // Glow behind icon
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [Color(hex: 0x22c55e).opacity(0.25), .clear],
                                center: .center, startRadius: 0, endRadius: 50
                            )
                        )
                        .frame(width: 100, height: 100)
                        .blur(radius: 20)

                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 40, weight: .bold))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color(hex: 0x22c55e), Color(hex: 0x16a34a)],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .shadow(color: Color(hex: 0x22c55e).opacity(0.5), radius: 12)
                }

                Text("ALL CLEAR")
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundColor(.white.opacity(0.85))
                    .tracking(3)

                Text("No upcoming bills")
                    .font(.system(size: 10, weight: .medium, design: .rounded))
                    .foregroundColor(.white.opacity(0.3))

                Spacer()
            }
            .padding()
            .containerBackground(for: .widget) {
                WidgetBackground(theme: theme)
            }
        } else {
            // Not synced — prompt to open app
            VStack(spacing: 8) {
                Spacer()

                ZStack {
                    // Pulsing accent glow
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [theme.accentColor.opacity(0.2), .clear],
                                center: .center, startRadius: 0, endRadius: 50
                            )
                        )
                        .frame(width: 100, height: 100)
                        .blur(radius: 20)

                    // Layered icon
                    ZStack {
                        Image(systemName: "bolt.fill")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(theme.accentColor.opacity(0.15))
                            .blur(radius: 6)

                        Image(systemName: "bolt.fill")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(theme.accentColor)
                            .shadow(color: theme.accentColor.opacity(0.6), radius: 8)
                    }
                }

                Text("DUEZO")
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundColor(.white.opacity(0.8))
                    .tracking(4)

                Text("Open app to sync")
                    .font(.system(size: 10, weight: .medium, design: .rounded))
                    .foregroundColor(.white.opacity(0.3))

                Spacer()
            }
            .padding()
            .containerBackground(for: .widget) {
                WidgetBackground(theme: theme)
            }
        }
    }
}

// MARK: - Error View

struct ErrorView: View {
    let message: String

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(goldAccent.opacity(0.8))

            Text(message)
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundColor(.white.opacity(0.6))
                .multilineTextAlignment(.center)

            Text("Open app to configure")
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .foregroundColor(goldAccent.opacity(0.8))
        }
        .padding()
        .containerBackground(for: .widget) {
            ZStack {
                Rectangle().fill(.regularMaterial)
                Color.white.opacity(0.03)
            }
            .overlay(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(Color.white.opacity(0.15), lineWidth: 0.75)
            )
        }
    }
}

// MARK: - Lock Screen: Gradient Gauge (Circular)

// MARK: - Lock Screen: Countdown Gauge (Circular)
// Uses Apple's native Gauge view — renders beautifully on lock screen

struct GaugeCircularView: View {
    let bills: [Bill]

    var nextBill: Bill? { bills.first }

    var body: some View {
        if let bill = nextBill {
            let days = bill.daysUntilDue
            let gaugeValue = max(0, min(1, urgencyProgress(days)))
            let isOverdue = days < 0

            Gauge(value: gaugeValue) {
                // Label (shown when space allows)
                Text(String(bill.name.prefix(3)).uppercased())
                    .font(.system(size: 8, weight: .bold, design: .rounded))
            } currentValueLabel: {
                VStack(spacing: -2) {
                    Text(isOverdue ? "!" : "\(abs(days))")
                        .font(.system(size: 22, weight: .black, design: .rounded))
                    Text(isOverdue ? "LATE" : days == 0 ? "DUE" : days == 1 ? "DAY" : "DAYS")
                        .font(.system(size: 7, weight: .heavy, design: .rounded))
                        .textCase(.uppercase)
                }
            }
            .gaugeStyle(.accessoryCircularCapacity)
            .widgetAccentable()
            .containerBackground(for: .widget) { Color.clear }
        }
    }
}

// MARK: - Lock Screen: Next Bill Card (Rectangular)
// Uses AccessoryWidgetBackground for native frosted look

struct GlowSplitRectView: View {
    let bills: [Bill]

    var nextBill: Bill? { bills.first }

    var body: some View {
        if let bill = nextBill {
            let days = bill.daysUntilDue
            let isOverdue = days < 0
            let gaugeValue = max(0, min(1, urgencyProgress(days)))

            HStack(spacing: 8) {
                // Mini gauge on the left
                Gauge(value: gaugeValue) {
                    Text("")
                } currentValueLabel: {
                    Text(isOverdue ? "!" : "\(abs(days))")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                }
                .gaugeStyle(.accessoryCircularCapacity)
                .frame(width: 40, height: 40)
                .widgetAccentable()

                // Bill info on the right
                VStack(alignment: .leading, spacing: 2) {
                    Text(bill.name)
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)

                    Text("$\(bill.amount, specifier: "%.2f")")
                        .font(.system(size: 12, weight: .semibold, design: .monospaced))
                        .opacity(0.8)

                    Text(isOverdue ? "Overdue" : days == 0 ? "Due today" : days == 1 ? "Due tomorrow" : "Due in \(days) days")
                        .font(.system(size: 10, weight: .medium))
                        .opacity(0.6)
                }

                Spacer(minLength: 0)
            }
            .containerBackground(for: .widget) {
                AccessoryWidgetBackground()
            }
        }
    }
}

// MARK: - Compatibility aliases

struct ProgressBarRectView: View {
    let bills: [Bill]
    var body: some View {
        GlowSplitRectView(bills: bills)
    }
}

struct BrandedCircularView: View {
    let bills: [Bill]
    var body: some View {
        GaugeCircularView(bills: bills)
    }
}

struct FlameCircularView: View {
    let bills: [Bill]
    var body: some View {
        GaugeCircularView(bills: bills)
    }
}

// MARK: - Lock Screen: Inline Widget

struct InlineWidgetView: View {
    let bills: [Bill]

    var body: some View {
        if let bill = bills.first {
            let days = bill.daysUntilDue
            let isOverdue = days < 0

            if isOverdue {
                Text("⚡ \(bill.name) OVERDUE · $\(bill.amount, specifier: "%.0f")")
            } else if days == 0 {
                Text("⚡ \(bill.name) due today · $\(bill.amount, specifier: "%.2f")")
            } else if days == 1 {
                Text("⚡ \(bill.name) due tomorrow · $\(bill.amount, specifier: "%.2f")")
            } else {
                let weekBills = bills.filter { $0.daysUntilDue >= 0 && $0.daysUntilDue <= 7 }
                if weekBills.count > 1 {
                    let total = weekBills.reduce(0) { $0 + $1.amount }
                    Text("⚡ \(weekBills.count) bills this week · $\(total, specifier: "%.2f")")
                } else {
                    Text("⚡ \(bill.name) · \(days) days · $\(bill.amount, specifier: "%.2f")")
                }
            }
        } else {
            Text("⚡ All bills paid!")
        }
    }
}

// MARK: - Lock Screen Entry View Router

struct LockScreenEntryView: View {
    var entry: DuezoEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        if entry.error != nil {
            Text("⚡ —")
        } else if entry.bills.isEmpty {
            Text("⚡ ✓")
        } else {
            switch family {
            case .accessoryInline:
                InlineWidgetView(bills: entry.bills)
            case .accessoryCircular:
                GaugeCircularView(bills: entry.bills)
            case .accessoryRectangular:
                GlowSplitRectView(bills: entry.bills)
            default:
                GaugeCircularView(bills: entry.bills)
            }
        }
    }
}

// MARK: - Widget Configuration

@main
struct DuezoWidgets: WidgetBundle {
    var body: some Widget {
        DuezoWidget()
        DuezoLockScreenWidget()
        DuezoGaugeWidget()
    }
}

struct DuezoWidget: Widget {
    let kind: String = "DuezoWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DuezoProvider()) { entry in
            DuezoWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Duezo Bills")
        .description("See your upcoming bills at a glance")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct DuezoLockScreenWidget: Widget {
    let kind: String = "DuezoLockScreen"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DuezoProvider()) { entry in
            LockScreenEntryView(entry: entry)
        }
        .configurationDisplayName("Duezo — Next Bill")
        .description("Your next bill with countdown and amount")
        .supportedFamilies([.accessoryRectangular, .accessoryInline])
    }
}

struct DuezoGaugeWidget: Widget {
    let kind: String = "DuezoGauge"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DuezoProvider()) { entry in
            if entry.bills.isEmpty && entry.error == nil {
                Text("✓")
            } else if entry.error != nil {
                Text("—")
            } else {
                GaugeCircularView(bills: entry.bills)
            }
        }
        .configurationDisplayName("Duezo — Countdown")
        .description("Bill countdown with urgency ring")
        .supportedFamilies([.accessoryCircular])
    }
}
