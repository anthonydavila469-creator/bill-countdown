// Test doubles for the /api/bills/[id] route regression test.
//
// The fake Supabase client deliberately simulates the SERVICE-ROLE (admin)
// client used on the Bearer path: it has NO row-level security, so it
// returns exactly the rows matching the .eq() filters the route applies.
// That is the whole point — the test proves the route's own user_id filter
// (not RLS) is what isolates one user's data from another's.

export const store = {
  currentUser: null, // { id }
  method: 'bearer',
  bills: new Map(), // id -> row
};

export function reset() {
  store.currentUser = null;
  store.method = 'bearer';
  store.bills = new Map();
}

export function seedBill(bill) {
  store.bills.set(bill.id, { ...bill });
}

// --- next/server (NextResponse) ---
// `next/server` isn't importable outside Next's bundler, so we stand in a
// minimal NextResponse.json that builds a Web Response with the same status
// + JSON body the route relies on — enough to assert res.status / res.json().
export const NextResponse = {
  json(body, init) {
    return new Response(JSON.stringify(body), {
      status: init?.status ?? 200,
      headers: { 'content-type': 'application/json' },
    });
  },
};

// --- @/lib/auth/get-authenticated-user ---
export async function getAuthenticatedUser() {
  return { user: store.currentUser, method: store.method };
}

// --- @/lib/notifications/scheduler (no-ops; route calls .catch on them) ---
export async function scheduleNotificationsForBillWithSettings() {}
export async function cancelNotificationsForBill() {}

// --- @/lib/supabase/server + @/lib/supabase/admin ---
function project(row, cols) {
  return cols === 'id' ? { id: row.id } : { ...row };
}

function runQuery(state) {
  const matched = [...store.bills.values()].filter((row) =>
    state.filters.every(([col, val]) => row[col] === val),
  );
  if (state.op === 'update') {
    for (const row of matched) {
      for (const [k, v] of Object.entries(state.updateValues)) {
        // Mimic Supabase/JSON dropping undefined keys (partial update).
        if (v !== undefined) row[k] = v;
      }
    }
  } else if (state.op === 'delete') {
    for (const row of matched) store.bills.delete(row.id);
  }
  return matched.map((r) => project(r, state.projection));
}

function makeQuery() {
  const state = { op: 'select', filters: [], updateValues: null, projection: '*' };
  const builder = {
    select(cols) {
      state.projection = cols ?? '*';
      return builder;
    },
    update(values) {
      state.op = 'update';
      state.updateValues = values;
      return builder;
    },
    delete() {
      state.op = 'delete';
      return builder;
    },
    eq(col, val) {
      state.filters.push([col, val]);
      return builder;
    },
    async single() {
      const rows = runQuery(state);
      if (rows.length === 0) {
        return { data: null, error: { code: 'PGRST116', message: 'no rows' } };
      }
      return { data: rows[0], error: null };
    },
    // Awaitable terminal for `delete().select('id')` (no .single()).
    then(resolve) {
      resolve({ data: runQuery(state), error: null });
    },
  };
  return builder;
}

function makeClient() {
  return { from: () => makeQuery() };
}

export function createAdminClient() {
  return makeClient();
}

export async function createClient() {
  return makeClient();
}
