
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Diploma {

    address public owner;

    struct Diplome {
        bytes32 hashPdf;
        string nomEtudiant;
        string prenomEtudiant;
        string filiere;
        uint annee;
        uint date;
        string cid;
        bool existe;
        bool valide;
    }

    mapping(bytes32 => Diplome) public diplomes;

    constructor() {
        owner = msg.sender;
    }

    modifier seulementAdmin() {
        require(msg.sender == owner, "Acces refuse");
        _;
    }

    function emettreDiplome(
        bytes32 hashPdf,
        string memory nomEtudiant,
        string memory prenomEtudiant,
        string memory filiere,
        uint annee,
        string memory cid
    ) public seulementAdmin {

        require(hashPdf != bytes32(0), "Hash invalide");
        require(!diplomes[hashPdf].existe, "Diplome deja enregistre");
        require(bytes(nomEtudiant).length > 0, "Nom obligatoire");
        require(bytes(prenomEtudiant).length > 0, "Prenom obligatoire");
        require(bytes(filiere).length > 0, "Filiere obligatoire");
        require(annee > 0, "Annee invalide");
        require(bytes(cid).length > 0, "CID obligatoire");

        diplomes[hashPdf] = Diplome({
            hashPdf: hashPdf,
            nomEtudiant: nomEtudiant,
            prenomEtudiant: prenomEtudiant,
            filiere: filiere,
            annee: annee,
            date: block.timestamp,
            cid: cid,
            existe: true,
            valide: true
        });
    }

    function verifierDiplome(bytes32 hashPdf)
        public
        view
        returns (
            string memory,
            string memory,
            string memory,
            uint,
            uint,
            string memory,
            bool,
            bool
        )
    {
        Diplome memory d = diplomes[hashPdf];

        return (
            d.nomEtudiant,
            d.prenomEtudiant,
            d.filiere,
            d.annee,
            d.date,
            d.cid,
            d.existe,
            d.valide
        );
    }

    function revoquerDiplome(bytes32 hashPdf)
        public
        seulementAdmin
    {
        require(diplomes[hashPdf].existe, "Diplome inexistant");
        require(diplomes[hashPdf].valide, "Diplome deja revoque");

        diplomes[hashPdf].valide = false;
    }
}
