-- Migration : PayPal Subscriptions + Sièges institutionnels
-- InternLog — 08/04/2026
-- IMPORTANT : exécuter dans le SQL Editor Supabase

-- 1. Ajouter le statut 'pending' à l'enum subscription_status (si enum existe)
-- NOTE : si l'enum n'existe pas encore, créer la table directement
-- ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'pending';

-- 2. Vérifier/créer la table subscriptions
-- (si elle existe déjà depuis le schema initial, cette commande sera ignorée)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES hospitals(id),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'institutional')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  payment_provider TEXT, -- 'paypal'
  payment_reference TEXT, -- PayPal subscription ID
  amount_fcfa INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Table des sièges institutionnels
CREATE TABLE IF NOT EXISTS institutional_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  max_seats INTEGER NOT NULL DEFAULT 20,
  used_seats INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Table des postes attribués (chefs de service)
CREATE TABLE IF NOT EXISTS seat_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institutional_seat_id UUID NOT NULL REFERENCES institutional_seats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(institutional_seat_id, user_id)
);

-- 5. Index
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_ref ON subscriptions(payment_reference);
CREATE INDEX IF NOT EXISTS idx_seat_assignments_user ON seat_assignments(user_id);

-- 6. RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutional_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_assignments ENABLE ROW LEVEL SECURITY;

-- Subscriptions : utilisateur voit les siennes, service role accès total
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access subscriptions"
  ON subscriptions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Institutional seats : visible par les admins de l'hôpital
CREATE POLICY "Admins can view institutional seats"
  ON institutional_seats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.id = institutional_seats.subscription_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access seats"
  ON institutional_seats FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Seat assignments
CREATE POLICY "Users can view own seat assignments"
  ON seat_assignments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access seat_assignments"
  ON seat_assignments FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 7. Fonction pour vérifier si un utilisateur a un abonnement actif
CREATE OR REPLACE FUNCTION has_active_subscription(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = uid AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM seat_assignments sa
    JOIN institutional_seats ist ON ist.id = sa.institutional_seat_id
    JOIN subscriptions s ON s.id = ist.subscription_id
    WHERE sa.user_id = uid AND sa.is_active = true AND s.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
