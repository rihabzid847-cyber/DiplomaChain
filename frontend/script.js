/* =====================================
   1. CONFIGURATION DU SMART CONTRACT
===================================== */

const CONTRACT_ADDRESS = "0x82277e1D4a8eD05566EFfcCF2FB08e5969DAC628";

const SEPOLIA_CHAIN_ID = 11155111n;

const ABI = [
    "function owner() view returns (address)",

    "function emettreDiplome(bytes32 hashPdf, string nomEtudiant, string prenomEtudiant, string filiere, uint256 annee, string cid)",

    "function verifierDiplome(bytes32 hashPdf) view returns (string nomEtudiant, string prenomEtudiant, string filiere, uint256 annee, uint256 date, string cid, bool existe, bool valide)",

    "function revoquerDiplome(bytes32 hashPdf)"
];


/* =====================================
   2. VARIABLES
===================================== */

let provider = null;
let signer = null;
let contract = null;

let currentHash = "";
let hashedFile = null;


/* =====================================
   3. AFFICHER LES SECTIONS
===================================== */

function showSection(sectionId) {

    document.getElementById("admin").hidden = true;
    document.getElementById("verification").hidden = true;

    document.getElementById(sectionId).hidden = false;
}


/* =====================================
   4. VERIFIER LE FORMAT PDF
===================================== */

function isPDF(file) {

    return file &&
        (file.type === "application/pdf" ||
         file.name.toLowerCase().endsWith(".pdf"));
}


/* =====================================
   5. CALCULER LE HASH SHA-256
===================================== */

async function calculateSHA256(file) {

    const buffer = await file.arrayBuffer();

    const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        buffer
    );

    const hashArray = Array.from(new Uint8Array(hashBuffer));

    const hashHex = hashArray
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");

    return "0x" + hashHex;
}


/* =====================================
   ENVOYER LE PDF VERS PINATA
===================================== */

async function uploadPDFToPinata(file) {

    const formData = new FormData();

    formData.append("pdf", file);

    const response = await fetch(
        "http://localhost:3000/upload",
        {
            method: "POST",
            body: formData
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || "Erreur lors de l'upload IPFS.");
    }

    return data.cid;
}

/* =====================================
   6. CALCULER LE HASH DU PDF ADMIN
===================================== */

document.getElementById("calculateHash").addEventListener(
    "click",
    async function () {

        const file = document.getElementById("pdfFile").files[0];
        const result = document.getElementById("hashResult");

        try {

            if (!isPDF(file)) {
                throw new Error("Veuillez sélectionner un fichier PDF.");
            }

            result.textContent = "Calcul du hash en cours...";

            currentHash = await calculateSHA256(file);
            hashedFile = file;

            result.textContent = "Hash SHA-256 : " + currentHash;

        } catch (error) {

            currentHash = "";
            hashedFile = null;

            result.textContent = "Erreur : " + error.message;
        }
    }
);


/* =====================================
   7. CONNECTER METAMASK
===================================== */

async function connectWallet() {

    if (!window.ethereum) {
        throw new Error("MetaMask n'est pas installé.");
    }

    const accounts = await window.ethereum.request({
        method: "eth_requestAccounts"
    });

    if (accounts.length === 0) {
        throw new Error("Aucun compte MetaMask sélectionné.");
    }

    provider = new ethers.BrowserProvider(window.ethereum);

    signer = await provider.getSigner();

    const network = await provider.getNetwork();

    if (network.chainId !== SEPOLIA_CHAIN_ID) {

        contract = null;

        throw new Error("Veuillez sélectionner le réseau Ethereum Sepolia dans MetaMask.");
    }

    contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ABI,
        signer
    );

    const code = await provider.getCode(CONTRACT_ADDRESS);

    if (code === "0x") {

        contract = null;

        throw new Error("Aucun Smart Contract trouvé à cette adresse sur Sepolia.");
    }

    document.getElementById("walletAddress").textContent =
        accounts[0];

    console.log("Portefeuille connecté :", accounts[0]);
    console.log("Smart Contract connecté :", CONTRACT_ADDRESS);

    return accounts[0];
}


document.getElementById("connectWallet").addEventListener(
    "click",
    async function () {

        try {

            await connectWallet();

            alert("MetaMask connecté avec succès !");

        } catch (error) {

            console.error(error);

            alert(error.message);
        }
    }
);


/* =====================================
   8. DETECTER LES CHANGEMENTS METAMASK
===================================== */

if (window.ethereum) {

    window.ethereum.on("accountsChanged", function (accounts) {

        provider = null;
        signer = null;
        contract = null;

        document.getElementById("walletAddress").textContent =
            accounts.length > 0
                ? accounts[0]
                : "Portefeuille non connecté";
    });

    window.ethereum.on("chainChanged", function () {

        window.location.reload();
    });
}


/* =====================================
   9. OBTENIR LE CONTRAT ADMIN
===================================== */

async function getAdminContract() {

    if (!contract || !signer || !provider) {
        await connectWallet();
    }

    const account = await signer.getAddress();

    const owner = await contract.owner();

    if (account.toLowerCase() !== owner.toLowerCase()) {
        throw new Error("Accès refusé : ce portefeuille n'est pas l'administrateur.");
    }

    return contract;
}


/* =====================================
   10. EMETTRE UN DIPLOME
===================================== */

document.getElementById("emitDiploma").addEventListener(
    "click",
    async function () {

        const result = document.getElementById("emitResult");

        try {

            const nom = document.getElementById("nomEtudiant").value.trim();

            const prenom = document.getElementById("prenomEtudiant").value.trim();

            const filiere = document.getElementById("filiere").value.trim();

            const annee = document.getElementById("annee").value.trim();

            const file = document.getElementById("pdfFile").files[0];



            // Vérifier les champs

            if (!nom || !prenom || !filiere || !annee || !file) {
                throw new Error("Veuillez remplir tous les champs.");
            }

            if (!isPDF(file)) {
                throw new Error("Le fichier sélectionné doit être un PDF.");
            }

            if (!/^\d+$/.test(annee) || Number(annee) <= 0) {
                throw new Error("Année invalide.");
            }

            if (!currentHash || hashedFile !== file) {
                throw new Error("Veuillez calculer le hash du PDF avant l'enregistrement.");
            }


            // Vérifier l'administrateur

            result.textContent = "Vérification de l'administrateur...";

            const adminContract = await getAdminContract();

            // Envoyer automatiquement le PDF vers Pinata

            result.textContent = "Envoi du PDF vers IPFS...";

            const cid = await uploadPDFToPinata(file);

// Afficher le CID obtenu

            document.getElementById("cid").value = cid;

            result.textContent =
                "PDF envoyé sur IPFS avec succès !\n" +
                "CID : " + cid + "\n" +
                "Préparation de la transaction blockchain...";
            // Préparer les données

            const documentHash = currentHash;

            const anneeDiplome = BigInt(annee);


            // Envoyer la transaction

            result.textContent = "Veuillez confirmer la transaction dans MetaMask...";

            const tx = await adminContract.emettreDiplome(
                documentHash,
                nom,
                prenom,
                filiere,
                anneeDiplome,
                cid
            );

            result.textContent = "Transaction envoyée. Confirmation en cours...";

            console.log("Transaction :", tx.hash);


            // Attendre la confirmation

            const receipt = await tx.wait();

            result.textContent =
                "Diplôme enregistré avec succès !\n" +
                "Hash du diplôme : " + documentHash + "\n" +
                "Transaction : " + receipt.hash;

            console.log("Diplôme enregistré :", receipt);

        } catch (error) {

            console.error("Erreur émission :", error);

            if (error.code === "ACTION_REJECTED") {

                result.textContent = "Transaction refusée dans MetaMask.";

            } else {

                result.textContent =
                    "Erreur : " +
                    (error.reason || error.shortMessage || error.message);
            }
        }
    }
);



/* =====================================
   11. VERIFIER UN DIPLOME SANS METAMASK
===================================== */

document.getElementById("verifyDiploma").addEventListener(
    "click",
    async function () {

        const result = document.getElementById("verifyResult");

        result.textContent = "";

        try {

            const file = document.getElementById("verifyPdf").files[0];

            if (!isPDF(file)) {
                throw new Error("Veuillez sélectionner un fichier PDF.");
            }

            result.textContent = "Calcul du hash SHA-256...";

            // Calculer le hash du PDF
            const hash = await calculateSHA256(file);

            // Connexion en lecture seule à Sepolia
            const readProvider = new ethers.JsonRpcProvider(
                "https://ethereum-sepolia-rpc.publicnode.com"
            );

            // Vérifier le réseau
            const network = await readProvider.getNetwork();

            if (network.chainId !== SEPOLIA_CHAIN_ID) {
                throw new Error("Connexion au mauvais réseau.");
            }

            // Vérifier le Smart Contract
            const code = await readProvider.getCode(CONTRACT_ADDRESS);

            if (code === "0x") {
                throw new Error("Smart Contract introuvable.");
            }

            // Créer le contrat en lecture seule
            const verifyContract = new ethers.Contract(
                CONTRACT_ADDRESS,
                ABI,
                readProvider
            );

            result.textContent = "Recherche du diplôme sur la blockchain...";

            const diploma = await verifyContract.verifierDiplome(hash);

            // Vérifier l'existence
            if (!diploma.existe) {

                result.textContent =
                    "Diplôme non reconnu : aucun diplôme enregistré ne correspond à ce fichier.";

                return;
            }

            // Vérifier la validité
            if (!diploma.valide) {

                result.textContent =
                    "Diplôme révoqué. Ce diplôme existe sur la blockchain, mais il n'est plus valide.";

                return;
            }

            // Convertir la date
            const dateEmission = new Date(
                Number(diploma.date) * 1000
            ).toLocaleString("fr-FR");

            // Afficher les informations
            result.textContent =
                "DIPLÔME AUTHENTIQUE ET VALIDE\n\n" +
                "Nom : " + diploma.nomEtudiant + "\n" +
                "Prénom : " + diploma.prenomEtudiant + "\n" +
                "Filière : " + diploma.filiere + "\n" +
                "Année : " + diploma.annee.toString() + "\n" +
                "Date d'émission : " + dateEmission + "\n" +
                "Statut : Valide\n" +
                "CID IPFS : " + diploma.cid;

        } catch (error) {

            console.error("Erreur vérification :", error);

            result.textContent =
                "Erreur : " +
                (error.reason || error.shortMessage || error.message);
        }
    }
);


/* =====================================
   12. REVOQUER UN DIPLOME
===================================== */

document.getElementById("revokeDiploma").addEventListener(
    "click",
    async function () {

        const result = document.getElementById("revokeResult");

        try {

            const file = document.getElementById("revokePdf").files[0];

            if (!isPDF(file)) {
                throw new Error("Veuillez sélectionner le PDF du diplôme à révoquer.");
            }


            // Vérifier l'administrateur

            result.textContent = "Vérification de l'administrateur...";

            const adminContract = await getAdminContract();


            // Calculer le hash du diplôme

            result.textContent = "Calcul du hash du diplôme...";

            const hash = await calculateSHA256(file);


            // Vérifier que le diplôme existe

            const diploma = await adminContract.verifierDiplome(hash);

            if (!diploma.existe) {
                throw new Error("Diplôme inexistant sur la blockchain.");
            }

            if (!diploma.valide) {
                throw new Error("Ce diplôme est déjà révoqué.");
            }


            // Demander la confirmation

            const confirmation = confirm(
                "Voulez-vous vraiment révoquer ce diplôme ?"
            );

            if (!confirmation) {
                result.textContent = "Révocation annulée.";
                return;
            }


            // Envoyer la transaction

            result.textContent = "Veuillez confirmer la transaction dans MetaMask...";

            const tx = await adminContract.revoquerDiplome(hash);

            result.textContent = "Transaction envoyée. Confirmation en cours...";

            const receipt = await tx.wait();


            // Résultat

            result.textContent =
                "Diplôme révoqué avec succès !\n" +
                "Transaction : " + receipt.hash;

            console.log("Diplôme révoqué :", receipt);

        } catch (error) {

            console.error("Erreur révocation :", error);

            if (error.code === "ACTION_REJECTED") {

                result.textContent = "Transaction refusée dans MetaMask.";

            } else {

                result.textContent =
                    "Erreur : " +
                    (error.reason || error.shortMessage || error.message);
            }
        }
    }
);

/* Configuration des zones de glisser-deposer */

function setupPDFDropZone(inputId) {

    const input = document.getElementById(inputId);
    const zone = document.getElementById("dropZone-" + inputId);

    if (!input || !zone) return;

    const fileName = zone.querySelector(".drop-file-name");

    // Selection classique
    input.addEventListener("change", () => {

        const file = input.files[0];

        if (file) {
            if (!isPDF(file)) {
                alert("Veuillez sélectionner un fichier PDF.");
                input.value = "";
                fileName.textContent = "Aucun fichier sélectionné";
                return;
            }

            fileName.textContent = "Fichier : " + file.name;
        } else {
            fileName.textContent = "Aucun fichier sélectionné";
        }
    });

    // Autoriser le glisser-deposer
    zone.addEventListener("dragover", (event) => {
        event.preventDefault();
        zone.classList.add("drag-over");
    });

    zone.addEventListener("dragleave", (event) => {
        event.preventDefault();
        zone.classList.remove("drag-over");
    });

    // Reception du fichier
    zone.addEventListener("drop", (event) => {

        event.preventDefault();
        zone.classList.remove("drag-over");

        const file = event.dataTransfer.files[0];

        if (!file) return;

        if (!isPDF(file)) {
            alert("Seuls les fichiers PDF sont autorisés.");
            return;
        }

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        input.files = dataTransfer.files;

        // Declencher les anciens evenements change
        input.dispatchEvent(
            new Event("change", { bubbles: true })
        );
    });
}

// Activer les trois zones
setupPDFDropZone("pdfFile");
setupPDFDropZone("revokePdf");
setupPDFDropZone("verifyPdf");
