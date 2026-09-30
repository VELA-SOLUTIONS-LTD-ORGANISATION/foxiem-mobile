import Foundation
import WatchConnectivity

/// Owns the iPhone side of WatchConnectivity. Created at app launch (see FoxiemWatchAppDelegate) so presses
/// the Watch queued while the app was closed are received even before JavaScript starts.
///
/// It stores opaque press records until the app acknowledges them; all counting rules live in JavaScript.
final class WatchSessionHub: NSObject, WCSessionDelegate {
    static let shared = WatchSessionHub()

    private let defaults = UserDefaults.standard
    private let inboxKey = "foxiem.watch.inbox"
    private let lock = NSLock()
    private var lastSnapshot: String?
    private var activated = false

    var onInbox: (() -> Void)?
    var onStatus: (() -> Void)?

    func activate() {
        guard WCSession.isSupported(), !activated else { return }
        activated = true
        let session = WCSession.default
        session.delegate = self
        session.activate()
    }

    // MARK: Status

    func status() -> [String: Bool] {
        guard WCSession.isSupported() else { return ["supported": false, "paired": false, "appInstalled": false] }
        let session = WCSession.default
        return ["supported": true, "paired": session.isPaired, "appInstalled": session.isWatchAppInstalled]
    }

    // MARK: Snapshot to the Watch

    func send(snapshot: String) {
        lastSnapshot = snapshot
        push()
    }

    private func push() {
        guard WCSession.isSupported(), let snapshot = lastSnapshot else { return }
        let session = WCSession.default
        guard session.activationState == .activated, session.isPaired, session.isWatchAppInstalled else { return }
        do {
            try session.updateApplicationContext(["snapshot": snapshot])
        } catch {
            // Delivered again with the next snapshot; nothing the app needs to know about.
        }
    }

    // MARK: Presses from the Watch

    private func load() -> [[String: Any]] {
        (defaults.array(forKey: inboxKey) as? [[String: Any]]) ?? []
    }

    func inboxJSON() -> String {
        lock.lock(); defer { lock.unlock() }
        guard let data = try? JSONSerialization.data(withJSONObject: load()),
              let text = String(data: data, encoding: .utf8) else { return "[]" }
        return text
    }

    func acknowledge(ids: [String]) {
        lock.lock(); defer { lock.unlock() }
        guard !ids.isEmpty else { return }
        let drop = Set(ids)
        defaults.set(load().filter { !drop.contains(($0["id"] as? String) ?? "") }, forKey: inboxKey)
    }

    func clearInbox() {
        lock.lock(); defer { lock.unlock() }
        defaults.removeObject(forKey: inboxKey)
    }

    private func receive(userInfo: [String: Any]) {
        guard let text = userInfo["action"] as? String,
              let data = text.data(using: .utf8),
              let action = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let id = action["id"] as? String, !id.isEmpty else { return }
        lock.lock()
        var stored = load()
        if !stored.contains(where: { ($0["id"] as? String) == id }) {
            stored.append(action)
            defaults.set(Array(stored.suffix(200)), forKey: inboxKey)
        }
        lock.unlock()
        DispatchQueue.main.async { self.onInbox?() }
    }

    // MARK: WCSessionDelegate

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        push()
        DispatchQueue.main.async { self.onStatus?() }
    }

    func sessionWatchStateDidChange(_ session: WCSession) {
        // The Watch app may have just been installed: give it the latest snapshot.
        push()
        DispatchQueue.main.async { self.onStatus?() }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        receive(userInfo: userInfo)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        receive(userInfo: message)
    }
}
