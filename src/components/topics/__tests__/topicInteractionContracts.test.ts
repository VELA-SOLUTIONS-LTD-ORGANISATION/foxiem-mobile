import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..', '..', '..', '..');

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('topic interaction contracts', () => {
  it('unmounts closed sheets and keeps keyboard-aware behaviour opt-in', () => {
    const sheet = read('src/components/overlays/BottomSheet.tsx');
    const modal = read('src/components/overlays/AppModal.tsx');
    const editor = read('src/components/topics/TopicNameEditor.tsx');
    const reminder = read('src/screens/reminders/ReminderEditorScreen.tsx');
    const appJson = read('app.json');

    expect(sheet).toContain('if (!visible)');
    expect(sheet).toContain('keyboardAware');
    expect(sheet).toContain('keyboardShouldPersistTaps="handled"');
    expect(sheet).toContain('behavior="padding"');
    expect(sheet).toContain('automaticallyAdjustKeyboardInsets');
    expect(modal).toContain('if (!visible)');

    expect(editor).toContain('keyboardAware');
    expect(editor).toContain('compact');
    expect(editor).toContain('showClose');
    expect(editor).toContain('placement="top"');
    expect(editor).toContain("label={t('topics.name')}");
    expect(editor).toContain('flexDirection: \'row\'');
    expect(editor).toContain('styles.formActions');
    expect(editor).toContain("variant=\"outline\"");
    expect(editor).toContain('export const TopicEditorSheet');
    expect(editor).not.toMatch(/position:\s*['"]absolute['"]/);
    expect(editor).toContain('Keyboard.dismiss');
    expect(editor).toContain('returnKeyType="done"');
    expect(sheet).toContain('compact');
    expect(sheet).toContain('flexGrow: 0');
    expect(sheet).toContain('showClose');

    expect(reminder).toContain('scroll={false}');
    expect(reminder).not.toMatch(/<BottomSheet[\s\S]*keyboardAware/);
    expect(appJson).toContain('"softwareKeyboardLayoutMode": "resize"');
  });

  it('keeps one exclusive overlay controller and no local topic ids', () => {
    const workspace = read('src/components/topics/TopicWorkspace.tsx');
    const picker = read('src/components/topics/TopicPickerSheet.tsx');
    const overlay = read('src/state/topicOverlay.ts');

    expect(overlay).toContain("type: 'picker'");
    expect(overlay).toContain("type: 'create'");
    expect(overlay).toContain("type: 'rename'");
    expect(workspace).toContain("overlay.type === 'picker'");
    expect(workspace).toContain("overlay.type === 'create' || overlay.type === 'rename'");
    expect(workspace).toContain('selectTopic(topicId)');
    expect(workspace).not.toContain('localActiveTopicId');
    expect(workspace).toContain('HomeTopicSwitcher');
    expect(workspace).toContain('TopicContextSelector');
    expect(picker).toContain('selected={selected}');
  });

  it('wires global topic switching into topic-dependent screens', () => {
    const home = read('src/screens/home/HomeScreen.tsx');
    const statistics = read('src/screens/statistics/StatisticsScreen.tsx');
    const history = read('src/screens/statistics/ActivityHistoryScreen.tsx');
    const consistency = read('src/screens/statistics/ConsistencyScreen.tsx');

    expect(home).toContain('activeTopicId');
    expect(statistics).toContain('[activeTopicId, counterEvents, referenceDate]');
    expect(statistics).toContain('[activeTopicId, counterEvents, period, referenceDate, t]');
    expect(history).toContain('[activeTopicId, counterEvents, i18n.language, referenceDate, t]');
    expect(consistency).toContain('[activeTopicId, counterEvents, referenceDate]');

    for (const source of [home, statistics, history, consistency]) {
      expect(source).not.toContain('localActiveTopicId');
    }
  });
});
