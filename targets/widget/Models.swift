import Foundation
import SwiftUI

// Mirrors src/widgets/model.ts, src/widgets/inbox.ts and src/widgets/snapshot.ts (resolveDisplay).
// If one changes, change the other and the tests in src/widgets/__tests__.

enum Shared {
    static let appGroup = "group.co.uk.solutionvela.foxiem"
    static let snapshotKey = "foxiem.widget.snapshot"
    static let inboxKey = "foxiem.widget.inbox"
    static let scheme = "foxiem"
    static let inboxLimit = 200
}

struct Tone: Codable, Hashable {
    let solid: String
    let soft: String
    let ink: String
    let onSolid: String
}

struct WidgetLabels: Codable, Hashable {
    let goalReached: String
    let overLimit: String
    let atLimit: String
    let empty: String
    let locked: String
    let lockedBody: String
    let open: String
}

struct TrackerInfo: Codable, Hashable, Identifiable {
    let id: String
    let name: String
    let symbol: String
    let intent: String
    let period: String
    let light: Tone
    let dark: Tone
    let value: Double
    let target: Double?
    let step: Double
    let caption: String
    let periodEnd: Double?
    let today: Double
    let canDecrement: Bool

    func tone(_ scheme: ColorScheme) -> Tone { scheme == .dark ? dark : light }
}

struct Snapshot: Codable, Hashable {
    let v: Int
    let generatedAt: Double
    let isPro: Bool
    /// Epoch ms after which `isPro` no longer holds (Pro lapsing while the app is closed); nil = never.
    let proUntil: Double?
    let language: String
    let primaryId: String?
    let applied: [String]
    let labels: WidgetLabels
    let trackers: [TrackerInfo]

    var primary: TrackerInfo? {
        trackers.first { $0.id == primaryId } ?? trackers.first
    }

    /// Mirrors `settleSnapshot` in src/widgets/snapshot.ts: once the Pro entitlement it was published under
    /// has lapsed, behave as Free (not Pro, primary tracker only) without waiting for the app to open.
    func settled(now: Date) -> Snapshot {
        guard isPro, let proUntil, now.timeIntervalSince1970 * 1000 > proUntil else { return self }
        return Snapshot(
            v: v,
            generatedAt: generatedAt,
            isPro: false,
            proUntil: proUntil,
            language: language,
            primaryId: primaryId,
            applied: applied,
            labels: labels,
            trackers: primary.map { [$0] } ?? []
        )
    }
}

struct PressAction: Codable, Hashable {
    let id: String
    let trackerId: String
    let direction: String
    let at: Double
}

enum DisplayState {
    case neutral, reached, atLimit, over
}

struct Display {
    let value: Double
    let progress: Double?
    let state: DisplayState
    let pending: Int
}

extension TrackerInfo {
    /// The snapshot plus presses made since it was published (never counting ones the app already applied).
    func display(pending actions: [PressAction], now: Date) -> Display {
        let nowMs = now.timeIntervalSince1970 * 1000
        let rolled = periodEnd.map { nowMs >= $0 } ?? false
        let relevant = actions
            .filter { $0.trackerId == id && (!rolled || $0.at >= (periodEnd ?? 0)) }
            .sorted { $0.at < $1.at }

        var value = rolled ? 0 : self.value
        var today = rolled ? 0 : self.today
        for action in relevant {
            if intent == "consistency" {
                if action.direction == "up" {
                    if today == 0 { value += 1 }
                    today += 1
                } else if today > 0 {
                    today -= 1
                    if today == 0 { value = max(0, value - 1) }
                }
            } else if action.direction == "up" {
                value += step
            } else {
                value = max(0, value - min(step, value))
            }
        }

        var progress: Double?
        var state = DisplayState.neutral
        if let target, target > 0 {
            progress = min(1, value / target)
            if intent == "reach" || intent == "consistency" {
                state = value >= target ? .reached : .neutral
            } else if intent == "limit" {
                state = value > target ? .over : (value == target ? .atLimit : .neutral)
            }
        }
        return Display(value: value, progress: progress, state: state, pending: relevant.count)
    }
}

extension Color {
    /// "#RRGGBB" or "#RRGGBBAA".
    init(hex: String) {
        var text = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        if text.count == 6 { text += "FF" }
        var raw: UInt64 = 0
        Scanner(string: text).scanHexInt64(&raw)
        self.init(
            .sRGB,
            red: Double((raw >> 24) & 0xFF) / 255,
            green: Double((raw >> 16) & 0xFF) / 255,
            blue: Double((raw >> 8) & 0xFF) / 255,
            opacity: Double(raw & 0xFF) / 255
        )
    }
}

func formatNumber(_ value: Double, language: String) -> String {
    let formatter = NumberFormatter()
    formatter.locale = Locale(identifier: language)
    formatter.maximumFractionDigits = 2
    formatter.minimumFractionDigits = 0
    return formatter.string(from: NSNumber(value: value)) ?? String(value)
}
