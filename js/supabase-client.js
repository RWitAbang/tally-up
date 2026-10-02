import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.2';

const SUPABASE_URL = 'https://lzimubkanmdllasiumkl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_CAhbvrqDrRfJ8ncHOwll8Q_GAT8cWcb';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
