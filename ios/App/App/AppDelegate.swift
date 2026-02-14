import UIKit
import Capacitor
import WidgetKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.

        NSLog("[Duezo] AppDelegate didFinishLaunching CALLED")
        // TODO: Remove before release — loads test data for widget preview
        let json = """
        {"version":1,"generatedAt":\(Int(Date().timeIntervalSince1970)),"currencyCode":"USD","totals":{"totalDue":1634.99,"deltaVsLastMonth":127.0},"nextBill":{"id":"test-1","vendor":"Netflix","amount":19.99,"dueDate":"2026-02-16","daysLeft":2},"upcoming":[{"id":"test-1","vendor":"Netflix","amount":19.99,"dueDate":"2026-02-16","daysLeft":2,"urgency":"critical"},{"id":"test-2","vendor":"Electric","amount":88.5,"dueDate":"2026-02-19","daysLeft":5,"urgency":"soon"},{"id":"test-3","vendor":"Rent","amount":1200.0,"dueDate":"2026-03-02","daysLeft":16,"urgency":"later"},{"id":"test-4","vendor":"Car Insurance","amount":272.5,"dueDate":"2026-03-06","daysLeft":20,"urgency":"later"}]}
        """
        if let defaults = UserDefaults(suiteName: "group.app.duezo") {
            defaults.set(json.trimmingCharacters(in: .whitespacesAndNewlines), forKey: "duezo_widget_payload_v1")
            // Only set theme if none exists — let the JS app sync the real theme
            if defaults.string(forKey: "duezo_theme") == nil {
                defaults.set("emerald", forKey: "duezo_theme")
            }
            defaults.set(Date().timeIntervalSince1970, forKey: "duezo_widget_last_updated")
            defaults.synchronize()
            WidgetCenter.shared.reloadAllTimelines()
            NSLog("[Duezo] ✅ Test widget data loaded successfully")
            NSLog("[Duezo] Payload: %@", json.trimmingCharacters(in: .whitespacesAndNewlines).prefix(100).description)
        } else {
            print("[Duezo] ❌ Failed to access App Group")
        }

        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
