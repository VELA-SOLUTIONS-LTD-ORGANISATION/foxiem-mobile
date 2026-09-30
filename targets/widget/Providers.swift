import AppIntents
import WidgetKit

struct CounterEntry: TimelineEntry {
    let date: Date
    let snapshot: Snapshot?
    let tracker: TrackerInfo?
    let pending: [PressAction]
}

private func refreshDate(for tracker: TrackerInfo?, snapshot: Snapshot?, from now: Date) -> Date {
    // Redraw when the tracker's period rolls over or Pro lapses, and at least every half hour so "today" stays true.
    var next = now.addingTimeInterval(30 * 60)
    var moments: [Double] = []
    if let end = tracker?.periodEnd { moments.append(end) }
    if let snapshot, snapshot.isPro, let until = snapshot.proUntil { moments.append(until) }
    for moment in moments {
        let date = Date(timeIntervalSince1970: moment / 1000)
        if date > now && date < next { next = date.addingTimeInterval(1) }
    }
    return next
}

struct CounterProvider: AppIntentTimelineProvider {
    typealias Entry = CounterEntry
    typealias Intent = SelectTrackerIntent

    func placeholder(in context: Context) -> CounterEntry {
        CounterEntry(date: .now, snapshot: nil, tracker: nil, pending: [])
    }

    func snapshot(for configuration: SelectTrackerIntent, in context: Context) async -> CounterEntry {
        entry(for: configuration)
    }

    func timeline(for configuration: SelectTrackerIntent, in context: Context) async -> Timeline<CounterEntry> {
        let current = entry(for: configuration)
        let next = refreshDate(for: current.tracker, snapshot: current.snapshot, from: current.date)
        return Timeline(entries: [current], policy: .after(next))
    }

    private func entry(for configuration: SelectTrackerIntent) -> CounterEntry {
        guard let snapshot = Store.snapshot() else {
            return CounterEntry(date: .now, snapshot: nil, tracker: nil, pending: [])
        }
        // A widget set up while Pro keeps working for Free by falling back to the one tracker Free may show.
        let chosen = configuration.tracker.flatMap { choice in snapshot.trackers.first { $0.id == choice.id } }
        let tracker = snapshot.isPro ? (chosen ?? snapshot.primary) : snapshot.primary
        return CounterEntry(date: .now, snapshot: snapshot, tracker: tracker, pending: Store.pending(for: snapshot))
    }
}

struct ListEntry: TimelineEntry {
    let date: Date
    let snapshot: Snapshot?
    let pending: [PressAction]
}

struct ListProvider: TimelineProvider {
    func placeholder(in context: Context) -> ListEntry {
        ListEntry(date: .now, snapshot: nil, pending: [])
    }

    func getSnapshot(in context: Context, completion: @escaping (ListEntry) -> Void) {
        completion(entry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ListEntry>) -> Void) {
        let current = entry()
        let earliestEnd = current.snapshot?.trackers.compactMap { $0.periodEnd }.min()
        var next = refreshDate(for: nil, snapshot: current.snapshot, from: current.date)
        if let earliestEnd {
            let end = Date(timeIntervalSince1970: earliestEnd / 1000)
            if end > current.date && end < next { next = end.addingTimeInterval(1) }
        }
        completion(Timeline(entries: [current], policy: .after(next)))
    }

    private func entry() -> ListEntry {
        guard let snapshot = Store.snapshot() else { return ListEntry(date: .now, snapshot: nil, pending: []) }
        return ListEntry(date: .now, snapshot: snapshot, pending: Store.pending(for: snapshot))
    }
}
