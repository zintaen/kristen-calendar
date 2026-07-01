import { createNotificationService, WebNotificationStub } from "../lib/notificationGlue";

test("createNotificationService tren web tra WebNotificationStub", () => {
  const service = createNotificationService();
  expect(service).toBeInstanceOf(WebNotificationStub);
});

test("WebNotificationStub.scheduleNotification la no-op, khong throw", async () => {
  const stub = new WebNotificationStub();
  await expect(stub.scheduleNotification({
    id: 1, title: "Test", body: "Body",
    scheduleAt: new Date(), extra: { reminderId: "r1" }
  })).resolves.toBeUndefined();
});

test("WebNotificationStub.cancelAllPending la no-op", async () => {
  const stub = new WebNotificationStub();
  await expect(stub.cancelAllPending()).resolves.toBeUndefined();
});
