import fs from 'node:fs';
import path from 'node:path';

describe('ReminderEditor presentation contracts', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', '..', 'screens', 'reminders', 'ReminderEditorScreen.tsx'),
    'utf8',
  );

  it('keeps Add and Edit on the shared ReminderEditor abstraction', () => {
    expect(source).toContain('function ReminderEditor');
    expect(source).toContain('export function AddReminderScreen');
    expect(source).toContain('export function EditReminderScreen');
    expect(source).toContain('<ReminderEditor');
  });

  it('does not permanently mount an inline iOS spinner in default form state', () => {
    expect(source).not.toMatch(/useState\(Platform\.OS === 'ios'\)/);
    expect(source).toContain('sheetPickerVisible');
    expect(source).toContain('time-outline');
    expect(source).toContain('scroll={false}');
  });

  it('removes Custom repeat from the selectable presets', () => {
    expect(source).not.toMatch(/custom:\s*'reminders\.custom'/);
    expect(source).toContain('everyDay');
    expect(source).toContain('weekdays');
    expect(source).toContain('weekends');
  });
});
