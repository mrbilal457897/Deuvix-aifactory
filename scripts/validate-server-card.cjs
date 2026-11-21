/**
 * Dependency-free validation of the Server Card against the downloaded
 * official schema.json. Supports the JSON Schema keywords the card uses.
 */
const fs = require("fs");

const schemaPath = process.argv[2] || "docs/server-card.schema.json";
const cardPath = process.argv[3] || "docs/server-card.json";

const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

function resolve(ref, root) {
  if (!ref.startsWith("#/")) throw new Error(`Unsupported $ref: ${ref}`);
  return ref
    .slice(2)
    .split("/")
    .reduce((node, part) => node[part], root);
}

function typeOf(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

function matchesType(value, expected) {
  if (Array.isArray(expected)) return expected.some((t) => matchesType(value, t));
  if (expected === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (expected === "array") return Array.isArray(value);
  if (expected === "integer") return Number.isInteger(value);
  if (expected === "number") return typeof value === "number";
  return typeOf(value) === expected;
}

const errors = [];

function validate(value, node, path, root) {
  if (!node || typeof node !== "object") return;
  if (node.$ref) {
    validate(value, resolve(node.$ref, root), path, root);
    return;
  }
  if (node.anyOf) {
    const before = errors.length;
    let ok = false;
    for (const branch of node.anyOf) {
      const beforeBranch = errors.length;
      validate(value, branch, path, root);
      if (errors.length === beforeBranch) {
        ok = true;
        break;
      }
      errors.length = beforeBranch;
    }
    if (!ok) errors.push(`${path}: does not match any allowed type`);
    return;
  }
  if (node.type && !matchesType(value, node.type)) {
    errors.push(`${path}: expected ${JSON.stringify(node.type)}, got ${typeOf(value)}`);
    return;
  }
  if (node.enum && !node.enum.includes(value)) {
    errors.push(`${path}: ${JSON.stringify(value)} not in enum ${JSON.stringify(node.enum)}`);
  }
  if (node.pattern && typeof value === "string" && !new RegExp(node.pattern).test(value)) {
    errors.push(`${path}: does not match pattern ${node.pattern}`);
  }
  if (node.minLength !== undefined && typeof value === "string" && value.length < node.minLength) {
    errors.push(`${path}: shorter than minLength ${node.minLength}`);
  }
  if (node.maxLength !== undefined && typeof value === "string" && value.length > node.maxLength) {
    errors.push(`${path}: longer than maxLength ${node.maxLength} (${value.length})`);
  }
  if (node.type === "object" || (value && typeof value === "object" && !Array.isArray(value))) {
    for (const key of node.required || []) {
      if (!(key in value)) errors.push(`${path}: missing required property "${key}"`);
    }
    for (const [key, child] of Object.entries(node.properties || {})) {
      if (key in value) validate(value[key], child, `${path}.${key}`, root);
    }
    if (node.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in (node.properties || {}))) errors.push(`${path}: unexpected property "${key}"`);
      }
    } else if (node.additionalProperties && typeof node.additionalProperties === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (!(key in (node.properties || {}))) validate(child, node.additionalProperties, `${path}.${key}`, root);
      }
    }
  }
  if (Array.isArray(value) && node.items) {
    value.forEach((item, index) => validate(item, node.items, `${path}[${index}]`, root));
  }
}

const card = JSON.parse(fs.readFileSync(cardPath, "utf8"));
validate(card, schema, "$", schema);

if (errors.length) {
  console.log("INVALID:");
  for (const e of errors) console.log("  - " + e);
  process.exit(1);
}
console.log("VALID: server card conforms to the downloaded schema.json");
