// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>

export interface ParsedIndicateur {
  nom: string
  categorie: string
  valeur: number | null
  valeur_texte: string | null
  unite: string | null
  ref_min: number | null
  ref_max: number | null
  ref_texte: string | null
}

export interface ParsedAnalyse {
  patient_nom: string
  patient_prenom: string | null
  patient_date_naissance: string | null
  dossier_ref: string | null
  telephone: string | null
  email: string | null
  date_analyse: string | null
  laboratoire: string | null
  indicateurs: ParsedIndicateur[]
}

function parseValeur(txt: string): { valeur: number | null; valeur_texte: string | null } {
  if (!txt) return { valeur: null, valeur_texte: null }
  const clean = txt.trim().replace(/−/g, '-').replace(/\s+/g, '')
  const match = clean.match(/^([<>≤≥]?[\d.,]+)/)
  if (match) {
    const raw = match[1].replace(',', '.')
    const num = parseFloat(raw.replace(/[<>≤≥]/g, ''))
    return { valeur: isNaN(num) ? null : num, valeur_texte: raw.trim() }
  }
  return { valeur: null, valeur_texte: clean }
}

function parseRef(refTxt: string): { ref_min: number | null; ref_max: number | null; ref_texte: string } {
  const clean = refTxt.trim().replace(/[()]/g, '').replace(/−/g, '-').replace(/\s+/g, ' ').trim()

  const rangeMatch = clean.match(/^([\d.,]+)\s*[-–]\s*([\d.,]+)/)
  if (rangeMatch) {
    return {
      ref_min: parseFloat(rangeMatch[1].replace(',', '.')),
      ref_max: parseFloat(rangeMatch[2].replace(',', '.')),
      ref_texte: clean,
    }
  }

  const ltMatch = clean.match(/^<\s*([\d.,]+)/)
  if (ltMatch) {
    return { ref_min: null, ref_max: parseFloat(ltMatch[1].replace(',', '.')), ref_texte: clean }
  }

  const gtMatch = clean.match(/^>\s*([\d.,]+)/)
  if (gtMatch) {
    return { ref_min: parseFloat(gtMatch[1].replace(',', '.')), ref_max: null, ref_texte: clean }
  }

  const leMatch = clean.match(/^[≤]\s*([\d.,]+)/)
  if (leMatch) {
    return { ref_min: null, ref_max: parseFloat(leMatch[1].replace(',', '.')), ref_texte: clean }
  }

  const numMatch = clean.match(/^([\d.,]+)$/)
  if (numMatch) {
    const v = parseFloat(numMatch[1].replace(',', '.'))
    return { ref_min: v * 0.9, ref_max: v * 1.1, ref_texte: clean }
  }

  return { ref_min: null, ref_max: null, ref_texte: clean }
}

// Check if a line is a raw value+unit line (PDF sometimes splits indicator name / value / ref on separate lines)
// e.g. "<12.50   mg/kg"
function parseValueUnitLine(line: string): { valeur: number | null; valeur_texte: string | null; unite: string | null } | null {
  const clean = line.replace(/\s+/g, ' ').trim()
  // Pattern: "[<>]? number  unit"
  const m = clean.match(/^([<>≤≥]?\s*[\d.,]+)\s+(.+)$/)
  if (m) {
    const valParsed = parseValeur(m[1])
    if (valParsed.valeur !== null || valParsed.valeur_texte) {
      return { ...valParsed, unite: m[2].trim() }
    }
  }
  // Pattern: just a number (no unit)
  const numOnly = clean.match(/^([<>≤≥]?\s*[\d.,]+)$/)
  if (numOnly) {
    const valParsed = parseValeur(numOnly[1])
    if (valParsed.valeur !== null) {
      return { ...valParsed, unite: null }
    }
  }
  return null
}

function isRefLine(line: string): boolean {
  return /^\(/.test(line) && /\)$/.test(line)
}

function isMetadataLine(line: string): boolean {
  return /^(Date|Dossier|Tel|Mail|Page|Recueil|Interpr|Ceci|−|20\d{8}|EASY|IR FORCE)/i.test(line)
    || /^\d{8}/.test(line)
    || line.length > 100
}

function isSectionHeader(line: string): boolean {
  return /^[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ\s]{6,}$/.test(line) && !line.includes('.') && line.length < 80
}

export async function parsePdf(buffer: Buffer): Promise<ParsedAnalyse> {
  const data = await pdfParse(buffer)
  const text = data.text

  const result: ParsedAnalyse = {
    patient_nom: '',
    patient_prenom: null,
    patient_date_naissance: null,
    dossier_ref: null,
    telephone: null,
    email: null,
    date_analyse: null,
    laboratoire: null,
    indicateurs: [],
  }

  const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean)
  let currentCategorie = ''
  // Track when we're inside an interpretation/legend table — skip these lines
  let inInterpretation = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const next1 = lines[i + 1] ?? ''
    const next2 = lines[i + 2] ?? ''

    // Patient name — "M. BENHSSAIN Samir"
    const nameMatch = line.match(/^(?:M\.|Mme\.?|Dr\.?)\s+([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ][A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ\s\-]+)\s+([A-Za-zàâäéèêëîïôùûüÀÂÄÉÈÊËÎÏÔÙÛÜ\-]+)$/)
    if (nameMatch && !result.patient_nom) {
      result.patient_nom = nameMatch[1].trim()
      result.patient_prenom = nameMatch[2].trim()
      continue
    }

    const dobMatch = line.match(/[Dd]ate\s+de\s+naissance\s*[:\-]?\s*(\d{2}[−\-/]\d{2}[−\-/]\d{4})/)
    if (dobMatch) { result.patient_date_naissance = dobMatch[1].replace(/−/g, '-'); continue }

    const dossierMatch = line.match(/[Dd]ossier\s+[Nn][°o]?\s*[:\-]?\s*(\S+)/)
    if (dossierMatch) { result.dossier_ref = dossierMatch[1]; continue }

    const telMatch = line.match(/^[Tt]el\s*[:\-]?\s*([\d\s.]+)$/)
    if (telMatch) { result.telephone = telMatch[1].trim(); continue }

    const emailMatch = line.match(/[Mm]ail\s*[:\-]?\s*(\S+@\S+)/)
    if (emailMatch) { result.email = emailMatch[1]; continue }

    const dateExamMatch = line.match(/[Dd]ate\s+de\s+l[''']?examen\s*[:\-]?\s*(\d{2}[−\-/]\d{2}[−\-/]\d{4})/)
    if (dateExamMatch) { result.date_analyse = dateExamMatch[1].replace(/−/g, '-'); continue }

    // Date du prélèvement embedded: "Date du prélèvement26−11−2025"
    const datePrelMatch = line.match(/[Dd]ate\s+du\s+pr[ée]l[èe]vement\s*(\d{2}[−\-/]\d{2}[−\-/]\d{4})/)
    if (datePrelMatch && !result.date_analyse) {
      result.date_analyse = datePrelMatch[1].replace(/−/g, '-'); continue
    }

    // Detect interpretation tables — skip all lines until next page/section
    if (/[Ii]nterpr[ée]tation\s+des\s+r[ée]sultats/i.test(line)) {
      inInterpretation = true
      continue
    }
    // A new section header resets interpretation mode
    if (isSectionHeader(line)) {
      inInterpretation = false
      currentCategorie = line
      continue
    }
    // Page markers reset interpretation mode
    if (/^Page\s*\d+/.test(line) || /^Page\d+\s*\//.test(line)) {
      inInterpretation = false
      continue
    }
    if (inInterpretation) continue

    // === MULTI-LINE INDICATOR DETECTION ===
    // Pattern A: Name on current line, value+unit on next, ref on next+1
    // e.g. [9]"Calprotectine fécale" [10]"<12.50   mg/kg" [11]"(<40.00)"
    if (!isMetadataLine(line) && line.length > 3 && line.length < 70
      && !isSectionHeader(line) && !/[(<]/.test(line)
      && !/^\d/.test(line)) {
      const valUnit = parseValueUnitLine(next1)
      if (valUnit && isRefLine(next2)) {
        const ref = parseRef(next2)
        result.indicateurs.push({
          nom: line,
          categorie: currentCategorie,
          valeur: valUnit.valeur,
          valeur_texte: valUnit.valeur_texte,
          unite: valUnit.unite,
          ...ref,
        })
        i += 2 // skip next two lines
        continue
      }
      // Pattern A2: Name on current, value+unit on next, no ref
      if (valUnit && !isRefLine(next2)) {
        // might still be valid if value is numeric
        if (valUnit.valeur !== null) {
          result.indicateurs.push({
            nom: line,
            categorie: currentCategorie,
            valeur: valUnit.valeur,
            valeur_texte: valUnit.valeur_texte,
            unite: valUnit.unite,
            ref_min: null, ref_max: null, ref_texte: null,
          })
          i += 1
          continue
        }
      }
    }

    // Pattern B: "Résultat<value unit" (no space) followed by ref line
    // e.g. "Résultat<25.0   ng/mL d'Hb" then "(<100.0)"
    const resultConcatMatch = line.match(/^R[ée]sultat([<>≤≥]?[\d.,]+)\s+(.+)$/)
    if (resultConcatMatch) {
      const valParsed = parseValeur(resultConcatMatch[1])
      const unite = resultConcatMatch[2].trim()
      let ref = { ref_min: null as number | null, ref_max: null as number | null, ref_texte: null as string | null }
      if (isRefLine(next1)) { ref = parseRef(next1); i += 1 }

      // Find name by looking backward
      let nom = 'Résultat'
      for (let j = i - 1; j >= Math.max(0, i - 8); j--) {
        const prev = lines[j]
        if (prev.length > 5 && prev.length < 70 && !isMetadataLine(prev) && !isSectionHeader(prev)
          && !/^\d/.test(prev) && !isRefLine(prev) && !/^R[ée]sultat/.test(prev)) {
          nom = prev
          break
        }
      }
      if (!result.indicateurs.find(x => x.nom === nom)) {
        result.indicateurs.push({
          nom,
          categorie: currentCategorie,
          valeur: valParsed.valeur,
          valeur_texte: valParsed.valeur_texte,
          unite,
          ...ref,
        })
      }
      continue
    }

    // Pattern C: All on one line "NAME VALUE UNIT (REF)"
    const fullPattern = /^(.+?)\s+([<>≤≥]?\s*[\d.,]+(?:\s*[−\-–]\s*[\d.,]+)?)\s+([\w/%µ°'·µμ'][^(]{0,20}?)\s*\(([^)]+)\)\s*$/
    const mFull = line.match(fullPattern)
    if (mFull) {
      const nom = mFull[1].trim()
      if (nom.length >= 2 && !/^\d/.test(nom) && !isMetadataLine(nom)) {
        const valParsed = parseValeur(mFull[2])
        const ref = parseRef(mFull[4])
        result.indicateurs.push({
          nom,
          categorie: currentCategorie,
          valeur: valParsed.valeur,
          valeur_texte: valParsed.valeur_texte,
          unite: mFull[3].trim(),
          ...ref,
        })
        continue
      }
    }

    // Pattern D: "NAME VALUE (REF)" (no unit)
    const noUnitPattern = /^(.+?)\s+([<>≤≥]?\s*[\d.,]+)\s*\(([^)]+)\)\s*$/
    const mNoUnit = line.match(noUnitPattern)
    if (mNoUnit) {
      const nom = mNoUnit[1].trim()
      if (nom.length >= 2 && !/^\d/.test(nom) && !isMetadataLine(nom)) {
        const valParsed = parseValeur(mNoUnit[2])
        const ref = parseRef(mNoUnit[3])
        result.indicateurs.push({
          nom,
          categorie: currentCategorie,
          valeur: valParsed.valeur,
          valeur_texte: valParsed.valeur_texte,
          unite: null,
          ...ref,
        })
        continue
      }
    }
  }

  // Deduplicate by nom
  const seen = new Set<string>()
  result.indicateurs = result.indicateurs.filter(ind => {
    if (seen.has(ind.nom)) return false
    seen.add(ind.nom)
    return true
  })

  return result
}
