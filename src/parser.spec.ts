import * as fs from 'fs';
// import path from "path"
import { parse } from './parser';
import * as path from 'path';
import { expect, it } from 'vitest';

const fixtureTests = loadFixtureTests();

it('adds component to docgen collection', () => {
  fixtureTests.forEach((fixture) => {
    expect(parse(fixture.filepath, {})).toMatchSnapshot();
  });
});

function getGeneratorOptions() {
  return (filename: string) => {
    const filepath = path.resolve(__dirname, '__fixtures__/components', filename);
    return { filename, filepath };
  };
}

function loadFixtureTests() {
  return fs.readdirSync(path.resolve(__dirname, '__fixtures__/components')).map(getGeneratorOptions());
}
