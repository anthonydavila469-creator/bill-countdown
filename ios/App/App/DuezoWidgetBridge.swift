import Foundation
import Capacitor
import WidgetKit

@objc(DuezoWidgetBridge)
public class DuezoWidgetBridge: CAPPlugin, CAPBridgedPlugin {
    private let appGroupId = "group.app.duezo"
    private let billsKey = "duezo_bills"
    private let payloadKey = "duezo_widget_payload_v1"
    private let themeKey = "duezo_theme"
    private let updatedKey = "duezo_widget_last_updated"

    public let identifier = "DuezoWidgetBridge"
    public let jsName = "DuezoWidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "syncBills", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearBills", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncPayload", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setTheme", returnType: CAPPluginReturnPromise)
    ]

    private func sharedDefaults() -> UserDefaults? {
        let defaults = UserDefaults(suiteName: appGroupId)
        NSLog("[DuezoWidgetBridge] sharedDefaults appGroup=%@ available=%@", appGroupId, defaults != nil ? "true" : "false")
        return defaults
    }

    private func reloadWidgets(reason: String) {
        if #available(iOS 14.0, *) {
            NSLog("[DuezoWidgetBridge] Reloading widget timelines (%@)", reason)
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    @objc func syncBills(_ call: CAPPluginCall) {
        guard let bills = call.getArray("bills") else {
            call.reject("Missing bills array")
            return
        }

        NSLog("[DuezoWidgetBridge] syncBills called with %d bills", bills.count)

        guard let defaults = sharedDefaults() else {
            call.reject("Failed to access App Group")
            return
        }

        do {
            let data = try JSONSerialization.data(withJSONObject: bills, options: [])
            defaults.set(data, forKey: billsKey)
            defaults.set(Date().timeIntervalSince1970, forKey: updatedKey)
            defaults.synchronize()

            reloadWidgets(reason: "syncBills")
            NSLog("[DuezoWidgetBridge] ✅ syncBills stored %d bytes in %@", data.count, appGroupId)

            call.resolve()
        } catch {
            call.reject("Failed to serialize bills: \(error.localizedDescription)")
        }
    }

    @objc func syncPayload(_ call: CAPPluginCall) {
        guard let payload = call.getString("payload") else {
            NSLog("[DuezoWidgetBridge] syncPayload rejected: missing payload string")
            call.reject("Missing payload string")
            return
        }
        let themeValue = call.getString("theme") ?? "onyx"
        NSLog("[DuezoWidgetBridge] syncPayload called with theme: %@ payloadBytes: %d", themeValue, payload.lengthOfBytes(using: .utf8))

        guard let defaults = sharedDefaults() else {
            NSLog("[DuezoWidgetBridge] syncPayload rejected: failed to access App Group %@", appGroupId)
            call.reject("Failed to access App Group")
            return
        }

        if let payloadData = payload.data(using: .utf8),
           let payloadObject = try? JSONSerialization.jsonObject(with: payloadData, options: []),
           let payloadDictionary = payloadObject as? [String: Any] {
            let upcomingCount = (payloadDictionary["upcoming"] as? [Any])?.count ?? 0
            let nextBill = payloadDictionary["nextBill"] as? [String: Any]
            let nextBillId = nextBill?["id"] as? String ?? "nil"
            NSLog("[DuezoWidgetBridge] syncPayload decoded payload upcomingCount=%d nextBillId=%@", upcomingCount, nextBillId)
        } else {
            NSLog("[DuezoWidgetBridge] syncPayload payload JSON could not be parsed for debug logging")
        }

        defaults.set(payload, forKey: payloadKey)
        defaults.set(themeValue, forKey: themeKey)
        defaults.set(Date().timeIntervalSince1970, forKey: updatedKey)
        defaults.synchronize()

        reloadWidgets(reason: "syncPayload")

        NSLog(
            "[DuezoWidgetBridge] ✅ syncPayload stored payload: %@ theme: %@ updatedAt: %.0f",
            defaults.string(forKey: payloadKey) != nil ? "yes" : "no",
            defaults.string(forKey: themeKey) ?? "nil",
            defaults.double(forKey: updatedKey)
        )
        call.resolve()
    }

    @objc func setTheme(_ call: CAPPluginCall) {
        guard let theme = call.getString("theme") else {
            call.reject("Missing theme string")
            return
        }
        NSLog("[DuezoWidgetBridge] setTheme called with: %@", theme)

        guard let defaults = sharedDefaults() else {
            call.reject("Failed to access App Group")
            return
        }

        let previousTheme = defaults.string(forKey: themeKey) ?? "nil"
        defaults.set(theme, forKey: themeKey)
        defaults.set(Date().timeIntervalSince1970, forKey: updatedKey)
        defaults.synchronize()

        reloadWidgets(reason: "setTheme")

        NSLog(
            "[DuezoWidgetBridge] ✅ Theme updated %@ -> %@",
            previousTheme,
            defaults.string(forKey: themeKey) ?? "nil"
        )
        call.resolve()
    }

    @objc func clearBills(_ call: CAPPluginCall) {
        guard let defaults = sharedDefaults() else {
            NSLog("[DuezoWidgetBridge] clearBills rejected: failed to access App Group %@", appGroupId)
            call.reject("Failed to access App Group")
            return
        }

        defaults.removeObject(forKey: billsKey)
        defaults.removeObject(forKey: payloadKey)
        defaults.set(Date().timeIntervalSince1970, forKey: updatedKey)
        defaults.synchronize()

        reloadWidgets(reason: "clearBills")
        NSLog("[DuezoWidgetBridge] Cleared widget bills and payload from %@", appGroupId)

        call.resolve()
    }
}
