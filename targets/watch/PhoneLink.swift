import Combine
import Foundation
import WatchConnectivity

/// The Watch's only connection to the iPhone.
///  - Snapshot: arrives as the application context (`snapshot` = JSON string; empty string means "reset").
///  - Presses: sent with `transferUserInfo`, which is queued and delivered even if the iPhone app is closed.
/// The iPhone app is the only writer of tracker history; the Watch never edits it directly.
final class PhoneLink: NSObject, ObservableObject, WCSessionDelegate {
    @Published private(set) var snapshot: Snapshot?
    @Published private(set) var pending: [PressAction] = []

    private let defaults = UserDefaults.standard
    private let snapshotKey = "foxiem.watch.snapshot"
    private let pendingKey = "foxiem.watch.pending"
    private let maxAge: TimeInterval = 7 * 24 * 3600

    override init() {
        super.init()
        snapshot = decode(defaults.string(forKey: snapshotKey))
        pending = decodeActions(defaults.string(forKey: pendingKey))
        prune()
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func press(trackerId: String, direction: String) {
        let action = PressAction(
            id: "wa-" + UUID().uuidString.lowercased(),
            trackerId: trackerId,
            direction: direction,
            at: (Date().timeIntervalSince1970 * 1000).rounded()
        )
        pending.append(action)
        if pending.count > 200 { pending = Array(pending.suffix(200)) }
        persistPending()
        if WCSession.isSupported(),
           let data = try? JSONEncoder().encode(action),
           let text = String(data: data, encoding: .utf8) {
            WCSession.default.transferUserInfo(["action": text])
        }
    }

    // MARK: State

    private func apply(context: [String: Any]) {
        guard let text = context["snapshot"] as? String else { return }
        DispatchQueue.main.async {
            if text.isEmpty {
                self.snapshot = nil
                self.pending = []
                self.defaults.removeObject(forKey: self.snapshotKey)
                self.persistPending()
                return
            }
            guard let next = self.decode(text) else { return }
            // Ignore an older snapshot that arrives late.
            if let current = self.snapshot, current.generatedAt > next.generatedAt { return }
            self.snapshot = next
            self.defaults.set(text, forKey: self.snapshotKey)
            self.prune()
        }
    }

    /// Forget presses the iPhone says it has applied, and anything too old to matter.
    private func prune() {
        let applied = Set(snapshot?.applied ?? [])
        let cutoff = (Date().timeIntervalSince1970 - maxAge) * 1000
        let kept = pending.filter { !applied.contains($0.id) && $0.at >= cutoff }
        if kept != pending {
            pending = kept
            persistPending()
        }
    }

    private func persistPending() {
        if let data = try? JSONEncoder().encode(pending), let text = String(data: data, encoding: .utf8) {
            defaults.set(text, forKey: pendingKey)
        }
    }

    private func decode(_ text: String?) -> Snapshot? {
        guard let text, !text.isEmpty, let data = text.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(Snapshot.self, from: data)
    }

    private func decodeActions(_ text: String?) -> [PressAction] {
        guard let text, let data = text.data(using: .utf8) else { return [] }
        return (try? JSONDecoder().decode([PressAction].self, from: data)) ?? []
    }

    // MARK: WCSessionDelegate

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if activationState == .activated { apply(context: session.receivedApplicationContext) }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        apply(context: applicationContext)
    }
}
