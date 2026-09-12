import { fireEvent, render } from '@testing-library/react-native';

import { AppButton } from '@/components/buttons/AppButton';

describe('AppButton', () => {
  it('presses when idle and ignores presses while loading', async () => {
    const onPress = jest.fn();
    const view = await render(<AppButton title="Save" onPress={onPress} />);
    fireEvent.press(view.getByText('Save'));
    expect(onPress).toHaveBeenCalledTimes(1);

    await view.rerender(<AppButton title="Save" onPress={onPress} loading />);
    fireEvent.press(view.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
