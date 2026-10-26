import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EntrancePhotoPicker } from './EntrancePhotoPicker';

describe('entrance image sources', () => {
  it('keeps the saved-image picker separate from rear-camera capture and accepts either image', () => {
    const onChoose = vi.fn();
    render(<EntrancePhotoPicker disabled={false} onChoose={onChoose} />);
    const gallery = screen.getByLabelText('Choose entrance image'), camera = screen.getByLabelText('Take entrance photo');
    expect(gallery).not.toHaveAttribute('capture');
    expect(camera).toHaveAttribute('capture', 'environment');
    const reference = new File(['image'], 'reference-entrance.png', { type: 'image/png' });
    fireEvent.change(gallery, { target: { files: [reference] } });
    expect(onChoose).toHaveBeenLastCalledWith(reference);
    const captured = new File(['image'], 'printed-entrance.jpg', { type: 'image/jpeg' });
    fireEvent.change(camera, { target: { files: [captured] } });
    expect(onChoose).toHaveBeenLastCalledWith(captured);
    expect(screen.getByText(/not a tracked AR entrance/)).toBeInTheDocument();
  });
  it('disables both sources while processing or an AR session is active', () => {
    render(<EntrancePhotoPicker disabled onChoose={vi.fn()} />);
    expect(screen.getByLabelText('Choose entrance image')).toBeDisabled();
    expect(screen.getByLabelText('Take entrance photo')).toBeDisabled();
  });
});
