import * as React from "react";

export interface MultilinePropDescriptionComponentProps {
  /**
   * This is a multiline prop description.
   *
   * Second line.
   */
  color: "blue" | "green";
}

/**
 * A component with multiline prop description.
 */
export const MultilinePropDescriptionComponent: React.SFC<
  MultilinePropDescriptionComponentProps
> = props => (
  <button style={{ backgroundColor: props.color }}>{props.children}</button>
);
