import * as React from 'react';

export interface HyphenatedPropNameProps {
  /** Button color. */
  'button-color': 'blue' | 'green';
}

/**
 * A component with a hyphenated prop name.
 */
export const HyphenatedPropNameComponent: React.SFC<HyphenatedPropNameProps> = (props) => (
  <button style={{ backgroundColor: props['button-color'] }}>{props.children}</button>
);
