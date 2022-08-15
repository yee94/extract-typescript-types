import * as fs from 'fs';
// import path from "path"
import { parse } from './parser';
import * as path from 'path';
import { expect, it } from 'vitest';

const fixtureTests = loadFixtureTests();
const simpleFixture = fixtureTests.find((f) => f.filename === 'Simple.tsx')!;

it('simple fixture test', () => {
  expect(parse(simpleFixture.filepath, {})).toMatchSnapshot();
});

it('adds component to extract collection', () => {
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
