import { Field } from './ui'

/**
 * Champ rédactionnel saisi dans les deux langues du site.
 *
 * Le référentiel (régions, villes) portait déjà les deux graphies, mais pas le
 * contenu rédigé : la version arabe du site affichait du français au milieu de
 * l'arabe. Chaque champ a donc son pendant `_ar`.
 *
 * La traduction reste facultative : sans elle, la version française s'affiche en
 * repli, ce qui vaut mieux qu'un titre vide. C'est pourquoi seul le champ
 * français peut être obligatoire.
 *
 * Le champ arabe est en `dir="rtl"` et `lang="ar"` : la saisie s'aligne à droite
 * et la ponctuation se place correctement, quelle que soit la langue de
 * l'interface au moment de la saisie.
 */
export function BilingualField({
  name,
  label,
  labelAr,
  hint,
  hintAr,
  required,
  placeholder,
  placeholderAr,
  rows,
  defaultValue,
  defaultValueAr,
}: {
  name: string
  label: string
  labelAr: string
  hint?: string
  hintAr?: string
  required?: boolean
  placeholder?: string
  placeholderAr?: string
  /** Renseigné, le champ devient une zone de texte de `rows` lignes. */
  rows?: number
  defaultValue?: string
  defaultValueAr?: string
}) {
  const arName = `${name}_ar`

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={label} htmlFor={name} hint={hint} required={required}>
        {rows ? (
          <textarea
            id={name}
            name={name}
            rows={rows}
            required={required}
            className="champ"
            placeholder={placeholder}
            defaultValue={defaultValue}
          />
        ) : (
          <input
            id={name}
            name={name}
            required={required}
            className="champ"
            placeholder={placeholder}
            defaultValue={defaultValue}
          />
        )}
      </Field>

      <Field label={labelAr} htmlFor={arName} hint={hintAr}>
        {rows ? (
          <textarea
            id={arName}
            name={arName}
            rows={rows}
            dir="rtl"
            lang="ar"
            className="champ"
            placeholder={placeholderAr}
            defaultValue={defaultValueAr}
          />
        ) : (
          <input
            id={arName}
            name={arName}
            dir="rtl"
            lang="ar"
            className="champ"
            placeholder={placeholderAr}
            defaultValue={defaultValueAr}
          />
        )}
      </Field>
    </div>
  )
}
