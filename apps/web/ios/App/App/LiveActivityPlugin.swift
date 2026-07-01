import Foundation
import Capacitor
import ActivityKit

@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveActivityPlugin"
    public let jsName = "LiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startCountdown", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endCountdown", returnType: CAPPluginReturnPromise)
    ]
    
    private var currentActivityId: String?

    @objc func startCountdown(_ call: CAPPluginCall) {
        guard let eventId = call.getString("eventId"),
              let eventName = call.getString("eventName"),
              let targetTimestamp = call.getDouble("targetTimestamp") else {
            call.reject("Must provide eventId, eventName, and targetTimestamp")
            return
        }

        if #available(iOS 16.1, *) {
            // Check if Live Activities are enabled by the user
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                call.reject("Live Activities are not enabled by the user.")
                return
            }
            
            let targetDate = Date(timeIntervalSince1970: targetTimestamp / 1000.0)
            let attributes = LunarCountdownAttributes(eventName: eventName, targetDate: targetDate)
            let contentState = LunarCountdownAttributes.ContentState(currentStatus: "Sắp đến nơi rồi!")
            
            do {
                let activity = try Activity.request(
                    attributes: attributes,
                    content: .init(state: contentState, staleDate: nil),
                    pushType: nil
                )
                
                self.currentActivityId = activity.id
                call.resolve([
                    "activityId": activity.id
                ])
            } catch {
                call.reject("Failed to start Live Activity", error.localizedDescription, error)
            }
        } else {
            call.reject("Live Activities require iOS 16.1 or newer.")
        }
    }
    
    @objc func endCountdown(_ call: CAPPluginCall) {
        guard let activityId = call.getString("activityId") else {
            call.reject("Must provide activityId")
            return
        }
        
        if #available(iOS 16.1, *) {
            Task {
                for activity in Activity<LunarCountdownAttributes>.activities where activity.id == activityId {
                    let finalState = LunarCountdownAttributes.ContentState(currentStatus: "Sự kiện đã diễn ra!")
                    await activity.end(ActivityContent(state: finalState, staleDate: nil), dismissalPolicy: .default)
                }
                call.resolve()
            }
        } else {
            call.resolve()
        }
    }
}
