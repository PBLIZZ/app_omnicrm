// ──────────────────────────────────────────────────────────────────────────────
// Client Onboarding Form — Architecture & Starter Code
// Stack: Next.js 15 (App Router), TypeScript, Zod, Supabase (Auth, DB, Storage),
//        shadcn/ui, react-hook-form, react-signature-canvas, hCaptcha (optional)
// Goal: Send a one-time link to a prospect. They open on mobile, fill details,
//       accept GDPR consent, (optionally) upload a photo, sign, and submit.
//       Data is written to the owner’s workspace/organization in Supabase.
//
// This file is a single-page reference containing:
//  1) DB schema (SQL) + RLS policies
//  2) Edge-safe RPC function for tokened onboarding (SECURITY DEFINER)
//  3) Storage bucket setup
//  4) Next.js routes: issue link, render public form, submit handler
//  5) React form UI with validation & signature + photo upload flow
//  6) Email template for the onboarding link
//  7) Consent blurb (GDPR-friendly, Spain/EU)
// Copy sections into their respective files in your repo.
// ──────────────────────────────────────────────────────────────────────────────

/*
================================================================================
1) SQL — Schema & Policies (Supabase > SQL Editor)
================================================================================
*/

/* Workspaces (tenant) */
create table if not exists public.workspaces (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  created_at    timestamptz not null default now()
);

/* Clients */
create table if not exists public.clients (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  /* PII */
  first_name     text,
  last_name      text,
  email          text check (email ~* '^[^@\n]+@[^@\n]+\.[^@\n]+$'),
  phone          text,
  date_of_birth  date,
  address_line1  text,
  address_line2  text,
  city           text,
  region         text,
  postal_code    text,
  country        text,
  notes          text
);

/* Consent records */
create table if not exists public.client_consents (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references public.clients(id) on delete cascade,
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  consent_type       text not null check (consent_type in ('data_processing','marketing')),
  consent_text_ver   text not null,
  processing_basis   text not null default 'consent',
  accepted_at        timestamptz not null default now(),
  ip_address         inet,
  user_agent         text,
  signature_image_url text,
  signature_svg      text
);

/* Onboarding tokens — used to create one-time public links */
create table if not exists public.onboarding_tokens (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  token         text unique not null,
  expires_at    timestamptz not null,
  max_uses      int not null default 1,
  used_count    int not null default 0,
  created_by    uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  disabled      boolean not null default false
);

/* Optional: client files (photos, docs) */
create table if not exists public.client_files (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients(id) on delete cascade,
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  created_at     timestamptz not null default now(),
  file_path      text not null,
  kind           text not null default 'photo'
);

-- Row Level Security
alter table public.workspaces enable row level security;
alter table public.clients enable row level security;
alter table public.client_consents enable row level security;
alter table public.client_files enable row level security;
alter table public.onboarding_tokens enable row level security;

-- Policies: authenticated users may manage their own workspace rows
create policy "owner can read/write own workspace" on public.workspaces
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Policies: workspace-scoped tables (clients, consents, files)
create policy "workspace read" on public.clients
  for select using (exists (select 1 from public.workspaces w where w.id = clients.workspace_id and w.owner_id = auth.uid()));
create policy "workspace write" on public.clients
  for insert with check (exists (select 1 from public.workspaces w where w.id = clients.workspace_id and w.owner_id = auth.uid()));
create policy "workspace update" on public.clients
  for update using (exists (select 1 from public.workspaces w where w.id = clients.workspace_id and w.owner_id = auth.uid()))
             with check (exists (select 1 from public.workspaces w where w.id = clients.workspace_id and w.owner_id = auth.uid()));
create policy "workspace delete" on public.clients
  for delete using (exists (select 1 from public.workspaces w where w.id = clients.workspace_id and w.owner_id = auth.uid()));

-- Duplicate policies (adjust table name) for client_consents and client_files

/* Public use via SECURITY DEFINER RPC: no direct policy for anon. */
create policy "token readers" on public.onboarding_tokens for select using (true);

/*
================================================================================
2) RPC — SECURITY DEFINER Function (token-validated insert)
================================================================================
*/

-- Create a Postgres function to safely accept public submissions.
-- It validates the token, inserts client + consent, increments token usage,
-- and returns the client id. Runs as table owner (bypassing RLS) with checks.

create or replace function public.onboard_client_with_token(
  p_token text,
  p_client jsonb,           -- { first_name, last_name, email, ... }
  p_consent jsonb,          -- { consent_type, consent_text_ver, signature_svg, signature_image_url }
  p_photo_path text         -- optional storage path already uploaded via signed URL
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_token record;
  v_client_id uuid;
begin
  select * into v_token
  from public.onboarding_tokens t
  where t.token = p_token
    and t.disabled = false
    and now() < t.expires_at
    and t.used_count < t.max_uses
  for update;

  if not found then
    raise exception 'Invalid or expired token' using errcode = '28000';
  end if;

  v_workspace_id := v_token.workspace_id;

  insert into public.clients (workspace_id, first_name, last_name, email, phone, date_of_birth,
                              address_line1, address_line2, city, region, postal_code, country, notes)
    values (
      v_workspace_id,
      coalesce((p_client->>'first_name'), null),
      coalesce((p_client->>'last_name'), null),
      coalesce((p_client->>'email'), null),
      coalesce((p_client->>'phone'), null),
      (p_client->>'date_of_birth')::date,
      (p_client->>'address_line1'),
      (p_client->>'address_line2'),
      (p_client->>'city'),
      (p_client->>'region'),
      (p_client->>'postal_code'),
      (p_client->>'country'),
      (p_client->>'notes')
    ) returning id into v_client_id;

  insert into public.client_consents (client_id, workspace_id, consent_type, consent_text_ver, processing_basis, accepted_at, ip_address, user_agent, signature_image_url, signature_svg)
    values (
      v_client_id,
      v_workspace_id,
      coalesce((p_consent->>'consent_type'),'data_processing'),
      (p_consent->>'consent_text_ver'),
      'consent',
      now(),
      null, -- fill via header in API handler if desired
      null,
      (p_consent->>'signature_image_url'),
      (p_consent->>'signature_svg')
    );

  if p_photo_path is not null then
    insert into public.client_files (client_id, workspace_id, file_path, kind)
      values (v_client_id, v_workspace_id, p_photo_path, 'photo');
  end if;

  update public.onboarding_tokens set used_count = used_count + 1 where id = v_token.id;
  return v_client_id;
end;
$$;

/* Grant anon access to call the function but not to write tables directly */
revoke all on function public.onboard_client_with_token(text, jsonb, jsonb, text) from public;
grant execute on function public.onboard_client_with_token(text, jsonb, jsonb, text) to anon;

/*
================================================================================
3) Storage — Bucket & Policy (Supabase > Storage)
================================================================================
*/
-- Create bucket: client-photos (private)
-- In Supabase Dashboard > Storage, create bucket `client-photos` as PRIVATE.
-- You will generate a signed upload URL from your API for a path like:
-- client-photos/{workspace_id}/{uuidv4()}.jpg

/*
================================================================================
4) Next.js — Routes (App Router)
================================================================================
*/

// File: src/app/(dashboard)/settings/onboarding/issue-link/action.ts
// Server Action to create a token for the logged-in user’s workspace
'use server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { randomBytes } from 'crypto'

export async function issueOnboardingLink(workspaceId: string, hoursValid = 72) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )

  const token = randomBytes(24).toString('base64url')
  const { data, error } = await supabase
    .from('onboarding_tokens')
    .insert({
      workspace_id: workspaceId,
      token,
      expires_at: new Date(Date.now() + hoursValid * 3600_000).toISOString(),
      max_uses: 1,
    })
    .select('token')
    .single()

  if (error) throw error

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/onboard/${token}`
  return { token, publicUrl }
}

// File: src/app/onboard/[token]/page.tsx
import { notFound } from 'next/navigation'
import OnboardForm from './ui/OnboardForm'
import { createClient } from '@supabase/supabase-js'

export default async function Page({ params }: { params: { token: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data, error } = await supabase
    .from('onboarding_tokens')
    .select('token, expires_at, disabled')
    .eq('token', params.token)
    .maybeSingle()

  if (error || !data || data.disabled || new Date(data.expires_at) < new Date()) {
    return notFound()
  }

  return <OnboardForm token={params.token} />
}

// File: src/app/api/public/onboard/signed-upload/route.ts (POST)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { token, mime } = await req.json()
    if (!token || !/^image\//.test(mime)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only
    )

    // validate token
    const { data: t } = await supabase
      .from('onboarding_tokens')
      .select('workspace_id, expires_at, disabled')
      .eq('token', token)
      .maybeSingle()

    if (!t || t.disabled || new Date(t.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 })
    }

    const path = `client-photos/${t.workspace_id}/${randomUUID()}`

    const { data: signed, error } = await supabase.storage
      .from('client-photos')
      .createSignedUploadUrl(path)

    if (error) throw error
    return NextResponse.json({ path, url: signed.signedUrl, token: signed.token })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// File: src/app/api/public/onboard/submit/route.ts (POST)
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const ClientSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
})

const ConsentSchema = z.object({
  consent_type: z.literal('data_processing'),
  consent_text_ver: z.string().min(1),
  signature_svg: z.string().optional(),
  signature_image_url: z.string().optional()
})

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.ip || undefined
    const ua = req.headers.get('user-agent') || undefined

    const payload = await req.json()
    const { token, client, consent, photo_path } = payload

    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const c = ClientSchema.parse(client)
    const k = ConsentSchema.parse(consent)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // call RPC with service key via admin client (separate client)
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await admin.rpc('onboard_client_with_token', {
      p_token: token,
      p_client: c,
      p_consent: { ...k, signature_svg: k.signature_svg, signature_image_url: k.signature_image_url },
      p_photo_path: photo_path ?? null
    })

    if (error) throw error

    // Optional: send confirmation email to client or notify workspace via webhook
    return NextResponse.json({ client_id: data })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid submission' }, { status: 400 })
  }
}

/*
================================================================================
5) React UI — Public Mobile Form (shadcn/ui + react-hook-form)
================================================================================
*/

// File: src/app/onboard/[token]/ui/OnboardForm.tsx
'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import SignatureCanvas from 'react-signature-canvas'

const GDPR_CONSENT_VERSION = process.env.NEXT_PUBLIC_GDPR_CONSENT_VERSION || '2025-09-01'

export default function OnboardForm({ token }: { token: string }) {
  const { register, handleSubmit } = useForm()
  const [sigRef, setSigRef] = useState<SignatureCanvas | null>(null)
  const [photoPath, setPhotoPath] = useState<string | null>(null)

  async function uploadPhoto(file: File) {
    const r = await fetch('/api/public/onboard/signed-upload', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, mime: file.type })
    })
    const { url, token: uploadToken, path } = await r.json()
    const put = await fetch(url, { method: 'PUT', headers: { 'x-upsert': 'true' }, body: file })
    if (!put.ok) throw new Error('Upload failed')
    setPhotoPath(path)
  }

  const onSubmit = async (data: any) => {
    const signature_svg = sigRef?.toSVG()
    const consent_text_ver = GDPR_CONSENT_VERSION
    const res = await fetch('/api/public/onboard/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        client: {
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone,
          date_of_birth: data.date_of_birth,
          address_line1: data.address_line1,
          address_line2: data.address_line2,
          city: data.city,
          region: data.region,
          postal_code: data.postal_code,
          country: data.country,
          notes: data.notes,
        },
        consent: {
          consent_type: 'data_processing',
          consent_text_ver: consent_text_ver,
          signature_svg,
          signature_image_url: null
        },
        photo_path: photoPath
      })
    })

    if (res.ok) {
      alert('Thanks! Your information has been submitted securely.')
    } else {
      alert('There was a problem. Please try again later.')
    }
  }

  return (
    <div className="mx-auto max-w-md p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Client Onboarding</h1>
      <p className="text-sm text-muted-foreground">Please complete your details and accept the consent.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <input className="w-full border p-2 rounded" placeholder="First name" {...register('first_name', { required: true })} />
        <input className="w-full border p-2 rounded" placeholder="Last name" {...register('last_name', { required: true })} />
        <input className="w-full border p-2 rounded" placeholder="Email" type="email" {...register('email', { required: true })} />
        <input className="w-full border p-2 rounded" placeholder="Phone" {...register('phone')} />
        <input className="w-full border p-2 rounded" placeholder="Date of birth" type="date" {...register('date_of_birth')} />

        <div className="grid grid-cols-2 gap-2">
          <input className="border p-2 rounded" placeholder="Address line 1" {...register('address_line1')} />
          <input className="border p-2 rounded" placeholder="Address line 2" {...register('address_line2')} />
          <input className="border p-2 rounded" placeholder="City" {...register('city')} />
          <input className="border p-2 rounded" placeholder="Region" {...register('region')} />
          <input className="border p-2 rounded" placeholder="Postal code" {...register('postal_code')} />
          <input className="border p-2 rounded" placeholder="Country" {...register('country')} />
        </div>

        <textarea className="w-full border p-2 rounded" placeholder="Notes" rows={3} {...register('notes')} />

        {/* Photo uploader */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Optional photo</label>
          <input type="file" accept="image/*" onChange={async (e) => {
            const f = e.target.files?.[0]
            if (f) await uploadPhoto(f)
          }} />
        </div>

        {/* Consent text (short) + link to full policy */}
        <div className="rounded border p-2 text-sm">
          <p>
            I consent to the processing and storage of my personal data by the practitioner for the
            purposes of client management and service delivery, in accordance with the Privacy Notice.
          </p>
        </div>

        {/* Signature */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Signature</label>
          <SignatureCanvas ref={setSigRef as any} canvasProps={{ className: 'border rounded w-full h-40' }} />
          <button type="button" className="text-xs underline" onClick={() => sigRef?.clear()}>Clear signature</button>
        </div>

        {/* Submit */}
        <button type="submit" className="w-full rounded bg-black text-white py-2">Submit</button>
      </form>

      <p className="text-xs text-muted-foreground">GDPR Consent v{GDPR_CONSENT_VERSION}. Powered by Omnipotency.</p>
    </div>
  )
}

/*
================================================================================
6) Email Template — Send the link
================================================================================
*/

// Subject: Action Required: Complete your onboarding details
// Body (text):
// Hi {first_name},\n\nTo get you booked in and set up, please complete your details here:\n{onboarding_url}\n\nThis secure form works on mobile and takes about 2 minutes.\n\nThank you!\n{practitioner_name}

/*
================================================================================
7) GDPR Consent (Short Blurb + Link to Full Notice)
================================================================================
*/

// Short blurb to show above signature (kept concise for mobile):
// “I consent to the collection and processing of my personal data (including contact details, health-related notes I choose to share, and my photo if uploaded) for client management and service delivery. I understand my data will be stored securely, kept no longer than necessary, and that I can withdraw consent at any time. See the full Privacy Notice for details on purposes, legal bases, retention, and my rights under the GDPR.”
// Link to full /privacy page for your workspace/brand. Consider a checkbox to confirm reading.

// ──────────────────────────────────────────────────────────────────────────────
// Deployment notes & hardening checklist
// - Add hCaptcha/Cloudflare Turnstile on the public form to reduce spam.
// - Rate limit POST /api/public/onboard/* (e.g., @upstash/ratelimit on Vercel Edge).
// - Virus-scan uploads via a background job if you later allow documents.
// - Encrypt sensitive fields at rest (either pgcrypto or app-level libs) if needed.
// - Maintain consent_text_ver history; bump version when policy changes.
// - Add marketing consent as a separate optional checkbox + row in client_consents.
// - Add audit log on server action for traceability.
// - Set Storage bucket as PRIVATE; only serve photos via signed URLs in the app.
// - Token lifecycle: allow manual revoke; default expiry 72h; single-use.
// - Localize consent text for ES/en.
// - Add i18n, accessible labels, and better mobile inputs (tel/email/date).
// ──────────────────────────────────────────────────────────────────────────────
