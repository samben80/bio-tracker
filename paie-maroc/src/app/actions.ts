'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { donneesDemo } from '@/lib/demo'
import { calculerBulletin, joursPayesParDefaut, variablesParDefaut } from '@/lib/paie/calcul'
import { PARAMETRES_DEFAUT, RUBRIQUES_DEFAUT, SOCIETE_VIDE } from '@/lib/paie/defaults'
import { nouveauSalarie, presentSurPeriode } from '@/lib/paie/salarie'
import { calculerSoldeToutCompte, type MotifSortie } from '@/lib/paie/stc'
import type { BaseDonnees, ElementFixe, PeriodePaie, Rubrique, Salarie, SituationCnss, TypePlafond, VariablesMois } from '@/lib/paie/types'
import { exigerSession } from '@/lib/auth'
import { dossierVierge, modifierBase, remplacerBase } from '@/lib/store'

const nombre = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
const texte = (v: FormDataEntryValue | null) => String(v ?? '').trim()

/** Recopie les champs du formulaire dans un objet en respectant le type des valeurs existantes. */
function appliquerFormulaire<T extends object>(cible: T, fd: FormData, prefixe = ''): T {
  for (const [cle, valeur] of Object.entries(cible)) {
    const nom = prefixe + cle
    if (Array.isArray(valeur)) {
      valeur.forEach((item, i) => {
        if (item && typeof item === 'object') appliquerFormulaire(item, fd, `${nom}.${i}.`)
      })
    } else if (valeur && typeof valeur === 'object') {
      appliquerFormulaire(valeur, fd, nom + '.')
    } else if (typeof valeur === 'boolean') {
      if (fd.has(`${nom}__present`)) (cible as Record<string, unknown>)[cle] = fd.has(nom)
    } else if (fd.has(nom)) {
      const brut = fd.get(nom)
      // seule la borne « max » de la dernière tranche du barème peut être vide (null)
      const estNombre = typeof valeur === 'number' || cle === 'max'
      ;(cible as Record<string, unknown>)[cle] = estNombre
        ? cle === 'max' && texte(brut) === '' ? null : nombre(brut)
        : texte(brut)
    }
  }
  return cible
}

function elementsDuFormulaire(fd: FormData, prefixe: string): ElementFixe[] {
  const codes = fd.getAll(`${prefixe}_code`)
  const montants = fd.getAll(`${prefixe}_montant`)
  return codes
    .map((c, i) => ({ code: texte(c), montant: nombre(montants[i]) }))
    .filter((e) => e.code && e.montant)
}

const rafraichir = () => revalidatePath('/', 'layout')

// ───────────── Société et paramètres ─────────────

export async function enregistrerSociete(fd: FormData) {
  await exigerSession('admin')
  await modifierBase((db) => {
    db.societe = appliquerFormulaire({ ...SOCIETE_VIDE, ...db.societe }, fd)
  })
  rafraichir()
}

export async function enregistrerParametres(fd: FormData) {
  await exigerSession('admin')
  await modifierBase((db) => {
    db.parametres = appliquerFormulaire(structuredClone(db.parametres), fd)
  })
  rafraichir()
}

export async function reinitialiserParametres() {
  await exigerSession('admin')
  await modifierBase((db) => {
    db.parametres = structuredClone(PARAMETRES_DEFAUT)
  })
  rafraichir()
}

// ───────────── Rubriques ─────────────

export async function enregistrerRubrique(fd: FormData) {
  await exigerSession('admin')
  const origine = texte(fd.get('origine'))
  const r: Rubrique = {
    code: texte(fd.get('code')),
    libelle: texte(fd.get('libelle')),
    sens: texte(fd.get('sens')) === 'RETENUE' ? 'RETENUE' : 'GAIN',
    nature: texte(fd.get('nature')) as Rubrique['nature'],
    exonerationIr: { type: texte(fd.get('exoIrType')) as TypePlafond, valeur: nombre(fd.get('exoIrValeur')) },
    exonerationCnss: { type: texte(fd.get('exoCnssType')) as TypePlafond, valeur: nombre(fd.get('exoCnssValeur')) },
    soumisCimr: fd.has('soumisCimr'),
    entreDansAnciennete: fd.has('entreDansAnciennete'),
    actif: fd.has('actif'),
    description: texte(fd.get('description')),
  }
  if (!r.code || !r.libelle) throw new Error('Code et libellé obligatoires')
  if (Number(r.code) >= 100 && Number(r.code) < 200) throw new Error('Les codes 100 à 199 sont réservés aux éléments calculés')
  if (r.sens === 'RETENUE') r.nature = 'RETENUE_NET'
  await modifierBase((db) => {
    const i = db.rubriques.findIndex((x) => x.code === (origine || r.code))
    if (!origine && i >= 0) throw new Error(`Le code ${r.code} existe déjà`)
    if (i >= 0) db.rubriques[i] = r
    else db.rubriques.push(r)
    db.rubriques.sort((a, b) => a.code.localeCompare(b.code))
  })
  rafraichir()
  redirect('/rubriques')
}

export async function reinitialiserRubriques() {
  await exigerSession('admin')
  await modifierBase((db) => {
    const codes = new Set(db.rubriques.map((r) => r.code))
    for (const r of RUBRIQUES_DEFAUT) if (!codes.has(r.code)) db.rubriques.push(structuredClone(r))
    db.rubriques.sort((a, b) => a.code.localeCompare(b.code))
  })
  rafraichir()
}

// ───────────── Salariés ─────────────

export async function enregistrerSalarie(id: string, fd: FormData) {
  await exigerSession()
  const nouvelId = await modifierBase((db) => {
    const existant = db.salaries.find((s) => s.id === id)
    const s: Salarie = appliquerFormulaire(structuredClone(existant ?? nouveauSalarie()), fd)
    s.elementsFixes = elementsDuFormulaire(fd, 'ef')
    if (!s.nom || !s.prenom) throw new Error('Nom et prénom obligatoires')
    if (!s.matricule) s.matricule = String(db.salaries.length + 1).padStart(3, '0')
    if (db.salaries.some((x) => x.matricule === s.matricule && x.id !== id)) throw new Error(`Le matricule ${s.matricule} est déjà utilisé`)
    s.dateAnciennete ||= s.dateEmbauche
    if (s.dateSortie) s.actif = false
    if (existant) Object.assign(existant, s)
    else {
      s.id = `sal-${Date.now().toString(36)}`
      db.salaries.push(s)
    }
    return existant ? existant.id : s.id
  })
  rafraichir()
  redirect(`/salaries/${nouvelId}`)
}

export async function supprimerSalarie(id: string) {
  await exigerSession()
  await modifierBase((db) => {
    if (db.periodes.some((p) => p.bulletins[id])) throw new Error('Ce salarié a des bulletins : enregistrez plutôt une date de sortie.')
    db.salaries = db.salaries.filter((s) => s.id !== id)
    for (const p of db.periodes) delete p.variables[id]
  })
  rafraichir()
  redirect('/salaries')
}

export async function ajouterDocument(salarieId: string, fd: FormData) {
  await exigerSession()
  await modifierBase((db) => {
    const s = db.salaries.find((x) => x.id === salarieId)
    if (!s) throw new Error('Salarié introuvable')
    s.documents.push({
      id: `doc-${Date.now().toString(36)}`,
      type: texte(fd.get('type')),
      reference: texte(fd.get('reference')),
      dateDelivrance: texte(fd.get('dateDelivrance')),
      dateExpiration: texte(fd.get('dateExpiration')),
      statut: (texte(fd.get('statut')) || 'FOURNI') as Salarie['documents'][number]['statut'],
      note: texte(fd.get('note')),
    })
  })
  rafraichir()
}

export async function supprimerDocument(salarieId: string, docId: string) {
  await exigerSession()
  await modifierBase((db) => {
    const s = db.salaries.find((x) => x.id === salarieId)
    if (s) s.documents = s.documents.filter((d) => d.id !== docId)
  })
  rafraichir()
}

// ───────────── Périodes de paie ─────────────

function periodeModifiable(db: BaseDonnees, id: string): PeriodePaie {
  const p = db.periodes.find((x) => x.id === id)
  if (!p) throw new Error('Période introuvable')
  if (p.statut === 'CLOTUREE') throw new Error('Période clôturée : rouvrez-la pour la modifier')
  return p
}

export async function ouvrirPeriode(fd: FormData) {
  await exigerSession()
  const id = texte(fd.get('periode'))
  if (!/^\d{4}-\d{2}$/.test(id)) throw new Error('Période invalide')
  await modifierBase((db) => {
    if (db.periodes.some((p) => p.id === id)) return
    const [annee, mois] = id.split('-').map(Number)
    const p: PeriodePaie = { id, annee, mois, statut: 'OUVERTE', variables: {}, bulletins: {}, dateOuverture: new Date().toISOString().slice(0, 10) }
    for (const s of db.salaries) if (presentSurPeriode(s, id)) p.variables[s.id] = variablesParDefaut(s, db.parametres, id)
    db.periodes.push(p)
    db.periodes.sort((a, b) => a.id.localeCompare(b.id))
  })
  rafraichir()
  redirect(`/paie/${id}`)
}

const CHAMPS_GRILLE = ['joursTravailles', 'heuresTravaillees', 'joursAbsenceNonPayee', 'joursConges', 'hs25', 'hs50', 'hs100', 'avance'] as const

export async function enregistrerGrille(periodeId: string, fd: FormData) {
  await exigerSession()
  await modifierBase((db) => {
    const p = periodeModifiable(db, periodeId)
    for (const s of db.salaries) {
      if (!fd.has(`${s.id}.joursTravailles`)) continue
      const v: VariablesMois = p.variables[s.id] ?? variablesParDefaut(s, db.parametres, p.id)
      for (const c of CHAMPS_GRILLE) v[c] = nombre(fd.get(`${s.id}.${c}`))
      v.situationCnss = texte(fd.get(`${s.id}.situationCnss`)) as SituationCnss
      p.variables[s.id] = v
    }
    p.statut = 'OUVERTE'
  })
  rafraichir()
}

export async function enregistrerVariablesSalarie(periodeId: string, salarieId: string, fd: FormData) {
  await exigerSession()
  await modifierBase((db) => {
    const p = periodeModifiable(db, periodeId)
    const s = db.salaries.find((x) => x.id === salarieId)
    if (!s) throw new Error('Salarié introuvable')
    const v: VariablesMois = p.variables[s.id] ?? variablesParDefaut(s, db.parametres, p.id)
    for (const c of CHAMPS_GRILLE) v[c] = nombre(fd.get(c))
    v.situationCnss = texte(fd.get('situationCnss')) as SituationCnss
    v.elements = elementsDuFormulaire(fd, 'ev')
    p.variables[s.id] = v
    p.bulletins[s.id] = calculerBulletin(s, v, p.id, db.parametres, db.rubriques)
  })
  rafraichir()
  redirect(`/paie/${periodeId}/bulletins/${salarieId}`)
}

export async function ajouterSalariePeriode(periodeId: string, salarieId: string) {
  await exigerSession()
  await modifierBase((db) => {
    const p = periodeModifiable(db, periodeId)
    const s = db.salaries.find((x) => x.id === salarieId)
    if (s && !p.variables[s.id]) p.variables[s.id] = variablesParDefaut(s, db.parametres, p.id)
  })
  rafraichir()
}

export async function retirerSalariePeriode(periodeId: string, salarieId: string) {
  await exigerSession()
  await modifierBase((db) => {
    const p = periodeModifiable(db, periodeId)
    delete p.variables[salarieId]
    delete p.bulletins[salarieId]
  })
  rafraichir()
}

export async function calculerPeriode(periodeId: string) {
  await exigerSession()
  await modifierBase((db) => {
    const p = periodeModifiable(db, periodeId)
    p.bulletins = {}
    for (const [id, v] of Object.entries(p.variables)) {
      const s = db.salaries.find((x) => x.id === id)
      if (s) p.bulletins[id] = calculerBulletin(s, v, p.id, db.parametres, db.rubriques)
    }
    p.statut = 'CALCULEE'
  })
  rafraichir()
}

export async function cloturerPeriode(periodeId: string) {
  await exigerSession()
  await modifierBase((db) => {
    const p = periodeModifiable(db, periodeId)
    if (p.statut !== 'CALCULEE') throw new Error('Calculez la paie avant de clôturer')
    p.statut = 'CLOTUREE'
    p.dateCloture = new Date().toISOString().slice(0, 10)
  })
  rafraichir()
}

export async function rouvrirPeriode(periodeId: string) {
  await exigerSession()
  await modifierBase((db) => {
    const p = db.periodes.find((x) => x.id === periodeId)
    if (p?.statut === 'CLOTUREE') {
      p.statut = 'CALCULEE'
      delete p.dateCloture
    }
  })
  rafraichir()
}

export async function supprimerPeriode(periodeId: string) {
  await exigerSession()
  await modifierBase((db) => {
    periodeModifiable(db, periodeId)
    db.periodes = db.periodes.filter((p) => p.id !== periodeId)
  })
  rafraichir()
  redirect('/paie')
}

// ───────────── Sauvegarde ─────────────

export async function importerSauvegarde(fd: FormData) {
  await exigerSession('admin')
  const fichier = fd.get('fichier')
  if (!(fichier instanceof File) || fichier.size === 0) throw new Error('Aucun fichier sélectionné')
  const db = JSON.parse(await fichier.text()) as BaseDonnees
  if (!db.societe || !Array.isArray(db.salaries) || !Array.isArray(db.periodes)) throw new Error('Fichier de sauvegarde invalide')
  await remplacerBase(db)
  rafraichir()
  redirect('/')
}

export async function chargerDemo() {
  await exigerSession('admin')
  await remplacerBase(donneesDemo())
  rafraichir()
  redirect('/')
}

export async function nouveauDossier() {
  await exigerSession('admin')
  await remplacerBase(dossierVierge())
  rafraichir()
  redirect('/societe')
}

// ───────────── Sortie du salarié ─────────────

export async function reporterSoldeToutCompte(salarieId: string, fd: FormData) {
  await exigerSession()
  const params = {
    dateSortie: texte(fd.get('dateSortie')),
    motif: texte(fd.get('motif')) as MotifSortie,
    moisPreavis: nombre(fd.get('moisPreavis')),
    joursCongesRestants: nombre(fd.get('joursCongesRestants')),
    abusif: fd.has('abusif'),
  }
  const periodeId = params.dateSortie.slice(0, 7)
  await modifierBase((db) => {
    const s = db.salaries.find((x) => x.id === salarieId)
    if (!s) throw new Error('Salarié introuvable')
    const p = db.periodes.find((x) => x.id === periodeId)
    if (!p) throw new Error(`Ouvrez d'abord la période ${periodeId} pour y reporter le solde de tout compte`)
    if (p.statut === 'CLOTUREE') throw new Error(`La période ${periodeId} est clôturée`)
    const stc = calculerSoldeToutCompte(db, s, params)
    s.dateSortie = params.dateSortie
    s.motifSortie = params.motif
    s.actif = false
    const v = p.variables[s.id] ?? variablesParDefaut(s, db.parametres, p.id)
    v.joursTravailles = joursPayesParDefaut(s, db.parametres, p.id)
    v.situationCnss = 'SO'
    const codes = new Set(stc.elements.map((e) => e.code))
    v.elements = [...v.elements.filter((e) => !codes.has(e.code)), ...stc.elements]
    v.joursConges = 0
    p.variables[s.id] = v
    p.bulletins[s.id] = calculerBulletin(s, v, p.id, db.parametres, db.rubriques)
    p.statut = 'OUVERTE'
  })
  rafraichir()
  redirect(`/paie/${periodeId}/bulletins/${salarieId}`)
}
