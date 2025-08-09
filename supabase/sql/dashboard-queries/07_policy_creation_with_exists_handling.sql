do $$
BEGIN
    -- Attempt to create the policy, do nothing if it already exists
    BEGIN
        CREATE POLICY "embeddings_select_own" ON embeddings
        FOR SELECT
        TO authenticated
        USING ((SELECT auth.uid()) = user_id);
    EXCEPTION WHEN DUPLICATE_OBJECT THEN
        -- Do nothing if policy already exists
        NULL;
    END;
END $$;