-- Suivi patient anonymisé (intervention → sortie)
-- Aucune donnée de santé identifiable — conformément à la décision juridique InternLog

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
CREATE INDEX idx_followups_user ON patient_followups(user_id);
CREATE INDEX idx_followups_outcome ON patient_followups(outcome);
CREATE INDEX idx_followups_entry ON patient_followups(entry_id) WHERE entry_id IS NOT NULL;

-- RLS
ALTER TABLE patient_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own followups"
  ON patient_followups FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own followups"
  ON patient_followups FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own followups"
  ON patient_followups FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own followups"
  ON patient_followups FOR DELETE USING (auth.uid() = user_id);
