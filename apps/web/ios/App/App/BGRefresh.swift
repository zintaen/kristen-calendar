import BackgroundTasks
import Capacitor

@objc public class BGRefresh: NSObject {
    
    // Đăng ký BGAppRefreshTask, gọi vào reschedule, kèm comment best-effort (DEC-LUNAR-051)
    // COMMENT: BGAppRefreshTask thời điểm do iOS quyết định, KHÔNG đảm bảo. App-open là kênh chính.
    
    @objc public static func registerBackgroundTasks() {
        if #available(iOS 13.0, *) {
            BGTaskScheduler.shared.register(forTaskWithIdentifier: "world.cyberskill.genieamlich.refresh", using: nil) { task in
                self.handleAppRefresh(task: task as! BGAppRefreshTask)
            }
        }
    }
    
    @available(iOS 13.0, *)
    private static func handleAppRefresh(task: BGAppRefreshTask) {
        // Schedule the next background refresh
        scheduleAppRefresh()
        
        // Cần bridge sang JS để gọi `reschedule()`.
        // Với Capacitor, ta có thể dispatch một notification hoặc gọi plugin bridge.
        // Hiện tại chỉ stub đăng ký, JS-side app-open / onResume sẽ đảm đương việc reschedule chính.
        NotificationCenter.default.post(name: Notification.Name("triggerReschedule"), object: nil)
        
        // Task must call setTaskCompleted
        task.setTaskCompleted(success: true)
    }
    
    @available(iOS 13.0, *)
    @objc public static func scheduleAppRefresh() {
        let request = BGAppRefreshTaskRequest(identifier: "world.cyberskill.genieamlich.refresh")
        // Yêu cầu tối thiểu là 12 tiếng sau
        request.earliestBeginDate = Date(timeIntervalSinceNow: 12 * 60 * 60)
        do {
            try BGTaskScheduler.shared.submit(request)
        } catch {
            print("Could not schedule app refresh: \(error)")
        }
    }
}
