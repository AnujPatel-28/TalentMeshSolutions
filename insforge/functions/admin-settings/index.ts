// @ts-nocheck — Deno edge function: npm: imports and Deno globals are valid at runtime
import { createClient } from 'npm:@insforge/sdk';
import { canPerform, isStaffRole } from '../_shared/permissions.ts';

const baseUrl = Deno.env.get('NEXT_PUBLIC_INSFORGE_URL') || Deno.env.get('INSFORGE_URL')!;
const anonKey = Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY')!;

export default async function handler(req: Request): Promise<Response> {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    // A-12: the service key must never come from a caller-supplied request header.
    // Env only — a forged x-insforge-service-key header is no longer honoured.
    const serviceKey = Deno.env.get('INSFORGE_SERVICE_KEY') ||
                       Deno.env.get('INSFORGE_ADMIN_KEY') ||
                       Deno.env.get('INSFORGE_ANON_KEY') ||
                       Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY');

    const verifyClient = createClient({
      baseUrl,
      anonKey: anonKey || '',
      edgeFunctionToken: token,
      isServerMode: true
    });

    const { data: authData, error: authError } = await verifyClient.auth.getCurrentUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized, invalid token' }), { status: 401 });
    }

    const userData = { id: authData.user.id };

    const insforge = createClient({ 
      baseUrl, 
      anonKey: serviceKey!,
      edgeFunctionToken: token,
      isServerMode: true 
    });

    const insforgeAdmin = createClient({
      baseUrl,
      anonKey: serviceKey!,
      isServerMode: true
    });

    const { data: profile } = await insforge.database
      .from('profiles')
      .select('role, is_active')
      .eq('id', userData.id)
      .single();

    if (!isStaffRole(profile?.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    if (profile?.is_active !== true) {
      return new Response(JSON.stringify({ error: 'Forbidden, account is suspended' }), { status: 403 });
    }

    // R-4: staff roster (`team`) and platform config (`settings`) are super_admin-only in the
    // matrix — `admin` is platform operations, NOT team/settings (doc 14 §4.2).
    const actorRole = profile.role;
    const isTeamOp = req.method === 'GET'
      ? new URL(req.url).searchParams.get('section') === 'admins'
      : req.method !== 'PATCH'; // POST add_admin/update_role and DELETE act on staff profiles
    const settingsPerm: { resource: 'team' | 'settings'; action: 'view' | 'edit' | 'delete' } = {
      resource: isTeamOp ? 'team' : 'settings',
      action: req.method === 'GET' ? 'view' : req.method === 'DELETE' ? 'delete' : 'edit',
    };
    if (!canPerform(actorRole, settingsPerm.resource, settingsPerm.action)) {
      return new Response(JSON.stringify({ error: 'forbidden', code: 'permission_denied' }), { status: 403 });
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const section = url.searchParams.get('section');
      
      if (section === 'admins') {
        const { data: admins, error } = await insforgeAdmin.database
          .from('profiles')
          .select('id, name, email, role, avatar_url, created_at')
          .or('role.eq.admin,role.eq.super_admin')
          .order('created_at', { ascending: false });

        if (error && (error.message || error.code)) throw error;
        return new Response(JSON.stringify({ admins }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      // Fetch platform settings from the platform_settings table
      const { data: settings, error } = await insforgeAdmin.database
        .from('platform_settings')
        .select('*');

      if (error && (error.message || error.code)) throw error;

      const formatted = (settings ?? []).reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});

      return new Response(JSON.stringify(formatted), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST') {
       const body = await req.json();
       const { email, password, role, fullName, action, id } = body;

       if (action === 'add_admin') {
         const targetRole = role || 'admin';
         if (!isStaffRole(targetRole)) {
           return new Response(JSON.stringify({ error: 'Invalid role' }), { status: 400 });
         }
         const name = fullName || email.split('@')[0];

         // Query multiple profiles matching the email to handle duplicate accounts gracefully
         const { data: users, error: findError } = await insforgeAdmin.database
           .from('profiles')
           .select('id, role')
           .eq('email', email);

         if (findError) return new Response(JSON.stringify({ error: findError.message || 'Database error' }), { status: 500 });
         
         let targetUserId = '';
         const siteUrl = Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000';

         if (!users || users.length === 0) {
           // User does not exist, register them
           if (!password) {
             return new Response(JSON.stringify({ error: 'Password is required to create a new user credentials.' }), { status: 400 });
           }

           const { data: signupData, error: signupError } = await insforgeAdmin.auth.signUp({
             email,
             password,
             name,
           });

           if (signupError) {
             return new Response(JSON.stringify({ error: signupError.message }), { status: 400 });
           }

           const newUser = signupData?.user || (signupData as any)?.session?.user;
           if (!newUser) {
             return new Response(JSON.stringify({ error: 'Failed to create user auth record.' }), { status: 500 });
           }

           targetUserId = newUser.id;

           // Insert into profiles
           const { error: profileError } = await insforgeAdmin.database
             .from('profiles')
             .insert([{
               id: targetUserId,
               user_id: targetUserId,
               email,
               role: targetRole,
               name,
             }]);

           if (profileError) {
             return new Response(JSON.stringify({ error: profileError.message || 'Failed to create profile.' }), { status: 500 });
           }

           // Insert into admin_members
           const { error: memberError } = await insforgeAdmin.database
             .from('admin_members')
             .insert([{
               profile_id: targetUserId,
               email,
               full_name: name,
               role: targetRole,
               status: 'active',
               invited_by: userData.id,
               permissions: {}
             }]);

           if (memberError) {
             console.error('Failed to insert into admin_members:', memberError.message);
           }

           // Send credentials welcome email
           try {
             await fetch(`${siteUrl}/api/email/send`, {
               method: 'POST',
               headers: {
                 'Content-Type': 'application/json',
                 'x-service-key': serviceKey || '',
               },
               body: JSON.stringify({
                 to: email,
                 subject: 'Welcome to the TalentMesh Administrative Team! 🎉',
                 html: `
                   <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                     <h2 style="color: #4f46e5; margin-top: 0;">Welcome to the TalentMesh Administrative Team</h2>
                     <p>You have been granted administrative privileges on the TalentMesh platform.</p>
                     <p>Here are your temporary login credentials. Please log in and change your password in settings immediately.</p>
                     <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                       <p style="margin: 0 0 8px 0;"><strong>Control Center:</strong> <a href="${siteUrl}/login">${siteUrl}/login</a></p>
                       <p style="margin: 0 0 8px 0;"><strong>Username / Email:</strong> ${email}</p>
                       <p style="margin: 0;"><strong>Password:</strong> ${password}</p>
                     </div>
                     <p style="color: #64748b; font-size: 0.875rem;">This is an automated security invitation. Do not share your credentials with anyone.</p>
                   </div>
                 `,
                 role: 'security'
               })
             });
           } catch (mailErr) {
             console.error('Credentials email delivery failed:', mailErr);
           }
         } else {
           // User exists, upgrade their role
           const targetUser = users[0];
           targetUserId = targetUser.id;

           if (targetUser.role === targetRole) {
             return new Response(JSON.stringify({ error: `User already holds the ${targetRole} role.` }), { status: 400 });
           }

           const { error: updateError } = await insforgeAdmin.database
             .from('profiles')
             .update({ role: targetRole })
             .eq('id', targetUserId);

           if (updateError && (updateError.message || updateError.code)) throw updateError;

           // Sync / upsert into admin_members
           const { error: memberError } = await insforgeAdmin.database
             .from('admin_members')
             .upsert({
               profile_id: targetUserId,
               email,
               full_name: name,
               role: targetRole,
               status: 'active',
               invited_by: userData.id,
               permissions: {}
             }, { onConflict: 'email' });

           if (memberError) {
             console.error('Failed to sync admin_members for upgraded user:', memberError.message);
           }

           // Send upgrade notification email
           try {
             await fetch(`${siteUrl}/api/email/send`, {
               method: 'POST',
               headers: {
                 'Content-Type': 'application/json',
                 'x-service-key': serviceKey || '',
               },
               body: JSON.stringify({
                 to: email,
                 subject: 'TalentMesh Admin Access Granted ⚡',
                 html: `
                   <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                     <h2 style="color: #4f46e5; margin-top: 0;">Access Granted: Administrative Authority</h2>
                     <p>Your existing TalentMesh account has been upgraded with administrative privileges (${targetRole}).</p>
                     <p>You can now access the Admin Command Center using your current password.</p>
                     <div style="margin: 20px 0;">
                       <a href="${siteUrl}/login" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Go to Admin Panel</a>
                     </div>
                   </div>
                 `,
                 role: 'security'
               })
             });
           } catch (mailErr) {
             console.error('Upgrade confirmation email delivery failed:', mailErr);
           }
         }

         // Insert into admin_users table
         const { error: insertAdminError } = await insforgeAdmin.database
           .from('admin_users')
           .upsert({ user_id: targetUserId });

         if (insertAdminError && (insertAdminError.message || insertAdminError.code)) throw insertAdminError;

         // Log audit entry
         try {
           const ipAddress = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || '';
           await insforgeAdmin.database.from('audit_log').insert([{
             actor_id: userData.id,
             action: 'add_admin',
             table_name: 'profiles',
             record_id: targetUserId,
             old_data: { role: users?.[0]?.role || 'candidate' },
             new_data: { role: targetRole },
             ip_address: ipAddress,
             created_at: new Date().toISOString()
           }]);
         } catch (auditErr) {
           console.error('Audit failed:', auditErr);
         }

         return new Response(JSON.stringify({ message: 'User granted admin access successfully' }), { status: 200 });
       }

       if (action === 'update_role') {
         if (!id || !role) {
           return new Response(JSON.stringify({ error: 'Missing id or role' }), { status: 400 });
         }
         // R-4: the assignable staff set is the matrix's, so `content` is grantable.
         if (!isStaffRole(role)) {
           return new Response(JSON.stringify({ error: 'Invalid role' }), { status: 400 });
         }

         // Fetch old role for audit logging
         let oldRole = null;
         try {
           const { data: userProfile } = await insforgeAdmin.database
             .from('profiles')
             .select('role')
             .eq('id', id)
             .single();
           if (userProfile) oldRole = userProfile.role;
         } catch (e) {
           console.warn('Failed to fetch old role for audit:', e);
         }

         // Update the role in profiles table
         const { error: updateError } = await insforgeAdmin.database
           .from('profiles')
           .update({ role })
           .eq('id', id);

         if (updateError && (updateError.message || updateError.code)) throw updateError;

         // Log audit entry
         try {
           const ipAddress = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || '';
           await insforgeAdmin.database.from('audit_log').insert([{
             actor_id: userData.id,
             action: 'update_admin_role',
             table_name: 'profiles',
             record_id: id,
             old_data: { role: oldRole },
             new_data: { role },
             ip_address: ipAddress,
             created_at: new Date().toISOString()
           }]);
         } catch (auditErr) {
           console.error('Audit failed:', auditErr);
         }

         return new Response(JSON.stringify({ message: 'Admin role updated successfully' }), { status: 200 });
       }
    }

    if (req.method === 'PATCH') {
       const { key, value } = await req.json();
       
       if (!key || value === undefined) {
         return new Response(JSON.stringify({ error: 'Missing key or value' }), { status: 400 });
       }

       // Fetch old value first for audit logs
       let oldValue = null;
       try {
         const { data: oldData } = await insforgeAdmin.database
           .from('platform_settings')
           .select('value')
           .eq('key', key)
           .maybeSingle();
         if (oldData) oldValue = oldData.value;
       } catch (e) {
         console.warn('Failed to fetch old setting value for audit:', e);
       }

       const escapedValue = JSON.stringify(value).replace(/'/g, "''");
       const escapedKey = String(key).replace(/'/g, "''");
       const sql = `UPDATE public.platform_settings SET value = '${escapedValue}'::jsonb, updated_at = now() WHERE key = '${escapedKey}'`;

       const { data: resData, error } = await insforgeAdmin.database.rpc('exec_sql', { query: sql });

       if (error && (error.message || error.code)) throw error;
       if (resData && resData.success === false) {
         throw new Error(resData.error || 'Database operation failed');
       }

       // Log to public.audit_log
       try {
         const ipAddress = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || '';
         const isFeature = key === 'feature_flags';
         const actionName = isFeature ? 'toggle_feature' : 'update_settings';
         
         await insforgeAdmin.database
           .from('audit_log')
           .insert([{
             actor_id: userData.id,
             action: actionName,
             table_name: 'platform_settings',
             record_id: key,
             old_data: oldValue,
             new_data: value,
             ip_address: ipAddress,
             created_at: new Date().toISOString()
           }]);
       } catch (auditErr) {
         console.error('Failed to log admin settings audit entry:', auditErr);
       }

       return new Response(JSON.stringify({ message: 'Settings updated' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'DELETE') {
       const { id } = await req.json();
       const { error } = await insforgeAdmin.database
         .from('profiles')
         .update({ role: 'candidate' })
         .eq('id', id);

       if (error && (error.message || error.code)) throw error;

       const { error: deleteAdminError } = await insforgeAdmin.database
         .from('admin_users')
         .delete()
         .eq('user_id', id);

       if (deleteAdminError && (deleteAdminError.message || deleteAdminError.code)) throw deleteAdminError;

       // Log audit entry
       try {
         const ipAddress = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || '';
         await insforgeAdmin.database.from('audit_log').insert([{
           actor_id: userData.id,
           action: 'remove_admin',
           table_name: 'profiles',
           record_id: id,
           old_data: { role: 'admin' },
           new_data: { role: 'candidate' },
           ip_address: ipAddress,
           created_at: new Date().toISOString()
         }]);
       } catch (auditErr) {
         console.error('Audit failed:', auditErr);
       }

       return new Response(JSON.stringify({ message: 'Admin access removed' }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  } catch (err: any) {
    console.error('Admin Settings Edge Function Error:', err);
    return new Response(JSON.stringify({ 
      error: err.message || 'Internal Server Error',
      details: err.details || null,
      code: err.code || null,
      stack: err.stack || null,
      raw: String(err)
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
