-- Inline company profile: add expandable profile sections to public and private company profiles.
alter table public.company_public_profiles
  add column if not exists products_services text not null default '',
  add column if not exists markets text not null default '',
  add column if not exists geographical_focus text not null default '',
  add column if not exists projects text not null default '',
  add column if not exists sections jsonb not null default '{}'::jsonb;

alter table public.company_private_profiles
  add column if not exists products_services text not null default '',
  add column if not exists markets text not null default '',
  add column if not exists geographical_focus text not null default '',
  add column if not exists projects text not null default '';

-- Illustrative demo baselines for the seven prototype companies.
update public.company_public_profiles set
  products_services = 'Connected sensor kits, edge gateways, and a machine-condition dashboard for production lines.',
  markets = 'Manufacturing, process industry, and public facilities looking for predictive maintenance.',
  geographical_focus = 'Karlskrona and the Blekinge industrial region, with pilots across southern Sweden.',
  projects = 'Demo pilot: condition monitoring for a small shipyard workshop, open to joint validation partners.',
  sections = jsonb_build_object(
    'about', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'products', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'technologies', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'markets', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'geography', jsonb_build_object('status','source','source','Blue Science Park member location','url','https://www.bluesciencepark.se/','retrieved_at','2026-11-13'),
    'priorities', jsonb_build_object('status','missing','source','No company priorities supplied yet'),
    'projects', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'interests', jsonb_build_object('status','inferred','source','AI-inferred discovery interests','retrieved_at','2026-11-13'))
where company_id = 'nord';

update public.company_public_profiles set
  products_services = 'Autonomous surface buoys, moored sensor arrays, and a coastal water-quality data service.',
  markets = 'Coastal municipalities, aquaculture, environmental monitoring, and offshore energy operators.',
  geographical_focus = 'Baltic Sea coastal waters, with field operations based in Karlskrona.',
  projects = 'Demo pilot: seasonal algal bloom monitoring with a coastal municipality.',
  sections = jsonb_build_object(
    'about', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'products', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'technologies', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'markets', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'geography', jsonb_build_object('status','source','source','Blue Science Park member location','url','https://www.bluesciencepark.se/','retrieved_at','2026-11-13'),
    'priorities', jsonb_build_object('status','missing','source','No company priorities supplied yet'),
    'projects', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'interests', jsonb_build_object('status','inferred','source','AI-inferred discovery interests','retrieved_at','2026-11-13'))
where company_id = 'ocean';

update public.company_public_profiles set
  products_services = 'Applied AI toolkits for anomaly detection, forecasting and document understanding, plus advisory workshops.',
  markets = 'Industrial data teams, healthcare administration, and public sector analytics.',
  geographical_focus = 'Remote-first team based in Karlskrona, serving organisations across Sweden.',
  projects = 'Demo pilot: a forecasting model for a manufacturing line, seeking a data partner.',
  sections = jsonb_build_object(
    'about', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'products', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'technologies', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'markets', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'geography', jsonb_build_object('status','source','source','Blue Science Park member location','url','https://www.bluesciencepark.se/','retrieved_at','2026-11-13'),
    'priorities', jsonb_build_object('status','missing','source','No company priorities supplied yet'),
    'projects', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'interests', jsonb_build_object('status','inferred','source','AI-inferred discovery interests','retrieved_at','2026-11-13'))
where company_id = 'aether';

update public.company_public_profiles set
  products_services = 'Modular conveyor cells, plug-in control units, and retrofit kits for older production lines.',
  markets = 'Small and medium manufacturers, logistics operators, and food production.',
  geographical_focus = 'Manufacturers in Blekinge and Småland, with installers across the Nordic region.',
  projects = 'Demo pilot: a modular assembly cell for a growing component supplier.',
  sections = jsonb_build_object(
    'about', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'products', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'technologies', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'markets', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'geography', jsonb_build_object('status','source','source','Blue Science Park member location','url','https://www.bluesciencepark.se/','retrieved_at','2026-11-13'),
    'priorities', jsonb_build_object('status','missing','source','No company priorities supplied yet'),
    'projects', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'interests', jsonb_build_object('status','inferred','source','AI-inferred discovery interests','retrieved_at','2026-11-13'))
where company_id = 'modul';

update public.company_public_profiles set
  products_services = 'Shore-based wave and current energy converters, plus maintenance services for coastal energy sites.',
  markets = 'Coastal communities, port authorities, and renewable energy developers.',
  geographical_focus = 'Baltic Sea and Swedish west coast sites, headquartered in Karlskrona.',
  projects = 'Demo pilot: a demonstration site for a small current-energy converter at a port.',
  sections = jsonb_build_object(
    'about', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'products', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'technologies', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'markets', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'geography', jsonb_build_object('status','source','source','Blue Science Park member location','url','https://www.bluesciencepark.se/','retrieved_at','2026-11-13'),
    'priorities', jsonb_build_object('status','missing','source','No company priorities supplied yet'),
    'projects', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'interests', jsonb_build_object('status','inferred','source','AI-inferred discovery interests','retrieved_at','2026-11-13'))
where company_id = 'baltic';

update public.company_public_profiles set
  products_services = 'Remote monitoring kits for home care, clinician dashboards, and integration with patient journals.',
  markets = 'Municipal home care, primary care centres, and regional healthcare providers.',
  geographical_focus = 'Municipalities in Blekinge and neighbouring counties.',
  projects = 'Demo pilot: home monitoring for chronic heart failure patients with a municipal partner.',
  sections = jsonb_build_object(
    'about', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'products', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'technologies', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'markets', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'geography', jsonb_build_object('status','source','source','Blue Science Park member location','url','https://www.bluesciencepark.se/','retrieved_at','2026-11-13'),
    'priorities', jsonb_build_object('status','missing','source','No company priorities supplied yet'),
    'projects', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'interests', jsonb_build_object('status','inferred','source','AI-inferred discovery interests','retrieved_at','2026-11-13'))
where company_id = 'pulse';

update public.company_public_profiles set
  products_services = 'Private wireless networks, maritime coverage solutions, and secure device onboarding services.',
  markets = 'Ports, shipyards, industrial sites, and maritime logistics operators.',
  geographical_focus = 'Swedish ports and coastal industrial sites, with a test network in Karlskrona.',
  projects = 'Demo pilot: private wireless coverage for a shipyard workshop area.',
  sections = jsonb_build_object(
    'about', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'products', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'technologies', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'markets', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'geography', jsonb_build_object('status','source','source','Blue Science Park member location','url','https://www.bluesciencepark.se/','retrieved_at','2026-11-13'),
    'priorities', jsonb_build_object('status','missing','source','No company priorities supplied yet'),
    'projects', jsonb_build_object('status','inferred','source','AI-generated baseline from public company themes','retrieved_at','2026-11-13'),
    'interests', jsonb_build_object('status','inferred','source','AI-inferred discovery interests','retrieved_at','2026-11-13'))
where company_id = 'ericsson';

-- Publishing now covers the new profile sections and marks them company-supplied.
CREATE OR REPLACE FUNCTION public.save_company_profile(cid text, profile_data jsonb, publish_fields text[] DEFAULT '{}'::text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  field text;
  section_key text;
  new_sections jsonb := '{}'::jsonb;
BEGIN
  IF NOT public.can_manage_company(cid) THEN RAISE EXCEPTION 'Not authorised to edit this company'; END IF;
  IF NOT cid = ANY(ARRAY['nord','ocean','aether','modul','baltic','pulse','ericsson']) THEN RAISE EXCEPTION 'Unknown company'; END IF;
  IF length(coalesce(profile_data->>'name','')) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Company name is required'; END IF;

  INSERT INTO public.company_private_profiles(company_id,name,description,interests,technologies,priorities,private_notes,products_services,markets,geographical_focus,projects,review_status)
  VALUES(
    cid, profile_data->>'name', coalesce(profile_data->>'description',''),
    ARRAY(SELECT jsonb_array_elements_text(coalesce(profile_data->'interests','[]'::jsonb))),
    ARRAY(SELECT jsonb_array_elements_text(coalesce(profile_data->'technologies','[]'::jsonb))),
    coalesce(profile_data->>'priorities',''), coalesce(profile_data->>'private_notes',''),
    coalesce(profile_data->>'products_services',''), coalesce(profile_data->>'markets',''),
    coalesce(profile_data->>'geographical_focus',''), coalesce(profile_data->>'projects',''), 'Reviewed')
  ON CONFLICT(company_id) DO UPDATE SET
    name = excluded.name, description = excluded.description, interests = excluded.interests,
    technologies = excluded.technologies, priorities = excluded.priorities, private_notes = excluded.private_notes,
    products_services = excluded.products_services, markets = excluded.markets,
    geographical_focus = excluded.geographical_focus, projects = excluded.projects,
    review_status = 'Reviewed', updated_at = now();

  IF cardinality(publish_fields) > 0 THEN
    IF NOT publish_fields <@ ARRAY['name','description','products_services','technologies','markets','geographical_focus','priorities','projects','interests'] THEN
      RAISE EXCEPTION 'Invalid public fields';
    END IF;
    IF NOT EXISTS(SELECT 1 FROM public.company_public_profiles WHERE company_id = cid) THEN RAISE EXCEPTION 'Published baseline is not available'; END IF;

    FOREACH field IN ARRAY publish_fields LOOP
      section_key := CASE field
        WHEN 'description' THEN 'about'
        WHEN 'products_services' THEN 'products'
        WHEN 'geographical_focus' THEN 'geography'
        ELSE field END;
      new_sections := new_sections || jsonb_build_object(section_key,
        jsonb_build_object('status','company','source','Company-provided information','retrieved_at', to_char(now(),'YYYY-MM-DD')));
    END LOOP;

    UPDATE public.company_public_profiles SET
      name = CASE WHEN 'name' = ANY(publish_fields) THEN profile_data->>'name' ELSE name END,
      description = CASE WHEN 'description' = ANY(publish_fields) THEN profile_data->>'description' ELSE description END,
      interests = CASE WHEN 'interests' = ANY(publish_fields) THEN ARRAY(SELECT jsonb_array_elements_text(profile_data->'interests')) ELSE interests END,
      technologies = CASE WHEN 'technologies' = ANY(publish_fields) THEN ARRAY(SELECT jsonb_array_elements_text(profile_data->'technologies')) ELSE technologies END,
      priorities = CASE WHEN 'priorities' = ANY(publish_fields) THEN profile_data->>'priorities' ELSE priorities END,
      products_services = CASE WHEN 'products_services' = ANY(publish_fields) THEN coalesce(profile_data->>'products_services','') ELSE products_services END,
      markets = CASE WHEN 'markets' = ANY(publish_fields) THEN coalesce(profile_data->>'markets','') ELSE markets END,
      geographical_focus = CASE WHEN 'geographical_focus' = ANY(publish_fields) THEN coalesce(profile_data->>'geographical_focus','') ELSE geographical_focus END,
      projects = CASE WHEN 'projects' = ANY(publish_fields) THEN coalesce(profile_data->>'projects','') ELSE projects END,
      sections = coalesce(sections,'{}'::jsonb) || new_sections,
      provenance = 'Company-provided information', updated_at = now()
      WHERE company_id = cid;
  END IF;

  IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'representative' AND company_id = cid) THEN
    UPDATE public.profile_review_requests SET status = 'Reviewed', reviewed_at = now()
      WHERE company_id = cid AND recipient_id = auth.uid() AND status = 'Pending';
  END IF;
END
$function$;