/**
 * Génère un mot de passe temporaire lisible pour les comptes admin-créés.
 *
 * Règles :
 *   - 12 caractères alphanumériques par défaut
 *   - Exclut les caractères visuellement ambigus : 0, O, l, 1, I
 *   - Pas de caractère spécial (`!` causait des confusions de copier-coller
 *     dans les emails Yahoo et les champs password masqués)
 *   - Entropie : 50 chars alphabet ^ 12 ≈ 2.4e20 combinaisons, suffisant
 *     pour un password temporaire (forcé à changer à la 1ère connexion)
 */
export async function generateTempPassword(length = 12): Promise<string> {
  const { randomBytes } = await import('crypto')
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = randomBytes(length)
  let pw = ''
  for (let i = 0; i < length; i++) {
    pw += alphabet[bytes[i] % alphabet.length]
  }
  return pw
}
