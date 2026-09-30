import SwiftUI
import WatchKit

@main
struct FoxiemWatchApp: App {
    @StateObject private var link = PhoneLink()

    var body: some Scene {
        WindowGroup {
            RootView().environmentObject(link)
        }
    }
}

// MARK: - Screens

struct RootView: View {
    @EnvironmentObject private var link: PhoneLink

    var body: some View {
        // Re-evaluated every minute so a lapsed Pro period locks the Watch even if nothing else changes.
        TimelineView(.everyMinute) { context in
            NavigationStack {
                if let snapshot = link.snapshot {
                    if !snapshot.isProNow(context.date) {
                        Message(title: snapshot.labels.locked, message: snapshot.labels.lockedBody)
                    } else if snapshot.trackers.isEmpty {
                        Message(title: snapshot.labels.empty, message: snapshot.labels.open)
                    } else {
                        TrackerList(snapshot: snapshot)
                    }
                } else {
                    Message(
                        title: "Foxiem",
                        message: String(localized: "Open Foxiem on your iPhone to get started.")
                    )
                }
            }
        }
    }
}

struct Message: View {
    let title: String
    let message: String

    var body: some View {
        ScrollView {
            VStack(spacing: 6) {
                Text(verbatim: title).font(.headline).multilineTextAlignment(.center)
                Text(verbatim: message).font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
            }
            .padding()
        }
    }
}

struct TrackerList: View {
    @EnvironmentObject private var link: PhoneLink
    let snapshot: Snapshot

    var body: some View {
        List(snapshot.trackers) { tracker in
            NavigationLink(value: tracker.id) {
                let display = tracker.display(pending: link.pending, now: .now)
                HStack(spacing: 8) {
                    Image(systemName: tracker.symbol)
                        .foregroundStyle(Color(hex: tracker.dark.ink))
                        .frame(width: 22)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(verbatim: tracker.name).font(.headline).lineLimit(1)
                        Text(verbatim: "\(formatNumber(display.value, language: snapshot.language)) \(tracker.caption)")
                            .font(.footnote)
                            .foregroundStyle(display.state == .over ? Color.red : Color.secondary)
                            .lineLimit(1)
                    }
                }
            }
        }
        .navigationTitle("Foxiem")
        .navigationDestination(for: String.self) { id in
            TrackerDetail(trackerId: id)
        }
    }
}

struct TrackerDetail: View {
    @EnvironmentObject private var link: PhoneLink
    let trackerId: String

    var body: some View {
        if let snapshot = link.snapshot, let tracker = snapshot.trackers.first(where: { $0.id == trackerId }) {
            content(tracker, snapshot)
        } else {
            // The tracker was deleted (or hidden) on the iPhone while this screen was open.
            Message(title: link.snapshot?.labels.empty ?? "Foxiem", message: link.snapshot?.labels.open ?? "")
        }
    }

    private func content(_ tracker: TrackerInfo, _ snapshot: Snapshot) -> some View {
        let display = tracker.display(pending: link.pending, now: .now)
        let accent = Color(hex: tracker.dark.solid)
        let canDecrement = display.value > 0
        return VStack(spacing: 6) {
            Text(verbatim: tracker.name).font(.footnote.weight(.semibold)).lineLimit(1)
            ZStack {
                if let progress = display.progress {
                    Circle().stroke(Color.secondary.opacity(0.25), lineWidth: 6)
                    Circle()
                        .trim(from: 0, to: progress)
                        .stroke(display.state == .over ? Color.red : accent, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                }
                VStack(spacing: 0) {
                    Text(verbatim: formatNumber(display.value, language: snapshot.language))
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .minimumScaleFactor(0.5)
                        .lineLimit(1)
                        .contentTransition(.numericText())
                    Text(verbatim: tracker.caption).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                }
                .padding(10)
            }
            .frame(maxHeight: 100)
            HStack(spacing: 12) {
                if tracker.intent != "consistency" || canDecrement {
                    Button {
                        WKInterfaceDevice.current().play(.directionDown)
                        link.press(trackerId: tracker.id, direction: "down")
                    } label: {
                        Image(systemName: "minus").font(.title3.weight(.bold))
                    }
                    .accessibilityLabel(Text("\(String(localized: "Subtract")) \(tracker.name)"))
                    .disabled(!canDecrement)
                    .frame(width: 44)
                }
                Button {
                    press(tracker, display: display)
                } label: {
                    Image(systemName: "plus").font(.title2.weight(.bold)).frame(maxWidth: .infinity)
                }
                .accessibilityLabel(Text("\(String(localized: "Add")) \(tracker.name)"))
                .tint(accent)
                .buttonStyle(.borderedProminent)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private func press(_ tracker: TrackerInfo, display before: Display) {
        link.press(trackerId: tracker.id, direction: "up")
        let after = tracker.display(pending: link.pending, now: .now)
        // A distinct haptic when this press reaches the goal; a plain click otherwise.
        if before.state != .reached && after.state == .reached {
            WKInterfaceDevice.current().play(.success)
        } else if after.state == .over && before.state != .over {
            WKInterfaceDevice.current().play(.notification)
        } else {
            WKInterfaceDevice.current().play(.click)
        }
    }
}
