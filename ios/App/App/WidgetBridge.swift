//
//  WidgetBridge.swift
//  App
//
//  Capacitor plugin to sync bills with the iOS widget
//

import Foundation
import Capacitor
import WidgetKit

@objc(WidgetBridge)
public class WidgetBridge: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridge"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "syncBills", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearBills", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "refreshWidget", returnType: CAPPluginReturnPromise)
    ]
    
    private let appGroupID = "group.app.duezo"
    private let billsKey = "cached_bills"
    private let lastSyncKey = "last_sync_date"
    
    private var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: appGroupID)
    }
    
    /// Sync bills to the widget's shared storage
    @objc func syncBills(_ call: CAPPluginCall) {
        guard let billsArray = call.getArray("bills") else {
            call.reject("Missing bills array")
            return
        }
        
        do {
            // Convert to JSON data
            let jsonData = try JSONSerialization.data(withJSONObject: billsArray, options: [])
            
            // Save to shared App Group storage
            sharedDefaults?.set(jsonData, forKey: billsKey)
            sharedDefaults?.set(Date(), forKey: lastSyncKey)
            
            // Tell the widget to refresh
            WidgetCenter.shared.reloadAllTimelines()
            
            call.resolve([
                "success": true,
                "billCount": billsArray.count,
                "syncedAt": ISO8601DateFormatter().string(from: Date())
            ])
        } catch {
            call.reject("Failed to sync bills: \(error.localizedDescription)")
        }
    }
    
    /// Clear all bills from widget storage (e.g., on logout)
    @objc func clearBills(_ call: CAPPluginCall) {
        sharedDefaults?.removeObject(forKey: billsKey)
        sharedDefaults?.removeObject(forKey: lastSyncKey)
        
        // Refresh widget to show empty state
        WidgetCenter.shared.reloadAllTimelines()
        
        call.resolve(["success": true])
    }
    
    /// Manually trigger a widget refresh
    @objc func refreshWidget(_ call: CAPPluginCall) {
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve(["success": true])
    }
}
