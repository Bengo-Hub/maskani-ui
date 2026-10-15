import type { Base } from './common';

/** A kind of issued document and the fields its templates may use (GET /document-templates kinds). */
export interface DocKind {
  code: string;
  name: string;
  entity_type: 'unit_account' | 'sale_contract';
  merge_fields: string[];
  /** Fields typed in when issuing (payment plan terms). */
  inputs?: string[];
}

/** A template version: 0 is the Codevertex starter. */
export interface DocTemplate {
  id?: string;
  code: string;
  name: string;
  entity_type: 'unit_account' | 'sale_contract';
  version: number;
  status: 'draft' | 'approved' | 'retired';
  body: string;
  merge_fields: string[];
  inputs?: string[];
  approved_at?: string;
}

/** An issued document. */
export interface IssuedDocument extends Base {
  number: string;
  kind: string;
  title: string;
  entity_type: string;
  entity_id: string;
  unit_id?: string;
  party_ids?: string[];
  sha256?: string;
  verification_code?: string;
  status: 'draft' | 'issued' | 'partly_signed' | 'executed' | 'expired' | 'superseded';
  issued_at?: string;
  executed_at?: string;
  template_version?: number;
  /** An agreement: the people named accept it by code, or the office records a signed copy. */
  needs_signature?: boolean;
  /** Portal: the signed-in person has already accepted it. */
  accepted_by_me?: boolean;
}

/** One acceptance by code or a recorded signed paper copy (GET /documents/{id}/signatures). */
export interface DocumentSignature {
  id: string;
  document_id: string;
  party_id?: string;
  method: 'otp_acceptance' | 'wet_upload' | 'e_signature';
  signed_at: string;
  document_hash?: string;
  ip?: string;
  device?: { via?: string; user_agent?: string; recorded_by?: string };
  scan_file_key?: string;
}

/** What the public verify check returns: nothing personal. */
export interface DocumentVerification {
  number: string;
  title: string;
  status: string;
  issued_at?: string;
  issuer: string;
  sha256: string;
}
