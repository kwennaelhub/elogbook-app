export default function CookiesPage() {
  return (
    <article className="prose prose-slate prose-sm max-w-none">
      <h1>Politique des cookies</h1>
      <p className="text-sm text-slate-500">Dernière mise à jour : 09 avril 2026</p>

      <h2>1. Qu&apos;est-ce qu&apos;un cookie ?</h2>
      <p>
        Un cookie est un petit fichier texte stocké sur votre appareil lors de votre visite sur un site web.
        Il permet au site de mémoriser vos actions et préférences.
      </p>

      <h2>2. Cookies utilisés par InternLog</h2>

      <h3>Cookies strictement nécessaires</h3>
      <table>
        <thead>
          <tr><th>Nom</th><th>Finalité</th><th>Durée</th></tr>
        </thead>
        <tbody>
          <tr><td>sb-*-auth-token</td><td>Authentification Supabase</td><td>Session</td></tr>
          <tr><td>internlog_session_token</td><td>Suivi de session active</td><td>30 jours</td></tr>
          <tr><td>internlog_locale</td><td>Préférence de langue</td><td>1 an</td></tr>
        </tbody>
      </table>
      <p>Ces cookies sont indispensables au fonctionnement du service et ne peuvent pas être désactivés.</p>

      <h3>Service Worker</h3>
      <p>
        InternLog utilise un Service Worker pour permettre le fonctionnement hors ligne.
        Ce mécanisme stocke des ressources localement sur votre appareil (cache du navigateur)
        mais ne collecte aucune donnée personnelle.
      </p>

      <h2>3. Cookies tiers</h2>
      <p>
        InternLog n&apos;utilise <strong>aucun cookie publicitaire</strong> ni de tracking tiers
        (pas de Google Analytics, Facebook Pixel, etc.).
      </p>

      <h2>4. Gestion des cookies</h2>
      <p>
        Vous pouvez configurer votre navigateur pour bloquer les cookies. Cependant, le blocage
        des cookies nécessaires empêchera l&apos;utilisation d&apos;InternLog.
      </p>

      <h2>5. Contact</h2>
      <p>Pour toute question : <strong>contact@internlog.app</strong></p>
    </article>
  )
}
