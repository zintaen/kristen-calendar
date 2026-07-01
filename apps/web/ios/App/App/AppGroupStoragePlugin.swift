import Foundation
import Capacitor
import WidgetKit

@objc(AppGroupStoragePlugin)
public class AppGroupStoragePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppGroupStoragePlugin"
    public let jsName = "AppGroupStorage"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "write", returnType: CAPPluginReturnPromise)
    ]

    @objc func write(_ call: CAPPluginCall) {
        guard let suite = call.getString("suite"),
              let key = call.getString("key"),
              let value = call.getString("value") else {
            call.reject("Must provide suite, key, and value")
            return
        }

        guard let defaults = UserDefaults(suiteName: suite) else {
            call.reject("Could not initialize UserDefaults for suite: \(suite)")
            return
        }
        
        guard let data = value.data(using: .utf8) else {
            call.reject("Could not convert value to Data")
            return
        }

        defaults.set(data, forKey: key)
        
        // Reload widget timelines so that it picks up the new data immediately
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        
        call.resolve()
    }
}
