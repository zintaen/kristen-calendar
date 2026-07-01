import Foundation
import Capacitor

CAP_PLUGIN(AppGroupStoragePlugin, "AppGroupStorage",
    CAP_PLUGIN_METHOD(write, CAPPluginReturnPromise);
)
