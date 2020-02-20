const parser = require("react-docgen-typescript/lib/parser.js");
// import * as parser from "react-docgen-typescript/lib/parser.js";
const { TypeFormatFlags } = require("typescript");
import fs from "fs";
import { Props, Method } from "react-docgen-typescript/lib/parser";

const addTags = (propInfo: any) => {
  const [mainComment, ...tags] = propInfo.description.split("\n@");

  const resultTags = tags
    .map(tag => tag.split(" "))
    .reduce((prev, [key, key2, ...value]) => {
      if (/^\..+/.test(key2) && !!value.length) {
        key = `${key}${key2}`;
      } else {
        value = [key2, ...value];
      }
      return Object.assign(prev, { [key]: value.join("") });
    }, {});

  return Object.assign(propInfo, {
    description: mainComment,
    tags: resultTags,
  });
};

const originGetPropsInfo = parser.Parser.prototype.getPropsInfo;
parser.Parser.prototype.getPropsInfo = function(propsObj, defaultProps) {
  const result = originGetPropsInfo.call(this, propsObj, defaultProps);

  Object.values(result).forEach(addTags);

  return result;
};

const originGetComponentInfo = parser.Parser.prototype.getComponentInfo;
parser.Parser.prototype.getComponentInfo = function(...args) {
  const result = originGetComponentInfo.apply(this, args);
  if (!result) {
    return result;
  }
  const [, source] = args;
  // @ts-ignore
  const mtime = Date.parse(fs.statSync(source.originalFileName).mtime);
  const [description, ...restArr] = `${result.description || ""}`.split("\n@");

  const restProps = restArr.reduce((previousValue, currentValue) => {
    const matches = /^(\w+) (.+)/.exec(currentValue.trim());
    const [, key, value] = matches || [];

    if (key && value) {
      return Object.assign(previousValue, { [key]: value });
    }

    return previousValue;
  }, {});

  // Object.values(result).forEach(addTags);

  return Object.assign(result, { description, tags: restProps, mtime });
};

parser.Parser.prototype.getDocgenType = function(propType) {
  // 解析浅层Interface
  const propTypeString = this.checker.typeToString(
    propType,
    undefined,
    TypeFormatFlags.InTypeAlias,
  );

  if (
    this.shouldExtractLiteralValuesFromEnum &&
    propType.isUnion() &&
    propType.types.every(type => type.isStringLiteral())
  ) {
    return {
      name: "enum",
      raw: propTypeString,
      value: propType.types
        .map(type => {
          return {
            // tslint:disable-next-line:prefer-template
            value: type.isStringLiteral() ? '"' + type.value + '"' : undefined,
          };
        })
        .filter(Boolean),
    };
  }
  return { name: propTypeString };
};

export interface ComponentDoc {
  displayName: string;
  description: string;
  props: Props;
  methods: Method[];
  mtime: string;
  tags: Record<string, string>;
}

module.exports = parser;
// export const withDefaultConfig = parser.withDefaultConfig;
// export const withCustomConfig = parser.withCustomConfig;
// export const withCompilerOptions = parser.withCompilerOptions;

// export default parser;
