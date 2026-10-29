import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimulationStudio } from '../SimulationStudio';

describe('SimulationStudio section', () => {
  it('renders the gallery, requirement bar and stage controls', () => {
    render(<SimulationStudio onBack={vi.fn()} onPinToCanvas={vi.fn()} />);
    expect(screen.getByText('Simulation Studio')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Launch a projectile on the Moon/)).toBeInTheDocument();
    for (const title of [
      'Simple Pendulum',
      'Spring–Mass Oscillator',
      'Planetary Orbit',
      'Projectile Motion',
      'Wave on a String',
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getByText('Parameters')).toBeInTheDocument();
    expect(screen.getByText('Pin to canvas')).toBeInTheDocument();
  });

  it('runs a typed requirement and reports the match', () => {
    render(<SimulationStudio onBack={vi.fn()} onPinToCanvas={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Launch a projectile on the Moon/), {
      target: { value: 'Wave on a string at 2 Hz' },
    });
    fireEvent.click(screen.getByText('Simulate'));
    expect(screen.getByText(/Matched: Wave on a String/)).toBeInTheDocument();
  });

  it('warns when the requirement matches nothing', () => {
    render(<SimulationStudio onBack={vi.fn()} onPinToCanvas={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Launch a projectile on the Moon/), {
      target: { value: 'asdfgh qwerty' },
    });
    fireEvent.click(screen.getByText('Simulate'));
    expect(screen.getByText(/No confident match/)).toBeInTheDocument();
  });

  it('pins the current simulation to the canvas with its params', () => {
    const onPin = vi.fn();
    render(<SimulationStudio onBack={vi.fn()} onPinToCanvas={onPin} />);
    fireEvent.click(screen.getByText('Pin to canvas'));
    expect(onPin).toHaveBeenCalledTimes(1);
    expect(onPin.mock.calls[0][0]).toBe('projectile');
    expect(onPin.mock.calls[0][1]).toMatchObject({ gravity: 9.80665 });
  });

  it('switches system from the gallery and resets the match note', () => {
    render(<SimulationStudio onBack={vi.fn()} onPinToCanvas={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Launch a projectile on the Moon/), {
      target: { value: 'asdfgh qwerty' },
    });
    fireEvent.click(screen.getByText('Simulate'));
    expect(screen.getByText(/No confident match/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Simple Pendulum'));
    expect(screen.queryByText(/No confident match/)).not.toBeInTheDocument();
  });
});
