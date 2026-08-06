import { insforgeAdmin } from '../insforge-admin';

/**
 * Server-side function to invite a new administrator.
 * Requires INSFORGE_SERVICE_KEY to be set in environment variables.
 */
export async function inviteAdmin(email: string, invitedByAdminId: string): Promise<{ success: boolean, error?: string }> {
  if (!insforgeAdmin) {
    return { success: false, error: 'Internal Error: Admin client not initialized (Missing SERVICE_KEY)' };
  }

  try {
    // 1. Check if email is already registered in profiles
    const { data: existing } = await insforgeAdmin.database
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'An account with this email already exists' };
    }

    // 2. Create the user account with a secure temporary password
    // Since InsForge SDK doesn't expose an admin.inviteUserByEmail API,
    // we sign them up and trigger a password reset email which serves as the invite.
    const tempPassword = crypto.randomUUID() + crypto.randomUUID().toUpperCase() + 'aA1!@';
    
    const { data, error } = await insforgeAdmin.auth.signUp({
      email,
      password: tempPassword,
      name: email.split('@')[0],
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const user = data?.user;
    if (!user) {
      return { success: false, error: 'Failed to retrieve user data after invitation.' };
    }

    // Trigger a password reset email so the user can set their own password 
    // and log in (acting as an invite email)
    await insforgeAdmin.auth.sendResetPasswordEmail({ email });

    // 3. Record the invite in admin_invites table
    const { error: insertError } = await insforgeAdmin.database
      .from('admin_invites')
      .upsert({
        email,
        role: 'super_admin',
        invited_by: invitedByAdminId,
        token: user.id, // using user ID as token reference
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      }, { onConflict: 'email' });

    if (insertError) {
      console.error('Error recording admin invite:', insertError.message);
      // We don't fail the whole operation if the log insert fails, but it's good to know
    }

    // 4. Create/Update the profile with admin role
    const { error: profileError } = await insforgeAdmin.database
      .from('profiles')
      .upsert({
        id: user.id,
        email,
        role: 'admin',
        name: email.split('@')[0],
        is_onboarded: true
      }, { onConflict: 'email' });

    if (profileError) {
      console.error('Error creating admin profile:', profileError.message);
      return { success: false, error: 'User created but profile role assignment failed: ' + profileError.message };
    }

    return { success: true };

  } catch (err: any) {
    console.error('Unexpected error in inviteAdmin:', err);
    return { success: false, error: err.message || 'An unexpected error occurred' };
  }
}
