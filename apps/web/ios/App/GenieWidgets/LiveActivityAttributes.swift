import ActivityKit
import Foundation

struct LunarCountdownAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var currentStatus: String // e.g., "Sắp đến nơi rồi!"
    }
    
    var eventName: String
    var targetDate: Date
}
