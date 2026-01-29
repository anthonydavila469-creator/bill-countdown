const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearAll() {
  // Get all users (you likely only have one)
  const { data: users } = await supabase.from('bills').select('user_id').limit(1);
  if (!users || users.length === 0) {
    console.log('No bills found');
    return;
  }

  const userId = users[0].user_id;
  console.log('Clearing data for user:', userId);

  // Clear ignored suggestions
  const { error: ignoredError } = await supabase
    .from('ignored_suggestions')
    .delete()
    .eq('user_id', userId);
  console.log('Cleared ignored_suggestions:', ignoredError ? ignoredError.message : 'success');

  // Clear bill extractions
  const { error: extractError } = await supabase
    .from('bill_extractions')
    .delete()
    .eq('user_id', userId);
  console.log('Cleared bill_extractions:', extractError ? extractError.message : 'success');

  // Clear bills
  const { data: deleted, error: billsError } = await supabase
    .from('bills')
    .delete()
    .eq('user_id', userId)
    .select('id');
  console.log('Cleared bills:', billsError ? billsError.message : (deleted?.length + ' bills deleted'));

  console.log('\nDone! You can now rescan your emails.');
}

clearAll().catch(console.error);
