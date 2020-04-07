const parser = require("./react-docgen-typescript/parser");
// import * as parser from "./react-docgen-typescript/parser";
const { SyntaxKind, TypeFormatFlags, SymbolFlags } = require("typescript");
import fs from "fs";
import { Props, Method } from "./react-docgen-typescript/parser";

const addTags = (propInfo: any) => {
  const [comment, ...tags] = ` \n${propInfo.description}`.split("\n@");

  const mainComment = comment.replace(/^ \n/, "");

  const resultTags = tags
    .map(tag => tag.split(" "))
    .reduce((prev, [key, key2, ...value]) => {
      if (/^\..+/.test(key2) && !!value.length) {
        // vision.key xxxxxx
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
  const [exp, source] = args;

  const valueDeclaration = exp.valueDeclaration || exp.declarations[0];

  if (
    exp.flags === SymbolFlags.Alias &&
    valueDeclaration.kind === SyntaxKind.ExportSpecifier
  ) {
    return null;
  }

  if (!valueDeclaration) {
    return null;
  }

  const { pos: start, end } = valueDeclaration;

  // @ts-ignore
  const mtime = Date.parse(fs.statSync(source.originalFileName).mtime);
  const [desc, ...restArr] = ` \n${result.description || ""}`.split("\n@");

  const description = desc.replace(/^ \n/, "");

  // rest description to be tags
  const tags = restArr.reduce((previousValue, currentValue) => {
    const newTag = [currentValue.trim().split(" ")].reduce(
      (prev, [key, key2, ...value]) => {
        if (/^\..+/.test(key2) && !!value.length) {
          // vision.key xxxxxx
          key = `${key}${key2}`;
        } else {
          value = [key2, ...value];
        }
        return Object.assign(prev, { [key]: value.join("") });
      },
      {},
    );

    return Object.assign(previousValue, newTag);
  }, {});

  // Object.values(result).forEach(addTags);

  return Object.assign(result, {
    description,
    tags,
    mtime,
    block: [start, end],
  });
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
  block: [number, number];
  tags: Record<string, string>;
}

module.exports = parser;
// export const withDefaultConfig = parser.withDefaultConfig;
// export const withCustomConfig = parser.withCustomConfig;
// export const withCompilerOptions = parser.withCompilerOptions;

// export default parser;
