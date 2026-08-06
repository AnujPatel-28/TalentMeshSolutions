import { redirect } from 'next/navigation';

// Editor for a feature whose backing table (email_templates) does not exist — see the parent
// page stub (doc 23 F-23.4).
export default function EmailTemplateEditorPage() {
  redirect('/dashboard/admin/email-templates');
}
