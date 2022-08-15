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
   * @category2 dd
   * @category.dd dd
   * @category.id 22
   * @default 'blue'
   * */
  color2: 'blue' | 'green';

  onChange?: () => void;
};
