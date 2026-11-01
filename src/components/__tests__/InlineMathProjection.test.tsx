import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InlineMathProjection } from '../InlineMathProjection';
import type { ProjectedEquation } from '../../services/calcInk/strokeRecognizer';

function makeEquation(overrides: Partial<ProjectedEquation> = {}): ProjectedEquation {
  return {
    id: 'eq-demo',
    strokeIds: ['s1'],
    expressionText: '2x+4=10',
    evaluation: {
      success: true,
      rawExpression: '2x+4=10',
      sanitizedExpression: '2x+4=10',
      value: 3,
      display: 'x = 3',
      isAssignment: false,
      isEquationSolution: true,
    },
    anchorPosition: { x: 120, y: 80 },
    boundingBox: { minX: 10, minY: 60, maxX: 220, maxY: 100, width: 210, height: 40, centerX: 115, centerY: 80 },
    timestamp: 1,
    isPlottableFunction: false,
    ...overrides,
  };
}

describe('InlineMathProjection demo surface', () => {
  it('shows the projected solution next to the ink', () => {
    render(<InlineMathProjection equation={makeEquation()} onWriteInInk={vi.fn()} />);
    expect(screen.getByText('2x+4=10')).toBeTruthy();
    expect(screen.getByText('x = 3')).toBeTruthy();
  });

  it('does not block the pen: capsule is click-through except its buttons', () => {
    const { container } = render(<InlineMathProjection equation={makeEquation()} onWriteInInk={vi.fn()} />);
    const root = container.firstElementChild as HTMLElement;
    // The capsule floats where the next handwritten glyph will land, so it
    // must let pen strokes pass through; only real buttons stay clickable.
    expect(root.className).toContain('pointer-events-none');
    expect(root.className).toContain('[&_button]:pointer-events-auto');
  });

  it('reveals the step-by-step trace when Steps is tapped', () => {
    render(<InlineMathProjection equation={makeEquation()} />);
    expect(screen.queryByText('Step-by-step solution')).toBeNull();

    fireEvent.click(screen.getByTitle('Show step-by-step solution'));

    expect(screen.getByText('Step-by-step solution')).toBeTruthy();
    expect(screen.getByText('2x+4 = 10')).toBeTruthy();
    expect(screen.getByText('2x = 6')).toBeTruthy();
    expect(screen.getAllByText('x = 3').length).toBeGreaterThanOrEqual(2);
  });

  it('offers no Steps button when the solver has no trace', () => {
    render(
      <InlineMathProjection
        equation={makeEquation({
          expressionText: 'x^2',
          evaluation: {
            success: true,
            rawExpression: 'x^2',
            sanitizedExpression: 'x^2',
            value: null,
            display: 'x^2',
            isAssignment: false,
          },
          isPlottableFunction: true,
          plotFunctionBody: 'x^2',
        })}
      />
    );
    expect(screen.queryByTitle('Show step-by-step solution')).toBeNull();
  });

  it('shows Undefined honestly for division by zero', () => {
    render(
      <InlineMathProjection
        equation={makeEquation({
          expressionText: '1/0',
          evaluation: {
            success: true,
            rawExpression: '1/0',
            sanitizedExpression: '1/0',
            value: null,
            display: 'Undefined',
            isAssignment: false,
            isUndefined: true,
          },
        })}
      />
    );
    expect(screen.getByText('= Undefined')).toBeTruthy();
    expect(screen.queryByTitle('Show step-by-step solution')).toBeNull();
  });
});
