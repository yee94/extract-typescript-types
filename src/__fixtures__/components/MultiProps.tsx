import * as React from "react";

export interface MultiPropsComponentProps {
  /** Button color. */
  color: "blue" | "green";

  /** Button size. */
  size: "small" | "large";

  required?: boolean;
}

/**
 * This is a component with multiple props.
 */
export const MultiPropsComponent: React.SFC<
  MultiPropsComponentProps
> = props => (
  <button style={{ backgroundColor: props.color }}>{props.children}</button>
);
