import { Bouton, Card, Champ, Input, PageHeader } from '@/components/ui'
import { lireBase } from '@/lib/store'
import { enregistrerSociete } from '../actions'
import type { Societe } from '@/lib/paie/types'

const GROUPES: { titre: string; champs: [keyof Societe, string, string?][] }[] = [
  { titre: 'Identité', champs: [['raisonSociale', 'Raison sociale'], ['formeJuridique', 'Forme juridique'], ['activite', 'Activité'], ['representantLegal', 'Représentant légal'], ['qualiteRepresentant', 'Qualité du signataire']] },
  { titre: 'Coordonnées', champs: [['adresse', 'Adresse'], ['ville', 'Ville'], ['codePostal', 'Code postal'], ['telephone', 'Téléphone'], ['email', 'E-mail']] },
  {
    titre: 'Identifiants légaux',
    champs: [
      ['ice', 'ICE', '15 chiffres'],
      ['identifiantFiscal', 'Identifiant fiscal (IF)'],
      ['registreCommerce', 'Registre de commerce (RC)'],
      ['taxeProfessionnelle', 'Taxe professionnelle (patente)'],
      ['codeCommune', 'Code commune (DGI)', 'Utilisé dans la déclaration 9421'],
    ],
  },
  {
    titre: 'Organismes sociaux',
    champs: [
      ['cnssAffiliation', 'N° d\'affiliation CNSS', '7 chiffres - utilisé dans le fichier Damancom'],
      ['cnssCodeAgence', 'Code agence CNSS'],
      ['cimrAdherent', 'N° adhérent CIMR'],
    ],
  },
  { titre: 'Banque (virements des salaires)', champs: [['banque', 'Banque'], ['rib', 'RIB', '24 chiffres']] },
]

export default async function PageSociete() {
  const { societe } = await lireBase()
  return (
    <form action={enregistrerSociete} className="space-y-6">
      <PageHeader titre="Société" sousTitre="Informations reprises sur les bulletins, attestations et télédéclarations." actions={<Bouton type="submit">Enregistrer</Bouton>} />
      <div className="grid gap-6 lg:grid-cols-2">
        {GROUPES.map((g) => (
          <Card key={g.titre} titre={g.titre}>
            <div className="grid gap-3 sm:grid-cols-2">
              {g.champs.map(([k, l, aide]) => (
                <Champ key={k} label={l} aide={aide} className={k === 'adresse' || k === 'raisonSociale' ? 'sm:col-span-2' : ''}>
                  <Input name={k} defaultValue={societe[k] ?? ''} />
                </Champ>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </form>
  )
}
