-- ================================================================
-- Migration Session 6 — InternLog — 09/04/2026
-- Tables : patient_followups + subscriptions + seats
-- EXÉCUTER dans Supabase SQL Editor (Dashboard > SQL Editor)
-- ================================================================

-- ==========================================
-- 1. TABLE patient_followups (Suivi post-op)
-- ==========================================

CREATE TABLE IF NOT EXISTS patient_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES entries(id) ON DELETE SET NULL,

  -- Identifiant anonyme (ex: PAT-2026-001)
  anonymous_id TEXT NOT NULL,

  -- Dates clés
  intervention_date DATE NOT NULL,
  discharge_date DATE,

  -- Résultat
  outcome TEXT NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending', 'success', 'complication', 'failure', 'deceased')),
  complication_type TEXT,
  complication_date DATE,

  -- Contexte (non identifiable)
  age_range TEXT CHECK (age_range IN ('0-5', '6-15', '16-25', '26-40', '41-60', '61-75', '75+')),
  sex TEXT CHECK (sex IN ('M', 'F')),
  asa_score INTEGER CHECK (asa_score BETWEEN 1 AND 5),

  -- Évolution
  notes TEXT,
  follow_up_days INTEGER GENERATED ALWAYS AS (
    CASE WHEN discharge_date IS NOT NULL
      THEN discharge_date - intervention_date
      ELSE NULL
    END
  ) STORED,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_followups_user ON patient_followups(user_id);
CREATE INDEX IF NOT EXISTS idx_followups_outcome ON patient_followups(outcome);
CREATE INDEX IF NOT EXISTS idx_followups_entry ON patient_followups(entry_id) WHERE entry_id IS NOT NULL;

-- RLS
ALTER TABLE patient_followups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_followups' AND policyname = 'Users can read their own followups') THEN
    CREATE POLICY "Users can read their own followups"
      ON patient_followups FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_followups' AND policyname = 'Users can insert their own followups') THEN
    CREATE POLICY "Users can insert their own followups"
      ON patient_followups FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_followups' AND policyname = 'Users can update their own followups') THEN
    CREATE POLICY "Users can update their own followups"
      ON patient_followups FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patient_followups' AND policyname = 'Users can delete their own followups') THEN
    CREATE POLICY "Users can delete their own followups"
      ON patient_followups FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;


-- ==========================================
-- 2. TABLE subscriptions (Abonnements PayPal)
-- ==========================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES hospitals(id),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'institutional')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  payment_provider TEXT,
  payment_reference TEXT,
  amount_fcfa INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_ref ON subscriptions(payment_reference);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Users can view own subscriptions') THEN
    CREATE POLICY "Users can view own subscriptions"
      ON subscriptions FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;


-- ==========================================
-- 3. TABLE institutional_seats
-- ==========================================

CREATE TABLE IF NOT EXISTS institutional_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id),
  max_seats INTEGER NOT NULL DEFAULT 20,
  used_seats INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE institutional_seats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'institutional_seats' AND policyname = 'Admins can view institutional seats') THEN
    CREATE POLICY "Admins can view institutional seats"
      ON institutional_seats FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.id = institutional_seats.subscription_id
          AND s.user_id = auth.uid()
        )
      );
  END IF;
END $$;


-- ==========================================
-- 4. TABLE seat_assignments
-- ==========================================

CREATE TABLE IF NOT EXISTS seat_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institutional_seat_id UUID NOT NULL REFERENCES institutional_seats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(institutional_seat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_seat_assignments_user ON seat_assignments(user_id);

ALTER TABLE seat_assignments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'seat_assignments' AND policyname = 'Users can view own seat assignments') THEN
    CREATE POLICY "Users can view own seat assignments"
      ON seat_assignments FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;


-- ==========================================
-- 5. FONCTION has_active_subscription
-- ==========================================

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


-- ==========================================
-- VÉRIFICATION
-- ==========================================
-- Lancer après exécution pour confirmer :
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('patient_followups', 'subscriptions', 'institutional_seats', 'seat_assignments');
