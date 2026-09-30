import Foundation

/// Reads the snapshot the app publishes and records presses in the inbox the app drains.
/// The app is the only writer of tracker history; this file never touches it.
enum Store {
    private static var defaults: UserDefaults? { UserDefaults(suiteName: Shared.appGroup) }

    static func snapshot() -> Snapshot? {
        guard let text = defaults?.string(forKey: Shared.snapshotKey), !text.isEmpty,
              let data = text.data(using: .utf8) else { return nil }
        // Read as of now, so a Pro entitlement that lapsed while the app was closed downgrades the widget.
        return (try? JSONDecoder().decode(Snapshot.self, from: data))?.settled(now: Date())
    }

    static func inbox() -> [PressAction] {
        guard let text = defaults?.string(forKey: Shared.inboxKey), !text.isEmpty,
              let data = text.data(using: .utf8) else { return [] }
        return (try? JSONDecoder().decode([PressAction].self, from: data)) ?? []
    }

    /// Presses the app has not applied yet (its snapshot lists what it has).
    static func pending(for snapshot: Snapshot) -> [PressAction] {
        let applied = Set(snapshot.applied)
        return inbox().filter { !applied.contains($0.id) }
    }

    /// Same steps as `appendAction` in src/widgets/inbox.ts.
    static func record(trackerId: String, direction: String) {
        guard let defaults else { return }
        let applied = Set(snapshot()?.applied ?? [])
        var kept = inbox().filter { !applied.contains($0.id) }
        kept.append(
            PressAction(
                id: "w-" + UUID().uuidString.lowercased(),
                trackerId: trackerId,
                direction: direction,
                at: (Date().timeIntervalSince1970 * 1000).rounded()
            )
        )
        if kept.count > Shared.inboxLimit { kept = Array(kept.suffix(Shared.inboxLimit)) }
        if let data = try? JSONEncoder().encode(kept), let text = String(data: data, encoding: .utf8) {
            defaults.set(text, forKey: Shared.inboxKey)
        }
    }
}
