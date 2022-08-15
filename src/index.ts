import {
  ComponentDoc,
  FileParser,
  getDefaultExportForFile,
  parse,
  Parser,
  ParserOptions,
  PropItem,
  PropItemType,
  Props,
  withCompilerOptions,
  withCustomConfig,
  withDefaultConfig,
} from './parser';

export default parse;

export {
  parse,
  getDefaultExportForFile,
  withCompilerOptions,
  withDefaultConfig,
  withCustomConfig,
  ComponentDoc,
  FileParser,
  Parser,
  ParserOptions,
  Props,
  PropItem,
  PropItemType,
};
