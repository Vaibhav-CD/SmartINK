import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InteractiveFunctionPlot } from '../InteractiveFunctionPlot';

describe('InteractiveFunctionPlot demo surface', () => {
  it('opens with sin(x) and the quadratic as two editable curves in one frame', () => {
    const { container } = render(
      <InteractiveFunctionPlot
        id="plot-demo"
        initialFunction="sin(x), x^2 - 4x + 3"
        position={{ x: 100, y: 100 }}
        onClose={vi.fn()}
      />
    );
    const inputs = screen.getAllByPlaceholderText('e.g. sin(x), x^2, cos(x)') as HTMLInputElement[];
    expect(inputs.map((i) => i.value)).toEqual(['sin(x)', 'x^2 - 4x + 3']);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelectorAll('svg path').length).toBeGreaterThanOrEqual(2);
  });

  it('lets the presenter type a replacement curve', () => {
    render(
      <InteractiveFunctionPlot
        id="plot-demo-2"
        initialFunction="sin(x)"
        position={{ x: 100, y: 100 }}
        onClose={vi.fn()}
      />
    );
    const input = screen.getByPlaceholderText('e.g. sin(x), x^2, cos(x)') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'x^2 - 4x + 3' } });
    expect(input.value).toBe('x^2 - 4x + 3');
  });
});
