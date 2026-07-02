# Native iOS wiring checklist (widget, Siri, Live Activity)

This lists the Xcode-project and Apple-portal steps that finish the native iOS features.
The Swift code and the lunar math are done and verified; these items are configuration
that cannot be completed from a text-only sandbox because they touch the Xcode project
file, code-signing, and the Apple Developer portal. Do them once, on the Mac.

## 1. App Group (critical - without this the widget shows nothing)

The widget, the Siri intent, and the Capacitor writer all share data through the App
Group `group.world.cyberskill.genie`. If the group is not declared and provisioned,
`UserDefaults(suiteName:)` returns nil and every reader is empty.

Ready-to-attach entitlements files are already created:

- `apps/web/ios/App/App/App.entitlements` (main app target)
- `apps/web/ios/App/LunarWidget/LunarWidget.entitlements` (widget extension)
- `apps/web/ios/App/GenieWidgets/GenieWidgets.entitlements` (Live Activity widget extension)

Steps on the Mac:

1. In Xcode, select each target above, open Signing and Capabilities, add the App Groups
   capability, and check `group.world.cyberskill.genie`. This points each target's
   `CODE_SIGN_ENTITLEMENTS` build setting at the matching file above (or lets Xcode manage it).
2. If the Siri intents (`GenieIntents`) are built as their own extension target rather than
   into the main app, add the same App Group to that target too.
3. In the Apple Developer portal, register the App Group id `group.world.cyberskill.genie`
   and include it in the provisioning profiles for the app and every extension.

Verify: run the app once, then check `UserDefaults(suiteName: "group.world.cyberskill.genie")`
is non-nil in the widget and Siri code paths.

## 2. Widget deep link

`LunarWidgetEntryView` uses `widgetURL(URL(string: "genieamlich://day-detail"))`. The
`genieamlich` URL scheme is now declared in `apps/web/ios/App/App/Info.plist`
(`CFBundleURLTypes`). Confirm the Capacitor app actually routes `genieamlich://day-detail`
to the day-detail screen when the widget is tapped; wire the route if it does not.

## 3. Background refresh (BGRefresh) - decide wire-or-drop

`apps/web/ios/App/App/BGRefresh.swift` exists but has no caller, and the Info.plist has no
`UIBackgroundModes` or `BGTaskSchedulerPermittedIdentifiers`, so it currently does nothing.
Its own comment says app-open is the primary refresh channel, and the Capacitor writer now
runs on every app-active event, so v1 works without it.

Two options:

- Drop it for v1: leave BGRefresh unwired. The widget refreshes whenever the app opens.
- Wire it: add `fetch` (and `processing` if you use a processing task) to `UIBackgroundModes`
  in Info.plist, add `world.cyberskill.genieamlich.refresh` to `BGTaskSchedulerPermittedIdentifiers`,
  then call `BGRefresh.registerBackgroundTasks()` from `application(_:didFinishLaunchingWithOptions:)`
  and `BGRefresh.scheduleAppRefresh()` from `applicationDidEnterBackground(_:)`. Note that enabling
  background modes adds App Review questions; only do this if you want background widget refresh.

Do not call `registerBackgroundTasks()` without first adding the permitted identifier to the
Info.plist - `BGTaskScheduler.register` crashes on an unlisted identifier.

## 4. Live Activity deployment target

`LiveActivityPlugin.swift` calls `Activity.request(attributes:content:pushType:)` and
`activity.end(_:dismissalPolicy:)` with `ActivityContent`, which are iOS 16.2 APIs, under an
`#available(iOS 16.1, *)` guard. Set the app's minimum deployment target to iOS 16.2 or later
(recommended), or switch to the iOS 16.1 `contentState:` form. Confirm at build time.

## 5. Build and test on the Mac

```sh
# from apps/web, after `npx cap sync ios`
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -destination 'generic/platform=iOS' build
xcodebuild test -workspace ios/App/App.xcworkspace -scheme LunarWidget -destination 'platform=iOS Simulator,name=iPhone 15'
```

`LunarWidgetTests` covers the lunar math (Tet 2023/2025/2007, the 1985 leap month, the Mau Tuat
day pillar, and a 60-day can-chi sweep). The math is already proven day-for-day against the core
across 1900-2199; this run confirms it compiles and passes on-device.
