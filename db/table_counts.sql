CREATE OR REPLACE FUNCTION public._table_counts()
RETURNS TABLE(table_name text, row_count bigint)
LANGUAGE plpgsql
AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename LOOP
    RETURN QUERY EXECUTE format('SELECT %L::text, count(*)::bigint FROM public.%I', r.tablename, r.tablename);
  END LOOP;
END;
$$;

COPY (
  SELECT table_name, row_count
  FROM public._table_counts()
  ORDER BY table_name
) TO STDOUT WITH CSV HEADER;

DROP FUNCTION public._table_counts();
