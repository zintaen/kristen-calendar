import WidgetKit
import SwiftUI
import ActivityKit

@main
struct GenieWidgets: WidgetBundle {
    var body: some Widget {
        LunarCountdownLiveActivity()
    }
}

struct LunarCountdownLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: LunarCountdownAttributes.self) { context in
            // Lock screen / Banner UI
            VStack(alignment: .leading, spacing: 8) {
                Text(context.attributes.eventName)
                    .font(.headline)
                    .foregroundColor(.white)
                
                HStack {
                    Text("Thời gian còn lại:")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.8))
                    
                    Text(timerInterval: Date()...context.attributes.targetDate, countsDown: true)
                        .font(.system(.title3, design: .monospaced, weight: .bold))
                        .foregroundColor(.yellow)
                }
            }
            .padding()
            .background(Color.purple.opacity(0.9))
            .cornerRadius(15)
            
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here
                DynamicIslandExpandedRegion(.leading) {
                    Text("Genie").font(.caption).foregroundColor(.purple)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.attributes.eventName).font(.caption)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(timerInterval: Date()...context.attributes.targetDate, countsDown: true)
                        .font(.title)
                        .foregroundColor(.yellow)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.currentStatus).font(.caption2)
                }
            } compactLeading: {
                Image(systemName: "moon.fill").foregroundColor(.purple)
            } compactTrailing: {
                Text(timerInterval: Date()...context.attributes.targetDate, countsDown: true)
                    .frame(maxWidth: 40)
                    .font(.caption2)
            } minimal: {
                Image(systemName: "moon.fill").foregroundColor(.purple)
            }
        }
    }
}
