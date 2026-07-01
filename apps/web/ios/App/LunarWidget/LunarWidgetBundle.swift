import WidgetKit
import SwiftUI

@main
struct LunarWidgetBundle: WidgetBundle {
    var body: some Widget {
        LunarWidgetSmall()
        // LunarWatchWidget() - COULD: add when watchOS target is built
    }
}

struct LunarWidgetSmall: Widget {
    static let kind = "LunarWidgetSmall"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: Self.kind, provider: LunarTimelineProvider()) { entry in
            LunarWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Genie Âm Lịch")
        .description("Ngày âm, can-chi, giờ Hoàng đạo")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
