import * as React from "react";

export interface DefaultPropValueComponentProps {
  /**
   * Button color.
   *
   * @default blue
   **/
  color: "blue" | "green";

  /**
   * Button counter.
   */
  counter: number;

  /**
   * Button disabled.
   */
  disabled: boolean;
}

/**
 * Component with a prop with a default value.
 */
export const DefaultPropValueComponent: React.SFC<
  DefaultPropValueComponentProps
> = props => (
  <button disabled={props.disabled} style={{ backgroundColor: props.color }}>
    {props.counter}
    {props.children}
  </button>
);

DefaultPropValueComponent.defaultProps = {
  counter: 123,
  disabled: false,
};
