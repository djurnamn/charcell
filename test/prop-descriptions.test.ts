// Every prop carries a JSDoc comment: the docs site reads its descriptions
// from them, so a prop without one shows up undescribed.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, test } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const parse = (path: string) =>
  ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

const documented = (node: ts.Node) =>
  ts
    .getJSDocCommentsAndTags(node)
    .some(
      (comment) =>
        ts.isJSDoc(comment) &&
        ts.getTextOfJSDocComment(comment.comment)?.trim(),
    );

const nameOf = (name: ts.PropertyName) =>
  name.getText().replace(/^['"]|['"]$/g, "");

/** The props of each `defineTemplate` call in a file, as `Component.prop`, that have no JSDoc. */
function undocumentedTemplateProps(file: string): string[] {
  const missing: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText() === "defineTemplate"
    ) {
      const [definition] = node.arguments;
      if (definition && ts.isObjectLiteralExpression(definition)) {
        const property = (key: string) =>
          definition.properties.find(
            (candidate): candidate is ts.PropertyAssignment =>
              ts.isPropertyAssignment(candidate) &&
              nameOf(candidate.name) === key,
          );
        const name = property("name")?.initializer;
        const component = name && ts.isStringLiteral(name) ? name.text : file;
        const props = property("props")?.initializer;
        if (props && ts.isObjectLiteralExpression(props)) {
          for (const prop of props.properties) {
            const key = prop.name ? nameOf(prop.name) : prop.getText();
            if (!documented(prop)) missing.push(`${component}.${key}`);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(parse(file));
  return missing;
}

/** The members of a props interface, as `Interface.member`, that have no JSDoc. */
function undocumentedMembers(file: string, name: string): string[] {
  const missing: string[] = [];
  let found = false;
  parse(file).forEachChild((node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === name) {
      found = true;
      for (const member of node.members) {
        if (!documented(member))
          missing.push(`${name}.${member.name?.getText() ?? member.getText()}`);
      }
    }
  });
  if (!found) missing.push(`${name} (interface not found)`);
  return missing;
}

describe("prop docs", () => {
  test("every template prop has a jsdoc comment", () => {
    const directory = resolve(root, "src/components");
    const files = readdirSync(directory).filter((file) => file.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(0);
    expect(
      files.flatMap((file) =>
        undocumentedTemplateProps(resolve(directory, file)),
      ),
    ).toEqual([]);
  });

  test("every member of the react SortableGroup's props has a jsdoc comment", () => {
    const file = resolve(root, "src/drivers/react/SortableListDriver.tsx");
    expect(undocumentedMembers(file, "SortableGroupProps")).toEqual([]);
  });
});
