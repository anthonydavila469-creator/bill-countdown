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
    }

    func readTheme() -> String {
        defaults.string(forKey: Self.themeKey) ?? "emerald"
    }

    func readPayload() -> DuezoWidgetPayload? {
        guard let json = defaults.string(forKey: Self.payloadKey),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(DuezoWidgetPayload.self, from: data)
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
                return DuezoEntry(date: Date(), payload: payload, bills: unpaid, error: nil)
            } catch {
                print("[DuezoWidget] Failed to decode legacy bills: \(error)")
            }
        }

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
    case onyx, pink, sky, emerald, midnight, wine, amethyst, ocean, sunset, ember, cosmic

    var tintColor: Color {
        switch self {
        case .onyx:     return Color.white
        case .pink:     return Color(hex: 0xec4899)
        case .sky:      return Color(hex: 0x38bdf8)
        case .emerald:  return Color(hex: 0x34d399)
        case .midnight: return Color(hex: 0x3b82f6)
        case .wine:     return Color(hex: 0xbe185d)
        case .amethyst: return Color(hex: 0xa78bfa)
        case .ocean:    return Color(hex: 0x14b8a6)
        case .sunset:   return Color(hex: 0xf97316)
        case .ember:    return Color(hex: 0xec4899)  // pink
        case .cosmic:   return Color(hex: 0x38bdf8)  // sky
        }
    }

    /// Whether this theme has a bright/warm background that needs stronger contrast
    var isWarm: Bool {
        switch self {
        case .sunset, .wine: return true
        default: return false
        }
    }

    var tintOpacity: Double {
        switch self {
        case .onyx: return 0.03
        default:    return 0.04
        }
    }

    var accentColor: Color {
        switch self {
        case .onyx:     return Color(hex: 0x06b6d4)
        case .pink:     return Color(hex: 0xf472b6)
        case .sky:      return Color(hex: 0x60a5fa)
        case .emerald:  return Color(hex: 0x34d399)
        case .midnight: return Color(hex: 0x60a5fa)
        case .wine:     return Color(hex: 0xf472b6)
        case .amethyst: return Color(hex: 0xc084fc)
        case .ocean:    return Color(hex: 0x2dd4bf)
        case .sunset:   return Color(hex: 0xfb923c)
        case .ember:    return Color(hex: 0xf472b6)  // pink
        case .cosmic:   return Color(hex: 0x60a5fa)  // sky
        }
    }

    var glowColor: Color { accentColor.opacity(0.35) }

    static func current() -> WidgetTheme {
        guard let defaults = UserDefaults(suiteName: DuezoWidgetStore.appGroupId) else {
            print("[DuezoWidget] ❌ Can't access App Group for theme")
            return .onyx
        }
        let raw = defaults.string(forKey: DuezoWidgetStore.themeKey)
        print("[DuezoWidget] Theme raw value: \(raw ?? "nil")")
        guard let raw = raw, let theme = WidgetTheme(rawValue: raw) else {
            print("[DuezoWidget] ❌ Theme fallback to onyx (raw: \(raw ?? "nil"))")
            return .onyx
        }
        print("[DuezoWidget] ✅ Using theme: \(theme.rawValue)")
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
        case .pink:
            return [Color(hex: 0xdb2777), Color(hex: 0xa855f7), Color(hex: 0x7c3aed)]
        case .sky:
            return [Color(hex: 0x38bdf8), Color(hex: 0x818cf8), Color(hex: 0x6366f1)]
        case .emerald:
            return [Color(hex: 0x059669), Color(hex: 0x0d9488), Color(hex: 0x0f766e)]
        case .midnight:
            return [Color(hex: 0x1e3a5f), Color(hex: 0x1e40af), Color(hex: 0x312e81)]
        case .wine:
            return [Color(hex: 0x9f1239), Color(hex: 0xbe185d), Color(hex: 0x7c2d12)]
        case .onyx:
            return [Color(hex: 0x1c1c1e), Color(hex: 0x111111), Color(hex: 0x0a0a0a)]
        case .amethyst:
            return [Color(hex: 0x7c3aed), Color(hex: 0xa855f7), Color(hex: 0x6d28d9)]
        case .ocean:
            return [Color(hex: 0x0d9488), Color(hex: 0x0891b2), Color(hex: 0x065f46)]
        case .sunset:
            return [Color(hex: 0xb94500), Color(hex: 0xd4580a), Color(hex: 0x991b1b)]
        case .ember:
            // JS "ember" = UI "Pink" — use pink gradient
            return [Color(hex: 0xdb2777), Color(hex: 0xa855f7), Color(hex: 0x7c3aed)]
        case .cosmic:
            // JS "cosmic" = UI "Sky" — use sky gradient
            return [Color(hex: 0x38bdf8), Color(hex: 0x818cf8), Color(hex: 0x6366f1)]
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
            Color.black.opacity(theme.isWarm ? 0.25 : 0.12)

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

/// Lighter inner glass card for bill rows
struct GlassCard<Content: View>: View {
    var cornerRadius: CGFloat = 12
    var isWarmTheme: Bool = false
    @ViewBuilder let content: () -> Content

    var body: some View {
        content()
            .background(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(Color.white.opacity(isWarmTheme ? 0.15 : 0.08))
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(
                        LinearGradient(
                            colors: [Color.white.opacity(0.22), Color.white.opacity(0.05)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 0.5
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

    // Urgency-based colors: red when late, theme accent when fine
    private var primaryColor: Color {
        days < 0 ? Color(hex: 0xef4444) : theme.accentColor
    }

    // Second gradient color for the arc
    private var secondaryColor: Color {
        if days < 0 { return Color(hex: 0xff6b6b) }
        // Lighter/shifted version of accent for gradient effect
        return .white.opacity(0.9)
    }

    private var thickWidth: CGFloat { lineWidth * 1.6 }

    var body: some View {
        ZStack {
            // Outer glow
            Circle()
                .fill(
                    RadialGradient(
                        colors: [primaryColor.opacity(0.25), primaryColor.opacity(0.05), .clear],
                        center: .center, startRadius: size * 0.3, endRadius: size * 0.75
                    )
                )
                .frame(width: size * 1.4, height: size * 1.4)
                .blur(radius: 10)

            // Background track — subtle double ring
            Circle()
                .stroke(Color.white.opacity(0.06), lineWidth: thickWidth)
                .frame(width: size, height: size)

            Circle()
                .stroke(Color.white.opacity(0.03), lineWidth: thickWidth + 4)
                .frame(width: size, height: size)

            // Progress arc — thick with gradient
            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    AngularGradient(
                        colors: [
                            primaryColor,
                            primaryColor.opacity(0.85),
                            secondaryColor,
                            primaryColor,
                        ],
                        center: .center
                    ),
                    style: StrokeStyle(lineWidth: thickWidth, lineCap: .round)
                )
                .frame(width: size, height: size)
                .rotationEffect(.degrees(-90))
                .shadow(color: primaryColor.opacity(0.5), radius: 6, x: 0, y: 0)

            // Bright end cap
            Circle()
                .fill(
                    RadialGradient(
                        colors: [.white, primaryColor],
                        center: .center, startRadius: 0, endRadius: thickWidth * 0.8
                    )
                )
                .frame(width: thickWidth * 0.9, height: thickWidth * 0.9)
                .shadow(color: primaryColor.opacity(0.9), radius: 6)
                .offset(y: -size / 2)
                .rotationEffect(.degrees(-90 + 360 * progress))

            // Inner content
            VStack(spacing: 0) {
                Text("\(abs(days))")
                    .font(.system(size: size * 0.36, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                    .shadow(color: primaryColor.opacity(0.5), radius: 10)

                if showLabel {
                    Text(days < 0 ? "LATE" : days == 1 ? "DAY" : "DAYS")
                        .font(.system(size: size * 0.11, weight: .heavy, design: .rounded))
                        .foregroundColor(.white.opacity(0.6))
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

// MARK: - Large Widget

struct LargeWidgetView: View {
    let payload: DuezoWidgetPayload
    let theme: WidgetTheme

    private var displayBills: [DuezoWidgetPayload.UpcomingBill] {
        Array(payload.upcoming.prefix(4))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(alignment: .top) {
                // Top-left: Branding + subtitle
                VStack(alignment: .leading, spacing: 1) {
                    HStack(spacing: 4) {
                        Text("\u{26A1}")
                            .font(.system(size: 12))
                        Text("Duezo")
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                    }
                    Text("\(payload.upcoming.count) upcoming bills")
                        .font(.system(size: 10, weight: .medium, design: .rounded))
                        .foregroundColor(.white.opacity(0.5))
                }

                Spacer()

                // Top-right: Total due
                Text("$\(payload.totals.totalDue, specifier: "%.2f")")
                    .font(.system(size: 20, weight: .black, design: .rounded))
                    .foregroundColor(.white)
            }
            .padding(.bottom, 6)

            // Ring row
            if let bill = payload.nextBill {
                HStack(spacing: 12) {
                    CountdownRing(days: bill.daysLeft, size: 72, lineWidth: 5, theme: theme)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("NEXT UP")
                            .font(.system(size: 8, weight: .bold, design: .rounded))
                            .foregroundColor(theme.isWarm ? .white.opacity(0.6) : theme.accentColor.opacity(0.7))
                            .tracking(0.8)
                        Text(bill.vendor)
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                            .lineLimit(1)
                        Text("$\(bill.amount, specifier: "%.2f")")
                            .font(.system(size: 18, weight: .heavy, design: .rounded))
                            .foregroundColor(.white.opacity(0.95))
                        Text("Due \(formatISODate(bill.dueDate))")
                            .font(.system(size: 10, weight: .medium, design: .rounded))
                            .foregroundColor(.white.opacity(0.4))
                    }

                    Spacer()
                }
                .padding(.bottom, 8)
            }

            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: 0.5)
                .padding(.bottom, 6)

            // Bill rows
            VStack(spacing: 4) {
                ForEach(displayBills) { bill in
                    LargeBillRow(bill: bill, theme: theme)
                }
            }

            if payload.upcoming.count > 4 {
                Text("+ \(payload.upcoming.count - 4) more")
                    .font(.system(size: 10, weight: .medium, design: .rounded))
                    .foregroundColor(.white.opacity(0.4))
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .padding(.top, 3)
            }

            Spacer(minLength: 0)
        }
        .padding(12)
        .containerBackground(for: .widget) {
            WidgetBackground(theme: theme)
        }
    }
}

// MARK: - Large Bill Row

struct LargeBillRow: View {
    let bill: DuezoWidgetPayload.UpcomingBill
    let theme: WidgetTheme

    var body: some View {
        GlassCard(cornerRadius: 10, isWarmTheme: theme.isWarm) {
            HStack(spacing: 8) {
                Circle()
                    .fill(dotColor(for: bill.urgency))
                    .frame(width: 7, height: 7)

                VStack(alignment: .leading, spacing: 2) {
                    Text(bill.vendor)
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Text(formatISODate(bill.dueDate))
                        .font(.system(size: 10, weight: .medium, design: .rounded))
                        .foregroundColor(.white.opacity(0.45))
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("$\(bill.amount, specifier: "%.2f")")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .foregroundColor(.white)
                    Text(dueInLabel(bill.daysLeft))
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundColor(theme.isWarm ? .white.opacity(0.85) : dotColor(for: bill.urgency))
                        .tracking(0.3)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
        }
    }
}

// MARK: - Placeholder View

struct PlaceholderView: View {
    private var hasSynced: Bool { DuezoWidgetStore().hasSynced }

    var body: some View {
        if hasSynced {
            VStack(spacing: 8) {
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 30, weight: .bold))
                    .foregroundColor(Color(hex: 0x22c55e).opacity(0.8))

                Text("All caught up!")
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundColor(.white.opacity(0.8))

                Text("No upcoming bills")
                    .font(.system(size: 10, weight: .medium, design: .rounded))
                    .foregroundColor(.white.opacity(0.4))
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
        } else {
            VStack(spacing: 8) {
                Image(systemName: "bolt.fill")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.white.opacity(0.25))

                Text("Connect Duezo")
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundColor(.white.opacity(0.7))

                Text("Open the app to sync bills")
                    .font(.system(size: 10, weight: .medium, design: .rounded))
                    .foregroundColor(.white.opacity(0.35))
                    .multilineTextAlignment(.center)
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

struct GaugeCircularView: View {
    let bills: [Bill]

    var nextBill: Bill? { bills.first }

    var body: some View {
        if let bill = nextBill {
            let days = bill.daysUntilDue
            let progress = urgencyProgress(days)
            let color = urgencyColor(days)

            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.15), lineWidth: 4.5)

                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(
                        AngularGradient(
                            colors: [color, urgencySecondaryColor(days), color.opacity(0.3)],
                            center: .center
                        ),
                        style: StrokeStyle(lineWidth: 4.5, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))

                VStack(spacing: 0) {
                    Text("\(abs(days))")
                        .font(.system(size: 24, weight: .black, design: .rounded))
                        .foregroundColor(.white)
                    Text(days < 0 ? "LATE" : days == 1 ? "DAY" : "DAYS")
                        .font(.system(size: 7, weight: .heavy))
                        .foregroundColor(.white.opacity(0.6))
                        .tracking(1)
                }
            }
            .containerBackground(for: .widget) { Color.clear }
        }
    }
}

// MARK: - Lock Screen: Branded Duezo (Circular)

struct BrandedCircularView: View {
    let bills: [Bill]

    var nextBill: Bill? { bills.first }

    var body: some View {
        if let bill = nextBill {
            ZStack {
                Circle()
                    .stroke(accentOrange.opacity(0.5), lineWidth: 2.5)
                    .background(Circle().fill(accentOrange.opacity(0.08)))

                VStack(spacing: 1) {
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 7, weight: .bold))
                        .foregroundColor(accentOrange.opacity(0.8))

                    Text("\(abs(bill.daysUntilDue))")
                        .font(.system(size: 26, weight: .black, design: .rounded))
                        .foregroundColor(accentOrange)

                    Text(bill.name.prefix(8).uppercased())
                        .font(.system(size: 6, weight: .bold))
                        .foregroundColor(accentOrange.opacity(0.7))
                        .lineLimit(1)
                }
            }
            .containerBackground(for: .widget) { Color.clear }
        }
    }
}

// MARK: - Lock Screen: Flame Urgency (Circular)

struct FlameCircularView: View {
    let bills: [Bill]

    var nextBill: Bill? { bills.first }

    var body: some View {
        if let bill = nextBill {
            let days = bill.daysUntilDue
            let color = urgencyColor(days)
            let isUrgent = days >= 0 && days <= 3
            let isOverdue = days < 0

            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [color.opacity(isUrgent || isOverdue ? 0.4 : 0.25), color.opacity(0.05), .clear],
                            center: .center, startRadius: 0, endRadius: 38
                        )
                    )

                VStack(spacing: 0) {
                    if isOverdue {
                        Text("!")
                            .font(.system(size: 28, weight: .black, design: .rounded))
                            .foregroundColor(color)
                        Text("OVERDUE")
                            .font(.system(size: 6, weight: .heavy))
                            .foregroundColor(color.opacity(0.7))
                            .tracking(1)
                    } else {
                        Text("\(days)")
                            .font(.system(size: 28, weight: .black, design: .rounded))
                            .foregroundColor(color)
                        Text(days == 1 ? "DAY" : "DAYS")
                            .font(.system(size: 7, weight: .heavy))
                            .foregroundColor(color.opacity(0.6))
                            .tracking(1)
                    }
                }
            }
            .containerBackground(for: .widget) { Color.clear }
        }
    }
}

// MARK: - Lock Screen: Glow Split (Rectangular)

struct GlowSplitRectView: View {
    let bills: [Bill]

    var nextBill: Bill? { bills.first }

    var body: some View {
        if let bill = nextBill {
            let days = bill.daysUntilDue
            let color = urgencyColor(days)
            let isOverdue = days < 0

            HStack(spacing: 0) {
                ZStack {
                    Circle()
                        .fill(color.opacity(0.2))
                        .frame(width: 36, height: 36)
                        .blur(radius: 8)

                    VStack(spacing: 0) {
                        Text(isOverdue ? "!" : "\(days)")
                            .font(.system(size: 26, weight: .black, design: .rounded))
                            .foregroundColor(.white)
                        Text(isOverdue ? "LATE" : days == 1 ? "DAY" : "DAYS")
                            .font(.system(size: 6, weight: .heavy))
                            .foregroundColor(.white.opacity(0.5))
                            .tracking(1)
                    }
                }
                .frame(width: 56)

                Rectangle()
                    .fill(.white.opacity(0.15))
                    .frame(width: 0.5, height: 36)

                VStack(alignment: .leading, spacing: 2) {
                    Text(bill.name)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Text("$\(bill.amount, specifier: "%.2f")")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.white.opacity(0.6))
                    if let date = bill.dueDate {
                        Text(formatDate(date))
                            .font(.system(size: 8, weight: .medium))
                            .foregroundColor(.white.opacity(0.35))
                    }
                }
                .padding(.leading, 10)

                Spacer()
            }
            .containerBackground(for: .widget) { Color.clear }
        }
    }
}

// MARK: - Lock Screen: Progress Bar (Rectangular)

struct ProgressBarRectView: View {
    let bills: [Bill]

    var nextBill: Bill? { bills.first }

    var body: some View {
        if let bill = nextBill {
            let days = bill.daysUntilDue
            let color = urgencyColor(days)
            let progress = urgencyProgress(days)
            let isOverdue = days < 0

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(bill.name)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Spacer()
                    Text(isOverdue ? "Overdue!" : days == 0 ? "Today!" : days == 1 ? "Tomorrow" : "\(days) days")
                        .font(.system(size: 10, weight: .heavy))
                        .foregroundColor(color)
                }

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(.white.opacity(0.1))
                            .frame(height: 4)
                        RoundedRectangle(cornerRadius: 2)
                            .fill(
                                LinearGradient(
                                    colors: [color, urgencySecondaryColor(days)],
                                    startPoint: .leading, endPoint: .trailing
                                )
                            )
                            .frame(width: geo.size.width * max(progress, 0.02), height: 4)
                    }
                }
                .frame(height: 4)

                HStack {
                    Text("$\(bill.amount, specifier: "%.2f")")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundColor(.white.opacity(0.4))
                    Spacer()
                    if let date = bill.dueDate {
                        Text(formatDate(date))
                            .font(.system(size: 9, weight: .medium))
                            .foregroundColor(.white.opacity(0.4))
                    }
                }
            }
            .containerBackground(for: .widget) { Color.clear }
        }
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
        DuezoBrandedWidget()
        DuezoFlameWidget()
        DuezoProgressWidget()
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
        .configurationDisplayName("Duezo — Glow Split")
        .description("Next bill with glowing countdown")
        .supportedFamilies([.accessoryRectangular, .accessoryInline])
    }
}

struct DuezoGaugeWidget: Widget {
    let kind: String = "DuezoGauge"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DuezoProvider()) { entry in
            if entry.bills.isEmpty && entry.error == nil {
                Text("⚡ ✓")
            } else if entry.error != nil {
                Text("⚡ —")
            } else {
                GaugeCircularView(bills: entry.bills)
            }
        }
        .configurationDisplayName("Duezo — Gauge")
        .description("Countdown ring that depletes as deadline nears")
        .supportedFamilies([.accessoryCircular])
    }
}

struct DuezoBrandedWidget: Widget {
    let kind: String = "DuezoBranded"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DuezoProvider()) { entry in
            if entry.bills.isEmpty && entry.error == nil {
                Text("⚡ ✓")
            } else if entry.error != nil {
                Text("⚡ —")
            } else {
                BrandedCircularView(bills: entry.bills)
            }
        }
        .configurationDisplayName("Duezo — Branded")
        .description("Orange accent countdown with Duezo identity")
        .supportedFamilies([.accessoryCircular])
    }
}

struct DuezoFlameWidget: Widget {
    let kind: String = "DuezoFlame"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DuezoProvider()) { entry in
            if entry.bills.isEmpty && entry.error == nil {
                Text("⚡ ✓")
            } else if entry.error != nil {
                Text("⚡ —")
            } else {
                FlameCircularView(bills: entry.bills)
            }
        }
        .configurationDisplayName("Duezo — Flame")
        .description("Color shifts from green to red as deadline approaches")
        .supportedFamilies([.accessoryCircular])
    }
}

struct DuezoProgressWidget: Widget {
    let kind: String = "DuezoProgress"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DuezoProvider()) { entry in
            if entry.bills.isEmpty && entry.error == nil {
                Text("⚡ All clear!")
            } else if entry.error != nil {
                Text("⚡ —")
            } else {
                ProgressBarRectView(bills: entry.bills)
            }
        }
        .configurationDisplayName("Duezo — Progress")
        .description("Progress bar shrinks toward due date")
        .supportedFamilies([.accessoryRectangular])
    }
}
