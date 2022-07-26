import * as React from "react";

export interface MultilineDescriptionProps {
  /** Button color. */
  color: "blue" | "green";
}

/**
 * A component with a multiline description.
 *
 * Second line.
 */
export const MultilineDescriptionComponent: React.SFC<
  MultilineDescriptionProps
> = props => (
  <button style={{ backgroundColor: props.color }}>{props.children}</button>
);
