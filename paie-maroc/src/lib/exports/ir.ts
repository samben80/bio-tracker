import { cumulsAnnuels, periodesAnnee, totaliser, bulletinsDe } from '../paie/agregats'
import { round2 } from '../paie/calcul'
import type { BaseDonnees, Salarie } from '../paie/types'
import { xmlEsc } from './format'

const f = (n: number) => round2(n).toFixed(2)

const estStagiaire = (s: Salarie) => s.typeContrat === 'ANAPEC' || s.typeContrat === 'STAGE'

/**
 * Déclaration annuelle des traitements et salaires (art. 79 du CGI, modèle
 * ADC210F / 9421) au format XML EDI du portail SIMPL-IR de la DGI.
 */
export function genererXml9421(db: BaseDonnees, annee: number): string {
  const soc = db.societe
  const cumuls = cumulsAnnuels(db, annee)
  const sal = (id: string) => db.salaries.find((s) => s.id === id)!
  const permanents = [...cumuls.values()].filter((c) => !estStagiaire(sal(c.salarieId)))
  const stagiaires = [...cumuls.values()].filter((c) => estStagiaire(sal(c.salarieId)))
  const somme = (l: typeof permanents, k: keyof (typeof permanents)[number]) => l.reduce((a, c) => a + (c[k] as number), 0)
  const tag = (nom: string, v: string | number) => `<${nom}>${xmlEsc(v)}</${nom}>`

  const pp = permanents
    .map((c) => {
      const s = sal(c.salarieId)
      const deductions = c.fraisProfessionnels + c.cotisations + c.interetsLogement
      return [
        '<PersonnelPermanent>',
        tag('nom', s.nom.toUpperCase()),
        tag('prenom', s.prenom),
        tag('adressePersonnelle', `${s.adresse} ${s.ville}`.trim()),
        tag('numCNI', s.cin),
        tag('numCE', s.nationalite !== 'Marocaine' ? s.cin : ''),
        tag('numPPR', ''),
        tag('numCNSS', s.numeroCnss),
        tag('ifu', ''),
        tag('salaireBaseAnnuel', f(c.salaireBase)),
        tag('mtBrutTraitementSalaire', f(c.brut)),
        tag('periode', c.joursDeclares),
        tag('mtExonere', f(c.exonere)),
        tag('mtEcheances', '0.00'),
        tag('nbrReductions', Math.min(s.personnesACharge, db.parametres.maxPersonnesACharge)),
        tag('mtIndemnite', '0.00'),
        tag('mtAvantages', f(c.avantagesNature)),
        tag('mtRevenuBrutImposable', f(c.brutImposable)),
        tag('mtFraisProfess', f(c.fraisProfessionnels)),
        tag('mtCotisationAssur', f(c.cotisations)),
        tag('mtAutresRetenues', f(c.interetsLogement)),
        tag('mtRevenuNetImposable', f(c.netImposable)),
        tag('mtTotalDeduction', f(deductions)),
        tag('irPreleve', f(c.ir)),
        tag('casSportif', 'false'),
        tag('numMatricule', s.matricule),
        tag('datePermis', ''),
        tag('dateAutorisation', ''),
        `<refSituationFamilliale>${tag('code', s.situationFamiliale)}</refSituationFamilliale>`,
        `<refTaux>${tag('code', 'TPP.20.2009')}</refTaux>`,
        '</PersonnelPermanent>',
      ].join('')
    })
    .join('\n    ')

  const stg = stagiaires
    .map((c) => {
      const s = sal(c.salarieId)
      return [
        '<Stagiaire>',
        tag('nom', s.nom.toUpperCase()),
        tag('prenom', s.prenom),
        tag('adressePersonnelle', `${s.adresse} ${s.ville}`.trim()),
        tag('numCNI', s.cin),
        tag('numCE', ''),
        tag('numCNSS', s.numeroCnss),
        tag('ifu', ''),
        tag('mtBrutTraitementSalaire', f(c.salaireBase)),
        tag('mtBrutIndemnites', f(c.brut - c.salaireBase)),
        tag('mtRetenues', f(c.cotisations)),
        tag('mtRevenuNetImposable', f(c.netImposable)),
        tag('periode', c.joursDeclares),
        '</Stagiaire>',
      ].join('')
    })
    .join('\n    ')

  const versements = periodesAnnee(db, annee)
    .filter((p) => Object.keys(p.bulletins).length)
    .map((p) => {
      const ir = totaliser(bulletinsDe(p)).ir
      return `<VersementTraitementSalaire>${tag('mois', p.mois)}${tag('totalVersement', f(ir))}${tag('dateDerniereVersment', '')}<detailPaiement><DetailPaiementTraitementSalaire>${tag('principal', f(ir))}${tag('penalite', '0.00')}${tag('majorations', '0.00')}${tag('dateVersement', '')}${tag('refMoyenPaiement', '')}${tag('numQuittance', '')}</DetailPaiementTraitementSalaire></detailPaiement></VersementTraitementSalaire>`
    })
    .join('\n    ')

  const totalPP = (k: keyof (typeof permanents)[number]) => f(somme(permanents, k))
  const totalStg = (k: keyof (typeof permanents)[number]) => f(somme(stagiaires, k))

  return `<?xml version="1.0" encoding="UTF-8"?>
<TraitementEtSalaire>
  ${tag('identifiantFiscal', soc.identifiantFiscal)}
  ${tag('nom', '')}
  ${tag('prenom', '')}
  ${tag('raisonSociale', soc.raisonSociale)}
  ${tag('exerciceFiscalDu', `${annee}-01-01`)}
  ${tag('exerciceFiscalAu', `${annee}-12-31`)}
  ${tag('annee', annee)}
  <commune>${tag('code', soc.codeCommune)}</commune>
  ${tag('adresse', `${soc.adresse} ${soc.codePostal} ${soc.ville}`.trim())}
  ${tag('numeroCIN', '')}
  ${tag('numeroCNSS', soc.cnssAffiliation)}
  ${tag('numeroCE', '')}
  ${tag('numeroRC', soc.registreCommerce)}
  ${tag('identifiantTP', soc.taxeProfessionnelle)}
  ${tag('numeroFax', '')}
  ${tag('numeroTelephone', soc.telephone)}
  ${tag('email', soc.email)}
  ${tag('effectifTotal', cumuls.size)}
  ${tag('nbrPersoPermanent', permanents.length)}
  ${tag('nbrPersoOccasionnel', 0)}
  ${tag('nbrStagiaires', stagiaires.length)}
  ${tag('totalMtRevenuBrutImposablePP', totalPP('brutImposable'))}
  ${tag('totalMtRevenuNetImposablePP', totalPP('netImposable'))}
  ${tag('totalMtTotalDeductionPP', f(somme(permanents, 'fraisProfessionnels') + somme(permanents, 'cotisations') + somme(permanents, 'interetsLogement')))}
  ${tag('totalMtIrPrelevePP', totalPP('ir'))}
  ${tag('totalMtBrutSommesPO', '0.00')}
  ${tag('totalIrPrelevePO', '0.00')}
  ${tag('totalMtBrutTraitSalaireSTG', totalStg('salaireBase'))}
  ${tag('totalMtBrutIndemnitesSTG', f(somme(stagiaires, 'brut') - somme(stagiaires, 'salaireBase')))}
  ${tag('totalMtRetenuesSTG', totalStg('cotisations'))}
  ${tag('totalMtRevenuNetImpSTG', totalStg('netImposable'))}
  ${tag('totalSommePayeRTS', '0.00')}
  ${tag('totalmtAnuuelRevenuSalarial', '0.00')}
  ${tag('totalmtAbondement', '0.00')}
  ${tag('montantPermanent', totalPP('ir'))}
  ${tag('montantOccasionnel', '0.00')}
  ${tag('montantStagiaire', totalStg('ir'))}
  <listPersonnelPermanent>
    ${pp}
  </listPersonnelPermanent>
  <listPersonnelExonere/>
  <listPersonnelOccasionnel/>
  <listStagiaires>
    ${stg}
  </listStagiaires>
  <listDoctorants/>
  <listBeneficiaires/>
  <listBeneficiairesPlanEpargne/>
  <listVersements>
    ${versements}
  </listVersements>
</TraitementEtSalaire>
`
}
