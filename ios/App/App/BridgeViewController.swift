import Capacitor
import Foundation

class BridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()

        let pluginName = "DuezoWidgetBridge"
        let alreadyRegistered = bridge?.plugin(withName: pluginName) != nil

        NSLog("[Duezo] BridgeViewController capacitorDidLoad plugin=%@ alreadyRegistered=%@", pluginName, alreadyRegistered ? "true" : "false")

        if alreadyRegistered {
            return
        }

        let pluginInstance = DuezoWidgetBridge()
        bridge?.registerPluginInstance(pluginInstance)

        let registeredAfterLoad = bridge?.plugin(withName: pluginName) != nil
        NSLog("[Duezo] BridgeViewController registered plugin=%@ success=%@", pluginName, registeredAfterLoad ? "true" : "false")

        // Register WebAuth plugin for ASWebAuthenticationSession-based OAuth
        let webAuthPlugin = WebAuthPlugin()
        bridge?.registerPluginInstance(webAuthPlugin)
        NSLog("[Duezo] BridgeViewController registered WebAuthPlugin")
    }
}
