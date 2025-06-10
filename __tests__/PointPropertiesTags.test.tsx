import { render, screen } from '@testing-library/react';
import PointPropertiesTags from '../components/PointPropertiesTags';

describe('PointPropertiesTags', () => {
  it('displays all valid BACnet markers as tags', () => {
    const mockPoint = {
      point: true,
      cmd: true,
      cur: true,
      his: true,
      writable: true,
      bacnetPoint: true
    };

    render(<PointPropertiesTags point={mockPoint} />);

    // Check that all expected tags are rendered
    expect(screen.getByText('Point')).toBeInTheDocument();
    expect(screen.getByText('Command')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Historized')).toBeInTheDocument();
    expect(screen.getByText('Writable')).toBeInTheDocument();
    expect(screen.getByText('BACnet')).toBeInTheDocument();
  });

  it('displays tags from markers array format', () => {
    const mockPoint = {
      markers: ['point', 'cmd', 'writable']
    };

    render(<PointPropertiesTags point={mockPoint} />);

    expect(screen.getByText('Point')).toBeInTheDocument();
    expect(screen.getByText('Command')).toBeInTheDocument();
    expect(screen.getByText('Writable')).toBeInTheDocument();
  });

  it('always includes point marker even if not explicitly set', () => {
    const mockPoint = {
      cmd: true,
      writable: true
    };

    render(<PointPropertiesTags point={mockPoint} />);

    // Should include 'Point' even though it wasn't explicitly set
    expect(screen.getByText('Point')).toBeInTheDocument();
    expect(screen.getByText('Command')).toBeInTheDocument();
    expect(screen.getByText('Writable')).toBeInTheDocument();
  });

  it('filters out invalid markers in development mode', () => {
    const mockPoint = {
      markers: ['point', 'invalidMarker', 'cmd']
    };

    render(<PointPropertiesTags point={mockPoint} />);

    expect(screen.getByText('Point')).toBeInTheDocument();
    expect(screen.getByText('Command')).toBeInTheDocument();
    // Invalid markers should not be visible in production
    expect(screen.queryByText('invalidMarker')).not.toBeInTheDocument();
  });

  it('shows appropriate tooltips for each marker', () => {
    const mockPoint = {
      point: true,
      cmd: true
    };

    render(<PointPropertiesTags point={mockPoint} />);

    const pointTag = screen.getByText('Point');
    const cmdTag = screen.getByText('Command');

    expect(pointTag).toHaveAttribute('title', expect.stringContaining('Indicates this is a point entity'));
    expect(cmdTag).toHaveAttribute('title', expect.stringContaining('Command/output point'));
  });

  it('handles empty point object gracefully', () => {
    const mockPoint = {};

    render(<PointPropertiesTags point={mockPoint} />);

    // Should show at least the default 'Point' marker
    expect(screen.getByText('Point')).toBeInTheDocument();
  });
}); 