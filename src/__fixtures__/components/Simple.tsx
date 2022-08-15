import * as React from 'react';

/**
 * Simple component.
 * @author Yee Wang
 */
export interface SimpleComponentProps {
  /**
   * Button color.
   * @category dd
   * */
  color: 'blue' | 'green';

  isDisabled?: boolean;
}

/**
 * Simple component.
 */
export type SimpleComponentProps2 = SimpleComponentProps & {
  /**
   * Button color.
   * @category dd
   * @default 'blue'
   * */
  color2: 'blue' | 'green';

  onChange?: () => void;
};

/**
 * A simple component.
 */
export const SimpleComponent: React.SFC<SimpleComponentProps> = (props) => (
  <button style={{ backgroundColor: props.color }}>{props.children}</button>
);
