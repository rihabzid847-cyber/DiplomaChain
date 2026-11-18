
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

function createApp(diploma = {}) {
    const elements = {};

    function getElement(id) {
        if (!elements[id]) {
            elements[id] = {
                value: "",
                files: [],
                textContent: "",
                hidden: false,
                listeners: {},
                addEventListener(event, callback) {
                    this.listeners[event] = callback;
                },
                querySelector() {
                    return { textContent: "" };
                },
                classList: {
                    add() {},
                    remove() {}
                }
            };
        }

        return elements[id];
    }

    const adminAddress = "0x5f4f46289714f8b914097e65ec0a51040f80b02d";

    const contractMock = {
        owner: async () => adminAddress,

        verifierDiplome: async () => ({
            nomEtudiant: "Ben Ali",
            prenomEtudiant: "Ahmed",
            filiere: "Informatique",
            annee: 2026n,
            date: 1700000000n,
            cid: "QmTest123",
            existe: diploma.existe ?? true,
            valide: diploma.valide ?? true
        }),

        revoquerDiplome: async () => ({
            wait: async () => ({
                hash: "0xtransaction123"
            })
        })
    };

    class BrowserProvider {
        async getSigner() {
            return {
                getAddress: async () => adminAddress
            };
        }

        async getNetwork() {
            return { chainId: 11155111n };
        }

        async getCode() {
            return "0x1234";
        }
    }

    class JsonRpcProvider {
        async getNetwork() {
            return { chainId: 11155111n };
        }

        async getCode() {
            return "0x1234";
        }
    }

    function Contract() {
        return contractMock;
    }

    const context = {
        document: {
            getElementById: getElement
        },

        window: {
            ethereum: {
                request: async () => [adminAddress],
                on() {}
            }
        },

        ethers: {
            BrowserProvider,
            JsonRpcProvider,
            Contract
        },

        crypto: webcrypto,
        console,
        confirm: () => true,
        alert() {},
        fetch: async () => ({
            ok: true,
            json: async () => ({
                success: true,
                cid: "QmTest123"
            })
        }),
        FormData: class {
            append() {}
        }
    };

    vm.runInNewContext(source, context);

    return elements;
}

function createPDF() {
    const buffer = new TextEncoder().encode("PDF DiplomaChain");

    return {
        name: "diplome.pdf",
        type: "application/pdf",
        arrayBuffer: async () =>
            buffer.buffer.slice(
                buffer.byteOffset,
                buffer.byteOffset + buffer.byteLength
            )
    };
}

// TEST 1 : Validation du formulaire

test("3. Refuser un formulaire vide", async () => {
    const elements = createApp();

    await elements.emitDiploma.listeners.click();

    assert.match(
        elements.emitResult.textContent,
        /Veuillez remplir tous les champs/
    );
});

// TEST 2 : Vérification d'un diplôme

test("4. Vérifier un diplôme authentique", async () => {
    const elements = createApp({
        existe: true,
        valide: true
    });

    elements.verifyPdf.files = [createPDF()];

    await elements.verifyDiploma.listeners.click();

    assert.match(
        elements.verifyResult.textContent,
        /DIPLÔME AUTHENTIQUE ET VALIDE/
    );
});

// TEST 3 : Révocation d'un diplôme

test("5. Révoquer un diplôme", async () => {
    const elements = createApp({
        existe: true,
        valide: true
    });

    elements.revokePdf.files = [createPDF()];

    await elements.revokeDiploma.listeners.click();

    assert.match(
        elements.revokeResult.textContent,
        /Diplôme révoqué avec succès/
    );
});
