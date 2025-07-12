-- SECURITY FIX: Remove unused role column from profiles table to prevent privilege escalation
-- This eliminates the critical vulnerability where users could update their role to 'admin'

ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;