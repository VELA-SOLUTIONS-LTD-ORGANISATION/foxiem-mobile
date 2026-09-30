import AppIntents
import SwiftUI
import UIKit
import WidgetKit

// MARK: - Shared pieces

struct Tint {
    let accent: Color
    let onAccent: Color
    let ink: Color
}

/// Free widgets stay neutral; tracker colour is part of Pro.
func tintFor(_ tracker: TrackerInfo, snapshot: Snapshot, scheme: ColorScheme) -> Tint {
    if snapshot.isPro {
        let tone = tracker.tone(scheme)
        return Tint(accent: Color(hex: tone.solid), onAccent: Color(hex: tone.onSolid), ink: Color(hex: tone.ink))
    }
    return Tint(accent: .primary, onAccent: Color(UIColor.systemBackground), ink: .primary)
}

func stateText(_ state: DisplayState, _ labels: WidgetLabels) -> String? {
    switch state {
    case .reached: return labels.goalReached
    case .over: return labels.overLimit
    case .atLimit: return labels.atLimit
    case .neutral: return nil
    }
}

func trackerURL(_ id: String) -> URL? { URL(string: "\(Shared.scheme)://tracker/\(id)") }
let homeURL = URL(string: "\(Shared.scheme)://home")
let proURL = URL(string: "\(Shared.scheme)://pro?feature=widgets")

struct StepButton: View {
    let tracker: TrackerInfo
    let direction: String
    let size: CGFloat
    let tint: Tint
    var enabled: Bool = true

    var body: some View {
        let up = direction == "up"
        // VoiceOver reads "Add Water" or "Subtract Water" (system-language strings from Localizable.xcstrings).
        let verb = up ? String(localized: "Add") : String(localized: "Subtract")
        Button(intent: AdjustTrackerIntent(trackerId: tracker.id, direction: direction)) {
            Image(systemName: up ? "plus" : "minus")
                .font(.system(size: size * 0.42, weight: .bold))
                .frame(width: size, height: size)
                .background(up ? tint.accent : Color.secondary.opacity(0.2), in: Circle())
                .foregroundStyle(up ? tint.onAccent : (enabled ? Color.primary : Color.secondary))
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
        .accessibilityLabel(Text(verbatim: "\(verb) \(tracker.name)"))
    }
}

struct MessageCard: View {
    let title: String
    let message: String
    let url: URL?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(verbatim: title).font(.headline).lineLimit(2)
            if !message.isEmpty {
                Text(verbatim: message).font(.caption).foregroundStyle(.secondary).lineLimit(3)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetURL(url)
    }
}

// MARK: - Counter widget

struct CounterWidgetView: View {
    let entry: CounterEntry
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        content
            .containerBackground(for: .widget) {
                switch family {
                case .accessoryCircular, .accessoryRectangular, .accessoryInline:
                    Color.clear
                default:
                    Color(UIColor.systemBackground)
                }
            }
    }

    /// Free covers one tracker on the Home Screen (small) and the simple Lock Screen shapes.
    private func locked(_ snapshot: Snapshot) -> Bool {
        guard !snapshot.isPro else { return false }
        return family == .systemMedium || family == .accessoryRectangular
    }

    @ViewBuilder
    private var content: some View {
        if let snapshot = entry.snapshot, let tracker = entry.tracker {
            if locked(snapshot) {
                lockedView(snapshot)
            } else {
                switch family {
                case .accessoryCircular: circular(tracker, snapshot)
                case .accessoryRectangular: rectangular(tracker, snapshot)
                case .accessoryInline: inline(tracker, snapshot)
                case .systemMedium: medium(tracker, snapshot)
                default: small(tracker, snapshot)
                }
            }
        } else if let snapshot = entry.snapshot {
            fallback(title: snapshot.labels.empty, message: snapshot.labels.open, url: homeURL)
        } else {
            // The app has never published a snapshot (fresh install, or after a reset).
            fallback(title: "Foxiem", message: "", url: homeURL)
        }
    }

    /// Placeholder for "nothing to show yet". The Lock Screen shapes are tiny, so each gets a compact version
    /// instead of a card that would be clipped.
    @ViewBuilder
    private func fallback(title: String, message: String, url: URL?) -> some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "plus").font(.title3.weight(.bold))
            }
            .widgetURL(url)
        case .accessoryInline:
            Text(verbatim: title).widgetURL(url)
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text(verbatim: title).font(.headline).lineLimit(1)
                if !message.isEmpty {
                    Text(verbatim: message).font(.caption2).lineLimit(2)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .widgetURL(url)
        default:
            MessageCard(title: title, message: message, url: url)
        }
    }

    @ViewBuilder
    private func lockedView(_ snapshot: Snapshot) -> some View {
        if family == .accessoryRectangular {
            VStack(alignment: .leading) {
                Text(verbatim: snapshot.labels.locked).font(.headline)
                Text(verbatim: snapshot.labels.lockedBody).font(.caption2).lineLimit(2)
            }
            .widgetURL(proURL)
        } else {
            MessageCard(title: snapshot.labels.locked, message: snapshot.labels.lockedBody, url: proURL)
        }
    }

    private func resolved(_ tracker: TrackerInfo) -> Display {
        tracker.display(pending: entry.pending, now: entry.date)
    }

    private func number(_ display: Display, _ snapshot: Snapshot) -> String {
        formatNumber(display.value, language: snapshot.language)
    }

    private func header(_ tracker: TrackerInfo, _ tint: Tint) -> some View {
        HStack(spacing: 6) {
            Image(systemName: tracker.symbol).foregroundStyle(tint.ink)
            Text(verbatim: tracker.name).font(.footnote.weight(.semibold)).lineLimit(1)
        }
    }

    private func bar(_ display: Display, _ tint: Tint) -> some View {
        Group {
            if let progress = display.progress {
                ProgressView(value: progress)
                    .tint(display.state == .over ? Color.red : tint.accent)
            }
        }
    }

    private func small(_ tracker: TrackerInfo, _ snapshot: Snapshot) -> some View {
        let display = resolved(tracker)
        let tint = tintFor(tracker, snapshot: snapshot, scheme: scheme)
        return VStack(alignment: .leading, spacing: 2) {
            header(tracker, tint)
            Spacer(minLength: 0)
            Text(verbatim: number(display, snapshot))
                .font(.system(size: 36, weight: .bold, design: .rounded))
                .minimumScaleFactor(0.5)
                .lineLimit(1)
                .contentTransition(.numericText())
            Text(verbatim: tracker.caption).font(.caption).foregroundStyle(.secondary).lineLimit(1)
            HStack(alignment: .center, spacing: 8) {
                bar(display, tint)
                StepButton(tracker: tracker, direction: "up", size: 34, tint: tint)
            }
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetURL(trackerURL(tracker.id))
    }

    private func medium(_ tracker: TrackerInfo, _ snapshot: Snapshot) -> some View {
        let display = resolved(tracker)
        let tint = tintFor(tracker, snapshot: snapshot, scheme: scheme)
        let canDecrement = display.value > 0
        return HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                header(tracker, tint)
                Spacer(minLength: 0)
                Text(verbatim: number(display, snapshot))
                    .font(.system(size: 44, weight: .bold, design: .rounded))
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
                    .contentTransition(.numericText())
                Text(verbatim: tracker.caption).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                if let text = stateText(display.state, snapshot.labels) {
                    Text(verbatim: text)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(display.state == .over ? Color.red : tint.ink)
                }
                bar(display, tint).padding(.top, 4)
            }
            VStack(spacing: 10) {
                StepButton(tracker: tracker, direction: "up", size: 52, tint: tint)
                StepButton(tracker: tracker, direction: "down", size: 44, tint: tint, enabled: canDecrement)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetURL(trackerURL(tracker.id))
    }

    private func circular(_ tracker: TrackerInfo, _ snapshot: Snapshot) -> some View {
        let display = resolved(tracker)
        return Group {
            if let progress = display.progress {
                Gauge(value: progress) {
                    Image(systemName: tracker.symbol)
                } currentValueLabel: {
                    Text(verbatim: number(display, snapshot)).minimumScaleFactor(0.5)
                }
                .gaugeStyle(.accessoryCircularCapacity)
            } else {
                ZStack {
                    AccessoryWidgetBackground()
                    VStack(spacing: 0) {
                        Image(systemName: tracker.symbol).font(.caption2)
                        Text(verbatim: number(display, snapshot)).font(.headline).minimumScaleFactor(0.5).lineLimit(1)
                    }
                }
            }
        }
        .widgetURL(trackerURL(tracker.id))
    }

    private func rectangular(_ tracker: TrackerInfo, _ snapshot: Snapshot) -> some View {
        let display = resolved(tracker)
        let tint = tintFor(tracker, snapshot: snapshot, scheme: scheme)
        return HStack {
            VStack(alignment: .leading, spacing: 1) {
                Text(verbatim: tracker.name).font(.headline).lineLimit(1)
                Text(verbatim: "\(number(display, snapshot)) \(tracker.caption)").font(.caption).lineLimit(1)
                if let progress = display.progress {
                    Gauge(value: progress) { EmptyView() }.gaugeStyle(.accessoryLinearCapacity)
                }
            }
            Spacer(minLength: 0)
            StepButton(tracker: tracker, direction: "up", size: 30, tint: tint)
        }
        .widgetURL(trackerURL(tracker.id))
    }

    private func inline(_ tracker: TrackerInfo, _ snapshot: Snapshot) -> some View {
        let display = resolved(tracker)
        return Label {
            Text(verbatim: "\(tracker.name) \(number(display, snapshot))")
        } icon: {
            Image(systemName: tracker.symbol)
        }
        .widgetURL(trackerURL(tracker.id))
    }
}

// MARK: - Trackers list widget (Pro)

struct ListWidgetView: View {
    let entry: ListEntry
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        content.containerBackground(for: .widget) { Color(UIColor.systemBackground) }
    }

    @ViewBuilder
    private var content: some View {
        if let snapshot = entry.snapshot {
            if !snapshot.isPro {
                MessageCard(title: snapshot.labels.locked, message: snapshot.labels.lockedBody, url: proURL)
            } else if snapshot.trackers.isEmpty {
                MessageCard(title: snapshot.labels.empty, message: snapshot.labels.open, url: homeURL)
            } else {
                rows(snapshot)
            }
        } else {
            MessageCard(title: "Foxiem", message: "", url: homeURL)
        }
    }

    private func rows(_ snapshot: Snapshot) -> some View {
        let limit = family == .systemLarge ? 6 : 3
        return VStack(spacing: 8) {
            ForEach(Array(snapshot.trackers.prefix(limit))) { tracker in
                row(tracker, snapshot)
            }
            if snapshot.trackers.count < limit { Spacer(minLength: 0) }
        }
    }

    private func row(_ tracker: TrackerInfo, _ snapshot: Snapshot) -> some View {
        let display = tracker.display(pending: entry.pending, now: entry.date)
        let tint = tintFor(tracker, snapshot: snapshot, scheme: scheme)
        return HStack(spacing: 10) {
            Link(destination: trackerURL(tracker.id) ?? homeURL ?? URL(string: "foxiem://home")!) {
                HStack(spacing: 10) {
                    Image(systemName: tracker.symbol)
                        .foregroundStyle(tint.ink)
                        .frame(width: 22)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(verbatim: tracker.name).font(.subheadline.weight(.semibold)).lineLimit(1)
                        Text(verbatim: "\(formatNumber(display.value, language: snapshot.language)) \(tracker.caption)")
                            .font(.caption)
                            .foregroundStyle(display.state == .over ? Color.red : Color.secondary)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 0)
                }
            }
            StepButton(tracker: tracker, direction: "up", size: 34, tint: tint)
        }
    }
}

// MARK: - Widgets

struct FoxiemCounterWidget: Widget {
    let kind = "FoxiemCounter"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SelectTrackerIntent.self, provider: CounterProvider()) { entry in
            CounterWidgetView(entry: entry)
        }
        .configurationDisplayName("Counter")
        .description("Count one tracker from your Home Screen or Lock Screen.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

struct FoxiemTrackersWidget: Widget {
    let kind = "FoxiemTrackers"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ListProvider()) { entry in
            ListWidgetView(entry: entry)
        }
        .configurationDisplayName("Trackers")
        .description("Your trackers in one list, each with a + button.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

@main
struct FoxiemWidgets: WidgetBundle {
    var body: some Widget {
        FoxiemCounterWidget()
        FoxiemTrackersWidget()
    }
}
