-- ============================================================
-- Fix: add missing INSERT policies
-- Run this in Supabase SQL Editor if you already applied 001.
-- ============================================================

-- HOUSEHOLDS: allow any authenticated user to create a new household
-- (at creation time the user has no household_id yet, so get_household_id() = NULL)
CREATE POLICY "Authenticated users can create households"
  ON households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- TRANSACTION CATEGORIES: allow insert when household belongs to user
-- (needed for seeding default categories right after household creation)
CREATE POLICY "Members can insert categories"
  ON transaction_categories FOR INSERT
  WITH CHECK (household_id = get_household_id());

-- SHOPPING LISTS: ensure insert is explicitly allowed
CREATE POLICY "Members can insert shopping lists"
  ON shopping_lists FOR INSERT
  WITH CHECK (household_id = get_household_id());

-- SHOPPING ITEMS: ensure insert is explicitly allowed
CREATE POLICY "Members can insert shopping items"
  ON shopping_items FOR INSERT
  WITH CHECK (household_id = get_household_id());

-- RECIPES: ensure insert is explicitly allowed
CREATE POLICY "Members can insert recipes"
  ON recipes FOR INSERT
  WITH CHECK (household_id = get_household_id());

-- MEAL PLANS: ensure insert is explicitly allowed
CREATE POLICY "Members can insert meal plans"
  ON meal_plans FOR INSERT
  WITH CHECK (household_id = get_household_id());

-- MEAL PLAN ENTRIES: ensure insert is explicitly allowed
CREATE POLICY "Members can insert meal plan entries"
  ON meal_plan_entries FOR INSERT
  WITH CHECK (
    plan_id IN (SELECT id FROM meal_plans WHERE household_id = get_household_id())
  );

-- SAVINGS GOALS: ensure insert is explicitly allowed
CREATE POLICY "Members can insert savings goals"
  ON savings_goals FOR INSERT
  WITH CHECK (household_id = get_household_id());

-- TRANSACTIONS: ensure insert is explicitly allowed
CREATE POLICY "Members can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (household_id = get_household_id() AND user_id = auth.uid());

-- WORKOUT PLANS: ensure insert is explicitly allowed
CREATE POLICY "Users can insert workout plans"
  ON workout_plans FOR INSERT
  WITH CHECK (user_id = auth.uid() AND household_id = get_household_id());

-- EXERCISES: ensure insert is explicitly allowed
CREATE POLICY "Users can insert exercises"
  ON exercises FOR INSERT
  WITH CHECK (
    plan_id IN (SELECT id FROM workout_plans WHERE user_id = auth.uid())
  );

-- WORKOUT LOGS: ensure insert is explicitly allowed
CREATE POLICY "Users can insert workout logs"
  ON workout_logs FOR INSERT
  WITH CHECK (user_id = auth.uid() AND household_id = get_household_id());

-- WORKOUT LOG EXERCISES: ensure insert is explicitly allowed
CREATE POLICY "Users can insert workout log exercises"
  ON workout_log_exercises FOR INSERT
  WITH CHECK (
    log_id IN (SELECT id FROM workout_logs WHERE user_id = auth.uid())
  );

-- CHILDREN: ensure insert is explicitly allowed
CREATE POLICY "Members can insert children"
  ON children FOR INSERT
  WITH CHECK (household_id = get_household_id());

-- CHILD EVENTS: ensure insert is explicitly allowed
CREATE POLICY "Members can insert child events"
  ON child_events FOR INSERT
  WITH CHECK (household_id = get_household_id());

-- VACCINES: ensure insert is explicitly allowed
CREATE POLICY "Members can insert vaccines"
  ON vaccines FOR INSERT
  WITH CHECK (household_id = get_household_id());

-- PETS: ensure insert is explicitly allowed
CREATE POLICY "Members can insert pets"
  ON pets FOR INSERT
  WITH CHECK (household_id = get_household_id());

-- PET EVENTS: ensure insert is explicitly allowed
CREATE POLICY "Members can insert pet events"
  ON pet_events FOR INSERT
  WITH CHECK (household_id = get_household_id());
