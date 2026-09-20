import fs from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components';
import { i18n } from '@/i18n';
import { TopicSwitcher } from '@/screens/home/TopicSwitcher';
import { useAppState } from '@/state';
import { createCustomTopic, createDefaultTopic, MAX_TOPIC_COUNT } from '@/state/topics';

jest.mock('@/state', () => ({
  useAppState: jest.fn(),
}));

jest.mock('@/state/useTopicOverlay', () => jest.requireActual('@/state/useTopicOverlay'));

const useAppStateMock = useAppState as jest.MockedFunction<typeof useAppState>;

function baseState(overrides?: Partial<ReturnType<typeof useAppState>>) {
  const general = { ...createDefaultTopic(47, '2026-09-01T00:00:00.000Z') };
  const water = { ...createCustomTopic('Water', '2026-09-02T00:00:00.000Z', 'topic.water'), currentCount: 12 };
  return {
    topics: [general, water],
    activeTopic: general,
    activeTopicId: general.id,
    selectTopic: jest.fn(),
    createTopic: jest.fn(),
    renameTopic: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useAppState>;
}

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe('TopicSwitcher', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the localized default name and active subtitle', async () => {
    useAppStateMock.mockReturnValue(baseState());
    const view = await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <I18nextProvider i18n={i18n}>
          <ToastProvider>
            <TopicSwitcher />
          </ToastProvider>
        </I18nextProvider>
      </SafeAreaProvider>,
    );
    expect(view.getByText('General')).toBeTruthy();
    expect(view.getByText('Active topic')).toBeTruthy();
    expect(view.getByLabelText('Select topic, currently General')).toBeTruthy();
    expect(view.getByLabelText('Add topic')).toBeTruthy();
  });

  it('disables add when the topic limit is reached', async () => {
    useAppStateMock.mockReturnValue(
      baseState({
        topics: [
          createDefaultTopic(),
          ...Array.from({ length: MAX_TOPIC_COUNT - 1 }, (_, index) => createCustomTopic(`Topic ${index}`)),
        ],
      }),
    );
    const view = await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <I18nextProvider i18n={i18n}>
          <ToastProvider>
            <TopicSwitcher />
          </ToastProvider>
        </I18nextProvider>
      </SafeAreaProvider>,
    );
    const json = JSON.stringify(view.toJSON());
    expect(json).toContain('home-topic-add');
    expect(json).toContain('"disabled":true');
  });

  it('hosts the shared home workspace without debug chrome', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'TopicSwitcher.tsx'), 'utf8');
    expect(source).toContain('TopicWorkspace');
    expect(source).toContain('variant="home"');
    expect(source).not.toMatch(/settings-outline|cog|debug/i);
  });
});
