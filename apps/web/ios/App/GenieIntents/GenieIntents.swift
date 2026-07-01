import AppIntents
import Foundation

struct GetNextEventIntent: AppIntent {
    static var title: LocalizedStringResource = "Get Next Lunar Event"
    static var description = IntentDescription("Hỏi Genie sự kiện âm lịch tiếp theo là gì.")
    
    // Add openAppWhenRun if you want the app to open instead of inline Siri
    // static var openAppWhenRun: Bool = false 
    
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let defaults = UserDefaults(suiteName: "group.world.cyberskill.genieamlich")
        // Read data stored by Capacitor AppGroupStoragePlugin
        let eventName = defaults?.string(forKey: "NextEventName") ?? "Hiện tại chưa có sự kiện nào sắp tới."
        
        return .result(dialog: "Sự kiện tiếp theo là \(eventName).")
    }
}

struct GenieShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: GetNextEventIntent(),
            phrases: [
                "Hỏi \(.applicationName) sự kiện tiếp theo",
                "Sự kiện tiếp theo trong \(.applicationName)",
                "Rằm tiếp theo là khi nào",
                "Mùng một tiếp theo"
            ],
            shortTitle: "Sự kiện tiếp theo",
            systemImageName: "moon.fill"
        )
    }
}
