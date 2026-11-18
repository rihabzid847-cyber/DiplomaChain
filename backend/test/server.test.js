
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const nock = require("nock").default;

process.env.PINATA_JWT = "fake-test-token";

const app = require("../server");

const PDF = Buffer.from("%PDF-1.4\nTest Diploma\n%%EOF");
const CID = "QmTest123456789";

before(() => {
    nock.disableNetConnect();
    nock.enableNetConnect("127.0.0.1");
});

after(() => {
    nock.enableNetConnect();
});

test("1. GET / : le serveur fonctionne", async () => {
    const response = await request(app).get("/");

    assert.equal(response.status, 200);
    assert.equal(response.text, "DiplomaChain Backend fonctionne !");
});

test("2. POST /upload : accepter un PDF et retourner son CID", async () => {
    nock("https://api.pinata.cloud")
        .post("/pinning/pinFileToIPFS")
        .reply(200, {
            IpfsHash: CID
        });

    const response = await request(app)
        .post("/upload")
        .attach("pdf", PDF, {
            filename: "diplome.pdf",
            contentType: "application/pdf"
        });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.cid, CID);
});

test("3. POST /upload : refuser une requête sans fichier", async () => {
    const response = await request(app)
        .post("/upload");

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
});

test("4. POST /upload : refuser un fichier non PDF", async () => {
    const response = await request(app)
        .post("/upload")
        .attach("pdf", Buffer.from("Hello World"), {
            filename: "document.txt",
            contentType: "text/plain"
        });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
});

test("5. POST /upload : refuser un fichier dépassant 10 Mo", async () => {
    const largePDF = Buffer.alloc(10 * 1024 * 1024 + 1, 65);

    const response = await request(app)
        .post("/upload")
        .attach("pdf", largePDF, {
            filename: "grand.pdf",
            contentType: "application/pdf"
        });

    assert.equal(response.status, 400);
});

test("6. POST /upload : gérer une erreur de Pinata", async () => {
    nock("https://api.pinata.cloud")
        .post("/pinning/pinFileToIPFS")
        .reply(500, {
            error: "Pinata unavailable"
        });

    const response = await request(app)
        .post("/upload")
        .attach("pdf", PDF, {
            filename: "diplome.pdf",
            contentType: "application/pdf"
        });

    assert.equal(response.status, 500);
    assert.equal(response.body.success, false);
});

test("7. POST /upload : refuser si le JWT Pinata est absent", async () => {
    const previousJWT = process.env.PINATA_JWT;

    delete process.env.PINATA_JWT;

    try {
        const response = await request(app)
            .post("/upload")
            .attach("pdf", PDF, {
                filename: "diplome.pdf",
                contentType: "application/pdf"
            });

        assert.equal(response.status, 500);
        assert.equal(response.body.success, false);
        assert.equal(
            response.body.message,
            "Configuration Pinata manquante."
        );
    } finally {
        process.env.PINATA_JWT = previousJWT;
    }
});
