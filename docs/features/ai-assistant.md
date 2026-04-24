# AI Assistant

**Status:** Living spec · reflects codebase as of `main` on 2026-04-24
**Owner (feature):** Brokztech team
**Related:** [api/README.md §12.1](../api/README.md#121-ai-chat--detailed), [auth/README.md §1](../auth/README.md#1-the-role-hierarchy)

> The AI Assistant is an **agentic tool-using chatbot** that answers questions about the org's data. It runs as a Supabase Edge Function (`ai-chat`) that proxies to the Anthropic Claude API, with a multi-turn tool loop (max 6 iterations). Sensitive tools are role-gated at two layers.

---

## Table of contents

1. [Scope](#1-scope)
2. [Architecture](#2-architecture)
3. [Authorization model](#3-authorization-model)
4. [Tool catalog](#4-tool-catalog)
5. [Streaming protocol](#5-streaming-protocol)
6. [Frontend integration](#6-frontend-integration)
7. [Secrets & config](#7-secrets--config)
8. [Known gaps / open questions](#8-known-gaps--open-questions)

---

## 1. Scope

**In scope:**
- The `ai-chat` Edge Function ([supabase/functions/ai-chat/index.ts](../../supabase/functions/ai-chat/index.ts)).
- Tool definitions + role-based allowlist + two-layer enforcement.
- Frontend SSE consumer contract.
- The `/future` page (in-app AI chat UI).

**Out of scope:**
- Anthropic SDK upgrades (covered by the `claude-api` skill when it's used).
- UI component details for the chat interface — standard DS components per [design-system/](../design-system/).
- Tool **implementation** details — each tool wraps an existing RPC or direct table query (cross-ref [api/README.md](../api/README.md)).

---

## 2. Architecture

### 2.1 Request flow

```
Frontend /future page
   ↓ fetch() with SSE
Edge Function: ai-chat
   ↓ validates JWT → resolves EffectiveRole server-side
   ↓ filters TOOLS → filteredTools (per role)
Anthropic Messages API (claude-sonnet-4-6)
   ↓ streaming response (text_delta + tool_use events)
Loop: each tool_use call →
   executeTool(name, input, orgId, role, admin)
   → result passed back to Anthropic as tool_result
   → continue loop (max 6 iterations)
Frontend receives SSE events:
   { type: 'text_delta', delta } | { type: 'tool_call', name } | { type: 'done' } | { type: 'error', message }
```

### 2.2 Config constants

[supabase/functions/ai-chat/index.ts:29–31](../../supabase/functions/ai-chat/index.ts#L29-L31):

| Constant | Value | Notes |
|---|---|---|
| `MODEL` | `'claude-sonnet-4-6'` | Main conversation model |
| `MAX_TOKENS` | `4096` | Per response |
| `MAX_LOOPS` | `6` | Tool-loop iterations before forcing conclusion |

### 2.3 Model upgrade policy

Upgrading the Claude model is a **one-line change** in `ai-chat/index.ts`. Before bumping:

1. Test tool-calling behavior on the new model.
2. Verify JSON shape of tool inputs (schema drift across model families).
3. Check token accounting if tool-heavy conversations are common.

Use the `claude-api` skill when touching this file.

---

## 3. Authorization model

**The 2026-04-20 security-fix pattern** — documented in [auth/README.md §1.2](../auth/README.md#12-organization-roles). Summary:

### 3.1 Effective role resolution

`EffectiveRole = 'god' | 'admin' | 'manager' | 'operation'`.

Resolution order (server-side, from the JWT):
1. `profiles.system_role = 'god'` → `'god'`.
2. Otherwise look up `organization_members.role` for `(user_id, orgId)`:
   - `'admin'` → `'admin'`
   - `'manager'` → `'manager'`
   - Anything else (including `'ik'`, `'operation'`, or missing) → `'operation'` (fail closed).

**Never trust `userRole` from request body.** The Zod schema accepts it for backwards compat but the server ignores it.

### 3.2 Admin-only tools

```ts
ADMIN_ONLY_TOOLS = new Set([
  'get_hr_summary',
  'get_wallet_balances',
  'get_accounting_summary',
])
```

A tool is "privileged" if the caller's EffectiveRole is god / admin / manager. Operation users (including unknown roles, fail-closed) cannot call these tools.

### 3.3 Two-layer enforcement

Defense-in-depth:

1. **Filter before sending to Anthropic.** `filterToolsForRole(role)` strips admin-only tools from the list advertised to the LLM. The LLM never sees them for operation users → no prompt-injection can make it call them.
2. **Re-check inside `executeTool`.** If a prompt-injected tool call somehow slips through, `executeTool` checks `isToolAllowedForRole` and returns `{ error: 'Tool "X" is not available for your role.' }`.

### 3.4 Data filtering within tools

Some tools sanitize output by role. `get_recent_activity` returns transfers for everyone but omits `accounting_entries` + `hr_salary_payments` rows for operation users ([ai-chat/index.ts:418](../../supabase/functions/ai-chat/index.ts#L418) — `canSeeSensitive` branch).

---

## 4. Tool catalog

Eight tools (as of 2026-04-24). See [ai-chat/index.ts:33–137](../../supabase/functions/ai-chat/index.ts#L33-L137) for schemas.

| # | Name | Inputs | Admin-only? | Implementation |
|---|---|---|---|---|
| 1 | `get_monthly_summary` | `year, month` | No | RPC `get_monthly_summary` — full KPI JSON (see [transfers.md §7](./transfers.md#7-rpc-contract-get_monthly_summary)) |
| 2 | `get_transfers` | `from_date?, to_date?, category? ('dep'\|'wit'), limit? (max 200)` | No | Direct query on `transfers` + joined `psps`, `transfer_types` |
| 3 | `get_top_customers` | `from_date?, to_date?, limit? (max 50)` | No | Aggregated from `transfers` (deposits only) by `full_name` |
| 4 | `get_psp_list` | (none) | No | `psps` with active status |
| 5 | `get_hr_summary` | `year, month` | **Yes** | Employee counts + role breakdown + payroll totals + payments for the month |
| 6 | `get_wallet_balances` | (none) | **Yes** | All wallets + latest snapshot per wallet |
| 7 | `get_accounting_summary` | `year, month` | **Yes** | Ledger grouped by `(entry_type, direction, register)` |
| 8 | `get_recent_activity` | `limit? (max 50)` | No (but filtered) | Merged recent rows across transfers, accounting, HR — sensitive sources omitted for operation |

### 4.1 Tool schema contract

Each tool has:
- `name` (string)
- `description` (prompt-style — the LLM reads this to decide when to call)
- `input_schema` (JSON schema — the LLM generates input matching it)

Inputs are validated loosely inside `executeTool` (the LLM usually gets it right, but `Number(input.x)` casts are defensive against string-y inputs).

### 4.2 Adding a new tool

1. Add an entry to the `TOOLS` array with name, description, and input_schema.
2. If sensitive, add the name to `ADMIN_ONLY_TOOLS`.
3. Add a `case '<name>':` branch in `executeTool`.
4. Test with an operation-role user to verify the two-layer enforcement works.
5. Bump docs — [api/README.md §12.1](../api/README.md#121-ai-chat--detailed) tool list and this file's [§4 table](#4-tool-catalog).

---

## 5. Streaming protocol

Server-Sent Events (SSE) — not the Anthropic SDK's streaming wrapper, raw chunks.

### 5.1 Event types

| Event | Payload | Emitted when |
|---|---|---|
| `text_delta` | `{ delta: string }` | Model produces a text chunk |
| `tool_call` | `{ name: string }` | Model invokes a tool (fires once per tool use — input details not surfaced to frontend) |
| `done` | (none) | Stream closed normally |
| `error` | `{ message: string }` | Error encountered (auth fail, RPC fail, max loops exceeded) |

### 5.2 Loop termination

- **Success:** model finishes without another tool call → emit `done`.
- **Max loops:** after 6 rounds of tool calls, server forces a final turn with no tools available and emits `done` when that completes.
- **Error:** any exception in the loop → `error` event, stream closes.

### 5.3 Frontend responsibilities

- Read `response.body.getReader()`, decode SSE chunks.
- Accumulate `text_delta.delta` into the current message.
- Show a pending UI indicator when `tool_call` arrives ("AI is looking up X…").
- Gracefully handle `error` (show to user, allow retry).

---

## 6. Frontend integration

### 6.1 Route

`/future` → renders the chat UI. Route name is legacy ("future features"); the feature has shipped.

### 6.2 Invocation pattern

```ts
const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ messages, orgId, orgName }),
})
const reader = res.body!.getReader()
// SSE decode loop…
```

Not `supabase.functions.invoke` because that doesn't support streaming — see [api/README.md §13.5](../api/README.md#135-edge-function-call).

### 6.3 Context injection

The server-side system prompt injects:
- `orgName` (for the assistant to reference in natural language).
- `orgId` (for tool scoping).
- `EffectiveRole` (so the LLM can reason about what it can/can't fetch).

### 6.4 Conversation history

The frontend owns the conversation state. Each request re-sends the full `messages` array. No persistent session on the server.

---

## 7. Secrets & config

### 7.1 Required secrets

Supabase Edge Function secrets (not committed):

| Secret | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Messages API auth |

Plus the standard admin DB creds (shared helper `_shared/supabase-admin.ts`).

### 7.2 CORS

Allowed origins set by `_shared/cors.ts`. Standard Supabase + localhost dev origins.

### 7.3 Rate limiting

`checkRateLimit` wrapper from `_shared/rateLimit.ts`. Per-user / per-IP token-bucket limits. Audit current values.

### 7.4 Input validation

Zod schema `AiChatBodySchema` ([index.ts:11–25](../../supabase/functions/ai-chat/index.ts#L11-L25)):

- `messages: array, min 1`
- `orgId: uuid`
- `orgName: string, min 1`
- `userRole?: string` — **accepted but ignored** (documented comment)

Invalid body → 400 before any LLM call.

---

## 8. Known gaps / open questions

- **No chat history persistence.** Each conversation is ephemeral (client-side only). If the user refreshes, the chat is gone. Consider a `ai_conversations` table if requested.
- **No tool-output truncation.** Some tools (`get_transfers` with `limit=200`, `get_monthly_summary` with 20 top customers) return large JSON that consumes conversation tokens. A long conversation can hit Anthropic's per-request token limit. Consider token-counting + truncating large tool outputs.
- **No streaming of tool input.** The frontend knows a tool was called (`tool_call` event with name) but not with what parameters. If a user asks "what's my January summary?" and the tool is called with `{year: 2025, month: 1}`, we don't show that in the UI. Consider surfacing tool inputs.
- **Model upgrade is manual.** No version-pinning / model-migration script. When a new Claude model ships, the dev must edit `MODEL`, test, and deploy.
- **`claude-sonnet-4-6` is the default** as of this file's date. The 4.7 family exists — evaluate and bump when stable.
- **No prompt-injection defense beyond tool filtering.** The LLM sees arbitrary user text + fetched DB data (customer names, notes). If a note contains an injection attempt, the tool filter still blocks execution, but the LLM's text output could still leak or contradict guidance. Standard Anthropic hardening applies.
- **Operation role silent tool hiding.** `filterToolsForRole` strips admin-only tools invisibly. An operation user asking "what's the payroll?" gets an "I don't have access to that" response without knowing the tool exists. Consider surfacing a tactful "some data is restricted by role" hint in the system prompt.
- **No telemetry.** Tool usage, error rates, response times aren't aggregated anywhere. Add structured logging.
- **No abuse protection beyond rate limit.** A user could script the chat endpoint to scrape the org's data. Consider per-user daily quotas.
- **Tool `category` input for `get_transfers` uses `'dep'/'wit'`** — legacy strings. The actual `transfer_categories.id` values are `'deposit'/'withdrawal'`. Confirm the tool actually matches these or if there's an alias mapping inside.
