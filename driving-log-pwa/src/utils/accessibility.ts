export interface AccessibilityProps {
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-labelledby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-disabled'?: boolean;
  'aria-hidden'?: boolean;
  role?: string;
  tabIndex?: number;
}

export function createAccessibilityProps(props: Partial<AccessibilityProps>): AccessibilityProps {
  return {
    tabIndex: 0,
    ...props
  };
}

export function createButtonProps(label: string, disabled?: boolean): AccessibilityProps {
  return {
    'aria-label': label,
    'aria-disabled': disabled,
    tabIndex: disabled ? -1 : 0,
    role: 'button'
  };
}

export function createListProps(label?: string): AccessibilityProps {
  return {
    role: 'list',
    'aria-label': label
  };
}

export function createListItemProps(label?: string): AccessibilityProps {
  return {
    role: 'listitem',
    'aria-label': label
  };
}

export function createDialogProps(labelledBy: string, describedBy?: string): AccessibilityProps {
  return {
    role: 'dialog',
    'aria-labelledby': labelledBy,
    'aria-describedby': describedBy,
    'aria-modal': true
  } as AccessibilityProps & { 'aria-modal': boolean };
}

export function announceToScreenReader(message: string): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  
  document.body.appendChild(announcement);
  announcement.textContent = message;
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll(
    'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
  );
  
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  };

  element.addEventListener('keydown', handleTabKey);
  firstElement?.focus();

  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
}