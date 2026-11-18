
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

const source = fs.readFileSync(
    path.join(__dirname, "script.js"),
    "utf8"
);

const match = source.match(
    /async function calculateSHA256\(file\)\s*\{[\s\S]*?\n\}/
);

if (!match) {
    throw new Error("Fonction calculateSHA256 introuvable");
}

const calculateSHA256 = vm.runInNewContext(
    `(${match[0]})`,
    { crypto: webcrypto }
);

function createFile(content) {
    const buffer = new TextEncoder().encode(content);

    return {
        arrayBuffer: async () => buffer.buffer
    };
}

test("1. Calculer correctement le hash SHA-256", async () => {
    const file = createFile("DiplomaChain test");

    const hash = await calculateSHA256(file);

    assert.equal(
        hash,
        "0x9045978499c949d437aa0cdb47d58d7614c152292e899bd8c556412dc34ffbb7"
    );
});

test("2. Deux calculs du même fichier donnent le même hash", async () => {
    const file = createFile("DiplomaChain test");

    const hash1 = await calculateSHA256(file);
    const hash2 = await calculateSHA256(file);

    assert.equal(hash1, hash2);
});
