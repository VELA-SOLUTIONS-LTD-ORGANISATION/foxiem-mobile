import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, render } from '@testing-library/react-native';

import {
  getHomeTopicSwitcherLayout,
  HOME_TOPIC_ADD_SIZE,
  HOME_TOPIC_ADD_SIZE_COMPACT,
  HOME_TOPIC_ICON_TILE,
  HOME_TOPIC_SELECTOR_MIN_HEIGHT,
  HomeTopicSwitcher,
} from '@/components/home/HomeTopicSwitcher';

describe('HomeTopicSwitcher', () => {
  it('renders name, status, press split, ellipsis, and disabled add', async () => {
    const onPressTopic = jest.fn();
    const onPressAdd = jest.fn();
    const longName = 'A very long evening reading and gratitude topic name';
    const view = await render(
      <HomeTopicSwitcher
        topicName={longName}
        activeLabel="Active topic"
        canCreateTopic
        selectorAccessibilityLabel={`Select topic, currently ${longName}`}
        addAccessibilityLabel="Add topic"
        onPressTopic={onPressTopic}
        onPressAdd={onPressAdd}
      />,
    );

    expect(view.getByText(longName)).toBeTruthy();
    expect(view.getByText('Active topic')).toBeTruthy();
    expect(view.getByLabelText(`Select topic, currently ${longName}`)).toBeTruthy();
    expect(view.getByText(longName).props.numberOfLines).toBe(1);
    expect(view.getByText(longName).props.ellipsizeMode).toBe('tail');

    fireEvent.press(view.getByTestId('home-topic-selector'));
    expect(onPressTopic).toHaveBeenCalledTimes(1);
    fireEvent.press(view.getByTestId('home-topic-add'));
    expect(onPressAdd).toHaveBeenCalledTimes(1);

    const source = fs.readFileSync(path.join(__dirname, '..', 'HomeTopicSwitcher.tsx'), 'utf8');
    expect(source).toContain('name="folder"');
    expect(source).toContain('name="chevron-down"');
    expect(source).toContain('accessibilityState={{ disabled: !canCreateTopic }}');
    expect(source).not.toMatch(/settings-outline|cog|debug/i);
  });

  it('fits selector + add button from 320 through 480', () => {
    for (const width of [320, 360, 375, 390, 414, 430, 480]) {
      const layout = getHomeTopicSwitcherLayout(width);
      expect(layout.fits).toBe(true);
      expect(layout.rowWidth).toBeLessThanOrEqual(390);
      expect(layout.addSize).toBeGreaterThanOrEqual(52);
    }
    expect(getHomeTopicSwitcherLayout(320).compact).toBe(true);
    expect(getHomeTopicSwitcherLayout(320).addSize).toBe(HOME_TOPIC_ADD_SIZE_COMPACT);
    expect(getHomeTopicSwitcherLayout(390).addSize).toBe(HOME_TOPIC_ADD_SIZE);
    expect(getHomeTopicSwitcherLayout(480).rowWidth).toBe(390);
  });

  it('uses compact selector and add dimensions', () => {
    expect(HOME_TOPIC_SELECTOR_MIN_HEIGHT).toBeGreaterThanOrEqual(62);
    expect(HOME_TOPIC_SELECTOR_MIN_HEIGHT).toBeLessThanOrEqual(66);
    expect(HOME_TOPIC_ADD_SIZE).toBeGreaterThanOrEqual(54);
    expect(HOME_TOPIC_ADD_SIZE).toBeLessThanOrEqual(56);
    expect(HOME_TOPIC_ADD_SIZE_COMPACT).toBeGreaterThanOrEqual(52);
    expect(HOME_TOPIC_ADD_SIZE_COMPACT).toBeLessThanOrEqual(56);
    expect(HOME_TOPIC_ICON_TILE).toBeGreaterThanOrEqual(42);
    expect(HOME_TOPIC_ICON_TILE).toBeLessThanOrEqual(44);

    const source = fs.readFileSync(path.join(__dirname, '..', 'HomeTopicSwitcher.tsx'), 'utf8');
    expect(source).toContain('HOME_TOPIC_SELECTOR_MIN_HEIGHT');
    expect(source).toContain('flex: 1');
    expect(source).toContain('minWidth: 0');
    expect(source).not.toMatch(/minHeight:\s*7[2-9]/);
    expect(source).not.toMatch(/settings-outline|cog|debug/i);
  });
});
