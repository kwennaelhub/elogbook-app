export default function ConfidentialitePage() {
  return (
    <article className="prose prose-slate prose-sm max-w-none">
      <h1>Politique de confidentialité</h1>
      <p className="text-sm text-slate-500">Dernière mise à jour : 09 avril 2026</p>

      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement des données est l&apos;éditeur d&apos;InternLog.<br />
        Contact : contact@internlog.app
      </p>

      <h2>2. Données collectées</h2>
      <h3>Données d&apos;inscription</h3>
      <ul>
        <li>Nom, prénom, email</li>
        <li>Matricule DES, niveau DES</li>
        <li>Hôpital de rattachement</li>
      </ul>

      <h3>Données d&apos;utilisation</h3>
      <ul>
        <li>Interventions chirurgicales (date, type, rôle, hôpital)</li>
        <li>Gardes (date, type, service)</li>
        <li>Suivis post-opératoires anonymisés (aucune donnée nominative patient)</li>
        <li>Notes de cours</li>
      </ul>

      <h3>Données techniques</h3>
      <ul>
        <li>Géolocalisation (si activée, pour vérification de présence)</li>
        <li>Adresse IP, données de session</li>
      </ul>

      <h2>3. Finalités du traitement</h2>
      <ul>
        <li>Gestion du logbook chirurgical pédagogique</li>
        <li>Suivi post-opératoire anonymisé des patients</li>
        <li>Validation des compétences par les superviseurs</li>
        <li>Génération de statistiques d&apos;activité</li>
        <li>Gestion des abonnements</li>
      </ul>

      <h2>4. Base légale</h2>
      <p>
        Le traitement est fondé sur le <strong>consentement</strong> de l&apos;utilisateur (article 6.1.a du RGPD)
        et l&apos;<strong>exécution du contrat</strong> de service (article 6.1.b du RGPD).
      </p>

      <h2>5. Destinataires des données</h2>
      <ul>
        <li><strong>Superviseurs désignés</strong> : accès aux interventions qui leur sont assignées</li>
        <li><strong>Administrateurs</strong> : accès aux données de leur hôpital</li>
        <li><strong>Sous-traitants techniques</strong> : Supabase (hébergement), Vercel (déploiement), PayPal (paiement), Brevo (emails)</li>
      </ul>
      <p>Aucune donnée n&apos;est vendue ou partagée à des fins commerciales.</p>

      <h2>6. Transferts internationaux</h2>
      <p>
        Les données sont hébergées par Supabase et Vercel, dont les serveurs peuvent être situés
        aux États-Unis ou à Singapour. Ces transferts sont encadrés par les clauses contractuelles
        types de la Commission européenne.
      </p>

      <h2>7. Durée de conservation</h2>
      <ul>
        <li>Données du compte : durée de l&apos;inscription + 3 ans après suppression</li>
        <li>Données d&apos;intervention : durée du DES + 5 ans (obligations pédagogiques)</li>
        <li>Logs techniques : 12 mois</li>
      </ul>

      <h2>8. Vos droits</h2>
      <p>Conformément au RGPD, vous disposez des droits suivants :</p>
      <ul>
        <li><strong>Accès</strong> : obtenir une copie de vos données</li>
        <li><strong>Rectification</strong> : corriger vos données inexactes</li>
        <li><strong>Suppression</strong> : demander l&apos;effacement de vos données</li>
        <li><strong>Portabilité</strong> : recevoir vos données dans un format structuré</li>
        <li><strong>Opposition</strong> : vous opposer au traitement</li>
        <li><strong>Limitation</strong> : restreindre le traitement</li>
      </ul>
      <p>
        Pour exercer vos droits : <strong>contact@internlog.app</strong><br />
        Vous pouvez également adresser une réclamation à la CNIL (www.cnil.fr).
      </p>

      <h2>9. Sécurité</h2>
      <p>
        Nous mettons en œuvre des mesures techniques et organisationnelles appropriées :
        chiffrement des données en transit (TLS), contrôle d&apos;accès par rôles (RLS),
        authentification sécurisée, anonymisation des données patient.
      </p>

      <h2>10. Contact</h2>
      <p>Pour toute question : <strong>contact@internlog.app</strong></p>
    </article>
  )
}
