import Foundation
import Capacitor
import AuthenticationServices

/// Native Capacitor plugin that uses ASWebAuthenticationSession for OAuth.
/// Unlike SFSafariViewController (@capacitor/browser), ASWebAuthenticationSession:
/// 1. Shows a system prompt "X wants to use Y to sign in"
/// 2. Automatically dismisses when the callback URL scheme is triggered
/// 3. Never leaves a browser UI stuck on screen
@objc(WebAuthPlugin)
class WebAuthPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    let identifier = "WebAuthPlugin"
    let jsName = "WebAuth"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise)
    ]

    @objc func start(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"),
              let url = URL(string: urlString) else {
            call.reject("Missing or invalid URL")
            return
        }

        // The callback scheme is our custom URL scheme: app.duezo
        let callbackScheme = call.getString("callbackScheme") ?? "app.duezo"

        DispatchQueue.main.async {
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: callbackScheme
            ) { callbackURL, error in
                if let error = error {
                    // User cancelled or something went wrong
                    let nsError = error as NSError
                    if nsError.domain == ASWebAuthenticationSessionErrorDomain,
                       nsError.code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                        call.reject("User cancelled", "CANCELLED")
                    } else {
                        call.reject(error.localizedDescription, "AUTH_ERROR")
                    }
                    return
                }

                guard let callbackURL = callbackURL else {
                    call.reject("No callback URL received", "NO_CALLBACK")
                    return
                }

                // Return the full callback URL to JS so it can extract the transfer key
                call.resolve(["url": callbackURL.absoluteString])
            }

            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false // Share cookies/sessions
            session.start()
        }
    }

    // MARK: - ASWebAuthenticationPresentationContextProviding

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return self.bridge?.webView?.window ?? ASPresentationAnchor()
    }
}
