import SwiftUI
import WidgetKit

struct SmallCountdownWidgetView: View {
    let payload: DuezoWidgetPayload
    let theme: WidgetTheme

    var body: some View {
        if let bill = payload.nextBill {
            VStack(spacing: 4) {
                Spacer(minLength: 0)

                CountdownRing(days: bill.daysLeft, size: 72, lineWidth: 5, theme: theme)

                Text(bill.vendor)
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                    .lineLimit(1)

                Text("$\(bill.amount, specifier: "%.2f")")
                    .font(.system(size: 15, weight: .heavy, design: .rounded))
                    .foregroundColor(.white.opacity(0.95))
                    .lineLimit(1)

                Text("Due \(formatISODate(bill.dueDate))")
                    .font(.system(size: 10, weight: .semibold, design: .rounded))
                    .foregroundColor(.white.opacity(0.6))
                    .lineLimit(1)

                Spacer(minLength: 0)
            }
            .padding(14)
            .containerBackground(for: .widget) {
                WidgetBackground(theme: theme)
            }
        }
    }
}

#Preview("Small", as: .systemSmall) {
    DuezoWidget()
} timeline: {
    DuezoEntry.placeholder
}
