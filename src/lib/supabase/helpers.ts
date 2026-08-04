/**
 * Helpers de typage pour les résultats Supabase.
 *
 * CONTEXTE :
 * Quand on écrit un select avec un embed relation (`select('*, hospital:hospitals(name)')`),
 * Supabase-js retourne côté TypeScript un type `Hospital[] | null`, alors qu'en pratique
 * une relation to-one renvoie un objet unique `Hospital | null`. Le type généré ne
 * distingue pas les cardinalités.
 *
 * Sans helper, il faut ruser avec `as unknown as { ... } | null` pour extraire
 * le premier élément, ce qui casse la traçabilité des types et empêche le
 * type-check d'attraper les régressions futures.
 *
 * Ce module fournit :
 *   - `SupabaseJoinResult<T>` : le shape "objet ou tableau ou null" retourné par
 *     Supabase pour un embed relation.
 *   - `firstJoin<T>()` : extrait le premier élément (ou l'objet direct) et
 *     retourne `T | null` de manière typée.
 */

export type SupabaseJoinResult<T> = T | T[] | null | undefined

/**
 * Extrait le premier élément d'un résultat de relation Supabase.
 *
 * @example
 * ```ts
 * const { data } = await supabase
 *   .from('entries')
 *   .select('*, hospital:hospitals(name)')
 *
 * const hospital = firstJoin<{ name: string }>(data[0].hospital)
 * // hospital: { name: string } | null
 * ```
 */
export function firstJoin<T>(result: SupabaseJoinResult<T>): T | null {
  if (result == null) return null
  return Array.isArray(result) ? (result[0] ?? null) : result
}
