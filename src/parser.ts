import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { isInterfaceDeclaration, isTypeAliasDeclaration, TypeFormatFlags } from 'typescript';

import { buildFilter } from './buildFilter';

export interface StringIndexedObject<T> {
  [key: string]: T;
}

export interface ComponentDoc {
  exportName: string;
  description: string;
  props: Props;
  methods: Method[];
  block?: [number, number];
  tags: Record<string, string>;
}

export interface Props extends StringIndexedObject<PropItem> {}

export interface PropItem {
  name: string;
  required: boolean;
  type: PropItemType;
  description: string;
  defaultValue: any;
  tags: Record<string, any>;
}

export interface Method {
  name: string;
  docblock: string;
  modifiers: string[];
  params: MethodParameter[];
  returns?: {
    description?: string | null;
    type?: string;
  } | null;
  description: string;
}

export interface MethodParameter {
  name: string;
  description?: string | null;
  type: MethodParameterType;
}

export interface MethodParameterType {
  name: string;
}

export interface Component {
  name: string;
}

export interface PropItemType {
  name: string;
  value?: any;
  raw?: string;
}

export type PropFilter = (props: PropItem, component: Component) => boolean;

export interface ParserOptions {
  propFilter?: StaticPropFilter | PropFilter;
  shouldExtractLiteralValuesFromEnum?: boolean;
}

export interface StaticPropFilter {
  skipPropsWithName?: string[] | string;
  skipPropsWithoutDoc?: boolean;
}

export const defaultParserOpts: ParserOptions = {};

export interface FileParser {
  parse(filePathOrPaths: string | string[]): ComponentDoc[];
  parseWithProgramProvider(filePathOrPaths: string | string[], programProvider?: () => ts.Program): ComponentDoc[];
}

const defaultOptions: ts.CompilerOptions = {
  jsx: ts.JsxEmit.React,
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.Latest,
};

/**
 * Parses a file with default TS options
 * @param filePath component file that should be parsed
 */
export function parse(filePathOrPaths: string | string[], parserOpts: ParserOptions = defaultParserOpts) {
  return withCompilerOptions(defaultOptions, parserOpts).parse(filePathOrPaths);
}

/**
 * Constructs a parser for a default configuration.
 */
export function withDefaultConfig(parserOpts: ParserOptions = defaultParserOpts): FileParser {
  return withCompilerOptions(defaultOptions, parserOpts);
}

/**
 * Constructs a parser for a specified tsconfig file.
 */
export function withCustomConfig(tsconfigPath: string, parserOpts: ParserOptions): FileParser {
  const basePath = path.dirname(tsconfigPath);
  const { config, error } = ts.readConfigFile(tsconfigPath, (filename) => fs.readFileSync(filename, 'utf8'));

  if (error !== undefined) {
    // tslint:disable-next-line: max-line-length
    const errorText = `Cannot load custom tsconfig.json from provided path: ${tsconfigPath}, with error code: ${error.code}, message: ${error.messageText}`;
    throw new Error(errorText);
  }

  const { options, errors } = ts.parseJsonConfigFileContent(config, ts.sys, basePath, {}, tsconfigPath);

  if (errors && errors.length) {
    throw errors[0];
  }

  return withCompilerOptions(options, parserOpts);
}

/**
 * Constructs a parser for a specified set of TS compiler options.
 */
export function withCompilerOptions(
  compilerOptions: ts.CompilerOptions,
  parserOpts: ParserOptions = defaultParserOpts,
): FileParser {
  return {
    parse(filePathOrPaths: string | string[]): ComponentDoc[] {
      return parseWithProgramProvider(filePathOrPaths, compilerOptions, parserOpts);
    },
    parseWithProgramProvider(filePathOrPaths, programProvider) {
      return parseWithProgramProvider(filePathOrPaths, compilerOptions, parserOpts, programProvider);
    },
  };
}

interface JSDoc {
  description: string;
  fullComment: string;
  tags: StringIndexedObject<string>;
}

const defaultJSDoc: JSDoc = {
  description: '',
  fullComment: '',
  tags: {},
};

export class Parser {
  private checker: ts.TypeChecker;
  private propFilter: PropFilter;
  private shouldExtractLiteralValuesFromEnum: boolean;

  constructor(program: ts.Program, opts: ParserOptions) {
    const { shouldExtractLiteralValuesFromEnum } = opts;
    this.checker = program.getTypeChecker();
    this.propFilter = buildFilter(opts);
    this.shouldExtractLiteralValuesFromEnum = Boolean(shouldExtractLiteralValuesFromEnum);
  }

  public getComponentInfo(exp: ts.Symbol): ComponentDoc | null {
    if (!!exp.declarations && exp.declarations.length === 0) {
      return null;
    }
    const declaration = exp.declarations?.[0];
    if (!declaration) {
      return null;
    }
    const isTypes = isInterfaceDeclaration(declaration) || isTypeAliasDeclaration(declaration);
    if (!isTypes) {
      return null;
    }

    let commentSource = exp;

    const exportName = exp.getName();
    const { description, tags } = this.getFullJsDocComment(commentSource);

    // const defaultProps = this.extractDefaultPropsFromComponent(exp, source);
    const props = this.getPropsInfo(exp);

    for (const propName of Object.keys(props)) {
      const prop = props[propName];
      const component: Component = { name: exportName };
      if (!this.propFilter(prop, component)) {
        delete props[propName];
      }
    }

    return {
      tags,
      description,
      exportName,
      methods: [],
      props,
    };
  }

  public getExtractType(propType: ts.Type): PropItemType {
    // 解析浅层Interface
    // @ts-ignore
    const propTypeString = this.checker.typeToString(propType, undefined, TypeFormatFlags.InTypeAlias);

    if (
      // @ts-ignore
      this.shouldExtractLiteralValuesFromEnum &&
      propType.isUnion() &&
      propType.types.every((type) => type.isStringLiteral())
    ) {
      return {
        name: 'enum',
        raw: propTypeString,
        value: propType.types
          .map((type) => {
            return {
              // tslint:disable-next-line:prefer-template
              value: type.isStringLiteral() ? '"' + type.value + '"' : undefined,
            };
          })
          .filter(Boolean),
      };
    }
    return { name: propTypeString };
  }

  public getPropsInfo(propsObj: ts.Symbol, defaultProps: StringIndexedObject<string> = {}): Props {
    const propsType = this.checker.getDeclaredTypeOfSymbol(propsObj);
    let propertiesOfProps = propsType.getProperties();

    if (!propertiesOfProps.length && propsType.isUnionOrIntersection()) {
      propertiesOfProps = propsType.types.reduce<ts.Symbol[]>((acc, type) => [...acc, ...type.getProperties()], []);
    }

    const result: Props = {};

    propertiesOfProps.forEach((prop) => {
      const propName = prop.getName();

      // Find type of prop by looking in context of the props object itself.
      const propType = this.checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration!);

      // tslint:disable-next-line:no-bitwise
      const isOptional = (prop.getFlags() & ts.SymbolFlags.Optional) !== 0;

      const { description, tags } = this.getFullJsDocComment(prop);

      const hasCodeBasedDefault = defaultProps[propName] !== undefined;

      let defaultValue: any = null;

      if (hasCodeBasedDefault) {
        defaultValue = { value: defaultProps[propName] };
      } else if (tags.default) {
        defaultValue = { value: tags.default };
      }

      result[propName] = {
        defaultValue,
        name: propName,
        description,
        tags,
        required: !isOptional && !hasCodeBasedDefault,
        type: this.getExtractType(propType),
      };
    });

    return result;
  }

  getTags(description: string) {
    const [comment, ...tags] = ` \n${description}`.split('\n@');

    const mainComment = comment.replace(/^ \n/, '');

    const resultTags: Record<string, any> = tags
      .map((tag) => tag.split(' '))
      .reduce((prev, [key, key2, ...value]) => {
        if (/^\..+/.test(key2) && !!value.length) {
          // vision.key xxxxxx
          key = `${key}${key2}`;
        } else {
          value = [key2, ...value];
        }
        return Object.assign(prev, { [key]: value.join('') });
      }, {});

    return {
      description: mainComment,
      tags: resultTags,
    };
  }

  /**
   * Extracts a full JsDoc comment from a symbol, even
   * though TypeScript has broken down the JsDoc comment into plain
   * text and JsDoc tags.
   */
  public getFullJsDocComment(symbol: ts.Symbol): JSDoc {
    // in some cases this can be undefined (Pick<Type, 'prop1'|'prop2'>)
    if (symbol.getDocumentationComment === undefined) {
      return defaultJSDoc;
    }

    let mainComment = ts.displayPartsToString(symbol.getDocumentationComment(this.checker));

    if (mainComment) {
      mainComment = mainComment.replace('\r\n', '\n');
    }

    const tags = symbol.getJsDocTags() || [];

    const tagComments: string[] = [];
    const tagMap: StringIndexedObject<string> = {};

    tags.forEach((tag) => {
      const formatedTag = formatTag(tag);
      const [, key, content] = formatedTag.match(/^@([^ ]+) (.+)/) || [];
      tagMap[key] = content;

      tagComments.push(formatTag(tag));
    });

    return {
      description: mainComment,
      fullComment: (mainComment + '\n' + tagComments.join('\n')).trim(),
      tags: tagMap,
    };
  }
}

function formatTag(tag: ts.JSDocTagInfo) {
  let result = '@' + tag.name;
  if (tag.text) {
    const trimmedText = Array.isArray(tag.text) ? tag.text.map(({ text }) => text).join('') : tag.text;

    if (/^\..+/.test(trimmedText)) {
      // @key.key xxxx
      const [, tagChild = '', desc = ''] = trimmedText.match(/^(\.[^ ]+)(.+)/) || [];
      result += tagChild + ' ' + desc.trim();
    } else {
      result += ' ' + trimmedText;
    }
  }
  return result;
}

// Default export for a file: named after file
export function getDefaultExportForFile(source: ts.SourceFile) {
  const name = path.basename(source.fileName, path.extname(source.fileName));
  const filename = name === 'index' ? path.basename(path.dirname(source.fileName)) : name;

  // JS identifiers must starts with a letter, and contain letters and/or numbers
  // So, you could not take filename as is
  const identifier = filename.replace(/^[^A-Z]*/gi, '').replace(/[^A-Z0-9]*/gi, '');

  return identifier.length ? identifier : 'DefaultName';
}

function parseWithProgramProvider(
  filePathOrPaths: string | string[],
  compilerOptions: ts.CompilerOptions,
  parserOpts: ParserOptions,
  programProvider?: () => ts.Program,
): ComponentDoc[] {
  const filePaths = Array.isArray(filePathOrPaths) ? filePathOrPaths : [filePathOrPaths];

  const program = programProvider ? programProvider() : ts.createProgram(filePaths, compilerOptions);

  const parser = new Parser(program, parserOpts);

  const checker = program.getTypeChecker();

  return filePaths
    .map((filePath) => program.getSourceFile(filePath))
    .filter((sourceFile): sourceFile is ts.SourceFile => typeof sourceFile !== 'undefined')
    .reduce<ComponentDoc[]>((docs, sourceFile) => {
      const moduleSymbol = checker.getSymbolAtLocation(sourceFile);

      if (!moduleSymbol) {
        return docs;
      }

      Array.prototype.push.apply(
        docs,
        checker
          .getExportsOfModule(moduleSymbol)
          .map((exp) => parser.getComponentInfo(exp))
          .filter((comp): comp is ComponentDoc => comp !== null)
          .filter((comp, index, comps) =>
            comps.slice(index + 1).every((innerComp) => innerComp!.exportName !== comp!.exportName),
          ),
      );

      return docs;
    }, []);
}
