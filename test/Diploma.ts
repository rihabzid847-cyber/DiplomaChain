
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

describe("Diploma - Tests unitaires", async function () {

  const { viem } = await network.create();
  const [owner, otherAccount] = await viem.getWalletClients();

  const hash = `0x${"1".repeat(64)}` as `0x${string}`;
  const hash2 = `0x${"2".repeat(64)}` as `0x${string}`;

  async function deployDiploma() {
    return await viem.deployContract("Diploma");
  }

  async function emitDiploma(contract: any, pdfHash = hash) {
    await contract.write.emettreDiplome(
      [
        pdfHash,
        "Ben Ali",
        "Ahmed",
        "Informatique",
        2025n,
        "QmTest123"
      ],
      { account: owner.account }
    );
  }

  it("1. Le propriétaire doit être l'administrateur", async function () {
    const diploma = await deployDiploma();

    const contractOwner = await diploma.read.owner();

    assert.equal(
      contractOwner.toLowerCase(),
      owner.account.address.toLowerCase()
    );
  });

  it("2. L'administrateur peut émettre un diplôme", async function () {
    const diploma = await deployDiploma();

    await emitDiploma(diploma);

    const result = await diploma.read.verifierDiplome([hash]);

    assert.equal(result[0], "Ben Ali");
    assert.equal(result[1], "Ahmed");
    assert.equal(result[2], "Informatique");
    assert.equal(result[3], 2025n);
    assert.equal(result[5], "QmTest123");
    assert.equal(result[6], true);
    assert.equal(result[7], true);
  });

  it("3. Un utilisateur non administrateur ne peut pas émettre", async function () {
    const diploma = await deployDiploma();

    await assert.rejects(
      async () => {
        await diploma.write.emettreDiplome(
          [
            hash,
            "Ben Ali",
            "Ahmed",
            "Informatique",
            2025n,
            "QmTest123"
          ],
          { account: otherAccount.account }
        );
      },
      /Acces refuse/
    );
  });

  it("4. Un hash nul doit être refusé", async function () {
    const diploma = await deployDiploma();

    const zeroHash = `0x${"0".repeat(64)}` as `0x${string}`;

    await assert.rejects(
      async () => {
        await emitDiploma(diploma, zeroHash);
      },
      /Hash invalide/
    );
  });

  it("5. Un diplôme déjà enregistré ne peut pas être émis deux fois", async function () {
    const diploma = await deployDiploma();

    await emitDiploma(diploma);

    await assert.rejects(
      async () => {
        await emitDiploma(diploma);
      },
      /Diplome deja enregistre/
    );
  });

  it("6. La vérification d'un diplôme inexistant retourne existe = false", async function () {
    const diploma = await deployDiploma();

    const result = await diploma.read.verifierDiplome([hash2]);

    assert.equal(result[6], false);
    assert.equal(result[7], false);
  });

  it("7. L'administrateur peut révoquer un diplôme", async function () {
    const diploma = await deployDiploma();

    await emitDiploma(diploma);

    await diploma.write.revoquerDiplome(
      [hash],
      { account: owner.account }
    );

    const result = await diploma.read.verifierDiplome([hash]);

    assert.equal(result[6], true);
    assert.equal(result[7], false);
  });

  it("8. Un utilisateur non administrateur ne peut pas révoquer", async function () {
    const diploma = await deployDiploma();

    await emitDiploma(diploma);

    await assert.rejects(
      async () => {
        await diploma.write.revoquerDiplome(
          [hash],
          { account: otherAccount.account }
        );
      },
      /Acces refuse/
    );
  });

  it("9. Un diplôme inexistant ne peut pas être révoqué", async function () {
    const diploma = await deployDiploma();

    await assert.rejects(
      async () => {
        await diploma.write.revoquerDiplome(
          [hash2],
          { account: owner.account }
        );
      },
      /Diplome inexistant/
    );
  });

  it("10. Un diplôme déjà révoqué ne peut pas être révoqué une deuxième fois", async function () {
    const diploma = await deployDiploma();

    await emitDiploma(diploma);

    await diploma.write.revoquerDiplome(
      [hash],
      { account: owner.account }
    );

    await assert.rejects(
      async () => {
        await diploma.write.revoquerDiplome(
          [hash],
          { account: owner.account }
        );
      },
      /Diplome deja revoque/
    );
  });

  it("11. Refuser un nom vide", async () => {
    const contract = await deployDiploma();

    await assert.rejects(
      contract.write.emettreDiplome(
        [hash, "", "Ahmed", "Informatique", 2025n, "QmTest123"],
        { account: owner.account }
      ),
      /Nom obligatoire/
    );
  });

  it("12. Refuser un prénom vide", async () => {
    const contract = await deployDiploma();

    await assert.rejects(
      contract.write.emettreDiplome(
        [hash, "Ben Ali", "", "Informatique", 2025n, "QmTest123"],
        { account: owner.account }
      ),
      /Prenom obligatoire/
    );
  });

  it("13. Refuser une filière vide", async () => {
    const contract = await deployDiploma();

    await assert.rejects(
      contract.write.emettreDiplome(
        [hash, "Ben Ali", "Ahmed", "", 2025n, "QmTest123"],
        { account: owner.account }
      ),
      /Filiere obligatoire/
    );
  });

  it("14. Refuser une année égale à zéro", async () => {
    const contract = await deployDiploma();

    await assert.rejects(
      contract.write.emettreDiplome(
        [hash, "Ben Ali", "Ahmed", "Informatique", 0n, "QmTest123"],
        { account: owner.account }
      ),
      /Annee invalide/
    );
  });

  it("15. Refuser un CID vide", async () => {
    const contract = await deployDiploma();

    await assert.rejects(
      contract.write.emettreDiplome(
        [hash, "Ben Ali", "Ahmed", "Informatique", 2025n, ""],
        { account: owner.account }
      ),
      /CID obligatoire/
    );
  });


});
