import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← Retour à l&apos;accueil
      </Link>

      <h1 className="mt-6 text-3xl font-bold">Politique de confidentialité</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dernière mise à jour : mars 2026
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold">1. Responsable du traitement</h2>
          <p className="mt-2">
            PratiFlow SAS, éditeur de la plateforme pratiflow.com, est
            responsable du traitement des données personnelles collectées via
            cette application, conformément au Règlement Général sur la
            Protection des Données (RGPD) et à la loi Informatique et Libertés.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Données collectées</h2>
          <p className="mt-2">Nous collectons les données suivantes :</p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>
              <strong>Praticiens :</strong> nom, email, téléphone, spécialité,
              numéro RPPS (optionnel), photo de profil, informations de
              facturation Stripe.
            </li>
            <li>
              <strong>Patients :</strong> nom, email, téléphone, date de
              naissance, historique de rendez-vous, notes partagées par le
              praticien, fichiers téléversés, messages échangés.
            </li>
            <li>
              <strong>Données techniques :</strong> adresse IP, type de
              navigateur, logs d&apos;accès (conformité HDS).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Finalités du traitement</h2>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Gestion des rendez-vous et téléconsultations</li>
            <li>Suivi médical et partage de documents praticien-patient</li>
            <li>Facturation et paiement en ligne</li>
            <li>Envoi de confirmations et rappels (email, SMS)</li>
            <li>
              Conformité réglementaire (HDS, traçabilité des accès aux données
              de santé)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">
            4. Base légale du traitement
          </h2>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>
              <strong>Consentement :</strong> collecté explicitement lors de
              l&apos;inscription, horodaté et archivé.
            </li>
            <li>
              <strong>Exécution du contrat :</strong> nécessaire à la fourniture
              du service de prise de rendez-vous.
            </li>
            <li>
              <strong>Obligation légale :</strong> conservation des données de
              santé conformément au Code de la Santé Publique.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Hébergement des données</h2>
          <p className="mt-2">
            Les données sont hébergées par <strong>Supabase</strong> en
            région <strong>Union Européenne</strong> (Frankfurt/Paris),
            conformément aux exigences de la certification HDS (Hébergeur de
            Données de Santé). Toutes les données sont chiffrées au repos
            (AES-256) et en transit (TLS 1.3).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Durée de conservation</h2>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>
              Données de compte : conservées tant que le compte est actif,
              supprimées dans les 30 jours suivant une demande de suppression.
            </li>
            <li>
              Données de santé : conservées 20 ans conformément au Code de la
              Santé Publique (art. R1112-7).
            </li>
            <li>
              Logs d&apos;accès : conservés 6 ans (conformité HDS).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Vos droits</h2>
          <p className="mt-2">
            Conformément au RGPD, vous disposez des droits suivants :
          </p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>
              <strong>Droit d&apos;accès :</strong> obtenir une copie de vos
              données personnelles.
            </li>
            <li>
              <strong>Droit de rectification :</strong> corriger des données
              inexactes.
            </li>
            <li>
              <strong>Droit à l&apos;effacement :</strong> demander la
              suppression de vos données (« droit à l&apos;oubli »).
            </li>
            <li>
              <strong>Droit à la portabilité :</strong> exporter vos données
              dans un format structuré (JSON).
            </li>
            <li>
              <strong>Droit d&apos;opposition :</strong> vous opposer au
              traitement de vos données.
            </li>
            <li>
              <strong>Retrait du consentement :</strong> retirer votre
              consentement à tout moment.
            </li>
          </ul>
          <p className="mt-2">
            Pour exercer ces droits, rendez-vous dans{" "}
            <Link
              href="/dashboard/account"
              className="text-primary hover:underline"
            >
              Paramètres du compte
            </Link>{" "}
            ou contactez-nous à{" "}
            <strong>rgpd@pratiflow.com</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">8. Sous-traitants</h2>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>
              <strong>Supabase</strong> — hébergement base de données et
              fichiers (UE)
            </li>
            <li>
              <strong>Stripe</strong> — paiements en ligne (certifié PCI DSS)
            </li>
            <li>
              <strong>Resend</strong> — envoi d&apos;emails transactionnels
            </li>
            <li>
              <strong>Twilio</strong> — envoi de SMS
            </li>
            <li>
              <strong>Vercel</strong> — hébergement de l&apos;application web
              (UE)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">9. Contact DPO</h2>
          <p className="mt-2">
            Délégué à la Protection des Données :{" "}
            <strong>dpo@pratiflow.com</strong>
          </p>
          <p className="mt-1">
            Vous pouvez également adresser une réclamation à la{" "}
            <strong>CNIL</strong> (Commission Nationale de l&apos;Informatique
            et des Libertés) : www.cnil.fr
          </p>
        </section>
      </div>
    </div>
  );
}
