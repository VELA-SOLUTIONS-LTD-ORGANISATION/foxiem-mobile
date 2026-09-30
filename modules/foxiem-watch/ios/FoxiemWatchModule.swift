import ExpoModulesCore
import UIKit

public class FoxiemWatchModule: Module {
    public func definition() -> ModuleDefinition {
        Name("FoxiemWatch")

        Events("onInbox", "onStatus")

        OnCreate {
            let hub = WatchSessionHub.shared
            hub.onInbox = { [weak self] in self?.sendEvent("onInbox", [:]) }
            hub.onStatus = { [weak self] in self?.sendEvent("onStatus", [:]) }
            hub.activate()
        }

        Function("getStatus") { () -> [String: Bool] in
            WatchSessionHub.shared.status()
        }

        Function("sendSnapshot") { (json: String) in
            if json.isEmpty { WatchSessionHub.shared.clearInbox() }
            WatchSessionHub.shared.send(snapshot: json)
        }

        AsyncFunction("readInbox") { () -> String in
            WatchSessionHub.shared.inboxJSON()
        }

        AsyncFunction("acknowledge") { (ids: [String]) in
            WatchSessionHub.shared.acknowledge(ids: ids)
        }
    }
}

public class FoxiemWatchAppDelegate: ExpoAppDelegateSubscriber {
    public func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        WatchSessionHub.shared.activate()
        return true
    }
}
