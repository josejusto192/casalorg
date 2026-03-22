-- ============================================================
-- Nós Dois — Schema Completo com RLS
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- HOUSEHOLDS
-- ============================================================
CREATE TABLE households (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL DEFAULT 'Nosso Lar',
  invite_code   TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 6)),
  has_children  BOOLEAN NOT NULL DEFAULT FALSE,
  has_pets      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id    UUID REFERENCES households(id) ON DELETE SET NULL,
  full_name       TEXT NOT NULL DEFAULT '',
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'partner' CHECK (role IN ('owner', 'partner')),
  dark_mode       BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRANSACTIONS (Finanças)
-- ============================================================
CREATE TABLE transaction_categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#6366f1',
  icon          TEXT NOT NULL DEFAULT 'tag',
  type          TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES transaction_categories(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  scope         TEXT NOT NULL DEFAULT 'shared' CHECK (scope IN ('personal', 'shared')),
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  notes         TEXT,
  recurring     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE savings_goals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL,
  current_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  deadline      DATE,
  color         TEXT NOT NULL DEFAULT '#f43f5e',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SHOPPING LISTS
-- ============================================================
CREATE TABLE shopping_lists (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT 'Lista de Compras',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE TABLE shopping_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id       UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  quantity      NUMERIC(8,2) NOT NULL DEFAULT 1,
  unit          TEXT,
  category      TEXT NOT NULL DEFAULT 'outros',
  checked       BOOLEAN NOT NULL DEFAULT FALSE,
  checked_by    UUID REFERENCES auth.users(id),
  checked_at    TIMESTAMPTZ,
  added_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MEAL PLANNING
-- ============================================================
CREATE TABLE recipes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  servings      INT NOT NULL DEFAULT 2,
  prep_time_min INT,
  calories      INT,
  ingredients   JSONB NOT NULL DEFAULT '[]',
  instructions  TEXT,
  image_url     TEXT,
  created_by    UUID NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE meal_plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  week_start    DATE NOT NULL,
  created_by    UUID NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE meal_plan_entries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id       UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  recipe_id     UUID REFERENCES recipes(id) ON DELETE SET NULL,
  day_of_week   INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 6=Sat
  meal_type     TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  custom_name   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WORKOUTS
-- ============================================================
CREATE TABLE workout_plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  days_per_week INT NOT NULL DEFAULT 3,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE exercises (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id       UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  sets          INT,
  reps          TEXT,
  rest_seconds  INT,
  day_of_week   INT CHECK (day_of_week BETWEEN 0 AND 6),
  order_index   INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workout_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  plan_id       UUID REFERENCES workout_plans(id) ON DELETE SET NULL,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_min  INT,
  notes         TEXT,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workout_log_exercises (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_id        UUID NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets_done     INT,
  reps_done     TEXT,
  weight_kg     NUMERIC(6,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CHILDREN (optional module)
-- ============================================================
CREATE TABLE children (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  birth_date    DATE,
  school        TEXT,
  avatar_url    TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE child_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id      UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'appointment' CHECK (type IN ('appointment', 'school', 'vaccine', 'other')),
  date          TIMESTAMPTZ NOT NULL,
  notes         TEXT,
  reminder_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vaccines (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id      UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  applied_at    DATE,
  next_dose_at  DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PETS (optional module)
-- ============================================================
CREATE TABLE pets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  species       TEXT NOT NULL DEFAULT 'dog',
  breed         TEXT,
  birth_date    DATE,
  avatar_url    TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pet_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id        UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'vet' CHECK (type IN ('vet', 'vaccine', 'grooming', 'medication', 'other')),
  date          TIMESTAMPTZ NOT NULL,
  notes         TEXT,
  reminder_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER households_updated_at BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER savings_goals_updated_at BEFORE UPDATE ON savings_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX transactions_household_id_idx ON transactions(household_id);
CREATE INDEX transactions_date_idx ON transactions(date DESC);
CREATE INDEX shopping_items_list_id_idx ON shopping_items(list_id);
CREATE INDEX shopping_items_household_id_idx ON shopping_items(household_id);
CREATE INDEX workout_logs_user_id_idx ON workout_logs(user_id);
CREATE INDEX child_events_child_id_idx ON child_events(child_id);
CREATE INDEX pet_events_pet_id_idx ON pet_events(pet_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper function: get user's household_id
CREATE OR REPLACE FUNCTION get_household_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT household_id FROM public.profiles WHERE id = auth.uid();
$$;

-- HOUSEHOLDS
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their household"
  ON households FOR SELECT USING (id = get_household_id());
CREATE POLICY "Members can update their household"
  ON households FOR UPDATE USING (id = get_household_id());

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view household members"
  ON profiles FOR SELECT USING (
    id = auth.uid() OR household_id = get_household_id()
  );
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- TRANSACTION CATEGORIES
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members can manage categories"
  ON transaction_categories FOR ALL USING (household_id = get_household_id());

-- TRANSACTIONS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members can view transactions"
  ON transactions FOR SELECT USING (household_id = get_household_id());
CREATE POLICY "Household members can insert transactions"
  ON transactions FOR INSERT WITH CHECK (household_id = get_household_id() AND user_id = auth.uid());
CREATE POLICY "Owners can update/delete transactions"
  ON transactions FOR UPDATE USING (household_id = get_household_id());
CREATE POLICY "Owners can delete transactions"
  ON transactions FOR DELETE USING (household_id = get_household_id());

-- SAVINGS GOALS
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members can manage savings goals"
  ON savings_goals FOR ALL USING (household_id = get_household_id());

-- SHOPPING LISTS
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members can manage shopping lists"
  ON shopping_lists FOR ALL USING (household_id = get_household_id());

-- SHOPPING ITEMS
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members can manage shopping items"
  ON shopping_items FOR ALL USING (household_id = get_household_id());

-- RECIPES
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members can manage recipes"
  ON recipes FOR ALL USING (household_id = get_household_id());

-- MEAL PLANS
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members can manage meal plans"
  ON meal_plans FOR ALL USING (household_id = get_household_id());

-- MEAL PLAN ENTRIES
ALTER TABLE meal_plan_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members can manage meal plan entries"
  ON meal_plan_entries FOR ALL USING (
    plan_id IN (SELECT id FROM meal_plans WHERE household_id = get_household_id())
  );

-- WORKOUT PLANS
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members can view workout plans"
  ON workout_plans FOR SELECT USING (household_id = get_household_id());
CREATE POLICY "Users manage own workout plans"
  ON workout_plans FOR ALL USING (user_id = auth.uid());

-- EXERCISES
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage exercises in their plans"
  ON exercises FOR ALL USING (
    plan_id IN (SELECT id FROM workout_plans WHERE user_id = auth.uid())
  );

-- WORKOUT LOGS
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members can view logs"
  ON workout_logs FOR SELECT USING (household_id = get_household_id());
CREATE POLICY "Users manage own workout logs"
  ON workout_logs FOR ALL USING (user_id = auth.uid());

-- WORKOUT LOG EXERCISES
ALTER TABLE workout_log_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own log exercises"
  ON workout_log_exercises FOR ALL USING (
    log_id IN (SELECT id FROM workout_logs WHERE user_id = auth.uid())
  );

-- CHILDREN
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members can manage children"
  ON children FOR ALL USING (household_id = get_household_id());

-- CHILD EVENTS
ALTER TABLE child_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members can manage child events"
  ON child_events FOR ALL USING (household_id = get_household_id());

-- VACCINES
ALTER TABLE vaccines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members can manage vaccines"
  ON vaccines FOR ALL USING (household_id = get_household_id());

-- PETS
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members can manage pets"
  ON pets FOR ALL USING (household_id = get_household_id());

-- PET EVENTS
ALTER TABLE pet_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members can manage pet events"
  ON pet_events FOR ALL USING (household_id = get_household_id());

-- ============================================================
-- SEED: Default transaction categories
-- (run after inserting a household)
-- ============================================================
-- These are created per-household via application logic
-- Example categories: Alimentação, Moradia, Transporte, Saúde, Lazer, Educação, Salário, Freelance
