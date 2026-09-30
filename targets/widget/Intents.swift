import AppIntents
import WidgetKit

/// The + and − buttons. Runs in the widget process: it records the press and asks WidgetKit to redraw.
/// The app applies it to the real history the next time it opens (see src/widgets/WidgetSync.tsx).
struct AdjustTrackerIntent: AppIntent {
    static let title: LocalizedStringResource = "Change count"
    static let isDiscoverable = false

    @Parameter(title: "Tracker")
    var trackerId: String

    @Parameter(title: "Direction")
    var direction: String

    init() {}

    init(trackerId: String, direction: String) {
        self.trackerId = trackerId
        self.direction = direction
    }

    func perform() async throws -> some IntentResult {
        Store.record(trackerId: trackerId, direction: direction)
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

struct TrackerEntity: AppEntity {
    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Tracker"
    static let defaultQuery = TrackerQuery()

    var id: String
    var name: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

/// Free accounts only ever see their one tracker, so choosing a different tracker per widget is a Pro feature
/// without any extra gating code here: the app publishes just that tracker in the snapshot.
struct TrackerQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [TrackerEntity] {
        all().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [TrackerEntity] {
        all()
    }

    func defaultResult() async -> TrackerEntity? {
        Store.snapshot()?.primary.map { TrackerEntity(id: $0.id, name: $0.name) }
    }

    private func all() -> [TrackerEntity] {
        (Store.snapshot()?.trackers ?? []).map { TrackerEntity(id: $0.id, name: $0.name) }
    }
}

struct SelectTrackerIntent: WidgetConfigurationIntent {
    static let title: LocalizedStringResource = "Tracker"
    static let description = IntentDescription("Choose the tracker this widget shows.")

    @Parameter(title: "Tracker")
    var tracker: TrackerEntity?
}
