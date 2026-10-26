import { calculerBulletin, variablesParDefaut } from './paie/calcul'
import { PARAMETRES_DEFAUT, RUBRIQUES_DEFAUT, SOCIETE_VIDE } from './paie/defaults'
import { nouveauSalarie, personnesAChargeParDefaut } from './paie/salarie'
import type { BaseDonnees, PeriodePaie, Salarie } from './paie/types'

// Jeu de données fictif pour découvrir le logiciel (identifiants inventés).
export function donneesDemo(): BaseDonnees {
  const s = (o: Partial<Salarie>): Salarie => {
    const sal = { ...nouveauSalarie(), ...o }
    sal.dateAnciennete ||= sal.dateEmbauche
    sal.personnesACharge = o.personnesACharge ?? personnesAChargeParDefaut(sal)
    return sal
  }
  const salaries: Salarie[] = [
    s({ id: 'sal-001', matricule: '001', civilite: 'M.', nom: 'Alaoui', prenom: 'Youssef', cin: 'BK123456', dateNaissance: '1980-04-12', lieuNaissance: 'Casablanca', situationFamiliale: 'M', nombreEnfants: 3, ville: 'Casablanca', numeroCnss: '112345678', numeroCimr: 'C0012345', dateEmbauche: '2005-09-01', poste: 'Directeur général', departement: 'Direction', categorie: 'Cadre dirigeant', salaireBase: 32000, banque: 'Attijariwafa Bank', rib: '007780000123456789012345', affilieCimr: true, tauxCimr: 6, tauxMutuelleSalarial: 1.5, tauxMutuellePatronal: 1.5, interetsLogement: 1800, elementsFixes: [{ code: '303', montant: 3000 }, { code: '401', montant: 1500 }] }),
    s({ id: 'sal-002', matricule: '002', civilite: 'Mme', sexe: 'F', nom: 'Bennani', prenom: 'Salma', cin: 'BE654321', dateNaissance: '1988-11-03', lieuNaissance: 'Rabat', situationFamiliale: 'M', nombreEnfants: 2, personnesACharge: 2, ville: 'Casablanca', numeroCnss: '123456789', numeroCimr: 'C0023456', dateEmbauche: '2014-03-15', poste: 'Responsable administratif et financier', departement: 'Finance', categorie: 'Cadre', salaireBase: 18500, banque: 'BMCE Bank of Africa', rib: '011780000234567890123456', affilieCimr: true, tauxCimr: 6, tauxMutuelleSalarial: 1.5, tauxMutuellePatronal: 1.5, elementsFixes: [{ code: '203', montant: 1500 }, { code: '300', montant: 500 }] }),
    s({ id: 'sal-003', matricule: '003', civilite: 'M.', nom: 'El Idrissi', prenom: 'Karim', cin: 'BH112233', dateNaissance: '1992-06-21', lieuNaissance: 'Fès', situationFamiliale: 'C', ville: 'Mohammedia', numeroCnss: '134567890', dateEmbauche: '2019-01-07', poste: 'Commercial', departement: 'Ventes', categorie: 'Agent de maîtrise', salaireBase: 7500, banque: 'Banque Populaire', rib: '181780000345678901234567', elementsFixes: [{ code: '300', montant: 500 }, { code: '305', montant: 1200 }] }),
    s({ id: 'sal-004', matricule: '004', civilite: 'Mme', sexe: 'F', nom: 'Chraibi', prenom: 'Nadia', cin: 'BJ445566', dateNaissance: '1995-02-14', lieuNaissance: 'Casablanca', situationFamiliale: 'M', nombreEnfants: 1, personnesACharge: 1, ville: 'Casablanca', numeroCnss: '145678901', dateEmbauche: '2021-05-03', poste: 'Comptable', departement: 'Finance', categorie: 'Employé', salaireBase: 6800, banque: 'CIH Bank', rib: '230780000456789012345678', elementsFixes: [{ code: '300', montant: 500 }] }),
    s({ id: 'sal-005', matricule: '005', civilite: 'M.', nom: 'Ouazzani', prenom: 'Hamza', cin: 'BL778899', dateNaissance: '1999-09-30', lieuNaissance: 'Settat', situationFamiliale: 'C', ville: 'Casablanca', numeroCnss: '156789012', dateEmbauche: '2024-02-01', typeContrat: 'CDD', dateFinContrat: '2026-12-31', poste: 'Magasinier', departement: 'Logistique', categorie: 'Ouvrier', typeSalaire: 'HORAIRE', salaireBase: 19.5, banque: 'Crédit Agricole du Maroc', rib: '225780000567890123456789', elementsFixes: [{ code: '302', montant: 650 }, { code: '308', montant: 210 }] }),
    s({ id: 'sal-006', matricule: '006', civilite: 'Mlle', sexe: 'F', nom: 'Tazi', prenom: 'Imane', cin: 'BK990011', dateNaissance: '2002-07-08', lieuNaissance: 'Casablanca', situationFamiliale: 'C', ville: 'Casablanca', dateEmbauche: '2026-03-01', typeContrat: 'ANAPEC', dateFinContrat: '2028-02-29', poste: 'Assistante marketing (contrat Idmaj)', departement: 'Marketing', categorie: 'Stagiaire', salaireBase: 0, modePaiement: 'VIREMENT', banque: 'Attijariwafa Bank', rib: '007780000678901234567890', exonereIr: true, exonereCnss: true, motifExoneration: 'Contrat d\'insertion ANAPEC (Idmaj) - 24 mois', elementsFixes: [{ code: '309', montant: 4000 }] }),
  ]
  for (const sal of salaries) {
    sal.documents = [
      { id: `${sal.id}-cin`, type: 'Copie CIN', reference: sal.cin, dateDelivrance: '2020-01-15', dateExpiration: sal.id === 'sal-003' ? '2026-11-20' : '2030-01-15', statut: 'FOURNI', note: '' },
      { id: `${sal.id}-ctr`, type: 'Contrat de travail', reference: `CT-${sal.matricule}`, dateDelivrance: sal.dateEmbauche, dateExpiration: sal.dateFinContrat, statut: 'FOURNI', note: '' },
      { id: `${sal.id}-rib`, type: 'Relevé d\'identité bancaire (RIB)', reference: '', dateDelivrance: '', dateExpiration: '', statut: sal.id === 'sal-005' ? 'MANQUANT' : 'FOURNI', note: '' },
    ]
  }

  const societe = {
    ...SOCIETE_VIDE,
    raisonSociale: 'ATLAS DISTRIBUTION SARL',
    formeJuridique: 'SARL',
    activite: 'Commerce de gros de produits alimentaires',
    adresse: '45, Boulevard Zerktouni, 3e étage',
    ville: 'Casablanca',
    codePostal: '20250',
    telephone: '0522 00 00 00',
    email: 'rh@atlas-distribution.example',
    ice: '001234567000089',
    identifiantFiscal: '12345678',
    registreCommerce: '456789',
    taxeProfessionnelle: '35712345',
    cnssAffiliation: '1234567',
    cnssCodeAgence: '01',
    cimrAdherent: '987654',
    banque: 'Attijariwafa Bank',
    rib: '007780000999999999999999',
    representantLegal: 'Youssef ALAOUI',
    qualiteRepresentant: 'Gérant',
    codeCommune: '141',
  }

  const periode = (id: string, statut: PeriodePaie['statut']): PeriodePaie => {
    const [annee, mois] = id.split('-').map(Number)
    const p: PeriodePaie = { id, annee, mois, statut, variables: {}, bulletins: {}, dateOuverture: `${id}-01` }
    for (const sal of salaries) {
      if (sal.dateEmbauche > `${id}-31`) continue
      const v = variablesParDefaut(sal, PARAMETRES_DEFAUT, id)
      if (sal.id === 'sal-003') v.elements = [{ code: '202', montant: 2400 }]
      if (sal.id === 'sal-005') v.hs25 = 8
      p.variables[sal.id] = v
      if (statut !== 'OUVERTE') p.bulletins[sal.id] = calculerBulletin(sal, v, id, PARAMETRES_DEFAUT, RUBRIQUES_DEFAUT)
    }
    if (statut === 'CLOTUREE') p.dateCloture = `${id}-28`
    return p
  }

  return {
    version: 1,
    societe,
    parametres: PARAMETRES_DEFAUT,
    rubriques: RUBRIQUES_DEFAUT,
    salaries,
    periodes: [
      periode('2026-07', 'CLOTUREE'),
      periode('2026-08', 'CLOTUREE'),
      periode('2026-09', 'CLOTUREE'),
      periode('2026-10', 'OUVERTE'),
    ],
  }
}
