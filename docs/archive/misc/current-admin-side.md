here is the current admin side overview, and wanted to improve it as for the admin , want to improve the manage roles , manage company, manage jobs and manage recruters  and all the core functionalities, for eg :- in Job and Application :- but as an admin thre job application should be like for job posting -> it details of whaat they are looking for like requriement and important field to know the admin perfectly,company who posted , then in this job posting which candidate has applied and see the candidate job application submitted for the job posting , and admin caan also help the company or recuter to change the stage or job posting details if they are having any problem in doing so it will be like job posting life cycle managment help from the aadmin side.

and for User and Company as we are following compaany as the entity and the recuter will be under them so how should we make changes in the admin side accourdingly , as for the company the recuter who acts the maanger or admin of the company caan add and remove the recuter of his or her company and manage it , so for admin this company managment can be seen and also help in management if for some reasons they can not manage it admin can help them to do so. 

Company Directory (admin/dashhboard/comapny):- as for here we caan see the whole compaany profile page with its recuters its job postings and candiate applied for the job postings and company review ,company seaarch , company edits can we help ful as we can edit detaails or other this as we are the admin we can help them to do so , create comapny with th informations and the field which are required to do so 

and how will admin side manage the roles as super admin , admin , content, and the person with only content details , and future the billing and susbscription that we cann make for the company as for free tier we are giving free one live post feature at a time as ffor more in future we willl introduce the susbcription plans 

here is basic overview of current system 

Listed directory Talentmesh-demo
Listed directory app
Listed directory admin
Listed directory dashboard
Listed directory admin
Searched for "admin dashboard"
Searched for "admin/page"
Searched for "admin dashboard"
Listed directory %28dashboard%29
Listed directory admin
Listed directory dashboard
Listed directory admin
Viewed page.tsx:1-323

The Admin Dashboard overview in the Talentmesh platform is located at the route **`/dashboard/admin`**. 

Here is a breakdown of the things present on the overview page and their specific functionalities:

### 1. Header & Manual Refresh
*   **Greeting:** Shows a personalized welcome message. 
*   **Refresh Button:** Allows the admin to manually refetch and update all the dashboard statistics and queues without having to reload the entire page.

### 2. Sub-Navigation Tabs
A quick navigation menu to switch between main admin areas:
*   **Overview:** The current page with high-level stats.
*   **Reports:** Links to the reports/analytics page (`/dashboard/admin/reports`).
*   **Team & Access:** Links to manage recruiter accounts and access (`/dashboard/admin/recruiters`).
*   **Settings:** Links to the admin settings configuration (`/dashboard/admin/settings`).

### 3. Stats Widgets (Key Metrics)
Four summary cards that give a high-level view of the platform's current scale:
*   **Total Users:** Displays the combined count of all registered candidates and recruiters.
*   **Active Jobs:** Shows the number of currently approved and live job listings.
*   **Total Applications:** The total number of job applications submitted across all active job posts.
*   **Recruiters:** The total number of approved recruiter accounts on the platform.

### 4. Review Queue (Alerts Panel)
This is an actionable panel that lists items requiring admin attention or approval. If there are no pending items, it shows an "All Caught Up!" message. Otherwise, it alerts you to:
*   **Approval Requests:** Recruiters waiting for platform access (Links directly to the pending recruiters list).
*   **Job Reviews:** New job listings that require an admin's approval before they go live.
*   **Flagged Reports:** Job listings that have been reported by users and require attention.

### 5. Recent Activity Panel
A timeline feed that displays recent actions on the platform, such as new candidates registering, new recruiters signing up, or other tracked activities along with timestamps.

### 6. Quick Actions
A set of shortcut buttons for frequently used admin tasks:
*   **Post Job:** Shortcut to create a new job listing (`/dashboard/admin/jobs`).
*   **Publish Article:** Shortcut to manage or post new blog content (`/dashboard/admin/blogs`).
*   **Reports:** Quick link to view detailed analytics (`/dashboard/admin/reports`).
*   **Settings:** Quick link to platform configurations (`/dashboard/admin/settings`).

### 7. Platform Status
A small status card that displays the current operational health of the platform (e.g., "Operational - All services are working correctly. No incidents.").

---


Viewed 13_Admin_Portal_System_Documentation.md:1-800

In the Talentmesh admin dashboard, the **Users** and **Companies** sections manage the core entities of the platform: Candidates, Recruiters, and the Companies they belong to. 

Here is a breakdown of what is included, their routes, and the functionality available in each section based on the system documentation:

### 1. Users (Candidates & Recruiters)

The "Users" domain is split into two distinct directories: Candidates and Recruiters.

#### A. Candidates Directory
- **Route:** `/dashboard/admin/candidates` (also accessible via the public-looking alias `/candidates` if authenticated)
- **Functionality:**
  - **Directory View:** A paginated list of all candidates on the platform with search and filtering (e.g., discoverability status).
  - **Bulk Actions:** Ability to perform bulk status updates, bulk suspend/activate, and bulk delete candidates.
  - **Single Actions:** Edit individual candidate details (PATCH) or delete a single candidate.
  - **Export:** Export candidate data to a CSV file (runs via a background job).

#### B. Recruiters Directory
- **Route:** `/dashboard/admin/recruiters` (also accessible via `/recruiters`)
- **Functionality:**
  - **Directory View:** A paginated list of all recruiters, sortable and searchable by name or email.
  - **Lifecycle Management:** Full control over the recruiter onboarding pipeline. This includes approving their setup, verifying their OTP on their behalf, generating and sending credentials, and updating passwords.
  - **Bulk Actions:** Similar to candidates, you can bulk update status, bulk activate/suspend, and bulk delete recruiters.
  - **Custom Proposals:** Ability to send custom billing/feature proposals to recruiters.
  - **Export:** Export recruiter data to a CSV file.

### 2. Companies

The Companies section is responsible for managing the tenant organizations that recruiters belong to, as well as their compliance and registration.

#### A. Companies Directory
- **Route:** `/dashboard/admin/companies`
- **Functionality:**
  - **Directory View:** A paginated and searchable directory of all registered companies on the platform.
  - **Edit:** Update company details and upload/modify company logos.
  - *(Note: Companies cannot be deleted through the admin API for data integrity reasons).*

#### B. Company Registration
- **Route:** `/dashboard/admin/companies/register`
- **Functionality:**
  - **Creation:** A dedicated form to manually register a new company onto the platform and upload their initial logo. It redirects back to the directory upon success.

#### C. Company KYC / Verification Queue
- **Route:** `/dashboard/admin/verification` *(Note: This route is fully functional but currently hidden from the main sidebar navigation)*.
- **Functionality:**
  - **KYC Management:** An operational queue for processing company Know Your Customer (KYC) requests.
  - **Triage:** Displays counts for `submitted`, `approved`, `rejected`, and `needs_more_info`.
  - **Decisioning:** A modal that allows admins to approve, reject, or request more information from the company, while attaching review notes.

---
**Summary:** The Admin acts as a global operator. Every query on these pages pulls from the entire platform (all candidates, all recruiters, all companies) rather than being restricted to a specific tenant.


---


Searched for ""System""
Viewed page.tsx:1-100
Searched for ""System""
Searched for "admin.*sidebar"
Listed directory components
Listed directory layout
Listed directory dashboard
Searched for "system"
Searched for "audit"
Searched for "audit"
Viewed OpsDarkSidebarShell.tsx:1-100
Searched for "label.*System"
Viewed OpsDarkSidebarShell.tsx:150-250
Viewed OpsDarkSidebarShell.tsx:250-350
Viewed page.tsx:1-150
Viewed page.tsx:1-150

In the Admin side dashboard, the **System & Audit** section consists of two main modules. Here is a breakdown of what they contain, their routes, and their specific functionalities:

### 1. Audit Logs
* **Route:** `/dashboard/admin/audit-logs`
* **Functionality:** 
  This module serves as the primary security and accountability tracker for the system. It maintains a detailed, immutable trail of all actions performed by administrators across the platform.
  * **Detailed Tracking:** It displays the timestamp, the specific administrator who performed the action (name and email), the exact action taken (e.g., `create`, `update`, `delete`, `approve`), the resource or database table affected, the record identifier, and the IP origin of the request.
  * **Filtering & Search:** Admins can search for specific logs and use dynamic dropdown filters to narrow down the audit trail by specific actions (e.g., only showing deletions) or by specific resources (e.g., only showing changes to the `jobs` table).

### 2. System Settings (Visible to Super Admins only)
* **Route:** `/dashboard/admin/settings`
* **Functionality:** 
  This module acts as the central control panel for the platform's configuration and security management. It is divided into three core tabs:
  * **General (Platform Settings):** Allows Super Admins to manage core platform details (like the Platform Name, Support Email, and Tagline). It also includes a section to view and manage all administrator accounts (adding new admins, deleting admins, and updating your own admin profile).
  * **Active Devices & Sessions:** Provides a global view of all active user sessions across the platform. It shows the session type (normal or impersonation), IP address, browser/device info, location (country/region), and last active time. Super Admins can use this tab to forcefully revoke compromised or stale sessions.
  * **File Quarantine:** A security management area for files that have been flagged or quarantined by the system. It shows the file paths and quarantine timestamps, allowing Super Admins to either safely restore these files to their original location or permanently purge/delete them from the system.