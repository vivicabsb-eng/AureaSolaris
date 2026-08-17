import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NodeCard } from '../../../components/mesa/NodeCard';
import type { CadernoNode } from '../../../types/caderno';

const stickyNode: CadernoNode = {
  id: 1,
  type: 'sticky',
  x: 20,
  y: 20,
  w: 200,
  h: 140,
  text: 'Primeiro',
  color: '#FFFDE7',
};

const baseProps = {
  selected: false,
  tool: 'select' as const,
  autoFocus: false,
  onFocused: vi.fn(),
  onSelect: vi.fn(),
  onOpenStudy: vi.fn(),
  onDragStart: vi.fn(),
  onResizeStart: vi.fn(),
  onDelete: vi.fn(),
  onUpdate: vi.fn(),
  onConnect: vi.fn(),
  nodeRef: vi.fn(),
};

describe('NodeCard', () => {
  it('renders sticky text and calls onUpdate when edited', () => {
    const onUpdate = vi.fn();
    render(<NodeCard {...baseProps} node={stickyNode} onUpdate={onUpdate} />);

    const textarea = screen.getByDisplayValue('Primeiro');
    expect(textarea).toBeTruthy();
    fireEvent.change(textarea, { target: { value: 'Editado' } });
    expect(onUpdate).toHaveBeenCalledWith({ text: 'Editado' });
  });

  it('calls onDelete from the header delete button when selected', () => {
    const onDelete = vi.fn();
    render(<NodeCard {...baseProps} node={stickyNode} selected onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Excluir card' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenStudy when the study button is clicked', () => {
    const onOpenStudy = vi.fn();
    render(<NodeCard {...baseProps} node={stickyNode} selected onOpenStudy={onOpenStudy} />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir estudo deste card' }));
    expect(onOpenStudy).toHaveBeenCalledTimes(1);
  });
});
