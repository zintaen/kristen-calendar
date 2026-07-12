---
id: FR-LUNAR-023
title: "Siri Shortcuts & Live Activities - iOS Native Integration"
module: LUNAR
priority: MUST
status: ready_to_implement
verify: T
phase: P4
milestone: P4 · slice 2
slice: 2
owner: Stephen Cheng
created: 2026-07-01
shipped: null
memory_chain_hash: null
related_frs: []
depends_on: [FR-LUNAR-004]
blocks: []
source_pages:
  - BACKLOG.md
source_decisions:
  - DEC-023 (Use an Apple Developer Account to implement Siri Intents and Live Activities for iOS)
language: swift
service: apps/mobile-app/ios
new_files:
  - apps/mobile-app/ios/App/GenieIntents/GenieIntents.swift
  - apps/mobile-app/ios/App/GenieWidgets/LiveActivityAttributes.swift
modified_files:
  - apps/mobile-app/ios/App/App/Info.plist
  - apps/mobile-app/package.json
allowed_tools:
  - Xcode
  - App Intents framework
  - ActivityKit
  - Capacitor plugins
disallowed_tools:
  - Third-party wrapper plugins for Live Activities (must write native Swift for stability)
effort_hours: 20
sub_tasks:
  - "4h: Set up Apple Developer certificates and App Groups for the Widget/Intents"
  - "5h: Write App Intents for Siri (e.g., ask for the next full moon day)"
  - "5h: Write the Live Activity widget UI counting down to an event"
  - "3h: Configure the Capacitor plugin to trigger the Live Activity from TS"
  - "3h: Test on a real device (iOS 17+)"
risk_if_skipped: "Missing the chance for deep integration into the Apple ecosystem, reducing the app's usability. iPhone users are very fond of Siri and Live Activities."
---

# Feature Request

> Turn Your Will Into Real.

## Summary

Deeply integrate iOS native features into the Genie app. Let users ask Siri by voice (e.g., "Hey Siri, what day is this month's full moon?") through App Intents. At the same time, show a countdown to special events (e.g., New Year's Eve, Mid-Autumn full moon) right on the Lock Screen and the Dynamic Island through Live Activities.

## Problem

Users currently have to open the app (or look at the widget) to get information. In many cases (hands busy, driving), asking Siri is much faster. In addition, for major events like New Year's Eve, having a real-time countdown clock running on the Dynamic Island creates a sense of anticipation and significantly increases app engagement.

## Customer Quotes

<untrusted_content source="app-store-reviews"> "The app is great, but it would be wonderful if it could show a countdown to Tet on the little black spot of the iPhone 14 Pro (Dynamic Island)." </untrusted_content>

## §1 - Description (Normative Clauses)

1. **MUST** implement App Intents (Swift) to expose at least one Siri shortcut: "Next Event Query" (e.g., "When is the next Full Moon?").
2. **MUST** implement a Live Activity using ActivityKit to show a real-time countdown to a specified Lunar Event.
3. **MUST** support Dynamic Island presentations (Expanded, Compact Leading, Compact Trailing, Minimal).
4. **MUST** bridge ActivityKit to Capacitor via a custom Swift plugin, exposing `startActivity()`, `updateActivity()`, and `endActivity()` to TypeScript.
5. **MUST** share the Lunar Engine logic (or pre-calculate the result and share via App Groups `UserDefaults`) so the App Intent extension can resolve Siri's queries without launching the main app.
6. **MUST** gracefully fail or fallback to a standard notification on iOS < 16.1 (which lacks Live Activities support).
7. **SHOULD** automatically start the Live Activity 24 hours before a major event (e.g., Lunar New Year Eve) if the user opens the app.
8. **MUST NOT** rely solely on background push notifications to keep Live Activities alive; rely on deterministic client-side countdowns using target timestamps.

## §2 - Why this design

**Why native Swift instead of a generic Cordova/Capacitor plugin for Live Activities (§1 #4)?** 
Live Activities UI requires SwiftUI. Existing Capacitor wrappers only pass data; the actual UI rendering *must* be done in native SwiftUI inside a Widget Extension target.

**Why App Groups (§1 #5)?**
App Intents and Widget Extensions run in isolated processes. They cannot access the main app's Capacitor SQLite database directly. We must write essential upcoming event dates into a shared `UserDefaults` suite (App Group) that the extensions can read instantly.

## §3 - API contract

```typescript
// Capacitor Plugin Interface (TypeScript)
export interface LiveActivityPlugin {
  startCountdown(options: { 
    eventId: string; 
    eventName: string; 
    targetTimestamp: number; 
  }): Promise<{ activityId: string }>;
  
  endCountdown(options: { activityId: string }): Promise<void>;
}
```

```swift
// LiveActivityAttributes.swift (Native Swift)
import ActivityKit

struct LunarCountdownAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var currentStatus: String // e.g., "Còn 2 tiếng nữa!"
    }
    
    var eventName: String
    var targetDate: Date
}
```

## §4 - Acceptance criteria

1. **Siri Intent** - When the user asks Siri "What is the next event in Genie?", Siri responds audibly with the correct localized event name and date without opening the app.
2. **Live Activity Start** - When `startCountdown` is called, a Live Activity appears on the Lock Screen showing the event name and a ticking timer.
3. **Dynamic Island** - On iPhone 14 Pro and newer, returning to the Home Screen moves the countdown into the Dynamic Island.
4. **App Group Data Sync** - When the main app computes upcoming events, it writes the next 3 events to the shared App Group, allowing Siri to access them offline.

## §5 - Verification

```swift
// test/GenieIntentsTests.swift
import XCTest
@testable import GenieIntents

final class GenieIntentsTests: XCTestCase {
    func testAppGroupSharedDataIsReadable() {
        // Arrange
        let defaults = UserDefaults(suiteName: "group.com.cyberskill.genie")!
        defaults.set("Rằm tháng 7", forKey: "NextEventName")
        
        // Act
        let intent = GetNextEventIntent()
        let result = intent.perform()
        
        // Assert
        XCTAssertEqual(result.dialog.content, "Sự kiện tiếp theo là Rằm tháng 7.")
    }
}
```

## §6 - Implementation skeleton

```swift
// GenieIntents.swift
import AppIntents

struct GetNextEventIntent: AppIntent {
    static var title: LocalizedStringResource = "Get Next Lunar Event"
    
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let defaults = UserDefaults(suiteName: "group.com.cyberskill.genie")
        let eventName = defaults?.string(forKey: "NextEventName") ?? "Không có sự kiện nào sắp tới"
        
        return .result(dialog: "Sự kiện tiếp theo là \(eventName).")
    }
}
```

## §7 - Dependencies

- **Upstream:** FR-LUNAR-004 (Core app setup and build targets for iOS).
- **Apple:** Requires active Apple Developer Program membership (Confirmed: DEC-233).

## §8 - Example payloads

N/A - Native bridging primarily.

## §9 - Open questions

- `Deferred: P4 slice 3` - Should we support Android's equivalent (Live spaces / ongoing notifications)? Focus on iOS first due to higher demographic overlap.

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| User denied Live Activity permission | `ActivityAuthorizationInfo` is false | `startCountdown` rejects | Catch in TS, do not crash, fallback to normal local notification |
| iOS version < 16.1 | SDK availability check fails | Plugin is a no-op | TS gracefully handles the unsupported platform |
| App Group misconfigured | `UserDefaults(suiteName:)` returns nil | Siri reads "No events" | Fix entitlements in Xcode |
| Target timestamp is in the past | ActivityKit throws | Widget shows 00:00:00 | Call `endCountdown` automatically if timestamp < now |
| Capacitor plugin bridging fails | Xcode build error | Build fails | Developer must fix Swift/Obj-C bridging headers |
| Siri misinterprets voice command | Siri routes to web search | Bad UX | Add diverse training phrases to the App Intent shortcut definitions |
| Main app fails to sync App Group | DB error | Siri gives stale data | Retry sync on next app launch; accept stale data |
| Extension runs out of memory | Crashlog in Xcode | Siri intent fails | Optimize intent memory footprint, avoid heavy DB ops |
| Dynamic Island not supported | Hardware limitation | Falls back to Lock Screen | Expected OS behavior |
| Developer certs expire | CI/CD build fails | App cannot be deployed | Renew certs |

## §11 - Implementation notes

- **Timer UI:** In SwiftUI, use `Text(targetDate, style: .timer)` to allow the OS to update the ticking clock every second without requiring background code execution. This is critical for battery life.
- **Entitlements:** Both the main app target and the extensions must share the exact same App Group entitlement and Team ID.

## AI Authorship Disclosure

- **Tools used:** LLM agent acting as feature-request-author
- **Scope:** The entire FR content.
- **Human review:** Reviewed by the operator after generation.

*End of FR-LUNAR-023.*
