alter table "public"."METER_READINGS" add column "created_at" timestamp with time zone default now();

alter table "public"."METER_READINGS" add column "deleted" boolean default false;

alter table "public"."METER_READINGS" add column "updated_at" timestamp with time zone default now();

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_times()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
    BEGIN
    IF (TG_OP = 'INSERT') THEN
        NEW.created_at := now();
        NEW.updated_at := now();
    ELSEIF (TG_OP = 'UPDATE') THEN
        NEW.created_at = OLD.created_at;
        NEW.updated_at = now();
    END IF;
    RETURN NEW;
    END;
    $function$
;

CREATE TRIGGER handle_times BEFORE INSERT OR UPDATE ON public."METER_READINGS" FOR EACH ROW EXECUTE FUNCTION public.handle_times();


