# Keyboard Navigation Guide

This document outlines the keyboard shortcuts and navigation features available in the X-Ear web application.

## Overview

The application provides comprehensive keyboard navigation support to improve accessibility and user experience. Navigation is available across calendar views and appointment management interfaces.

## Calendar Navigation

### Universal Calendar Shortcuts

These shortcuts work across all calendar views (Day, Week, Month):

| Shortcut | Action |
|----------|--------|
| `t` | Go to today's date |
| `Escape` | Clear selection/exit current mode |

### Day View Navigation

| Shortcut | Action |
|----------|--------|
| `←` (Left Arrow) | Go to previous day |
| `→` (Right Arrow) | Go to next day |
| `j` | Go to previous day (alternative) |
| `k` | Go to next day (alternative) |

### Week View Navigation

| Shortcut | Action |
|----------|--------|
| `←` (Left Arrow) | Go to previous week |
| `→` (Right Arrow) | Go to next week |
| `j` | Go to previous week (alternative) |
| `k` | Go to next week (alternative) |

### Month View Navigation

| Shortcut | Action |
|----------|--------|
| `←` (Left Arrow) | Go to previous month |
| `→` (Right Arrow) | Go to next month |
| `j` | Go to previous month (alternative) |
| `k` | Go to next month (alternative) |

## Appointment List Navigation

When viewing appointment lists, you can navigate and interact with appointments using the keyboard:

| Shortcut | Action |
|----------|--------|
| `↑` (Up Arrow) | Select previous appointment |
| `↓` (Down Arrow) | Select next appointment |
| `j` | Select previous appointment (alternative) |
| `k` | Select next appointment (alternative) |
| `Enter` | Open selected appointment details |
| `e` | Edit selected appointment |
| `Delete` | Delete selected appointment |
| `Escape` | Clear selection |

### Visual Indicators

- **Selected Appointment**: Highlighted with a blue background (`bg-blue-50`)
- **Keyboard Focus**: Clear visual indication of which element is currently focused

## Implementation Details

### Hooks Used

The keyboard navigation is implemented using custom React hooks:

1. **`useKeyboardNavigation`**: Base hook for general keyboard event handling
2. **`useCalendarKeyboardNavigation`**: Specialized hook for calendar navigation
3. **`useAppointmentListKeyboardNavigation`**: Specialized hook for appointment list navigation

### Components with Keyboard Support

- **Calendar Components**:
  - `CalendarDay.tsx`
  - `CalendarWeek.tsx` 
  - `CalendarMonth.tsx`

- **Appointment Components**:
  - `AppointmentList.tsx`

### Accessibility Features

- **Focus Management**: Proper focus handling and visual indicators
- **Screen Reader Support**: Compatible with assistive technologies
- **Keyboard-Only Navigation**: Full functionality available without mouse
- **Escape Handling**: Consistent escape key behavior across components

## Usage Tips

1. **Calendar Navigation**: Use arrow keys or `j`/`k` for quick date navigation
2. **Quick Today**: Press `t` from any calendar view to jump to today
3. **Appointment Selection**: Use arrow keys to browse appointments, Enter to view details
4. **Quick Edit**: Select an appointment and press `e` for quick editing
5. **Clear Selection**: Press Escape to clear any active selections

## Browser Compatibility

The keyboard navigation features are compatible with:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Common Issues

1. **Shortcuts Not Working**: Ensure the calendar or appointment list component has focus
2. **Conflicting Shortcuts**: Some browser shortcuts may override application shortcuts
3. **Focus Lost**: Click on the component area to restore keyboard focus

### Reporting Issues

If you encounter issues with keyboard navigation:
1. Check browser console for errors
2. Verify component is properly focused
3. Test with different browsers
4. Report issues with specific steps to reproduce

## Future Enhancements

Planned improvements for keyboard navigation:
- Global shortcut registration
- Customizable key bindings
- More granular appointment actions
- Search integration with keyboard shortcuts
- Multi-selection support

---

*Last updated: December 2024*