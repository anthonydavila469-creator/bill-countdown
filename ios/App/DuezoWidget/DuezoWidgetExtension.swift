//
//  DuezoWidgetExtension.swift
//  DuezoWidgetExtension
//
//  Created by Anthony Dyess on 2/7/26.
//

import WidgetKit
import SwiftUI

// MARK: - Configuration
struct WidgetConfig {
    static let appGroupID = "group.app.duezo"
    static let billsKey = "cached_bills"
    static let lastSyncKey = "last_sync_date"
}

// MARK: - Bill Model
struct Bill: Codable, Identifiable {
    let id: String
    let name: String
    let amount: Double
    let due_date: String
    let category: String?
    let is_paid: Bool
    
    var dueDate: Date {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        return formatter.date(from: due_date) ?? Date()
    }
    
    var daysUntilDue: Int {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let due = calendar.startOfDay(for: dueDate)
        return calendar.dateComponents([.day], from: today, to: due).day ?? 0
    }
    
    var urgencyColor: Color {
        switch daysUntilDue {
        case ..<0: return .red // Overdue
        case 0...2: return .red // Urgent
        case 3...7: return .orange // Soon
        default: return .green // Good
        }
    }
}

// MARK: - Shared Storage (reads what the main app writes)
class BillsStorage {
    static let shared = BillsStorage()
    
    private var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: WidgetConfig.appGroupID)
    }
    
    func getBills() -> [Bill] {
        guard let defaults = sharedDefaults,
              let data = defaults.data(forKey: WidgetConfig.billsKey) else {
            return []
        }
        
        do {
            let bills = try JSONDecoder().decode([Bill].self, from: data)
            // Return unpaid bills sorted by due date
            return bills
                .filter { !$0.is_paid }
                .sorted { $0.dueDate < $1.dueDate }
        } catch {
            print("[Widget] Failed to decode bills: \(error)")
            return []
        }
    }
    
    var lastSyncDate: Date? {
        sharedDefaults?.object(forKey: WidgetConfig.lastSyncKey) as? Date
    }
}

// MARK: - Timeline Provider
struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> BillEntry {
        BillEntry(date: Date(), bills: [
            Bill(id: "1", name: "Electric", amount: 142.50, due_date: "2026-02-15", category: "Utilities", is_paid: false),
            Bill(id: "2", name: "Internet", amount: 79.99, due_date: "2026-02-20", category: "Utilities", is_paid: false)
        ], isPlaceholder: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (BillEntry) -> ()) {
        let bills = BillsStorage.shared.getBills()
        let entry = BillEntry(date: Date(), bills: bills)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let bills = BillsStorage.shared.getBills()
        let entry = BillEntry(date: Date(), bills: bills)
        
        // Refresh every 30 minutes to check for updates
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Timeline Entry
struct BillEntry: TimelineEntry {
    let date: Date
    let bills: [Bill]
    var isPlaceholder: Bool = false
    
    var nextBill: Bill? {
        bills.first
    }
    
    var upcomingBills: [Bill] {
        Array(bills.prefix(5))
    }
    
    var totalDue: Double {
        bills.reduce(0) { $0 + $1.amount }
    }
    
    var hasNoBills: Bool {
        bills.isEmpty && !isPlaceholder
    }
}

// MARK: - Widget Views
struct DuezoWidgetExtensionEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        case .systemLarge:
            LargeWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

// MARK: - Small Widget
struct SmallWidgetView: View {
    let entry: BillEntry
    
    var body: some View {
        if entry.hasNoBills {
            EmptyStateView()
        } else if let bill = entry.nextBill {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Image(systemName: "bolt.fill")
                        .foregroundColor(.orange)
                        .font(.caption)
                    Text("NEXT DUE")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundColor(.secondary)
                    Spacer()
                    Circle()
                        .fill(bill.urgencyColor)
                        .frame(width: 8, height: 8)
                }
                
                Text(bill.name)
                    .font(.headline)
                    .fontWeight(.bold)
                    .lineLimit(1)
                
                Text("$\(bill.amount, specifier: "%.2f")")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(bill.urgencyColor)
                
                Spacer()
                
                Text(daysText(bill.daysUntilDue))
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(bill.urgencyColor)
            }
            .padding()
            .containerBackground(.fill.tertiary, for: .widget)
        } else {
            AllCaughtUpView()
        }
    }
}

// MARK: - Medium Widget
struct MediumWidgetView: View {
    let entry: BillEntry
    
    var body: some View {
        if entry.hasNoBills {
            EmptyStateView()
        } else {
            HStack(spacing: 16) {
                // Next bill highlight
                if let bill = entry.nextBill {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Image(systemName: "bolt.fill")
                                .foregroundColor(.orange)
                            Text("NEXT")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        
                        Text(bill.name)
                            .font(.headline)
                            .fontWeight(.bold)
                        
                        Text("$\(bill.amount, specifier: "%.2f")")
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundColor(bill.urgencyColor)
                        
                        Spacer()
                        
                        Text(daysText(bill.daysUntilDue))
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(bill.urgencyColor)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                
                Divider()
                
                // Upcoming list
                VStack(alignment: .leading, spacing: 6) {
                    Text("UPCOMING")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    
                    if entry.upcomingBills.count > 1 {
                        ForEach(entry.upcomingBills.dropFirst().prefix(3)) { bill in
                            HStack {
                                Circle()
                                    .fill(bill.urgencyColor)
                                    .frame(width: 6, height: 6)
                                Text(bill.name)
                                    .font(.caption)
                                    .lineLimit(1)
                                Spacer()
                                Text("$\(bill.amount, specifier: "%.0f")")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    } else {
                        Text("No more bills")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding()
            .containerBackground(.fill.tertiary, for: .widget)
        }
    }
}

// MARK: - Large Widget
struct LargeWidgetView: View {
    let entry: BillEntry
    
    var body: some View {
        if entry.hasNoBills {
            EmptyStateView()
        } else {
            VStack(alignment: .leading, spacing: 12) {
                // Header
                HStack {
                    Image(systemName: "bolt.fill")
                        .foregroundColor(.orange)
                    Text("Duezo")
                        .font(.headline)
                        .fontWeight(.bold)
                    Spacer()
                    Text("$\(entry.totalDue, specifier: "%.2f") due")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Divider()
                
                // Bills list
                if entry.upcomingBills.isEmpty {
                    Spacer()
                    AllCaughtUpView()
                    Spacer()
                } else {
                    ForEach(entry.upcomingBills) { bill in
                        HStack {
                            Circle()
                                .fill(bill.urgencyColor)
                                .frame(width: 10, height: 10)
                            
                            VStack(alignment: .leading) {
                                Text(bill.name)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                Text(daysText(bill.daysUntilDue))
                                    .font(.caption)
                                    .foregroundColor(bill.urgencyColor)
                            }
                            
                            Spacer()
                            
                            Text("$\(bill.amount, specifier: "%.2f")")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                        }
                        .padding(.vertical, 2)
                    }
                    Spacer()
                }
            }
            .padding()
            .containerBackground(.fill.tertiary, for: .widget)
        }
    }
}

// MARK: - Shared Views
struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "arrow.triangle.2.circlepath")
                .font(.largeTitle)
                .foregroundColor(.orange)
            Text("Open Duezo")
                .font(.headline)
            Text("to sync your bills")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

struct AllCaughtUpView: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .font(.largeTitle)
                .foregroundColor(.green)
            Text("All caught up!")
                .font(.headline)
            Text("No upcoming bills")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Helpers
func daysText(_ days: Int) -> String {
    switch days {
    case ..<0: return "\(abs(days))d overdue"
    case 0: return "Due today!"
    case 1: return "Due tomorrow"
    default: return "\(days) days left"
    }
}

// MARK: - Widget Configuration
struct DuezoWidgetExtension: Widget {
    let kind: String = "DuezoWidgetExtension"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            DuezoWidgetExtensionEntryView(entry: entry)
        }
        .configurationDisplayName("Bill Countdown")
        .description("See your upcoming bills at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Previews
#Preview(as: .systemSmall) {
    DuezoWidgetExtension()
} timeline: {
    BillEntry(date: Date(), bills: [
        Bill(id: "1", name: "Electric", amount: 142.50, due_date: "2026-02-10", category: "Utilities", is_paid: false),
        Bill(id: "2", name: "Internet", amount: 79.99, due_date: "2026-02-15", category: "Utilities", is_paid: false)
    ])
}

#Preview(as: .systemMedium) {
    DuezoWidgetExtension()
} timeline: {
    BillEntry(date: Date(), bills: [
        Bill(id: "1", name: "Electric", amount: 142.50, due_date: "2026-02-10", category: "Utilities", is_paid: false),
        Bill(id: "2", name: "Internet", amount: 79.99, due_date: "2026-02-15", category: "Utilities", is_paid: false),
        Bill(id: "3", name: "Phone", amount: 85.00, due_date: "2026-02-20", category: "Utilities", is_paid: false)
    ])
}

#Preview(as: .systemLarge) {
    DuezoWidgetExtension()
} timeline: {
    BillEntry(date: Date(), bills: [
        Bill(id: "1", name: "Electric", amount: 142.50, due_date: "2026-02-10", category: "Utilities", is_paid: false),
        Bill(id: "2", name: "Internet", amount: 79.99, due_date: "2026-02-15", category: "Utilities", is_paid: false),
        Bill(id: "3", name: "Phone", amount: 85.00, due_date: "2026-02-20", category: "Utilities", is_paid: false),
        Bill(id: "4", name: "Netflix", amount: 15.99, due_date: "2026-02-22", category: "Subscriptions", is_paid: false)
    ])
}

#Preview("Empty State", as: .systemSmall) {
    DuezoWidgetExtension()
} timeline: {
    BillEntry(date: Date(), bills: [])
}
