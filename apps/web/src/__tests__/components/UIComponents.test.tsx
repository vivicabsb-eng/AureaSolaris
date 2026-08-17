import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  NavItem,
  SectionTitle,
  Card,
  Advice,
  StarRow,
  FileItem,
  RoutineItem,
  AspectRow,
  FamilyItem,
  TodoRow,
  StatBox,
} from '../../components/common/UIComponents';

describe('UIComponents', () => {
  it('renders NavItem', () => {
    const handleClick = vi.fn();
    render(
      <NavItem
        icon={<span>icon</span>}
        label="Test"
        active={false}
        onClick={handleClick}
        collapsed={false}
      />
    );
    // NavItem renders a button with the label
    const button = screen.getByRole('button', { name: /test/i });
    expect(button).toBeInstanceOf(HTMLElement);
    expect(button.getAttribute('title')).toBe('Test');
  });

  it('renders SectionTitle', () => {
    render(<SectionTitle>Section Title</SectionTitle>);
    const heading = screen.getByText('Section Title');
    expect(heading).toBeInstanceOf(HTMLElement);
  });

  it('renders Card', () => {
    render(
      <Card title="Test Card" icon={<span>icon</span>}>
        <p>Content</p>
      </Card>
    );
    expect(screen.getByText('Test Card')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Content')).toBeInstanceOf(HTMLElement);
  });

  it('renders Advice', () => {
    render(
      <Advice agent="Agent" content="Some advice" icon={<span>icon</span>} />
    );
    // The advice text is wrapped in double quotes
    expect(screen.getByText('Conselho do Agent')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('"Some advice"')).toBeInstanceOf(HTMLElement);
  });

  it('renders StarRow', () => {
    render(
      <StarRow icon="★" name="Star" sign="Leo" deg="15°" />
    );
    expect(screen.getByText('Star')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Leo')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('15°')).toBeInstanceOf(HTMLElement);
  });

  it('renders FileItem', () => {
    const handleClick = vi.fn();
    render(<FileItem name="file.txt" date="2026-01-01" onClick={handleClick} />);
    expect(screen.getByText('file.txt')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('2026-01-01')).toBeInstanceOf(HTMLElement);
    expect(screen.getByRole('button', { name: /file\.txt/i })).toBeInstanceOf(HTMLElement);
  });

  it('renders RoutineItem', () => {
    render(<RoutineItem name="Exercise" time="07:00" />);
    expect(screen.getByText('Exercise')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('07:00')).toBeInstanceOf(HTMLElement);
  });

  it('renders AspectRow', () => {
    render(<AspectRow aspect="Conjunção" desc="Descrição" />);
    expect(screen.getByText('Conjunção')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Descrição')).toBeInstanceOf(HTMLElement);
  });

  it('renders FamilyItem', () => {
    render(<FamilyItem name="Family" data="Data" />);
    expect(screen.getByText('Family')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Data')).toBeInstanceOf(HTMLElement);
  });

  it('renders TodoRow', () => {
    const handleClick = vi.fn();
    render(<TodoRow label="Todo" checked={false} onClick={handleClick} />);
    expect(screen.getByText('Todo')).toBeInstanceOf(HTMLElement);
    expect(screen.getByRole('button', { name: /todo/i }).getAttribute('aria-pressed')).toBe('false');
  });

  it('renders StatBox', () => {
    render(<StatBox label="Total" val="42" />);
    expect(screen.getByText('Total')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('42')).toBeInstanceOf(HTMLElement);
  });
});
