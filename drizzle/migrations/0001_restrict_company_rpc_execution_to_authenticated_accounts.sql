REVOKE EXECUTE ON FUNCTION public.is_staff() FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_company(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_account_profile() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_company_profile(text,jsonb,text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.send_company_review(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.company_review_recipient(text) FROM anon;