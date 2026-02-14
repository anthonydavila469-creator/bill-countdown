import Foundation
import Capacitor
import WidgetKit

@objc(DuezoWidgetBridge)
public class DuezoWidgetBridge: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DuezoWidgetBridge"
    public let jsName = "DuezoWidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "syncBills", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearBills", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncPayload", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setTheme", returnType: CAPPluginReturnPromise)
    ]

    @objc func syncBills(_ call: CAPPluginCall) {
        guard let bills = call.getArray("bills") else {
            call.reject("Missing bills array")
            return
        }

        guard let defaults = UserDefaults(suiteName: "group.app.duezo") else {
            call.reject("Failed to access App Group")
            return
        }

        do {
            let data = try JSONSerialization.data(withJSONObject: bills, options: [])
            defaults.set(data, forKey: "duezo_bills")
            defaults.synchronize()

            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }

            call.resolve()
        } catch {
            call.reject("Failed to serialize bills: \(error.localizedDescription)")
        }
    }

    @objc func syncPayload(_ call: CAPPluginCall) {
        guard let payload = call.getString("payload") else {
            call.reject("Missing payload string")
            return
        }
        let themeValue = call.getString("theme") ?? "onyx"
        NSLog("[DuezoWidgetBridge] syncPayload called with theme: %@", themeValue)

        guard let defaults = UserDefaults(suiteName: "group.app.duezo") else {
            call.reject("Failed to access App Group")
            return
        }

        defaults.set(payload, forKey: "duezo_widget_payload_v1")
        defaults.set(themeValue, forKey: "duezo_theme")
        defaults.set(Date().timeIntervalSince1970, forKey: "duezo_widget_last_updated")
        defaults.synchronize()

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }

        NSLog("[DuezoWidgetBridge] ✅ syncPayload stored theme: %@", defaults.string(forKey: "duezo_theme") ?? "nil")
        call.resolve()
    }

    @objc func setTheme(_ call: CAPPluginCall) {
        guard let theme = call.getString("theme") else {
            call.reject("Missing theme string")
            return
        }
        NSLog("[DuezoWidgetBridge] setTheme called with: %@", theme)

        guard let defaults = UserDefaults(suiteName: "group.app.duezo") else {
            call.reject("Failed to access App Group")
            return
        }

        defaults.set(theme, forKey: "duezo_theme")
        defaults.synchronize()

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }

        NSLog("[DuezoWidgetBridge] ✅ Theme set to: %@", defaults.string(forKey: "duezo_theme") ?? "nil")
        call.resolve()
    }

    @objc func clearBills(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: "group.app.duezo") else {
            call.reject("Failed to access App Group")
            return
        }

        defaults.removeObject(forKey: "duezo_bills")
        defaults.synchronize()

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }

        call.resolve()
    }
}
